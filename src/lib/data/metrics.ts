import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { caliper, oneroster } from "@/lib/clients"
import type { CourseReadSchemaType } from "@/lib/oneroster"
import { constructActorId } from "@/lib/utils/actor-id"

export type MetricsDateRange = { fromIso: string; toIso: string }

export type UserMetricsSummary = {
	userId: string
	email?: string
	lastActivityIso?: string
	xp: number
	timeActiveSeconds: number
}

export type CourseMetrics = {
	courseId: string
	title: string
	activeEnrollments: number
	xpTotal: number
	timeActiveSeconds: number
	users: UserMetricsSummary[]
}

function isNiceId(id: string): boolean {
	return typeof id === "string" && id.startsWith("nice_")
}

function clampToRange(tsIso: string, range: MetricsDateRange): boolean {
	const t = Date.parse(tsIso)
	return t >= Date.parse(range.fromIso) && t <= Date.parse(range.toIso)
}

async function fetchNiceCourses(): Promise<Pick<CourseReadSchemaType, "sourcedId" | "title">[]> {
	// Fetch all active courses and filter client-side for nice_ prefix
	// OneRoster's LIKE filter may not be working as expected
	const courses = await oneroster.getAllCourses({ filter: "status='active'" })
	const niceCourses = courses.filter((c) => c.sourcedId.startsWith("nice_"))
	logger.info("filtered nice courses", {
		totalCourses: courses.length,
		niceCourses: niceCourses.length,
		sampleIds: niceCourses.slice(0, 5).map((c) => c.sourcedId)
	})
	return niceCourses.map((c) => ({ sourcedId: c.sourcedId, title: c.title }))
}

async function buildClassToCourseMapFromEnrollments(
	enrollments: Array<{ userId: string; classId: string }>
): Promise<Map<string, string>> {
	const uniqueClassIds = Array.from(new Set(enrollments.map((e) => e.classId)))
	const map = new Map<string, string>()
	const CONCURRENCY = 10
	let idx = 0
	async function worker() {
		while (true) {
			const i = idx++
			if (i >= uniqueClassIds.length) return
			const classId = uniqueClassIds[i]
			if (!classId) continue
			const cls = await oneroster.getClass(classId)
			if (!cls) continue
			const courseId = cls.course?.sourcedId
			if (courseId && isNiceId(courseId)) {
				map.set(classId, courseId)
			}
		}
	}
	const workers = Array.from({ length: Math.min(CONCURRENCY, uniqueClassIds.length) }, () => worker())
	await Promise.all(workers)
	return map
}

async function fetchActiveStudentEnrollments(): Promise<Array<{ userId: string; classId: string }>> {
	const enrollments = await oneroster.getAllEnrollments({ filter: "status='active'" })
	return enrollments
		.filter((e) => e.role === "student")
		.map((e) => ({ userId: e.user.sourcedId, classId: e.class.sourcedId }))
}

async function fetchUserEmails(userIds: string[]): Promise<Map<string, string>> {
	const emailMap = new Map<string, string>()
	if (userIds.length === 0) return emailMap

	// Fetch all users once and create a lookup map
	const result = await errors.try(oneroster.getAllUsers())
	if (result.error) {
		logger.warn("failed to fetch all users for email lookup", { error: result.error })
		// Fallback: use userIds as emails
		for (const userId of userIds) {
			emailMap.set(userId, userId)
		}
		return emailMap
	}

	// Create a map of userId -> email
	const userLookup = new Map<string, string>()
	for (const user of result.data) {
		const email = user.email || user.username || user.sourcedId
		userLookup.set(user.sourcedId, email)
	}

	// Build the result map for requested userIds
	for (const userId of userIds) {
		const email = userLookup.get(userId) || userId
		emailMap.set(userId, email)
	}

	logger.info("fetched user emails", { requested: userIds.length, found: emailMap.size })
	return emailMap
}

function buildEnrollmentIndex(
	enrollments: Array<{ userId: string; classId: string }>,
	classToCourse: Map<string, string>
): Map<string, Set<string>> {
	const byCourse = new Map<string, Set<string>>()
	for (const e of enrollments) {
		const courseId = classToCourse.get(e.classId)
		if (!courseId) continue
		let set = byCourse.get(courseId)
		if (!set) {
			set = new Set<string>()
			byCourse.set(courseId, set)
		}
		set.add(e.userId)
	}
	return byCourse
}

async function fetchCaliperAggForUsers(
	userIds: string[],
	range: MetricsDateRange
): Promise<Map<string, { xp: number; timeActiveSeconds: number; lastActivityIso?: string }>> {
	const out = new Map<string, { xp: number; timeActiveSeconds: number; lastActivityIso?: string }>()

	// Simple concurrency cap to avoid overwhelming the Caliper service
	const CONCURRENCY = 5
	let idx = 0
	async function worker() {
		while (true) {
			const i = idx++
			if (i >= userIds.length) return
			const userId = userIds[i]
			if (!userId) continue
			const actorId = constructActorId(userId)
			const events = await caliper.getEvents(actorId)

			let xp = 0
			let time = 0
			let lastIso: string | undefined

			for (const ev of events) {
				const ts: string | undefined = "eventTime" in ev ? ev.eventTime : undefined
				if (!ts || !clampToRange(ts, range)) continue
				if (!lastIso || Date.parse(ts) > Date.parse(lastIso)) lastIso = ts

				if (ev.type === "TimeSpentEvent") {
					const items = ev.generated?.items ?? []
					for (const item of items) {
						if (item.type === "active" && typeof item.value === "number") {
							time += item.value
						}
					}
				} else if (ev.type === "ActivityEvent") {
					const items = ev.generated?.items ?? []
					for (const item of items) {
						if (item.type === "xpEarned" && typeof item.value === "number") {
							xp += item.value
						}
					}
				}
			}

			if (userId) {
				out.set(userId, { xp, timeActiveSeconds: time, lastActivityIso: lastIso })
			}
		}
	}
	const workers = Array.from({ length: Math.min(CONCURRENCY, userIds.length) }, () => worker())
	await Promise.all(workers)
	return out
}

export async function getCourseMetrics(opts: { courseId: string; range: MetricsDateRange }): Promise<CourseMetrics> {
	logger.info("metrics: fetching course metrics", {
		courseId: opts.courseId,
		from: opts.range.fromIso,
		to: opts.range.toIso
	})

	const [courses, allEnrollments] = await Promise.all([fetchNiceCourses(), fetchActiveStudentEnrollments()])

	const classToCourse = await buildClassToCourseMapFromEnrollments(allEnrollments)

	const courseTitle = courses.find((c) => c.sourcedId === opts.courseId)?.title || ""

	const enrollIndex = buildEnrollmentIndex(allEnrollments, classToCourse)
	const enrolledUsers = Array.from(enrollIndex.get(opts.courseId) || new Set<string>())
	const activeEnrollments = enrolledUsers.length

	const [caliperAgg, emailMap] = await Promise.all([
		fetchCaliperAggForUsers(enrolledUsers, opts.range),
		fetchUserEmails(enrolledUsers)
	])

	let xpTotal = 0
	let timeTotal = 0
	const users: UserMetricsSummary[] = []

	for (const userId of enrolledUsers) {
		const c = caliperAgg.get(userId) || { xp: 0, timeActiveSeconds: 0 }
		users.push({
			userId,
			email: emailMap.get(userId),
			xp: c.xp,
			timeActiveSeconds: c.timeActiveSeconds,
			lastActivityIso: c.lastActivityIso
		})
		xpTotal += c.xp
		timeTotal += c.timeActiveSeconds
	}

	return {
		courseId: opts.courseId,
		title: courseTitle,
		activeEnrollments,
		xpTotal,
		timeActiveSeconds: timeTotal,
		users
	}
}

export async function getAllCourseMetrics(range: MetricsDateRange): Promise<CourseMetrics[]> {
	logger.info("metrics: fetching nice courses and related data")

	// Step 1: Fetch only nice_ courses directly
	const niceCourses = await fetchNiceCourses()
	logger.info("metrics: found nice courses", { count: niceCourses.length })

	if (niceCourses.length === 0) {
		return []
	}

	// Step 2: Fetch all classes and filter to our courses
	const allClasses = await oneroster.getAllClasses({ filter: "status='active'" })
	const courseIdSet = new Set(niceCourses.map((c) => c.sourcedId))

	// Build mappings
	const classToCourse = new Map<string, string>()
	const courseToClasses = new Map<string, string[]>()
	const allClassIds: string[] = []

	for (const cls of allClasses) {
		const courseId = cls.course?.sourcedId
		if (courseId && courseIdSet.has(courseId)) {
			classToCourse.set(cls.sourcedId, courseId)
			allClassIds.push(cls.sourcedId)

			if (!courseToClasses.has(courseId)) {
				courseToClasses.set(courseId, [])
			}
			courseToClasses.get(courseId)?.push(cls.sourcedId)
		}
	}

	logger.info("metrics: mapped classes to courses", {
		totalClasses: allClassIds.length,
		coursesWithClasses: courseToClasses.size
	})

	// Step 3: Fetch enrollments
	const allEnrollments = await fetchActiveStudentEnrollments()

	// Step 4: Build enrollment index (filter to only our classes)
	const enrollIndex = new Map<string, Set<string>>()
	const relevantClassIds = new Set(allClassIds)

	logger.info("metrics: processing enrollments", {
		totalEnrollments: allEnrollments.length,
		relevantClasses: relevantClassIds.size,
		sampleClassIds: Array.from(relevantClassIds).slice(0, 5)
	})

	for (const enrollment of allEnrollments) {
		// Only process enrollments for classes that belong to nice_ courses
		if (!relevantClassIds.has(enrollment.classId)) continue

		const courseId = classToCourse.get(enrollment.classId)
		if (!courseId) continue

		if (!enrollIndex.has(courseId)) {
			enrollIndex.set(courseId, new Set())
		}
		enrollIndex.get(courseId)?.add(enrollment.userId)
	}

	// Get all unique user IDs from relevant enrollments
	const allUserIds = Array.from(new Set(Array.from(enrollIndex.values()).flatMap((s) => Array.from(s))))

	logger.info("metrics: found enrolled users", {
		userCount: allUserIds.length,
		coursesWithEnrollments: enrollIndex.size
	})

	// Step 5: Fetch Caliper aggregations and emails for all users
	const [caliperAgg, emailMap] = await Promise.all([
		fetchCaliperAggForUsers(allUserIds, range),
		fetchUserEmails(allUserIds)
	])

	// Step 6: Compute metrics for each course
	const out: CourseMetrics[] = []
	for (const course of niceCourses) {
		const courseId = course.sourcedId
		const title = course.title
		const enrolledUsers = Array.from(enrollIndex.get(courseId) || new Set<string>())
		const activeEnrollments = enrolledUsers.length

		// Skip courses with no enrollments
		if (activeEnrollments === 0) continue

		let xpTotal = 0
		let timeTotal = 0
		const users: UserMetricsSummary[] = []

		for (const userId of enrolledUsers) {
			const cAgg = caliperAgg.get(userId) || { xp: 0, timeActiveSeconds: 0 }
			users.push({
				userId,
				email: emailMap.get(userId),
				xp: cAgg.xp,
				timeActiveSeconds: cAgg.timeActiveSeconds,
				lastActivityIso: cAgg.lastActivityIso
			})
			xpTotal += cAgg.xp
			timeTotal += cAgg.timeActiveSeconds
		}

		out.push({
			courseId,
			title,
			activeEnrollments,
			xpTotal,
			timeActiveSeconds: timeTotal,
			users
		})
	}

	logger.info("metrics: computed metrics for courses", {
		totalCourses: niceCourses.length,
		coursesWithMetrics: out.length
	})

	return out
}
