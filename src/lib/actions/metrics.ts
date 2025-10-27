"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { oneroster } from "@/lib/clients"
import { redisCache } from "@/lib/cache"

export type CourseEnrollmentUser = {
  userId: string
  email?: string
  displayName?: string
  enrollmentRoles: string[]
  globalRoles: string[]
  isStudentOnly: boolean
  schoolNames: string[]
  earnedXP: number
  percentComplete: number
}

export type CourseEnrollmentData = {
  users: CourseEnrollmentUser[]
  totals: {
    totalEnrolled: number
    totalStudentsOnly: number
  }
}

export async function getCourseEnrollments(courseId: string): Promise<CourseEnrollmentData> {
  if (!courseId || !courseId.startsWith("nice_")) {
    logger.warn("metrics enrollments: invalid course id", { courseId })
    throw errors.new("invalid course id")
  }
  return redisCache(async () => {
  const classesResult = await errors.try(
    oneroster.getAllClasses({ filter: "status='active'" })
  )
  if (classesResult.error) {
    logger.error("metrics enrollments: failed to fetch classes", { error: classesResult.error })
    throw errors.wrap(classesResult.error, "classes fetch")
  }
  logger.debug("metrics enrollments: fetched active classes", { allClasses: classesResult.data.length, courseId })
  const relevantClasses = classesResult.data.filter((c) => c.course?.sourcedId === courseId)
  const relevantClassIds = new Set(relevantClasses.map((c) => c.sourcedId))
  logger.debug("metrics enrollments: filtered relevant classes", { relevantClasses: relevantClasses.length })
  const classIdToSchoolId = new Map<string, string | undefined>()
  for (const cls of relevantClasses) {
    classIdToSchoolId.set(cls.sourcedId, cls.school?.sourcedId)
  }
  logger.debug("metrics enrollments: class to school map built", { mappedClasses: classIdToSchoolId.size })

  if (relevantClassIds.size === 0) {
    return { users: [], totals: { totalEnrolled: 0, totalStudentsOnly: 0 } }
  }

  const enrollmentsResult = await errors.try(
    oneroster.getAllEnrollments({ filter: "status='active'" })
  )
  if (enrollmentsResult.error) {
    logger.error("metrics enrollments: failed to fetch enrollments", { error: enrollmentsResult.error })
    throw errors.wrap(enrollmentsResult.error, "enrollments fetch")
  }
  logger.debug("metrics enrollments: fetched active enrollments", { allEnrollments: enrollmentsResult.data.length })

  const userIdToEnrollmentRoles = new Map<string, Set<string>>()
  const userIdToSchoolIdsFromClasses = new Map<string, Set<string>>()
  for (const e of enrollmentsResult.data) {
    if (!relevantClassIds.has(e.class.sourcedId)) continue
    const set = userIdToEnrollmentRoles.get(e.user.sourcedId) || new Set<string>()
    set.add(e.role)
    userIdToEnrollmentRoles.set(e.user.sourcedId, set)

    // Track school ids for the user's relevant enrollments
    const sset = userIdToSchoolIdsFromClasses.get(e.user.sourcedId) || new Set<string>()
    const schoolId = classIdToSchoolId.get(e.class.sourcedId)
    if (schoolId) sset.add(schoolId)
    userIdToSchoolIdsFromClasses.set(e.user.sourcedId, sset)
  }

  const uniqueUserIds = Array.from(userIdToEnrollmentRoles.keys())
  logger.debug("metrics enrollments: unique users found in course enrollments", { userCount: uniqueUserIds.length })

  // Fetch global roles for each user with small concurrency cap
  const userDetails = new Map<string, { email?: string; roles: string[]; roleOrgIds: string[] }>()
  const CONCURRENCY = Math.min(24, Math.max(4, uniqueUserIds.length))
  logger.debug("metrics enrollments: starting user detail fetch", { concurrency: CONCURRENCY })
  let idx = 0
  async function worker() {
    while (true) {
      const i = idx++
      if (i >= uniqueUserIds.length) return
      const userId = uniqueUserIds[i]
      if (!userId) continue
      const usersResult = await errors.try(
        oneroster.getAllUsers({ filter: `sourcedId='${userId}'` })
      )
      if (usersResult.error) {
        logger.warn("metrics enrollments: failed to fetch user", { userId, error: usersResult.error })
        continue
      }
      const user = usersResult.data[0]
      if (!user) continue
      const globalRoles = Array.isArray(user.roles) ? user.roles.map((r) => r.role) : []
      const roleOrgIds: string[] = Array.isArray(user.roles)
        ? user.roles
            .map((r) => r.org?.sourcedId)
            .filter((v): v is string => typeof v === "string" && v.length > 0)
        : []
      userDetails.set(userId, { email: user.email ?? undefined, roles: globalRoles, roleOrgIds })
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, uniqueUserIds.length) }, () => worker())
  await Promise.all(workers)
  logger.debug("metrics enrollments: user details populated", { populatedUsers: userDetails.size })

  // Determine total XP possible for the course from OneRoster course metadata.metrics.totalXp
  let totalCourseXP = 0
  const courseResult = await errors.try(oneroster.getCourse(courseId))
  if (courseResult.error) {
    logger.error("metrics enrollments: failed to fetch course for totalXP", { courseId, error: courseResult.error })
    throw errors.wrap(courseResult.error, "course fetch")
  }
  const meta = courseResult.data?.metadata
  if (meta && typeof meta === "object") {
    const MetricsSchema = z.object({ metrics: z.object({ totalXp: z.union([z.number(), z.string()]) }).partial().optional() }).passthrough()
    const parsed = MetricsSchema.safeParse(meta)
    if (parsed.success && parsed.data.metrics && parsed.data.metrics.totalXp !== undefined) {
      const raw = parsed.data.metrics.totalXp as unknown
      const num = typeof raw === "number" ? raw : Number(raw)
      if (!Number.isNaN(num) && num > 0) totalCourseXP = num
    }
  }
  logger.debug("metrics enrollments: resolved course total XP", { courseId, totalCourseXP })

  // Helper to derive display name from email
  function deriveNameFromEmail(email?: string): string | undefined {
    if (!email) return undefined
    const local = email.split("@")[0] || ""
    if (!local) return undefined
    const parts = local.replace(/[._-]+/g, " ").split(" ").filter(Boolean)
    if (parts.length === 0) return undefined
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
  }

  // Aggregate earned XP per user via assessment results
  async function fetchEarnedXPForUser(userSourcedId: string): Promise<number> {
    const resultsResponse = await errors.try(
      oneroster.getAllResults({ filter: `student.sourcedId='${userSourcedId}'` })
    )
    if (resultsResponse.error) {
      logger.warn("metrics enrollments: failed to fetch results for user", { userId: userSourcedId, error: resultsResponse.error })
      return 0
    }
    const allCount = resultsResponse.data.length
    const latestByLineItem = new Map<string, { scoreDateMs: number; xp: number }>()
    let considered = 0
    let mismatchedCourse = 0
    let zeroOrInvalidXp = 0
    for (const result of resultsResponse.data) {
      const lineItemId = result.assessmentLineItem?.sourcedId
      if (typeof lineItemId !== "string" || !lineItemId.endsWith("_ali")) continue
      if (result.scoreStatus !== "fully graded") continue
      const MetaSchema = z.object({ xp: z.union([z.number(), z.string()]).optional(), courseSourcedId: z.string().optional() }).passthrough()
      const parsedMeta = MetaSchema.safeParse(result.metadata)
      let xpValue = 0
      if (parsedMeta.success) {
        const raw = parsedMeta.data.xp
        xpValue = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : 0
        if (Number.isNaN(xpValue)) xpValue = 0
      }
      const metaCourseId = parsedMeta.success && typeof parsedMeta.data.courseSourcedId === "string" ? parsedMeta.data.courseSourcedId : ""
      if (metaCourseId !== courseId) { mismatchedCourse++; continue }
      if (xpValue <= 0) { zeroOrInvalidXp++; continue }
      considered++
      const scoreDateMs = new Date(result.scoreDate || 0).getTime()
      const existing = latestByLineItem.get(lineItemId)
      if (!existing || scoreDateMs > existing.scoreDateMs) {
        latestByLineItem.set(lineItemId, { scoreDateMs, xp: xpValue })
      }
    }
    const total = Array.from(latestByLineItem.values()).reduce((sum, v) => sum + v.xp, 0)
    logger.debug("metrics enrollments: user xp aggregation", {
      userId: userSourcedId,
      resultsAll: allCount,
      resultsConsidered: considered,
      mismatchedCourse,
      zeroOrInvalidXp,
      aggregatedXp: total
    })
    return total
  }

  // Build users list, filter to student-only
  const users: CourseEnrollmentUser[] = []
  let totalStudentsOnly = 0
  // Pre-collect all org ids from roles to resolve names once
  const allRoleOrgIds = new Set<string>()
  for (const userId of uniqueUserIds) {
    const detail = userDetails.get(userId) || { email: undefined, roles: [], roleOrgIds: [] }
    for (const oid of detail.roleOrgIds) allRoleOrgIds.add(oid)
  }
  // Resolve org names for role org ids
  const orgIdToName = new Map<string, string>()
  const orgIds = Array.from(allRoleOrgIds)
  let orgIdx = 0
  const ORG_CONCURRENCY = Math.min(16, Math.max(2, orgIds.length))
  logger.debug("metrics enrollments: resolving org names", { orgCount: orgIds.length, concurrency: ORG_CONCURRENCY })
  async function orgWorker() {
    while (true) {
      const i = orgIdx++
      if (i >= orgIds.length) return
      const id = orgIds[i]
      if (!id) continue
      const orgResult = await errors.try(oneroster.getOrg(id))
      if (orgResult.error) {
        logger.warn("metrics enrollments: failed to fetch org", { orgId: id, error: orgResult.error })
        continue
      }
      const name = orgResult.data?.name
      if (typeof name === "string" && name.length > 0) orgIdToName.set(id, name)
    }
  }
  await Promise.all(Array.from({ length: Math.min(ORG_CONCURRENCY, orgIds.length) }, () => orgWorker()))
  logger.debug("metrics enrollments: resolved org names summary", { resolved: orgIdToName.size, unresolved: orgIds.length - orgIdToName.size })

  // Compute XP per user with concurrency (only student-only set)
  const SPECIAL_STUDENT_EMAIL = "ameer.alnseirat@superbuilders.school"
  const studentOnlyUserIds = uniqueUserIds.filter((uid) => {
    const detail = userDetails.get(uid) || { email: undefined, roles: [] as string[], roleOrgIds: [] as string[] }
    
    // Special case: always include this specific user
    if (detail.email && detail.email.toLowerCase() === SPECIAL_STUDENT_EMAIL.toLowerCase()) {
      return true
    }
    
    if (detail.roles.length === 0) return false
    const isStudent = detail.roles.every((r) => r === "student")
    if (!isStudent) return false
    const emailLower = (detail.email || "").toLowerCase()
    if (emailLower.endsWith("@superbuilders.school") || emailLower.endsWith("@gmail.com")) return false
    return true
  })
  logger.debug("metrics enrollments: student-only user subset", { count: studentOnlyUserIds.length })

  let xpIdx = 0
  const xpResults = new Map<string, number>()
  const XP_CONCURRENCY = Math.min(24, Math.max(4, studentOnlyUserIds.length))
  logger.debug("metrics enrollments: starting XP aggregation", { concurrency: XP_CONCURRENCY })
  async function xpWorker() {
    while (true) {
      const i = xpIdx++
      if (i >= studentOnlyUserIds.length) return
      const userId = studentOnlyUserIds[i]
      if (!userId) continue
      const earnedXP = await fetchEarnedXPForUser(userId)
      xpResults.set(userId, earnedXP)
    }
  }
  await Promise.all(Array.from({ length: XP_CONCURRENCY }, () => xpWorker()))

  for (const userId of uniqueUserIds) {
    const enrollmentRoles = Array.from(userIdToEnrollmentRoles.get(userId) || new Set<string>())
    const detail = userDetails.get(userId) || { email: undefined, roles: [], roleOrgIds: [] }
    
    // Special case: always include this specific user
    const emailLower = (detail.email || "").toLowerCase()
    const isSpecialUser = emailLower === SPECIAL_STUDENT_EMAIL.toLowerCase()
    
    let isStudentOnly = detail.roles.length > 0 && detail.roles.every((r) => r === "student")
    if (isStudentOnly && !isSpecialUser && (emailLower.endsWith("@superbuilders.school") || emailLower.endsWith("@gmail.com"))) {
      isStudentOnly = false
    }
    
    // Include if special user OR regular student
    if (!isSpecialUser && !isStudentOnly) {
      continue
    }
    totalStudentsOnly++
    const roleOrgNames = detail.roleOrgIds.map((id) => orgIdToName.get(id)).filter((v): v is string => typeof v === "string" && v.length > 0)
    const classSchoolNames = Array.from(userIdToSchoolIdsFromClasses.get(userId) || new Set<string>())
      .map((id) => orgIdToName.get(id))
      .filter((v): v is string => typeof v === "string" && v.length > 0)
    const schoolNames = Array.from(new Set([...(roleOrgNames || []), ...(classSchoolNames || [])]))
    const earnedXP = Math.max(0, xpResults.get(userId) ?? 0)
    const percentComplete = totalCourseXP > 0 ? Math.min(100, Math.round((earnedXP / totalCourseXP) * 100)) : 0
    users.push({
      userId,
      email: detail.email,
      displayName: deriveNameFromEmail(detail.email),
      enrollmentRoles,
      globalRoles: detail.roles,
      isStudentOnly,
      schoolNames,
      earnedXP,
      percentComplete
    })
  }

  return {
    users,
    totals: {
      totalEnrolled: users.length,
      totalStudentsOnly
    }
  }
}, ["metrics-enrollments-v4", courseId], { revalidate: 60 * 5 })
}

export type StrugglingExercise = {
  exerciseId: string
  exerciseTitle: string
  exercisePath: string
  attemptsToMaster: number
  masteryAccuracy: number
  firstAttemptAt?: string
  masteredAt?: string
  caseId?: string // CASE learning objective ID if available
}

export type StudentCourseProgress = {
  courseId: string
  courseTitle: string
  percentComplete: number
  earnedXP: number
}

export type StrugglingStudent = {
  userId: string
  email?: string
  displayName?: string
  strugglingExercises: StrugglingExercise[]
  courseProgress?: StudentCourseProgress[]
}

export type StrugglingStudentsData = {
  students: StrugglingStudent[]
  lastUpdated: string
  nextUpdate: string
}

export async function getStrugglingStudents(metricsCoursesIds?: string[]): Promise<StrugglingStudentsData> {
  const cacheDays = 3
  const cacheHours = cacheDays * 24  // 3 days = 72 hours
  
  const cachedData = await redisCache(async () => {
    const now = new Date()
    const nextUpdate = new Date(now.getTime() + cacheHours * 60 * 60 * 1000)
    logger.info("metrics: fetching struggling students data", { metricsCoursesIds })
    
    // Get student-only users (same logic as getCourseEnrollments)
    const enrollmentsResult = await errors.try(
      oneroster.getAllEnrollments({ filter: "status='active'" })
    )
    if (enrollmentsResult.error) {
      logger.error("metrics struggling: failed to fetch enrollments", { error: enrollmentsResult.error })
      throw errors.wrap(enrollmentsResult.error, "enrollments fetch")
    }
    
    const uniqueUserIds = Array.from(
      new Set(enrollmentsResult.data.map((e) => e.user?.sourcedId).filter((v): v is string => typeof v === "string" && v.length > 0))
    )
    
    // Fetch user details to filter for students
    const userDetails = new Map<string, { email?: string; roles: string[] }>()
    const CONCURRENCY = Math.min(24, Math.max(4, uniqueUserIds.length))
    let idx = 0
    async function userWorker() {
      while (true) {
        const i = idx++
        if (i >= uniqueUserIds.length) return
        const userId = uniqueUserIds[i]
        if (!userId) continue
        const usersResult = await errors.try(
          oneroster.getAllUsers({ filter: `sourcedId='${userId}'` })
        )
        if (usersResult.error) {
          logger.warn("metrics struggling: failed to fetch user", { userId, error: usersResult.error })
          continue
        }
        const user = usersResult.data[0]
        if (!user) continue
        const roles = Array.isArray(user.roles) ? user.roles.map((r) => r.role) : []
        userDetails.set(userId, { email: user.email ?? undefined, roles })
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, uniqueUserIds.length) }, () => userWorker()))
    
    // Filter to student-only users (with special exception)
    const SPECIAL_STUDENT_EMAIL = "ameer.alnseirat@superbuilders.school"
    const studentOnlyUserIds = uniqueUserIds.filter((uid) => {
      const detail = userDetails.get(uid) || { email: undefined, roles: [] as string[] }
      
      // Special case: always include this specific user
      if (detail.email && detail.email.toLowerCase() === SPECIAL_STUDENT_EMAIL.toLowerCase()) {
        logger.debug("metrics struggling: including special user", { userId: uid, email: detail.email, roles: detail.roles })
        return true
      }
      
      if (detail.roles.length === 0) return false
      const isStudent = detail.roles.every((r) => r === "student")
      if (!isStudent) return false
      const emailLower = (detail.email || "").toLowerCase()
      if (emailLower.endsWith("@superbuilders.school") || emailLower.endsWith("@gmail.com")) return false
      return true
    })
    
    logger.debug("metrics struggling: student-only users", { count: studentOnlyUserIds.length })
    
    // Helper to derive display name from email
    function deriveNameFromEmail(email?: string): string | undefined {
      if (!email) return undefined
      const local = email.split("@")[0] || ""
      if (!local) return undefined
      const parts = local.replace(/[._-]+/g, " ").split(" ").filter(Boolean)
      if (parts.length === 0) return undefined
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
    }
    
    // Helper to extract attempt number
    function getAttemptNumber(result: { sourcedId: string; metadata?: Record<string, unknown> }): number | undefined {
      const meta = result.metadata as Record<string, unknown> | undefined
      const metaAttempt = typeof meta?.attempt === "number" ? meta.attempt : undefined
      if (typeof metaAttempt === "number" && Number.isInteger(metaAttempt) && metaAttempt > 0) {
        return metaAttempt
      }
      const match = result.sourcedId.match(/_attempt_(\d+)$/)
      if (match) {
        const parsed = Number.parseInt(match[1]!, 10)
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed
        }
      }
      return undefined
    }
    
    // Helper to parse exercise id from line item
    function getExerciseIdFromLineItemId(lineItemSourcedId: string): string | undefined {
      if (!lineItemSourcedId.startsWith("nice_") || !lineItemSourcedId.endsWith("_ali")) return undefined
      return lineItemSourcedId.slice("nice_".length, -"_ali".length)
    }
    
    const strugglingStudents: StrugglingStudent[] = []
    const exerciseIdsToResolve = new Set<string>()
    
    // Process each student's results
    let studentIdx = 0
    const STUDENT_CONCURRENCY = Math.min(16, Math.max(2, studentOnlyUserIds.length))
    async function studentWorker() {
      while (true) {
        const i = studentIdx++
        if (i >= studentOnlyUserIds.length) return
        const userId = studentOnlyUserIds[i]
        if (!userId) continue
        
        const resultsResponse = await errors.try(
          oneroster.getAllResults({ filter: `student.sourcedId='${userId}'` })
        )
        if (resultsResponse.error) {
          logger.warn("metrics struggling: failed to fetch results", { userId, error: resultsResponse.error })
          continue
        }
        
        const results = resultsResponse.data
        if (!Array.isArray(results) || results.length === 0) continue
        
        // Group by exercise id
        const byExercise = new Map<string, Array<{ attempt: number; accuracy: number; xp: number; dateMs: number }>>()
        for (const r of results) {
          if (r.scoreStatus !== "fully graded") continue
          const lineItemId = r.assessmentLineItem?.sourcedId
          if (typeof lineItemId !== "string" || !lineItemId.endsWith("_ali")) continue
          
          const exerciseId = getExerciseIdFromLineItemId(lineItemId)
          if (!exerciseId) continue
          
          const attempt = getAttemptNumber(r)
          if (typeof attempt !== "number") continue
          
          const meta = r.metadata as Record<string, unknown> | undefined
          const lessonType = typeof meta?.lessonType === "string" ? meta.lessonType.toLowerCase() : ""
          if (lessonType !== "exercise") continue
          
          const accuracy = typeof meta?.accuracy === "number" ? meta.accuracy : 
                          typeof meta?.accuracy === "string" ? Number(meta.accuracy) : 0
          const xp = typeof meta?.xp === "number" ? meta.xp : 
                    typeof meta?.xp === "string" ? Number(meta.xp) : 0
          const dateMs = new Date(r.scoreDate || 0).getTime()
          
          const list = byExercise.get(exerciseId) || []
          list.push({ attempt, accuracy, xp, dateMs })
          byExercise.set(exerciseId, list)
        }
        
        const strugglingExercises: StrugglingExercise[] = []
        for (const [exerciseId, attempts] of byExercise) {
          // Sort by attempt number
          attempts.sort((a, b) => a.attempt - b.attempt)
          
          // Find first mastery attempt (>= 80 accuracy)
          const mastery = attempts.find((a) => a.accuracy >= 80)
          if (!mastery) continue
          if (mastery.attempt < 4) continue
          
          // Sum total XP across all attempts
          const totalXp = attempts.reduce((sum, a) => sum + (Number.isFinite(a.xp) ? a.xp : 0), 0)
          if (totalXp !== 0) continue
          
          const firstDateMs = attempts.length > 0 ? Math.min(...attempts.map((a) => a.dateMs || 0)) : 0
          const masteredDateMs = mastery.dateMs || 0
          
          strugglingExercises.push({
            exerciseId,
            exerciseTitle: "", // Will be resolved later
            exercisePath: "", // Will be resolved later
            attemptsToMaster: mastery.attempt,
            masteryAccuracy: Math.round(mastery.accuracy),
            firstAttemptAt: firstDateMs > 0 ? new Date(firstDateMs).toISOString() : undefined,
            masteredAt: masteredDateMs > 0 ? new Date(masteredDateMs).toISOString() : undefined,
            caseId: undefined // Will be resolved later
          })
          exerciseIdsToResolve.add(exerciseId)
        }
        
        if (strugglingExercises.length > 0) {
          const detail = userDetails.get(userId)
          strugglingStudents.push({
            userId,
            email: detail?.email,
            displayName: deriveNameFromEmail(detail?.email),
            strugglingExercises
          })
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(STUDENT_CONCURRENCY, studentOnlyUserIds.length) }, () => studentWorker()))
    
    logger.debug("metrics struggling: students with struggling exercises", { count: strugglingStudents.length })
    
    // Resolve exercise titles and CASE IDs from OneRoster
    const exerciseTitles = new Map<string, { title: string; path: string; caseId?: string }>()
    const exerciseIds = Array.from(exerciseIdsToResolve)
    let exerciseIdx = 0
    const EXERCISE_CONCURRENCY = Math.min(16, Math.max(2, exerciseIds.length))
    async function exerciseWorker() {
      while (true) {
        const i = exerciseIdx++
        if (i >= exerciseIds.length) return
        const exerciseId = exerciseIds[i]
        if (!exerciseId) continue
        
        const resourceId = `nice_${exerciseId}`
        const resourceResult = await errors.try(oneroster.getResource(resourceId))
        if (resourceResult.error) {
          logger.warn("metrics struggling: failed to fetch exercise resource", { exerciseId, error: resourceResult.error })
          continue
        }
        
        const resource = resourceResult.data
        if (!resource) continue
        
        const metadata = resource.metadata as Record<string, unknown> | undefined
        const path = typeof metadata?.path === "string" ? metadata.path : ""
        
        // Extract CASE ID from vendorId if available
        let caseId: string | undefined
        if (resource.vendorId && typeof resource.vendorId === "string") {
          // vendorId might contain the CASE ID
          caseId = resource.vendorId
        } else if (metadata?.caseId && typeof metadata.caseId === "string") {
          caseId = metadata.caseId
        } else if (metadata?.learningObjectiveId && typeof metadata.learningObjectiveId === "string") {
          caseId = metadata.learningObjectiveId
        }
        
        exerciseTitles.set(exerciseId, { title: resource.title, path, caseId })
      }
    }
    await Promise.all(Array.from({ length: Math.min(EXERCISE_CONCURRENCY, exerciseIds.length) }, () => exerciseWorker()))
    
    // Update exercise titles, paths, and CASE IDs
    for (const student of strugglingStudents) {
      for (const exercise of student.strugglingExercises) {
        const meta = exerciseTitles.get(exercise.exerciseId)
        if (meta) {
          exercise.exerciseTitle = meta.title
          exercise.exercisePath = meta.path
          exercise.caseId = meta.caseId
        }
      }
    }
    
    // Fetch course enrollments and progress for each struggling student
    logger.debug("metrics struggling: fetching course progress for students")
    
    // Get all courses first
    const coursesResult = await errors.try(oneroster.getAllCourses({ filter: "status='active'" }))
    if (coursesResult.error) {
      logger.warn("metrics struggling: failed to fetch courses", { error: coursesResult.error })
    }
    const courseMap = new Map<string, string>()
    if (!coursesResult.error) {
      for (const course of coursesResult.data) {
        courseMap.set(course.sourcedId, course.title)
      }
    }
    
    // Get enrollments to find which courses each student is in
    const userCourseEnrollments = new Map<string, Set<string>>()
    for (const enrollment of enrollmentsResult.data) {
      if (!enrollment.user?.sourcedId || !enrollment.class?.sourcedId) continue
      // Only track student enrollments
      if (enrollment.role !== "student") continue
      const userSet = userCourseEnrollments.get(enrollment.user.sourcedId) || new Set<string>()
      userSet.add(enrollment.class.sourcedId)
      userCourseEnrollments.set(enrollment.user.sourcedId, userSet)
    }
    
    logger.debug("metrics struggling: enrollment mapping", {
      totalEnrollments: enrollmentsResult.data.length,
      studentEnrollments: userCourseEnrollments.size,
      sampleUsers: Array.from(userCourseEnrollments.keys()).slice(0, 5)
    })
    
    // Get classes to map to courses
    const classesResult = await errors.try(oneroster.getAllClasses({ filter: "status='active'" }))
    const classToCourse = new Map<string, string>()
    if (!classesResult.error) {
      for (const cls of classesResult.data) {
        if (cls.course?.sourcedId) {
          classToCourse.set(cls.sourcedId, cls.course.sourcedId)
        }
      }
    }
    
    // Fetch course XP totals for metrics courses only
    const courseTotalXpMap = new Map<string, number>()
    const relevantCourseIds = metricsCoursesIds || []
    
    for (const courseId of relevantCourseIds) {
      const courseResult = await errors.try(oneroster.getCourse(courseId))
      if (!courseResult.error && courseResult.data?.metadata) {
        const meta = courseResult.data.metadata
        if (typeof meta === "object" && meta && "metrics" in meta) {
          const metrics = meta.metrics as any
          if (metrics && typeof metrics.totalXp === "number") {
            courseTotalXpMap.set(courseId, metrics.totalXp)
          }
        }
      }
    }
    
    // Process each struggling student
    for (const student of strugglingStudents) {
      const courseProgress: StudentCourseProgress[] = []
      const userClasses = userCourseEnrollments.get(student.userId) || new Set<string>()
      const userCourses = new Set<string>()
      
      // Map classes to courses
      for (const classId of userClasses) {
        const courseId = classToCourse.get(classId)
        if (courseId && relevantCourseIds.includes(courseId)) {
          userCourses.add(courseId)
        }
      }
      
      // Fetch results once for this student
      const resultsResponse = await errors.try(
        oneroster.getAllResults({ filter: `student.sourcedId='${student.userId}'` })
      )
      
      // Calculate progress for each metrics course the student is enrolled in
      for (const courseId of userCourses) {
        const courseTitle = courseMap.get(courseId) || "Unknown Course"
        const totalCourseXP = courseTotalXpMap.get(courseId) || 0
        
        let earnedXP = 0
        if (!resultsResponse.error) {
          const latestByLineItem = new Map<string, { scoreDateMs: number; xp: number }>()
          for (const result of resultsResponse.data) {
            const lineItemId = result.assessmentLineItem?.sourcedId
            if (typeof lineItemId !== "string" || !lineItemId.endsWith("_ali")) continue
            if (result.scoreStatus !== "fully graded") continue
            
            const meta = result.metadata as Record<string, unknown> | undefined
            const metaCourseId = typeof meta?.courseSourcedId === "string" ? meta.courseSourcedId : ""
            if (metaCourseId !== courseId) continue
            
            let xpValue = 0
            if (meta && typeof meta.xp === "number") {
              xpValue = meta.xp
            } else if (meta && typeof meta.xp === "string") {
              xpValue = Number(meta.xp) || 0
            }
            if (xpValue <= 0) continue
            
            const scoreDateMs = new Date(result.scoreDate || 0).getTime()
            const existing = latestByLineItem.get(lineItemId)
            if (!existing || scoreDateMs > existing.scoreDateMs) {
              latestByLineItem.set(lineItemId, { scoreDateMs, xp: xpValue })
            }
          }
          earnedXP = Array.from(latestByLineItem.values()).reduce((sum, v) => sum + v.xp, 0)
        }
        
        const percentComplete = totalCourseXP > 0 ? Math.min(100, Math.round((earnedXP / totalCourseXP) * 100)) : 0
        
        courseProgress.push({
          courseId,
          courseTitle,
          percentComplete,
          earnedXP
        })
      }
      
      student.courseProgress = courseProgress
      
      logger.debug("metrics struggling: student course progress final", {
        userId: student.userId,
        email: student.email,
        coursesCount: courseProgress.length,
        courses: courseProgress.map(c => `${c.courseTitle} (${c.percentComplete}%)`)
      })
    }
    
    // Sort students by number of struggling exercises (desc)
    strugglingStudents.sort((a, b) => b.strugglingExercises.length - a.strugglingExercises.length)
    
    logger.info("metrics struggling: data fetched", { 
      totalStudents: strugglingStudents.length,
      totalExercises: exerciseIdsToResolve.size,
      totalEnrollments: enrollmentsResult.data.length,
      totalClasses: classesResult.error ? 0 : classesResult.data.length,
      totalCourses: courseMap.size
    })
    
    // Return the data with timestamps included in the cached object
    return {
      students: strugglingStudents,
      lastUpdated: now.toISOString(),
      nextUpdate: nextUpdate.toISOString()
    }
  }, ["metrics-struggling-students-v5", metricsCoursesIds?.join(",") || ""], { revalidate: 60 * 60 * cacheHours})
  
  return cachedData
}


