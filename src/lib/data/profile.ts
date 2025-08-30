import { clerkClient, currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { oneroster } from "@/lib/clients"
import { getActiveEnrollmentsForUser, getClass, getCourse, getUnitsForCourses } from "@/lib/data/fetchers/oneroster"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { CourseMetadataSchema } from "@/lib/metadata/oneroster"
import type { Lesson, ProfileCourse, Quiz, Unit, UnitTest } from "@/lib/types/domain"
import type { ProfileCoursesPageData } from "@/lib/types/page"
import { getResourceIdFromLineItem } from "@/lib/utils/assessment-line-items"
import type { ClassReadSchemaType } from "../oneroster"

// NEW: Interface for unit proficiency tracking
export interface UnitProficiency {
	unitId: string
	proficiencyPercentage: number
	proficientExercises: number
	totalExercises: number
}

function removeNiceAcademyPrefix(title: string): string {
	const prefix = "Nice Academy - "
	if (title.startsWith(prefix)) {
		return title.substring(prefix.length).trim()
	}
	return title
}

/**
 * Deprecated: Caliper-based XP aggregation. Kept temporarily for reference.
 */
/* async function fetchCourseEarnedXP(actorId: string, courseSlug: string): Promise<number> {
	logger.debug("fetching earned XP for course", { actorId, courseSlug })

	const eventsResult = await errors.try(getAllEventsForUser(actorId))
	if (eventsResult.error) {
		logger.error("failed to fetch caliper events for course XP", {
			actorId,
			courseSlug,
			error: eventsResult.error
		})
		return 0
	}

	const events = eventsResult.data
	let totalEarnedXP = 0

	// Debug: Log all unique course names found in events
	const uniqueCourseNames = new Set<string>()
	for (const event of events) {
		if (event.object.course?.name) {
			uniqueCourseNames.add(event.object.course.name)
		}
	}
	logger.debug("unique course names found in Caliper events", {
		uniqueCourseNames: Array.from(uniqueCourseNames),
		targetCourseSlug: courseSlug,
		totalEvents: events.length
	})

	// Filter events for this specific course using slug matching
	const courseEvents = events.filter((event: z.infer<typeof CaliperEventSchema>) => {
		// Match by course slug in the event object
		const eventCourseSlug = event.object.course?.name
		if (!eventCourseSlug) return false

		// Direct slug comparison (no prefix removal needed for slugs)
		const matches = eventCourseSlug === courseSlug

		logger.debug("comparing course slugs", {
			eventCourseSlug,
			targetCourseSlug: courseSlug,
			matches
		})

		return matches
	})

	// Sum XP from completed activities in this course
	for (const event of courseEvents) {
		if (event.action === "Completed") {
			const xpEarnedItem = event.generated.items.find((item) => item.type === "xpEarned")
			const xpEarned = xpEarnedItem?.value ?? 0

			// Only count positive XP (not penalties)
			if (xpEarned > 0) {
				totalEarnedXP += xpEarned
			}

			logger.debug("found completed event with XP", {
				eventId: event.id,
				activityName: event.object.activity?.name,
				xpEarned,
				totalEarnedXP
			})
		}
	}

	logger.debug("calculated earned XP for course", {
		actorId,
		courseSlug,
		totalEarnedXP,
		courseEventsCount: courseEvents.length,
		completedEventsCount: courseEvents.filter((e) => e.action === "Completed").length
	})

	return totalEarnedXP
} */

/**
 * NEW: Sums earned XP from OneRoster assessment results for a given student and course.
 * We read fully graded results for the student within the course and sum positive `metadata.xp`.
 * Only assessment line items using the new `_ali` convention are considered.
 */
async function fetchCourseEarnedXPFromResults(userSourcedId: string, courseSourcedId: string): Promise<number> {
	logger.debug("fetching earned XP from results", { userSourcedId, courseSourcedId })

	const resultsResponse = await errors.try(
		oneroster.getAllResults({
			// Filter by student and by assessment line items that belong to this course.
			// The API does not support direct course filter on results, so we fetch all for the student
			// and filter client-side by course sourced id embedded in metadata.
			filter: `student.sourcedId='${userSourcedId}'`
		})
	)

	if (resultsResponse.error) {
		logger.error("failed to fetch assessment results for earned XP", {
			userSourcedId,
			courseSourcedId,
			error: resultsResponse.error
		})
		return 0
	}

	// Keep only the newest fully graded result per assessment line item
	const latestByLineItem = new Map<string, { scoreDateMs: number; xp: number }>()

	for (const result of resultsResponse.data) {
		const lineItemId = result.assessmentLineItem?.sourcedId
		if (typeof lineItemId !== "string" || !lineItemId.endsWith("_ali")) continue
		if (result.scoreStatus !== "fully graded") continue

		const MetaSchema = z.object({ xp: z.number().optional(), courseSourcedId: z.string().optional() }).passthrough()
		const parsedMeta = MetaSchema.safeParse(result.metadata)
		const xpValue = parsedMeta.success && typeof parsedMeta.data.xp === "number" ? parsedMeta.data.xp : 0
		const metaCourseId =
			parsedMeta.success && typeof parsedMeta.data.courseSourcedId === "string" ? parsedMeta.data.courseSourcedId : ""
		if (metaCourseId !== courseSourcedId || xpValue <= 0) continue

		const scoreDateMs = new Date(result.scoreDate || 0).getTime()
		const existing = latestByLineItem.get(lineItemId)
		if (!existing || scoreDateMs > existing.scoreDateMs) {
			latestByLineItem.set(lineItemId, { scoreDateMs, xp: xpValue })
		}
	}

	const totalEarnedXP = Array.from(latestByLineItem.values()).reduce((sum, v) => sum + v.xp, 0)

	logger.debug("calculated earned XP from results", { userSourcedId, courseSourcedId, totalEarnedXP })

	return totalEarnedXP
}

/**
 * Calculates total possible XP for a course by fetching from our local database
 * Uses the same XP calculation logic as fetchCoursePageData
 */
async function fetchCourseTotalXP(courseSourcedId: string): Promise<number> {
	logger.debug("calculating total XP for course from local database", { courseSourcedId })

	// Import the course data fetching function
	const { fetchCoursePageData } = await import("@/lib/data/course")
	const { CourseMetadataSchema } = await import("@/lib/metadata/oneroster")
	const { getCourse } = await import("@/lib/data/fetchers/oneroster")

	// First get the course metadata to extract the subject and course slugs
	const courseResult = await errors.try(getCourse(courseSourcedId))
	if (courseResult.error) {
		logger.error("failed to fetch course metadata for XP calculation", {
			courseSourcedId,
			error: courseResult.error
		})
		return 0
	}

	const course = courseResult.data
	if (!course) {
		logger.error("course not found for XP calculation", { courseSourcedId })
		return 0
	}

	// Validate course metadata with Zod
	const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
	if (!courseMetadataResult.success) {
		logger.error("invalid course metadata for XP calculation", {
			courseSourcedId,
			error: courseMetadataResult.error
		})
		return 0
	}
	const courseMetadata = courseMetadataResult.data

	// Use the course metadata to fetch detailed course data with XP
	const coursePageDataResult = await errors.try(
		fetchCoursePageData(
			{
				subject: courseMetadata.khanSubjectSlug,
				course: courseMetadata.khanSlug
			},
			{ skip: { questions: true } }
		)
	)
	if (coursePageDataResult.error) {
		logger.error("failed to fetch course page data for XP calculation", {
			courseSourcedId,
			subject: courseMetadata.khanSubjectSlug,
			courseSlug: courseMetadata.khanSlug,
			error: coursePageDataResult.error
		})
		return 0
	}

	const totalXP = coursePageDataResult.data.totalXP

	logger.debug("calculated total XP for course from local database", {
		courseSourcedId,
		totalXP,
		subject: courseMetadata.khanSubjectSlug,
		courseSlug: courseMetadata.khanSlug
	})

	return totalXP
}

/**
 * Fetches unit proficiency data for a user across all units in a course.
 * Only exercises, quizzes, and unit tests with 100% scores count as "proficient".
 *
 * @param userSourcedId - The user's OneRoster sourcedId
 * @param courseData - The complete course data with units and their content
 * @returns Array of unit proficiency percentages
 */
async function fetchUnitProficiencies(
	userSourcedId: string,
	courseData: { units: Unit[] }
): Promise<UnitProficiency[]> {
	logger.info("🎯 STARTING fetchUnitProficiencies", { userSourcedId, unitCount: courseData.units.length })

	// Get all assessment results for this user
	// We'll filter client-side to only include new '_ali' format line items
	const resultsResponse = await errors.try(
		oneroster.getAllResults({
			filter: `student.sourcedId='${userSourcedId}'`
		})
	)
	if (resultsResponse.error) {
		logger.error("failed to fetch assessment results for proficiency calculation", {
			userSourcedId,
			error: resultsResponse.error
		})
		// Return empty proficiencies rather than failing - graceful degradation
		return courseData.units.map((unit) => ({
			unitId: unit.id,
			proficiencyPercentage: 0,
			proficientExercises: 0,
			totalExercises: 0
		}))
	}

	// Create a map of resourceId -> assessment result for quick lookup
	// Only process results with new '_ali' format line items
	const resultsMap = new Map<string, { score: number; isFullyGraded: boolean }>()
	for (const result of resultsResponse.data) {
		// Skip results from old assessment line items (without '_ali' suffix)
		if (!result.assessmentLineItem.sourcedId.endsWith("_ali")) {
			continue
		}

		if (result.scoreStatus === "fully graded" && typeof result.score === "number") {
			const resourceId = getResourceIdFromLineItem(result.assessmentLineItem.sourcedId)
			const normalizedScore = result.score <= 1.1 ? result.score * 100 : result.score
			resultsMap.set(resourceId, {
				score: normalizedScore,
				isFullyGraded: true
			})
		}
	}

	logger.debug("processed assessment results", {
		userSourcedId,
		totalResults: resultsResponse.data.length,
		fullyGradedResults: resultsMap.size
	})

	// Calculate proficiency for each unit
	const unitProficiencies: UnitProficiency[] = []

	for (const unit of courseData.units) {
		const assessableContentIds: string[] = []

		logger.info("🔍 Processing unit for proficiency", {
			unitId: unit.id,
			unitTitle: unit.title,
			childrenCount: unit.children.length,
			childrenTypes: unit.children.map((c) => c.type)
		})

		// Collect all assessable content IDs from this unit
		for (const child of unit.children) {
			if (child.type === "Lesson") {
				logger.debug("Processing lesson", {
					lessonId: child.id,
					lessonTitle: child.title,
					contentCount: child.children.length,
					contentTypes: child.children.map((c) => c.type)
				})
				// Add exercises from within lessons
				for (const content of child.children) {
					if (content.type === "Exercise") {
						assessableContentIds.push(content.id)
						logger.debug("Found exercise in lesson", {
							exerciseId: content.id,
							exerciseTitle: content.title,
							lessonTitle: child.title
						})
					}
				}
			} else if (child.type === "Quiz" || child.type === "UnitTest") {
				// Add unit-level quizzes and tests
				assessableContentIds.push(child.id)
				logger.debug("Found unit-level assessment", {
					assessmentId: child.id,
					assessmentTitle: child.title,
					assessmentType: child.type
				})
			}
		}

		// Count how many of these assessable items the user has completed with 100% score
		let proficientCount = 0
		logger.debug("Checking proficiency for assessable content", {
			unitTitle: unit.title,
			assessableContentIds,
			totalAssessable: assessableContentIds.length,
			availableResultIds: Array.from(resultsMap.keys()).slice(0, 10) // First 10 for brevity
		})

		for (const contentId of assessableContentIds) {
			const result = resultsMap.get(contentId)
			if (result?.isFullyGraded && result.score >= 100) {
				proficientCount++
				logger.debug("Found proficient result", {
					contentId,
					score: result.score,
					unitTitle: unit.title
				})
			} else if (result) {
				logger.debug("Found non-proficient result", {
					contentId,
					score: result.score,
					isFullyGraded: result.isFullyGraded,
					unitTitle: unit.title
				})
			}
		}

		// Calculate proficiency percentage
		const proficiencyPercentage =
			assessableContentIds.length > 0 ? Math.round((proficientCount / assessableContentIds.length) * 100) : 0

		unitProficiencies.push({
			unitId: unit.id,
			proficiencyPercentage,
			proficientExercises: proficientCount,
			totalExercises: assessableContentIds.length
		})

		logger.debug("calculated unit proficiency", {
			unitId: unit.id,
			unitTitle: unit.title,
			proficiencyPercentage,
			proficientCount,
			totalAssessable: assessableContentIds.length
		})
	}

	logger.info("🏁 COMPLETED unit proficiency calculation", {
		userSourcedId,
		unitCount: unitProficiencies.length,
		averageProficiency:
			unitProficiencies.length > 0
				? Math.round(
						unitProficiencies.reduce((sum, up) => sum + up.proficiencyPercentage, 0) / unitProficiencies.length
					)
				: 0,
		proficiencies: unitProficiencies.map((up) => ({
			unitId: up.unitId,
			percentage: up.proficiencyPercentage,
			proficient: up.proficientExercises,
			total: up.totalExercises
		}))
	})

	return unitProficiencies
}

export async function fetchUserEnrolledCourses(userSourcedId: string): Promise<ProfileCourse[]> {
	// Fetch active enrollments for the user
	const enrollmentsResult = await errors.try(getActiveEnrollmentsForUser(userSourcedId))
	if (enrollmentsResult.error) {
		logger.error("failed to fetch user enrollments", { error: enrollmentsResult.error, userSourcedId })
		throw errors.wrap(enrollmentsResult.error, "user enrollments: unable to retrieve")
	}

	if (enrollmentsResult.data.length === 0) {
		return []
	}

	// Extract unique class IDs from enrollments
	const classSourcedIds = [...new Set(enrollmentsResult.data.map((enrollment) => enrollment.class.sourcedId))]

	const classPromises = classSourcedIds.map(async (classSourcedId) => {
		const classResult = await errors.try(getClass(classSourcedId))
		if (classResult.error) {
			logger.error("failed to fetch class details", { error: classResult.error, classSourcedId })
			return null
		}
		return classResult.data
	})

	const classResults = await Promise.all(classPromises)
	const classes = classResults.filter((c): c is ClassReadSchemaType => c !== null)

	const courseSourcedIds = [...new Set(classes.map((c) => c.course.sourcedId))]
	const unitsByCourseSourcedId = new Map<string, Unit[]>()

	if (courseSourcedIds.length > 0) {
		// Fetch all components and resources for building unit hierarchy
		const [allUnitsResult, allResourcesResult] = await Promise.all([
			errors.try(getUnitsForCourses(courseSourcedIds)),
			import("@/lib/data/fetchers/oneroster").then(({ getAllResources }) => errors.try(getAllResources()))
		])

		if (allUnitsResult.error) {
			logger.error("failed to fetch units for enrolled courses", { error: allUnitsResult.error, courseSourcedIds })
		} else if (allResourcesResult.error) {
			logger.error("failed to fetch resources for enrolled courses", { error: allResourcesResult.error })
		} else {
			// Import required schemas and functions
			const { ComponentMetadataSchema, ResourceMetadataSchema } = await import("@/lib/metadata/oneroster")
			const { getAllComponentResources } = await import("@/lib/data/fetchers/oneroster")

			const allComponents = allUnitsResult.data
			const allResources = allResourcesResult.data

			// Get component-resource mappings
			const componentResourcesResult = await errors.try(getAllComponentResources())
			if (componentResourcesResult.error) {
				logger.error("failed to fetch component resources", { error: componentResourcesResult.error })
				throw errors.wrap(componentResourcesResult.error, "component resources unavailable")
			}
			const componentResources = componentResourcesResult.data

			// Process each course separately
			for (const courseSourcedId of courseSourcedIds) {
				const courseComponents = allComponents.filter((c) => c.course.sourcedId === courseSourcedId)
				const courseComponentResources = componentResources.filter((cr) =>
					courseComponents.some((c) => c.sourcedId === cr.courseComponent.sourcedId)
				)

				// Build units and lessons maps for this course
				const units: Unit[] = []

				// Temporary interfaces for building hierarchy with sortOrder
				interface TempExercise {
					type: "Exercise"
					id: string
					title: string
					path: string
					sortOrder: number
				}

				interface TempLesson extends Omit<Lesson, "children"> {
					children: TempExercise[]
					sortOrder?: number
				}

				interface TempAssessment {
					type: "Quiz" | "UnitTest"
					id: string
					title: string
					path: string
					sortOrder: number
				}

				const lessonsByUnitSourcedId = new Map<string, TempLesson[]>()

				// First pass: identify units and lessons
				for (const component of courseComponents) {
					const componentMetadataResult = ComponentMetadataSchema.safeParse(component.metadata)
					if (!componentMetadataResult.success) {
						logger.error("invalid component metadata for enrolled course", {
							componentSourcedId: component.sourcedId,
							error: componentMetadataResult.error
						})
						continue
					}
					const componentMetadata = componentMetadataResult.data

					if (!component.parent) {
						// This is a unit - skip course challenges
						if (componentMetadata.khanSlug === "course-challenge") {
							continue
						}

						units.push({
							id: component.sourcedId,
							title: component.title,
							path: "", // Will be set later
							ordering: component.sortOrder,
							description: componentMetadata.khanDescription,
							slug: componentMetadata.khanSlug,
							children: [] // Will be populated
						})
					} else {
						// This is a lesson
						const parentSourcedId = component.parent.sourcedId
						if (!lessonsByUnitSourcedId.has(parentSourcedId)) {
							lessonsByUnitSourcedId.set(parentSourcedId, [])
						}

						lessonsByUnitSourcedId.get(parentSourcedId)?.push({
							type: "Lesson",
							id: component.sourcedId,
							componentResourceSourcedId: component.sourcedId, // For lessons in profile, use component sourcedId
							slug: componentMetadata.khanSlug,
							title: component.title,
							description: componentMetadata.khanDescription,
							path: "", // Will be set later
							children: [], // Will be populated with exercises
							ordering: 0, // Default ordering value
							xp: 0
						})
					}
				}

				// Second pass: populate lessons with exercises and unit-level assessments
				for (const unit of units) {
					const unitLessons = lessonsByUnitSourcedId.get(unit.id) || []
					const unitAssessments: TempAssessment[] = []

					// Find resources for this unit, its lessons, and its child components (quizzes/tests)
					// Build a set of all child component IDs under this unit (lessons and assessment components)
					const unitChildComponentIds = new Set<string>([
						...unitLessons.map((l) => l.id),
						...courseComponents.filter((c) => c.parent && c.parent.sourcedId === unit.id).map((c) => c.sourcedId)
					])

					const unitComponentResources = courseComponentResources.filter((cr) => {
						const componentId = cr.courseComponent.sourcedId
						return componentId === unit.id || unitChildComponentIds.has(componentId)
					})

					// Process each resource
					for (const componentResource of unitComponentResources) {
						const resource = allResources.find((r) => r.sourcedId === componentResource.resource.sourcedId)
						if (!resource) continue

						const resourceMetadataResult = ResourceMetadataSchema.safeParse(resource.metadata)
						if (!resourceMetadataResult.success) continue

						const resourceMetadata = resourceMetadataResult.data

						// Check if this is an assessable resource (exercise, quiz, or test)
						if (resourceMetadata.khanActivityType === "UnitTest" || resourceMetadata.khanActivityType === "Quiz") {
							// With the new structure, quizzes/tests live under their own components (children of the unit)
							// Since unitComponentResources already scopes to the unit and its children, we can add directly
							if (resourceMetadata.khanActivityType === "UnitTest") {
								unitAssessments.push({
									type: "UnitTest",
									id: resource.sourcedId,
									title: resource.title,
									path: "", // Will be set later
									sortOrder: componentResource.sortOrder
								})
							} else if (resourceMetadata.khanActivityType === "Quiz") {
								unitAssessments.push({
									type: "Quiz",
									id: resource.sourcedId,
									title: resource.title,
									path: "", // Will be set later
									sortOrder: componentResource.sortOrder
								})
							}
						} else if (resourceMetadata.khanActivityType === "Exercise") {
							// This is a lesson-level exercise
							const lesson = unitLessons.find((l) => l.id === componentResource.courseComponent.sourcedId)
							if (lesson) {
								// Only exercises count as assessable within lessons
								lesson.children.push({
									type: "Exercise",
									id: resource.sourcedId,
									title: resource.title,
									path: "", // Will be set later
									sortOrder: componentResource.sortOrder
								})
							}
						}
					}

					// Sort lesson children by sortOrder
					for (const lesson of unitLessons) {
						lesson.children.sort((a, b) => a.sortOrder - b.sortOrder)
					}

					// Combine lessons and assessments, sort by sortOrder
					const allUnitChildren = [
						...unitLessons.map((lesson) => ({ ...lesson, sortOrder: lesson.sortOrder || 0 })),
						...unitAssessments
					].sort((a, b) => a.sortOrder - b.sortOrder)

					// Remove sortOrder and convert to proper domain types
					unit.children = allUnitChildren.map(({ sortOrder, ...child }) => {
						if (child.type === "Lesson") {
							const lesson: Lesson = {
								type: "Lesson",
								id: child.id,
								componentResourceSourcedId: child.id, // For profile lessons, use lesson id
								slug: child.slug,
								title: child.title,
								description: child.description,
								path: child.path,
								ordering: 0, // Default ordering value
								children: child.children.map(({ sortOrder: _, ...exercise }) => ({
									type: exercise.type,
									id: exercise.id,
									componentResourceSourcedId: exercise.id, // For profile exercises, use exercise id
									title: exercise.title,
									path: exercise.path,
									slug: "", // Not needed for proficiency calculation
									description: "",
									totalQuestions: 5, // Default value
									questionsToPass: 4, // Default value
									ordering: 0, // Default ordering value
									xp: 0
								})),
								xp: child.xp
							}
							return lesson
						}
						if (child.type === "Quiz") {
							const quiz: Quiz = {
								type: "Quiz",
								id: child.id,
								componentResourceSourcedId: child.id, // For profile quizzes, use quiz id
								title: child.title,
								path: child.path,
								slug: "",
								description: "",
								questions: [], // Not needed for proficiency calculation
								ordering: 0, // Default ordering value
								xp: 0
							}
							return quiz
						}

						// UnitTest case
						const unitTest: UnitTest = {
							type: "UnitTest",
							id: child.id,
							componentResourceSourcedId: child.id, // For profile unit tests, use test id
							title: child.title,
							path: child.path,
							slug: "",
							description: "",
							questions: [], // Not needed for proficiency calculation
							ordering: 0, // Default ordering value
							xp: 0
						}
						return unitTest
					})
				}

				// Sort units by ordering
				units.sort((a, b) => a.ordering - b.ordering)

				unitsByCourseSourcedId.set(courseSourcedId, units)
			}
		}
	}

	// Map to ProfileCourse format and attach units
	const courses: ProfileCourse[] = []

	for (const cls of classes) {
		const courseUnits = unitsByCourseSourcedId.get(cls.course.sourcedId)
		if (!courseUnits) {
			logger.error("CRITICAL: No units found for course", {
				courseSourcedId: cls.course.sourcedId,
				classSourcedId: cls.sourcedId
			})
			throw errors.new("course units: required data missing")
		}

		// Fetch course metadata for the ProfileCourse
		const courseResult = await errors.try(getCourse(cls.course.sourcedId))
		if (courseResult.error) {
			logger.error("failed to fetch course metadata", {
				courseSourcedId: cls.course.sourcedId,
				error: courseResult.error
			})
			continue // Skip this course
		}

		const course = courseResult.data
		if (!course) {
			logger.error("course data is undefined", { courseSourcedId: cls.course.sourcedId })
			continue // Skip this course
		}

		// Validate course metadata with Zod
		const courseMetadataResult = CourseMetadataSchema.safeParse(course.metadata)
		if (!courseMetadataResult.success) {
			logger.warn("skipping course with invalid metadata for enrolled user", {
				courseSourcedId: course.sourcedId,
				userSourcedId,
				error: courseMetadataResult.error,
				metadata: course.metadata
			})
			continue // Skip this course instead of throwing
		}
		const courseMetadata = courseMetadataResult.data

		// Use the actual subject slug from the course metadata
		const subject = courseMetadata.khanSubjectSlug

		// Now update unit paths with the course slug
		const unitsWithCorrectPaths = courseUnits.map((unit) => ({
			...unit,
			path: `/${subject}/${courseMetadata.khanSlug}/${unit.slug}`
		}))

		courses.push({
			id: course.sourcedId,
			title: removeNiceAcademyPrefix(course.title),
			description: courseMetadata.khanDescription,
			path: `/${subject}/${courseMetadata.khanSlug}`, // Construct path from slugs
			units: unitsWithCorrectPaths
		})
	}

	return courses
}

export async function fetchProfileCoursesData(): Promise<ProfileCoursesPageData> {
	// dynamic opt-in is handled at the page level
	// Cannot use "use cache" here because currentUser() accesses dynamic headers
	const user = await currentUser()
	if (!user) {
		logger.error("user not authenticated")
		throw errors.new("user not authenticated")
	}

	// Normalize and validate metadata deterministically (no brittle string checks)
	const parsedMetadata = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
	if (!parsedMetadata.success) {
		logger.error("CRITICAL: invalid user metadata structure", {
			userId: user.id,
			error: parsedMetadata.error
		})
		throw errors.wrap(parsedMetadata.error, "user metadata validation failed")
	}

	const normalizedMetadata = parsedMetadata.data

	// Persist normalized shape back to Clerk on first encounter (idempotent)
	let needsNormalization = false
	const raw = user.publicMetadata
	const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null
	function getProp(v: unknown, key: string): unknown {
		if (!isRecord(v)) return undefined
		const rec: Record<string, unknown> = v
		return rec[key]
	}
	if (!isRecord(raw)) {
		needsNormalization = true
	} else {
		if (typeof getProp(raw, "nickname") !== "string") needsNormalization = true
		if (typeof getProp(raw, "username") !== "string") needsNormalization = true
		if (typeof getProp(raw, "bio") !== "string") needsNormalization = true

		const streakValue = getProp(raw, "streak")
		if (!isRecord(streakValue)) {
			needsNormalization = true
		} else {
			const lad = getProp(streakValue, "lastActivityDate")
			if (!(lad === null || lad === undefined || typeof lad === "string")) {
				needsNormalization = true
			}
			const cnt = getProp(streakValue, "count")
			if (!(cnt === undefined || typeof cnt === "number")) {
				needsNormalization = true
			}
		}

		const sid = getProp(raw, "sourceId")
		if (!(sid === undefined || typeof sid === "string")) {
			needsNormalization = true
		}
	}

	if (needsNormalization) {
		const clerk = await clerkClient()
		const updateResult = await errors.try(
			clerk.users.updateUserMetadata(user.id, { publicMetadata: normalizedMetadata })
		)
		if (updateResult.error) {
			logger.error("failed to normalize user metadata", { userId: user.id, error: updateResult.error })
			throw errors.wrap(updateResult.error, "metadata normalization failed")
		}
		logger.info("normalized user public metadata", { userId: user.id })
	}

	const metadata = normalizedMetadata

	// Import from actions since that's where the function is defined (from upstream)
	const { getOneRosterCoursesForExplore } = await import("@/lib/actions/courses")

	// Get available subjects for explore dropdown
	const subjectsPromise = getOneRosterCoursesForExplore()

	// sourceId is optional - users without it simply have no enrolled courses yet
	if (!metadata.sourceId) {
		logger.info("user has no sourceId yet, returning empty enrolled courses", { userId: user.id })
		const subjects = await subjectsPromise
		return { subjects, userCourses: [], needsSync: true }
	}
	const sourceId = metadata.sourceId

	// Get user's enrolled courses
	const userCoursesPromise = fetchUserEnrolledCourses(sourceId)

	const [subjects, userCourses] = await Promise.all([subjectsPromise, userCoursesPromise])

	logger.info("fetching XP data for user courses", {
		userId: user.id,
		sourceId,
		courseCount: userCourses.length
	})

	const userCoursesWithXP = await Promise.all(
		userCourses.map(async (course) => {
			// Extract course slug from path (e.g., "/math/early-math" -> "early-math")
			const courseSlug = course.path.split("/").pop()
			if (!courseSlug) {
				logger.error("failed to extract course slug from path", {
					courseId: course.id,
					coursePath: course.path
				})
				return { ...course, earnedXP: 0, totalXP: 0, unitProficiencies: [] }
			}

			// Switch to results-based XP aggregation instead of Caliper events.
			const [earnedXP, totalXP, unitProficiencies] = await Promise.all([
				fetchCourseEarnedXPFromResults(sourceId, course.id),
				fetchCourseTotalXP(course.id),
				fetchUnitProficiencies(sourceId, course)
			])

			return {
				...course,
				earnedXP,
				totalXP,
				unitProficiencies
			}
		})
	)

	logger.info("XP data fetched for user courses", {
		userId: user.id,
		courseCount: userCoursesWithXP.length,
		totalEarnedXP: userCoursesWithXP.reduce((sum, course) => sum + (course.earnedXP ?? 0), 0),
		totalPossibleXP: userCoursesWithXP.reduce((sum, course) => sum + (course.totalXP ?? 0), 0)
	})

	return { subjects, userCourses: userCoursesWithXP }
}

export async function fetchProfileCoursesDataWithUser(sourceId: string): Promise<ProfileCoursesPageData> {
	// Import from actions since that's where the function is defined (from upstream)
	const { getOneRosterCoursesForExplore } = await import("@/lib/actions/courses")

	const subjectsPromise = getOneRosterCoursesForExplore()
	const userCoursesPromise = fetchUserEnrolledCourses(sourceId)

	const [subjects, userCourses] = await Promise.all([subjectsPromise, userCoursesPromise])

	return { subjects, userCourses }
}
