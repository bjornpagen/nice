import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as crypto from "node:crypto"
import { eq, inArray, sql } from "drizzle-orm"
import { env } from "@/env"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import type { ParsedCoverage, ParsedUnit, ParsedLesson, ParsedContent } from "@/lib/parsers/coverage-markdown"
import { generateSlug } from "@/lib/parsers/coverage-markdown"
import { formatResourceTitleForDisplay } from "@/lib/utils/format-resource-title"

// OneRoster types (matching course.ts)
type GradeLevelNumber = number

interface OneRosterGUIDRef {
	sourcedId: string
	type: "course" | "academicSession" | "org" | "courseComponent" | "resource" | "term" | "district"
}

interface OneRosterCourse {
	sourcedId: string
	status: "active" | "tobedeleted"
	title: string
	subjects: string[]
	grades: GradeLevelNumber[]
	courseCode?: string
	org: OneRosterGUIDRef
	academicSession: OneRosterGUIDRef
	metadata?: Record<string, unknown>
}

interface OneRosterClass {
	sourcedId: string
	status: "active" | "tobedeleted"
	title: string
	classType: "scheduled"
	course: OneRosterGUIDRef
	school: OneRosterGUIDRef
	terms: OneRosterGUIDRef[]
}

interface OneRosterCourseComponent {
	sourcedId: string
	status: "active" | "tobedeleted"
	title: string
	course: OneRosterGUIDRef
	parent?: OneRosterGUIDRef
	sortOrder: number
	metadata?: Record<string, unknown>
}

interface OneRosterResource {
	sourcedId: string
	status: "active" | "tobedeleted"
	title: string
	vendorResourceId: string
	vendorId: string
	applicationId: string
	roles: string[]
	importance: "primary" | "secondary"
	metadata: Record<string, unknown>
}

interface OneRosterCourseComponentResource {
	sourcedId: string
	status: "active" | "tobedeleted"
	title: string
	courseComponent: OneRosterGUIDRef
	resource: OneRosterGUIDRef
	sortOrder: number
}

interface OneRosterAssessmentLineItem {
	sourcedId: string
	status: "active" | "tobedeleted"
	title: string
	componentResource?: {
		sourcedId: string
	}
	course: {
		sourcedId: string
	}
	metadata?: Record<string, unknown>
}

export interface SupplementaryPayload {
	course: OneRosterCourse
	class: OneRosterClass
	courseComponents: OneRosterCourseComponent[]
	resources: OneRosterResource[]
	componentResources: OneRosterCourseComponentResource[]
	assessmentLineItems: OneRosterAssessmentLineItem[]
}

// Constants
const ORG_SOURCED_ID = "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"
const ACADEMIC_SESSION_SOURCED_ID = "Academic_Year_2025-2026"

// Hardcoded XP values
const EXERCISE_XP = 2

// Helper to generate IDs
function generateId(): string {
	return `x${crypto.randomBytes(8).toString("hex")}`
}

// Helper to generate deterministic ID for YouTube videos
function generateYouTubeVideoId(youtubeId: string): string {
	// Create a deterministic hash from the YouTube ID
	const hash = crypto.createHash("sha256").update(youtubeId).digest("hex")
	// Take first 16 characters and prefix with 'x'
	return `x${hash.substring(0, 16)}`
}

// Helper to add Nice Academy prefix
function addNiceAcademyPrefix(title: string): string {
	const prefix = "Nice Academy - "
	if (!title.startsWith(prefix)) {
		return `${prefix}${title}`
	}
	return title
}

// Cache for CASE API lookups to avoid duplicate calls
const caseIdCache = new Map<string, string>()

// Helper to fetch CASE ID for a standard
async function fetchCaseIdForStandard(standard: string): Promise<string | null> {
	// Check cache first
	if (caseIdCache.has(standard)) {
		return caseIdCache.get(standard) ?? null
	}
	
	// Skip TEKS standards (Texas standards, not Common Core)
	if (standard.startsWith("TEKS") || standard.includes("TEKS")) {
		logger.debug("skipping TEKS standard", { standard })
		return null
	}
	
	// Skip empty or invalid standards
	if (!standard || standard === "") {
		return null
	}
	
	try {
		// Get OAuth token
		const tokenUrl = env.TIMEBACK_TOKEN_URL
		const clientId = env.TIMEBACK_CLIENT_ID
		const clientSecret = env.TIMEBACK_CLIENT_SECRET
		
		const tokenResponse = await fetch(tokenUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: new URLSearchParams({
				grant_type: "client_credentials",
				client_id: clientId,
				client_secret: clientSecret
			})
		})
		
		if (!tokenResponse.ok) {
			logger.error("failed to get oauth token", { 
				status: tokenResponse.status,
				standard 
			})
			return null
		}
		
		const tokenData = await tokenResponse.json() as { access_token: string }
		
		// Call CASE API
		const caseUrl = `${env.TIMEBACK_ONEROSTER_SERVER_URL}/ims/case/v1p1/CFItems?filter=humanCodingScheme%3D${encodeURIComponent(`'${standard}'`)}`
		
		const caseResponse = await fetch(caseUrl, {
			headers: {
				"Authorization": `Bearer ${tokenData.access_token}`,
				"Accept": "application/json"
			}
		})
		
		if (!caseResponse.ok) {
			logger.error("failed to fetch CASE data", { 
				status: caseResponse.status,
				standard 
			})
			return null
		}
		
		const caseData = await caseResponse.json() as { 
			CFItems: Array<{ sourcedId: string }> 
		}
		
		if (caseData.CFItems && caseData.CFItems.length > 0) {
			const caseId = caseData.CFItems[0]!.sourcedId
			caseIdCache.set(standard, caseId)
			logger.debug("fetched CASE ID", { standard, caseId })
			return caseId
		}
		
		logger.debug("no CASE ID found", { standard })
		return null
	} catch (error) {
		logger.error("error fetching CASE ID", { standard, error })
		return null
	}
}

// Helper to parse grade number
function parseGradeNumber(grade: string): GradeLevelNumber {
	// Extract number from strings like "6th", "7th", "8th", "6", "7", "8"
	const match = grade.match(/(\d+)/)
	if (match) {
		return Number.parseInt(match[1]!, 10)
	}
	logger.error("invalid grade format", { grade })
	throw errors.new(`invalid grade format: ${grade}`)
}

/**
 * Generate OneRoster payload from parsed coverage data
 */
export async function generateSupplementaryPayload(
	coverage: ParsedCoverage,
	courseTitle: string,
	courseSlug: string,
	courseDescription: string
): Promise<SupplementaryPayload> {
	logger.info("generating supplementary oneroster payload", { 
		grade: coverage.grade,
		courseSlug,
		unitCount: coverage.units.length 
	})
	
	// Validate environment
	if (!env.NEXT_PUBLIC_APP_DOMAIN || typeof env.NEXT_PUBLIC_APP_DOMAIN !== "string") {
		logger.error("CRITICAL: NEXT_PUBLIC_APP_DOMAIN is not configured", {
			NEXT_PUBLIC_APP_DOMAIN: env.NEXT_PUBLIC_APP_DOMAIN
		})
		throw errors.new("configuration: NEXT_PUBLIC_APP_DOMAIN is required")
	}
	const appDomain = env.NEXT_PUBLIC_APP_DOMAIN.replace(/\/$/, "")
	
	// Collect all content IDs by type for DB lookups
	const videoIds: string[] = []
	const exerciseIds: string[] = []
	
	for (const unit of coverage.units) {
		for (const lesson of unit.lessons) {
			for (const content of lesson.contents) {
				if (content.type === "Video" && content.id) {
					videoIds.push(content.id)
				} else if (content.type === "Exercise" && content.id) {
					exerciseIds.push(content.id)
				}
			}
		}
	}
	
	// Fetch canonical data from DB
	const videoMap = new Map<string, { 
		id: string
		slug: string
		title: string
		description: string | null
		youtubeId: string | null
		duration: number | null
	}>()
	
	const exerciseMap = new Map<string, {
		id: string
		slug: string
		title: string
		description: string | null
	}>()
	
	if (videoIds.length > 0) {
		const videosResult = await errors.try(
			db.select({
				id: schema.niceVideos.id,
				slug: schema.niceVideos.slug,
				title: schema.niceVideos.title,
				description: schema.niceVideos.description,
				youtubeId: schema.niceVideos.youtubeId,
				duration: schema.niceVideos.duration
			})
			.from(schema.niceVideos)
			.where(inArray(schema.niceVideos.id, videoIds))
		)
		if (videosResult.error) {
			logger.error("failed to fetch videos from DB", { error: videosResult.error })
			throw errors.wrap(videosResult.error, "fetch videos")
		}
		for (const video of videosResult.data) {
			videoMap.set(video.id, video)
		}
	}
	
	if (exerciseIds.length > 0) {
		const exercisesResult = await errors.try(
			db.select({
				id: schema.niceExercises.id,
				slug: schema.niceExercises.slug,
				title: schema.niceExercises.title,
				description: schema.niceExercises.description
			})
			.from(schema.niceExercises)
			.where(inArray(schema.niceExercises.id, exerciseIds))
		)
		if (exercisesResult.error) {
			logger.error("failed to fetch exercises from DB", { error: exercisesResult.error })
			throw errors.wrap(exercisesResult.error, "fetch exercises")
		}
		for (const exercise of exercisesResult.data) {
			exerciseMap.set(exercise.id, exercise)
		}
	}
	
	// Generate course ID
	const courseId = generateId()
	const coursePath = `/math/${courseSlug}`
	const gradeNumber = parseGradeNumber(coverage.grade)
	
	// Initialize payload
	const payload: SupplementaryPayload = {
		course: {
			sourcedId: `nice_${courseId}`,
			status: "active",
			title: addNiceAcademyPrefix(courseTitle),
			subjects: ["Math"],
			grades: [gradeNumber],
			courseCode: courseSlug,
			org: { sourcedId: ORG_SOURCED_ID, type: "district" },
			academicSession: { sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" },
			metadata: {
				timebackVisible: "true",
				primaryApp: "nice_academy",
				khanId: courseId,
				khanSlug: courseSlug,
				khanSubjectSlug: "math",
				khanTitle: courseTitle,
				khanDescription: courseDescription,
				AlphaLearn: {
					publishStatus: "active"
				}
			}
		},
		class: {
			sourcedId: `nice_${courseId}`,
			status: "active",
			title: addNiceAcademyPrefix(courseTitle),
			classType: "scheduled",
			course: { sourcedId: `nice_${courseId}`, type: "course" },
			school: { sourcedId: ORG_SOURCED_ID, type: "org" },
			terms: [{ sourcedId: ACADEMIC_SESSION_SOURCED_ID, type: "term" }]
		},
		courseComponents: [],
		resources: [],
		componentResources: [],
		assessmentLineItems: []
	}
	
	const resourceSet = new Set<string>()
	let totalXp = 0
	let totalLessons = 0
	
	// Process units
	for (let unitIndex = 0; unitIndex < coverage.units.length; unitIndex++) {
		const unit = coverage.units[unitIndex]!
		const unitId = generateId()
		const unitSlug = generateSlug(unit.title)
		const unitPath = `${coursePath}/${unitSlug}`
		
		// Add unit component
		payload.courseComponents.push({
			sourcedId: `nice_${unitId}`,
			status: "active",
			title: unit.title,
			course: { sourcedId: `nice_${courseId}`, type: "course" },
			sortOrder: unitIndex,
			metadata: {
				khanId: unitId,
				khanSlug: unitSlug,
				khanTitle: unit.title,
				khanDescription: `Unit covering ${unit.title}`
			}
		})
		
		// Process lessons
		for (let lessonIndex = 0; lessonIndex < unit.lessons.length; lessonIndex++) {
			const lesson = unit.lessons[lessonIndex]!
			const lessonId = generateId()
			const lessonSlug = generateSlug(lesson.title)
			const lessonPath = `${unitPath}/${lessonSlug}`
			
			// Skip lessons with no content
			if (lesson.contents.length === 0) {
				logger.debug("skipping empty lesson", { title: lesson.title })
				continue
			}
			
			// Add lesson component
			payload.courseComponents.push({
				sourcedId: `nice_${lessonId}`,
				status: "active",
				title: lesson.title,
				course: { sourcedId: `nice_${courseId}`, type: "course" },
				parent: { sourcedId: `nice_${unitId}`, type: "courseComponent" },
				sortOrder: lessonIndex,
				metadata: {
					khanId: lessonId,
					khanSlug: lessonSlug,
					khanTitle: lesson.title,
					khanDescription: `Lesson covering ${lesson.title}`
				}
			})
			
			// Track passive resources for XP banking
			const passiveResourcesForNextExercise: string[] = []
			
			// Process content items
			for (let contentIndex = 0; contentIndex < lesson.contents.length; contentIndex++) {
				const content = lesson.contents[contentIndex]!
				
				// Determine the resource ID based on content type
				let contentId: string
				let contentSlug: string
				let contentTitle: string
				let contentDescription: string | undefined
				
				if (content.type === "YT Video") {
					// For YT Videos, generate a deterministic ID from YouTube ID
					if (!content.id) {
						logger.error("YT Video missing YouTube ID", { title: content.title })
						throw errors.new("YT Video missing YouTube ID")
					}
					contentId = generateYouTubeVideoId(content.id)
					contentSlug = content.slug || content.id // Use YouTube ID as slug if not provided
					contentTitle = content.title
					contentDescription = content.description
				} else if (content.type === "Video") {
					// For regular videos, use DB data if available
					const dbVideo = videoMap.get(content.id)
					if (dbVideo) {
						contentId = dbVideo.id
						contentSlug = dbVideo.slug
						contentTitle = dbVideo.title
						contentDescription = dbVideo.description || undefined
					} else {
						// Fallback to coverage data if not in DB (shouldn't happen normally)
						logger.warn("Video not found in DB, using coverage data", { id: content.id })
						contentId = content.id
						contentSlug = content.slug
						contentTitle = content.title
						contentDescription = undefined
					}
				} else if (content.type === "Exercise") {
					// For exercises, use DB data if available
					const dbExercise = exerciseMap.get(content.id)
					if (dbExercise) {
						contentId = dbExercise.id
						contentSlug = dbExercise.slug
						contentTitle = dbExercise.title
						contentDescription = dbExercise.description || undefined
					} else {
						// Fallback to coverage data if not in DB (shouldn't happen normally)
						logger.warn("Exercise not found in DB, using coverage data", { id: content.id })
						contentId = content.id
						contentSlug = content.slug
						contentTitle = content.title
						contentDescription = undefined
					}
				} else {
					// Should never happen with current types
					logger.error("Unknown content type", { type: content.type })
					continue
				}
				
				const contentSourcedId = `nice_${contentId}`
				
				// Skip if we already have this resource
				if (!resourceSet.has(contentSourcedId)) {
					// Fetch CASE ID for the standard
					const caseId = await fetchCaseIdForStandard(content.standard)
					let xp = 0
					let metadata: Record<string, unknown> = {
						khanId: contentId,
						khanSlug: contentSlug,
						khanTitle: contentTitle,
						khanDescription: contentDescription || `${content.type} for ${lesson.title}`,
						path: lessonPath
					}
					
					if (content.type === "Video" || content.type === "YT Video") {
						// Compute XP from duration
						let duration: number | undefined
						
						if (content.type === "Video") {
							const dbVideo = videoMap.get(content.id)
							if (dbVideo?.duration) {
								duration = dbVideo.duration
							}
						} else if (content.type === "YT Video") {
							duration = content.duration
						}
						
						if (typeof duration !== "number" || duration <= 0) {
							logger.error("CRITICAL: Missing or invalid duration for video", { 
								contentId,
								contentSlug,
								contentType: content.type,
								duration
							})
							throw errors.new("video metadata: duration is required for interactive video resource")
						}
						
						xp = Math.max(1, Math.ceil(duration / 60))
						
						// Get YouTube ID
						let youtubeId: string | undefined
						if (content.type === "Video") {
							const dbVideo = videoMap.get(content.id)
							youtubeId = dbVideo?.youtubeId || undefined
						} else if (content.type === "YT Video") {
							youtubeId = content.id // For YT Videos, the ID is the YouTube ID
						}
						
						if (!youtubeId) {
							logger.error("CRITICAL: Missing youtubeId for video", { 
								contentId,
								contentSlug,
								contentType: content.type
							})
							throw errors.new("video metadata: youtubeId is required for interactive video resource")
						}
						
						metadata = {
							...metadata,
							type: "interactive",
							toolProvider: "Nice Academy",
							khanActivityType: "Video",
							launchUrl: `${appDomain}${lessonPath}/v/${contentSlug}`,
							url: `${appDomain}${lessonPath}/v/${contentSlug}`,
							khanYoutubeId: youtubeId,
							xp
						}
						// Collect this video as a passive resource for the next exercise
						if (xp > 0) {
							passiveResourcesForNextExercise.push(contentSourcedId)
						}
					} else if (content.type === "Exercise") {
						xp = EXERCISE_XP
						totalLessons++ // Count exercises as lessons
						metadata = {
							...metadata,
							type: "interactive",
							toolProvider: "Nice Academy",
							khanActivityType: "Exercise",
							launchUrl: `${appDomain}${lessonPath}/e/${contentSlug}`,
							url: `${appDomain}${lessonPath}/e/${contentSlug}`,
							xp,
							passiveResources: null,
							nice_passiveResources: [...passiveResourcesForNextExercise] // Copy current passive resources
						}
						// Reset passive resources after attaching to exercise
						passiveResourcesForNextExercise.length = 0
					}
					
					// Add CASE learning objective if we found one
					if (caseId) {
						metadata = {
							...metadata,
							learningObjectiveSet: [
								{
									source: "CASE",
									learningObjectiveIds: [caseId]
								}
							]
						}
					}
					
					totalXp += xp
					
					// Add resource
					payload.resources.push({
						sourcedId: contentSourcedId,
						status: "active",
						title: contentTitle,
						vendorResourceId: `nice-academy-${contentId}`,
						vendorId: "superbuilders",
						applicationId: "nice",
						roles: ["primary"],
						importance: "primary",
						metadata
					})
					resourceSet.add(contentSourcedId)
					
					// Add assessment line item for videos (including YT Videos)
					if (content.type === "Video" || content.type === "YT Video") {
						payload.assessmentLineItems.push({
							sourcedId: `${contentSourcedId}_ali`,
							status: "active",
							title: `Progress for: ${contentTitle}`,
							componentResource: {
								sourcedId: `nice_${lessonId}_${contentId}`
							},
							course: {
								sourcedId: `nice_${courseId}`
							},
							metadata: {
								lessonType: "video",
								courseSourcedId: `nice_${courseId}`
							}
						})
					}
					
					// Add assessment line item for exercises
					if (content.type === "Exercise") {
						payload.assessmentLineItems.push({
							sourcedId: `${contentSourcedId}_ali`,
							status: "active",
							title: contentTitle,
							componentResource: {
								sourcedId: `nice_${lessonId}_${contentId}`
							},
							course: {
								sourcedId: `nice_${courseId}`
							},
							metadata: {
								lessonType: "exercise",
								courseSourcedId: `nice_${courseId}`
							}
						})
					}
				}
				
				// Add component resource link
				let componentTitle = contentTitle
				if (content.type === "Video" || content.type === "YT Video") {
					componentTitle = formatResourceTitleForDisplay(contentTitle, "Video")
				} else if (content.type === "Exercise") {
					componentTitle = formatResourceTitleForDisplay(contentTitle, "Exercise")
				}
				
				payload.componentResources.push({
					sourcedId: `nice_${lessonId}_${contentId}`,
					status: "active",
					title: componentTitle,
					courseComponent: { sourcedId: `nice_${lessonId}`, type: "courseComponent" },
					resource: { sourcedId: contentSourcedId, type: "resource" },
					sortOrder: contentIndex
				})
			}
		}
	}
	
	// Update course metadata with metrics
	const courseMetadata = payload.course.metadata ?? {}
	courseMetadata.metrics = { totalXp, totalLessons }
	payload.course.metadata = courseMetadata
	
	logger.info("supplementary payload generation complete", {
		courseSlug,
		unitCount: payload.courseComponents.filter(c => !c.parent).length,
		lessonCount: payload.courseComponents.filter(c => c.parent).length,
		resourceCount: payload.resources.length,
		totalXp,
		totalLessons
	})
	
	return payload
}
