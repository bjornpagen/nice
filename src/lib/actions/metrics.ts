"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

export type CourseEnrollmentUser = {
  userId: string
  email?: string
  enrollmentRoles: string[]
  globalRoles: string[]
  isStudentOnly: boolean
  schoolId?: string
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

  const classesResult = await errors.try(
    oneroster.getAllClasses({ filter: "status='active'" })
  )
  if (classesResult.error) {
    logger.error("metrics enrollments: failed to fetch classes", { error: classesResult.error })
    throw errors.wrap(classesResult.error, "classes fetch")
  }
  const relevantClasses = classesResult.data.filter((c) => c.course?.sourcedId === courseId)
  const relevantClassIds = new Set(relevantClasses.map((c) => c.sourcedId))
  const classIdToSchoolId = new Map<string, string | undefined>()
  for (const cls of relevantClasses) {
    classIdToSchoolId.set(cls.sourcedId, cls.school?.sourcedId)
  }

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

  const userIdToEnrollmentRoles = new Map<string, Set<string>>()
  const userIdToSchoolIds = new Map<string, Set<string>>()
  for (const e of enrollmentsResult.data) {
    if (!relevantClassIds.has(e.class.sourcedId)) continue
    const set = userIdToEnrollmentRoles.get(e.user.sourcedId) || new Set<string>()
    set.add(e.role)
    userIdToEnrollmentRoles.set(e.user.sourcedId, set)

    // Track school ids for the user's relevant enrollments
    const sset = userIdToSchoolIds.get(e.user.sourcedId) || new Set<string>()
    const schoolId = classIdToSchoolId.get(e.class.sourcedId)
    if (schoolId) sset.add(schoolId)
    userIdToSchoolIds.set(e.user.sourcedId, sset)
  }

  const uniqueUserIds = Array.from(userIdToEnrollmentRoles.keys())

  // Fetch global roles for each user with small concurrency cap
  const userDetails = new Map<string, { email?: string; roles: string[] }>()
  const CONCURRENCY = 8
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
      userDetails.set(userId, { email: user.email ?? undefined, roles: globalRoles })
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, uniqueUserIds.length) }, () => worker())
  await Promise.all(workers)

  const users: CourseEnrollmentUser[] = []
  let totalStudentsOnly = 0
  for (const userId of uniqueUserIds) {
    const enrollmentRoles = Array.from(userIdToEnrollmentRoles.get(userId) || new Set<string>())
    const detail = userDetails.get(userId) || { email: undefined, roles: [] }
    const globalRoles = detail.roles
    let isStudentOnly = globalRoles.length > 0 && globalRoles.every((r) => r === "student")
    const emailLower = (detail.email || "").toLowerCase()
    // Exclusions: internal and gmail-only students
    if (isStudentOnly && (emailLower.endsWith("@superbuilders.school") || emailLower.endsWith("@gmail.com"))) {
      isStudentOnly = false
    }
    if (isStudentOnly) totalStudentsOnly++

    const schoolIds = Array.from(userIdToSchoolIds.get(userId) || new Set<string>())
    const schoolId = schoolIds[0]
    users.push({
      userId,
      email: detail.email,
      enrollmentRoles,
      globalRoles,
      isStudentOnly,
      schoolId
    })
  }

  return {
    users,
    totals: {
      totalEnrolled: uniqueUserIds.length,
      totalStudentsOnly
    }
  }
}


