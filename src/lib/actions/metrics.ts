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
  const studentOnlyUserIds = uniqueUserIds.filter((uid) => {
    const detail = userDetails.get(uid) || { email: undefined, roles: [] as string[], roleOrgIds: [] as string[] }
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
    let isStudentOnly = detail.roles.length > 0 && detail.roles.every((r) => r === "student")
    const emailLower = (detail.email || "").toLowerCase()
    if (isStudentOnly && (emailLower.endsWith("@superbuilders.school") || emailLower.endsWith("@gmail.com"))) {
      isStudentOnly = false
    }
    if (!isStudentOnly) {
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
}, ["metrics-enrollments-v3", courseId], { revalidate: 60 * 5 })
}


