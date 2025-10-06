import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as crypto from "node:crypto"
import { env } from "@/env"
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
const VIDEO_DEFAULT_XP = 5 // Default for videos when we can't calculate duration

// Helper to generate IDs
function generateId(): string {
	return `x${crypto.randomBytes(8).toString("hex")}`
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
				
				// Skip YT Videos (external YouTube links)
				if (content.type === "YT Video") {
					logger.debug("skipping youtube video", { link: content.link })
					continue
				}
				
				// Use the actual Khan ID and slug from the coverage data
				const contentSourcedId = `nice_${content.id}`
				
				// Skip if we already have this resource
				if (!resourceSet.has(contentSourcedId)) {
					// Fetch CASE ID for the standard
					const caseId = await fetchCaseIdForStandard(content.standard)
					let xp = 0
					let metadata: Record<string, unknown> = {
						khanId: content.id,
						khanSlug: content.slug,
						khanTitle: content.title,
						khanDescription: `${content.type} for ${lesson.title}`,
						path: lessonPath
					}
					
					if (content.type === "Video") {
						xp = VIDEO_DEFAULT_XP
						metadata = {
							...metadata,
							type: "interactive",
							toolProvider: "Nice Academy",
							khanActivityType: "Video",
							launchUrl: `${appDomain}${lessonPath}/v/${content.slug}`,
							url: `${appDomain}${lessonPath}/v/${content.slug}`,
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
							launchUrl: `${appDomain}${lessonPath}/e/${content.slug}`,
							url: `${appDomain}${lessonPath}/e/${content.slug}`,
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
						title: content.title,
						vendorResourceId: `nice-academy-${content.id}`,
						vendorId: "superbuilders",
						applicationId: "nice",
						roles: ["primary"],
						importance: "primary",
						metadata
					})
					resourceSet.add(contentSourcedId)
					
					// Add assessment line item for videos
					if (content.type === "Video") {
						payload.assessmentLineItems.push({
							sourcedId: `${contentSourcedId}_ali`,
							status: "active",
							title: `Progress for: ${content.title}`,
							componentResource: {
								sourcedId: `nice_${lessonId}_${content.id}`
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
							title: content.title,
							componentResource: {
								sourcedId: `nice_${lessonId}_${content.id}`
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
				let componentTitle = content.title
				if (content.type === "Video") {
					componentTitle = formatResourceTitleForDisplay(content.title, "Video")
				} else if (content.type === "Exercise") {
					componentTitle = formatResourceTitleForDisplay(content.title, "Exercise")
				}
				
				payload.componentResources.push({
					sourcedId: `nice_${lessonId}_${content.id}`,
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
