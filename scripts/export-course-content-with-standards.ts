#!/usr/bin/env bun
/**
 * Export Course Content with Standards to CSV
 *
 * This script reads OneRoster JSON files for a course and exports a CSV
 * containing unit titles, lesson titles, content titles, URLs, standards,
 * and content types - matching the format of the HS Biology spreadsheet.
 *
 * Usage:
 *   bun run scripts/export-course-content-with-standards.ts <course-folder>
 *
 * Examples:
 *   bun run scripts/export-course-content-with-standards.ts hs-chemistry
 *   bun run scripts/export-course-content-with-standards.ts highschool-physics
 *   bun run scripts/export-course-content-with-standards.ts hs-bio
 */
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { caseApi } from "@/lib/clients"

// --- Types ---
type CourseComponent = {
	sourcedId: string
	status: string
	title: string
	course: { sourcedId: string; type: string }
	parent?: { sourcedId: string; type: string }
	sortOrder: number
	metadata?: Record<string, unknown>
}

type Resource = {
	sourcedId: string
	status: string
	title: string
	metadata?: {
		khanActivityType?: string
		khanLessonType?: string
		url?: string
		launchUrl?: string
		path?: string
		learningObjectiveSet?: Array<{
			source: string
			learningObjectiveIds: string[]
		}>
	}
}

type ComponentResource = {
	sourcedId: string
	status: string
	title: string
	courseComponent: { sourcedId: string; type: string }
	resource: { sourcedId: string; type: string }
	sortOrder: number
}

type CourseInfo = {
	sourcedId: string
	title: string
	courseCode: string
}

type StandardInfo = {
	sourcedId: string
	humanCodingScheme: string
	fullStatement: string
}

type CSVRow = {
	unitTitle: string
	lessonTitle: string
	lessonUrl: string
	contentTitle: string
	contentUrl: string
	ngssStandards: string
	allStandards: string
	contentType: string
}

type LessonType = "lesson" | "quiz" | "unittest"

// --- Helper Functions ---
async function readJsonFile<T>(filePath: string): Promise<T> {
	const readResult = await errors.try(fs.readFile(filePath, "utf-8"))
	if (readResult.error) {
		logger.error("file read failed", { error: readResult.error, file: filePath })
		throw errors.wrap(readResult.error, "file read")
	}

	const parseResult = errors.trySync(() => JSON.parse(readResult.data) as T)
	if (parseResult.error) {
		logger.error("json parse failed", { error: parseResult.error, file: filePath })
		throw errors.wrap(parseResult.error, "json parse")
	}

	return parseResult.data
}

function getContentType(khanActivityType: string | undefined, khanLessonType: string | undefined): string {
	// Check for quiz/unittest first (from khanLessonType)
	if (khanLessonType === "quiz") return "Quiz"
	if (khanLessonType === "unittest") return "Unit Test"
	if (khanLessonType === "coursechallenge") return "Course Challenge"

	// Then check activity type
	switch (khanActivityType) {
		case "Video":
			return "Video"
		case "Article":
			return "Reading"
		case "Exercise":
			return "Quiz" // Exercises within lessons are shown as Quiz
		case "Quiz":
			return "Quiz"
		default:
			return khanActivityType ?? "Unknown"
	}
}

function getLessonType(component: CourseComponent): LessonType {
	const khanSlug = (component.metadata?.khanSlug as string) ?? ""
	const title = component.title.toLowerCase()

	// Check the slug pattern for quizzes and unit tests
	if (khanSlug.includes("-quiz-") || title.includes(": quiz")) return "quiz"
	if (khanSlug.includes("-unit-test") || title.includes(": unit test")) return "unittest"

	return "lesson"
}

function getShortSlug(fullSlug: string): string {
	// Convert "x6679aa2c65c01e53:motion-and-forces-quiz-2" to "motion-and-forces-quiz-2"
	const colonIndex = fullSlug.indexOf(":")
	if (colonIndex !== -1) {
		return fullSlug.slice(colonIndex + 1)
	}
	return fullSlug
}

function findPrecedingLesson(
	component: CourseComponent,
	allLessonsInUnit: CourseComponent[]
): CourseComponent | undefined {
	// Sort lessons by sortOrder
	const sortedLessons = [...allLessonsInUnit].sort((a, b) => a.sortOrder - b.sortOrder)

	// Find the last active lesson that comes before this component's sortOrder
	let precedingLesson: CourseComponent | undefined

	for (const lesson of sortedLessons) {
		// Skip if this lesson's sortOrder is >= the component's sortOrder
		if (lesson.sortOrder >= component.sortOrder) break

		// Skip if this lesson is not active
		if (lesson.status !== "active") continue

		// Skip if this is a quiz or unit test (we want actual lessons)
		const lessonType = getLessonType(lesson)
		if (lessonType !== "lesson") continue

		precedingLesson = lesson
	}

	return precedingLesson
}

function constructCorrectUrl(
	courseFolder: string,
	unitSlug: string,
	component: CourseComponent,
	lessonType: LessonType,
	precedingLessonSlug?: string
): string {
	const baseUrl = `https://www.nice.academy/science/${courseFolder}`
	const componentSlug = (component.metadata?.khanSlug as string) ?? ""
	const shortSlug = getShortSlug(componentSlug)

	if (lessonType === "quiz") {
		// Quiz URL format: /{course}/{unit-slug}/{lesson-slug}/quiz/{short-quiz-slug}
		if (precedingLessonSlug) {
			return `${baseUrl}/${unitSlug}/${precedingLessonSlug}/quiz/${shortSlug}`
		}
		// Fallback if no preceding lesson found
		return `${baseUrl}/${unitSlug}/quiz/${shortSlug}`
	}

	if (lessonType === "unittest") {
		// Unit test URL format: /{course}/{unit-slug}/{lesson-slug}/test/{short-unittest-slug}
		if (precedingLessonSlug) {
			return `${baseUrl}/${unitSlug}/${precedingLessonSlug}/test/${shortSlug}`
		}
		// Fallback if no preceding lesson found
		return `${baseUrl}/${unitSlug}/test/${shortSlug}`
	}

	// Regular lesson URL format: /{course}/{unit-slug}/{lesson-slug}
	return `${baseUrl}/${unitSlug}/${componentSlug}`
}

function formatStandard(info: StandardInfo): string {
	if (info.humanCodingScheme && info.fullStatement) {
		return `${info.humanCodingScheme} (${info.fullStatement})`
	}
	if (info.humanCodingScheme) {
		return info.humanCodingScheme
	}
	return info.sourcedId
}

function isNgssStandard(humanCodingScheme: string): boolean {
	// NGSS standards typically start with HS-, MS-, K-, or contain -LS, -PS, -ESS, -ETS
	return /^(HS|MS|K|[0-9])/.test(humanCodingScheme) &&
		(/-(LS|PS|ESS|ETS)/.test(humanCodingScheme) || /\.[A-Z]+\./.test(humanCodingScheme))
}

function escapeCSVField(field: string): string {
	// If field contains comma, newline, or quote, wrap in quotes and escape internal quotes
	if (field.includes(",") || field.includes("\n") || field.includes('"')) {
		return `"${field.replace(/"/g, '""')}"`
	}
	return field
}

// --- Main Logic ---
async function main(): Promise<void> {
	const args = process.argv.slice(2)
	if (args.length === 0) {
		console.log("Usage: bun run scripts/export-course-content-with-standards.ts <course-folder>")
		console.log("")
		console.log("Available courses:")
		console.log("  hs-bio")
		console.log("  hs-chemistry")
		console.log("  highschool-physics")
		process.exit(1)
	}

	const courseFolder = args[0]
	if (!courseFolder) {
		throw errors.new("course folder argument required")
	}

	const dataDir = path.join(process.cwd(), "data", courseFolder, "oneroster")

	// Check if directory exists
	const statResult = await errors.try(fs.stat(dataDir))
	if (statResult.error) {
		logger.error("course folder not found", { error: statResult.error, path: dataDir })
		throw errors.new(`course folder not found: ${dataDir}`)
	}

	logger.info("loading oneroster data", { course: courseFolder })

	// Load all OneRoster JSON files
	const [courseInfo, courseComponents, resources, componentResources] = await Promise.all([
		readJsonFile<CourseInfo>(path.join(dataDir, "course.json")),
		readJsonFile<CourseComponent[]>(path.join(dataDir, "courseComponents.json")),
		readJsonFile<Resource[]>(path.join(dataDir, "resources.json")),
		readJsonFile<ComponentResource[]>(path.join(dataDir, "componentResources.json"))
	])

	logger.info("loaded oneroster data", {
		course: courseInfo.title,
		components: courseComponents.length,
		resources: resources.length,
		componentResources: componentResources.length
	})

	// Build lookup maps
	const componentsById = new Map<string, CourseComponent>()
	for (const comp of courseComponents) {
		componentsById.set(comp.sourcedId, comp)
	}

	const resourcesById = new Map<string, Resource>()
	for (const resource of resources) {
		resourcesById.set(resource.sourcedId, resource)
	}

	// Group component resources by lesson (course component)
	const resourcesByLesson = new Map<string, ComponentResource[]>()
	for (const cr of componentResources) {
		const lessonId = cr.courseComponent.sourcedId
		const existing = resourcesByLesson.get(lessonId)
		if (existing) {
			existing.push(cr)
		} else {
			resourcesByLesson.set(lessonId, [cr])
		}
	}

	// Sort resources within each lesson by sortOrder
	for (const lessonResources of resourcesByLesson.values()) {
		lessonResources.sort((a, b) => a.sortOrder - b.sortOrder)
	}

	// Identify units (components without parent) and lessons (components with parent)
	const units: CourseComponent[] = []
	const lessonsByUnit = new Map<string, CourseComponent[]>()

	for (const comp of courseComponents) {
		if (comp.status !== "active") continue

		if (!comp.parent) {
			units.push(comp)
		} else {
			const unitId = comp.parent.sourcedId
			const existing = lessonsByUnit.get(unitId)
			if (existing) {
				existing.push(comp)
			} else {
				lessonsByUnit.set(unitId, [comp])
			}
		}
	}

	// Sort units by sortOrder
	units.sort((a, b) => a.sortOrder - b.sortOrder)

	// Sort lessons within each unit by sortOrder
	for (const lessons of lessonsByUnit.values()) {
		lessons.sort((a, b) => a.sortOrder - b.sortOrder)
	}

	logger.info("parsed course structure", { units: units.length })

	// Collect all unique CASE IDs from resources
	const allCaseIds = new Set<string>()
	for (const resource of resources) {
		const learningObjectiveSets = resource.metadata?.learningObjectiveSet
		if (learningObjectiveSets) {
			for (const set of learningObjectiveSets) {
				if (set.source === "CASE") {
					for (const id of set.learningObjectiveIds) {
						allCaseIds.add(id)
					}
				}
			}
		}
	}

	logger.info("found unique case ids", { count: allCaseIds.size })

	// Fetch all standards from CASE API
	const standardsCache = new Map<string, StandardInfo>()
	const caseIdArray = Array.from(allCaseIds)

	logger.info("fetching standards from case api", { count: caseIdArray.length })

	// Batch fetch in groups to avoid overwhelming the API
	const BATCH_SIZE = 20
	for (let i = 0; i < caseIdArray.length; i += BATCH_SIZE) {
		const batch = caseIdArray.slice(i, i + BATCH_SIZE)
		const batchResults = await Promise.all(
			batch.map(async (caseId) => {
				const result = await errors.try(caseApi.getCFItem(caseId))
				if (result.error) {
					logger.warn("failed to fetch case item", { caseId, error: result.error })
					return { caseId, item: null }
				}
				return { caseId, item: result.data }
			})
		)

		for (const { caseId, item } of batchResults) {
			if (item) {
				standardsCache.set(caseId, {
					sourcedId: item.sourcedId ?? caseId,
					humanCodingScheme: item.humanCodingScheme ?? "",
					fullStatement: item.fullStatement ?? ""
				})
			}
		}

		logger.debug("fetched batch", {
			progress: Math.min(i + BATCH_SIZE, caseIdArray.length),
			total: caseIdArray.length
		})
	}

	logger.info("fetched standards from case api", { fetched: standardsCache.size, total: allCaseIds.size })

	// Build CSV rows
	const rows: CSVRow[] = []

	for (const unit of units) {
		const unitTitle = unit.title
		const unitSlug = (unit.metadata?.khanSlug as string) ?? ""
		const lessons = lessonsByUnit.get(unit.sourcedId) ?? []

		for (const lesson of lessons) {
			const lessonTitle = lesson.title
			const lessonType = getLessonType(lesson)

			// For quizzes and unit tests, find the preceding lesson
			let precedingLessonSlug: string | undefined
			if (lessonType === "quiz" || lessonType === "unittest") {
				const precedingLesson = findPrecedingLesson(lesson, lessons)
				if (precedingLesson) {
					precedingLessonSlug = (precedingLesson.metadata?.khanSlug as string) ?? undefined
				}
			}

			const lessonUrl = constructCorrectUrl(courseFolder, unitSlug, lesson, lessonType, precedingLessonSlug)

			const lessonResources = resourcesByLesson.get(lesson.sourcedId) ?? []

			// For quizzes and unit tests, they are self-contained (the component IS the content)
			if (lessonType === "quiz" || lessonType === "unittest") {
				// Find the resource for this quiz/unittest
				const resource = resourcesById.get(lesson.sourcedId)

				// Get standards for this quiz/unittest
				const standards: StandardInfo[] = []
				if (resource) {
					const learningObjectiveSets = resource.metadata?.learningObjectiveSet
					if (learningObjectiveSets) {
						for (const set of learningObjectiveSets) {
							if (set.source === "CASE") {
								for (const id of set.learningObjectiveIds) {
									const standard = standardsCache.get(id)
									if (standard) {
										standards.push(standard)
									}
								}
							}
						}
					}
				}

				const ngssStandards = standards.filter((s) => isNgssStandard(s.humanCodingScheme))
				const ngssStandardsStr = ngssStandards.map(formatStandard).join(", ")
				const allStandardsStr = standards.map(formatStandard).join(", ")

				const contentType = lessonType === "quiz" ? "Quiz" : "Unit Test"

				rows.push({
					unitTitle,
					lessonTitle,
					lessonUrl,
					contentTitle: lessonTitle,
					contentUrl: lessonUrl,
					ngssStandards: ngssStandardsStr,
					allStandards: allStandardsStr,
					contentType
				})
				continue
			}

			// For regular lessons, iterate through their resources
			for (const cr of lessonResources) {
				const resource = resourcesById.get(cr.resource.sourcedId)
				if (!resource) continue
				if (resource.status !== "active") continue

				const contentTitle = resource.title
				// Use the correct URL from metadata, but construct lesson URL properly
				const contentUrl = resource.metadata?.url ?? resource.metadata?.launchUrl ?? ""
				const khanLessonType = resource.metadata?.khanLessonType
				const contentType = getContentType(resource.metadata?.khanActivityType, khanLessonType)

				// Get standards for this resource
				const standards: StandardInfo[] = []
				const learningObjectiveSets = resource.metadata?.learningObjectiveSet
				if (learningObjectiveSets) {
					for (const set of learningObjectiveSets) {
						if (set.source === "CASE") {
							for (const id of set.learningObjectiveIds) {
								const standard = standardsCache.get(id)
								if (standard) {
									standards.push(standard)
								}
							}
						}
					}
				}

				// Split into NGSS and all standards
				const ngssStandards = standards.filter((s) => isNgssStandard(s.humanCodingScheme))
				const allStandardsList = standards

				const ngssStandardsStr = ngssStandards.map(formatStandard).join(", ")
				const allStandardsStr = allStandardsList.map(formatStandard).join(", ")

				rows.push({
					unitTitle,
					lessonTitle,
					lessonUrl,
					contentTitle,
					contentUrl,
					ngssStandards: ngssStandardsStr,
					allStandards: allStandardsStr,
					contentType
				})
			}
		}
	}

	logger.info("generated csv rows", { count: rows.length })

	// Generate CSV content
	const header = "Unit Title,Lesson Title,Lesson URL,Content Title,Content URL,NGSS Standards,All Standards,Content Type"
	const csvLines = [header]

	for (const row of rows) {
		const line = [
			escapeCSVField(row.unitTitle),
			escapeCSVField(row.lessonTitle),
			escapeCSVField(row.lessonUrl),
			escapeCSVField(row.contentTitle),
			escapeCSVField(row.contentUrl),
			escapeCSVField(row.ngssStandards),
			escapeCSVField(row.allStandards),
			escapeCSVField(row.contentType)
		].join(",")
		csvLines.push(line)
	}

	const csvContent = csvLines.join("\n")

	// Write to file
	const outputFileName = `${courseInfo.title.replace(/[^a-zA-Z0-9]+/g, " ").trim()} - Lesson Review - Nice Academy URLs.csv`
	const outputPath = path.join(process.cwd(), outputFileName)

	const writeResult = await errors.try(fs.writeFile(outputPath, csvContent, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write csv", { error: writeResult.error, path: outputPath })
		throw errors.wrap(writeResult.error, "csv write")
	}

	logger.info("csv exported successfully", { path: outputPath, rows: rows.length })
	console.log(`\nExported ${rows.length} rows to:\n${outputPath}`)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

