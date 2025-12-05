#!/usr/bin/env bun
import * as p from "@clack/prompts"
import { and, eq, ilike, or } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas/nice"
import { caliper, oneroster } from "@/lib/clients"
import { type AssessmentResult } from "@/lib/oneroster"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { z } from "zod"

type ContentType = "Video" | "Article" | "Exercise" | "Quiz" | "UnitTest" | "CourseChallenge"

interface XpMetadataUpdate {
	xp: number
	xpReason: string
	multiplier: number
	penaltyApplied: boolean
}

interface ContentResult {
	id: string
	title: string
	slug: string
	path: string
	type: ContentType
}

function getAttemptNumber(result: AssessmentResult): number | undefined {
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

function isInteractiveContentType(contentType: ContentType): boolean {
	return contentType === "Exercise" || contentType === "Quiz" || contentType === "UnitTest"
}

async function searchContent(titleQuery: string, contentType: ContentType): Promise<ContentResult[]> {
	const pattern = `%${titleQuery}%`

	if (contentType === "Video") {
		const results = await db
			.select({
				id: schema.niceVideos.id,
				title: schema.niceVideos.title,
				slug: schema.niceVideos.slug,
				path: schema.niceVideos.path
			})
			.from(schema.niceVideos)
			.where(ilike(schema.niceVideos.title, pattern))
			.limit(20)

		return results.map((r) => ({ ...r, type: "Video" as const }))
	}

	if (contentType === "Article") {
		const results = await db
			.select({
				id: schema.niceArticles.id,
				title: schema.niceArticles.title,
				slug: schema.niceArticles.slug,
				path: schema.niceArticles.path
			})
			.from(schema.niceArticles)
			.where(ilike(schema.niceArticles.title, pattern))
			.limit(20)

		return results.map((r) => ({ ...r, type: "Article" as const }))
	}

	if (contentType === "Exercise") {
		const results = await db
			.select({
				id: schema.niceExercises.id,
				title: schema.niceExercises.title,
				slug: schema.niceExercises.slug,
				path: schema.niceExercises.path
			})
			.from(schema.niceExercises)
			.where(ilike(schema.niceExercises.title, pattern))
			.limit(20)

		return results.map((r) => ({ ...r, type: "Exercise" as const }))
	}

	if (contentType === "Quiz" || contentType === "UnitTest" || contentType === "CourseChallenge") {
		const results = await db
			.select({
				id: schema.niceAssessments.id,
				title: schema.niceAssessments.title,
				slug: schema.niceAssessments.slug,
				path: schema.niceAssessments.path
			})
			.from(schema.niceAssessments)
			.where(and(eq(schema.niceAssessments.type, contentType), ilike(schema.niceAssessments.title, pattern)))
			.limit(20)

		return results.map((r) => ({ ...r, type: contentType }))
	}

	return []
}

async function fetchAssessmentResults(
	userSourcedId: string,
	contentId: string,
	contentType: ContentType
): Promise<AssessmentResult[]> {
	const lineItemId = `nice_${contentId}_ali`
	// Base prefix matches: nice_{userId}_nice_{contentId}_ali (and any suffix like _attempt_1)
	const basePrefix = `nice_${userSourcedId}_${lineItemId}`

	// Search for ALL results matching this user/content combination
	// This catches: _ali, _ali_attempt_1, _ali_attempt_2, etc.
	const allResultsResponse = await errors.try(
		oneroster.getAllResults({
			filter: `sourcedId~'${basePrefix}'`
		})
	)
	if (allResultsResponse.error) {
		logger.error("failed to fetch assessment results", { error: allResultsResponse.error })
		throw errors.wrap(allResultsResponse.error, "fetch assessment results")
	}

	const allResults = allResultsResponse.data
	const filtered = allResults.filter((r: AssessmentResult) => r.sourcedId.startsWith(basePrefix))

	if (filtered.length === 0) {
		return []
	}

	// Check if these are attempt-based results
	const attemptResults = filtered.filter((r) => r.sourcedId.includes("_attempt_"))
	
	if (attemptResults.length > 0) {
		// Sort attempt results by attempt number or date
		const allHaveAttemptNumbers = attemptResults.every((r) => typeof getAttemptNumber(r) === "number")
		if (allHaveAttemptNumbers) {
			return attemptResults.sort((a, b) => (getAttemptNumber(a)! - getAttemptNumber(b)!))
		}
		const allHaveDates = attemptResults.every((r) => typeof r.scoreDate === "string" && r.scoreDate.length > 0)
		if (allHaveDates) {
			return attemptResults.sort(
				(a, b) => new Date(a.scoreDate!).getTime() - new Date(b.scoreDate!).getTime()
			)
		}
		logger.error("cannot determine attempt ordering", { hasAttemptNumbers: allHaveAttemptNumbers, hasScoreDates: allHaveDates })
		throw errors.new("attempt ordering unavailable")
	}

	// Return non-attempt results (single completion records)
	// Sort by date if multiple exist
	const allHaveDates = filtered.every((r) => typeof r.scoreDate === "string" && r.scoreDate.length > 0)
	if (allHaveDates && filtered.length > 1) {
		return filtered.sort(
			(a, b) => new Date(a.scoreDate!).getTime() - new Date(b.scoreDate!).getTime()
		)
	}

	return filtered
}

function formatResult(result: AssessmentResult, attemptNumber?: number): string {
	const score = result.score !== null && result.score !== undefined ? result.score : "N/A"
	const normalizedScore = typeof score === "number" && score <= 1.1 ? `${(score * 100).toFixed(1)}%` : `${score}%`
	const scoreDate = result.scoreDate ? new Date(result.scoreDate).toLocaleString() : "N/A"
	const metadata = result.metadata ? JSON.stringify(result.metadata, null, 2) : "none"

	const header = attemptNumber !== undefined ? `\n=== Attempt ${attemptNumber} ===` : "\n=== Result ==="

	return `${header}
ID: ${result.sourcedId}
Score: ${normalizedScore}
Status: ${result.scoreStatus}
Date: ${scoreDate}
Comment: ${result.comment || "none"}
Metadata: ${metadata}`
}

async function fetchCaliperEventsForContent(
	userSourcedId: string,
	contentId: string
): Promise<unknown[]> {
	const actorId = `urn:uuid:${userSourcedId}`
	const resourceId = `nice_${contentId}`

	logger.info("fetching caliper events", { actorId, resourceId })

	const eventsResult = await errors.try(caliper.getEvents(actorId))
	if (eventsResult.error) {
		logger.error("failed to fetch caliper events", { error: eventsResult.error })
		throw errors.wrap(eventsResult.error, "fetch caliper events")
	}

	const allEvents = eventsResult.data

	// Filter events that match the content/resource ID
	const filtered = allEvents.filter((event) => {
		const objectId = event.object?.id
		if (typeof objectId !== "string") return false
		// Match events where object.id contains the resource ID
		return objectId.includes(resourceId)
	})

	logger.info("filtered caliper events", { total: allEvents.length, matched: filtered.length })
	return filtered
}

function formatCaliperEvent(event: unknown, index: number): string {
	const e = event as Record<string, unknown>
	const eventTime = e.eventTime ? new Date(e.eventTime as string).toLocaleString() : "N/A"
	const action = e.action ?? "N/A"
	const objectId = (e.object as Record<string, unknown> | undefined)?.id ?? "N/A"
	const objectType = (e.object as Record<string, unknown> | undefined)?.type ?? "N/A"

	// Extract extensions if present
	const extensions = e.extensions ? JSON.stringify(e.extensions, null, 2) : "none"

	return `
=== Event ${index + 1} ===
Action: ${action}
Time: ${eventTime}
Object ID: ${objectId}
Object Type: ${objectType}
Extensions: ${extensions}`
}

async function main() {
	p.intro("🔍 Assessment Result Lookup")

	const userEmail = await p.text({
		message: "enter user email:",
		placeholder: "e.g., student@example.com",
		validate: (value) => {
			if (!value) {
				return "user email is required"
			}
			if (!value.includes("@")) {
				return "invalid email format"
			}
		}
	})

	if (p.isCancel(userEmail)) {
		p.cancel("operation cancelled")
		process.exit(0)
	}

	const userLookupSpinner = p.spinner()
	userLookupSpinner.start("looking up user in oneroster...")

	const userResult = await errors.try(oneroster.getUsersByEmail(userEmail))
	if (userResult.error) {
		userLookupSpinner.stop("user lookup failed")
		logger.error("oneroster user lookup failed", { error: userResult.error })
		throw errors.wrap(userResult.error, "oneroster user lookup")
	}

	const onerosterUser = userResult.data
	if (!onerosterUser) {
		userLookupSpinner.stop("user not found")
		p.note(`no user found in oneroster with email: ${userEmail}`, "not found")
		process.exit(0)
	}

	const userSourcedId = onerosterUser.sourcedId
	userLookupSpinner.stop(`found user: ${userSourcedId}`)

	p.note(`Email: ${userEmail}
SourcedId: ${userSourcedId}
Given Name: ${onerosterUser.givenName || "N/A"}
Family Name: ${onerosterUser.familyName || "N/A"}`, "user details")

	const lookupMethod = await p.select({
		message: "how do you want to find the content?",
		options: [
			{ value: "title" as const, label: "Search by title (fuzzy search)" },
			{ value: "resourceId" as const, label: "Lookup by OneRoster resource ID" }
		]
	})

	if (p.isCancel(lookupMethod)) {
		p.cancel("operation cancelled")
		process.exit(0)
	}

	let selectedContent: ContentResult

	if (lookupMethod === "resourceId") {
		const resourceId = await p.text({
			message: "enter oneroster resource id:",
			placeholder: "e.g., nice_x1234567890abcdef",
			validate: (value) => {
				if (!value) {
					return "resource id is required"
				}
				if (!value.startsWith("nice_")) {
					return "resource id should start with 'nice_'"
				}
			}
		})

		if (p.isCancel(resourceId)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const resourceSpinner = p.spinner()
		resourceSpinner.start("fetching resource from oneroster...")

		const resourceResult = await errors.try(oneroster.getResource(resourceId))
		if (resourceResult.error) {
			resourceSpinner.stop("resource fetch failed")
			logger.error("oneroster resource fetch failed", { error: resourceResult.error })
			throw errors.wrap(resourceResult.error, "oneroster resource fetch")
		}

		const resource = resourceResult.data
		if (!resource) {
			resourceSpinner.stop("resource not found")
			p.note(`no resource found with id: ${resourceId}`, "not found")
			process.exit(0)
		}

		resourceSpinner.stop("resource found")

		// Derive content type from resource metadata, prioritizing assessment lesson types
		const metadata = resource.metadata as Record<string, unknown> | undefined
		const khanLessonType = typeof metadata?.khanLessonType === "string" ? String(metadata?.khanLessonType) : undefined
		const khanActivityType = typeof metadata?.khanActivityType === "string" ? String(metadata?.khanActivityType) : undefined

		let contentType: ContentType
		if (khanLessonType === "quiz") {
			contentType = "Quiz"
		} else if (khanLessonType === "unittest") {
			contentType = "UnitTest"
		} else if (khanLessonType === "coursechallenge") {
			contentType = "CourseChallenge"
		} else if (khanActivityType === "Exercise") {
			contentType = "Exercise"
		} else if (khanActivityType === "Video") {
			contentType = "Video"
		} else if (khanActivityType === "Article") {
			contentType = "Article"
		} else {
			p.note("unable to determine content type from resource metadata", "error")
			process.exit(1)
		}

		// Derive raw content id (without the 'nice_' prefix or 'nice-academy-' prefix)
		let rawContentId: string | undefined
		if (typeof resource.vendorResourceId === "string" && resource.vendorResourceId.startsWith("nice-academy-")) {
			rawContentId = resource.vendorResourceId.replace("nice-academy-", "")
		}
		if (!rawContentId && typeof resource.sourcedId === "string" && resource.sourcedId.startsWith("nice_")) {
			rawContentId = resource.sourcedId.replace("nice_", "")
		}
		if (!rawContentId) {
			p.note("unable to derive content id from resource", "error")
			process.exit(1)
		}

		selectedContent = {
			id: rawContentId,
			title: resource.title,
			slug: rawContentId,
			path: typeof metadata?.path === "string" ? String(metadata?.path) : "unknown",
			type: contentType
		}

		p.note(`ID: ${selectedContent.id}
Title: ${selectedContent.title}
Type: ${selectedContent.type}
Resource ID: ${resourceId}
Path: ${selectedContent.path}`, "selected content")
	} else {
		const contentType = await p.select({
			message: "select content type:",
			options: [
				{ value: "Video" as const, label: "Video" },
				{ value: "Article" as const, label: "Article" },
				{ value: "Exercise" as const, label: "Exercise" },
				{ value: "Quiz" as const, label: "Quiz" },
				{ value: "UnitTest" as const, label: "Unit Test" },
				{ value: "CourseChallenge" as const, label: "Course Challenge" }
			]
		}) as unknown as ContentType

		if (p.isCancel(contentType)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const titleQuery = await p.text({
			message: "enter title to search (partial match):",
			placeholder: "e.g., introduction to",
			validate: (value) => {
				if (!value) {
					return "title query is required"
				}
			}
		})

		if (p.isCancel(titleQuery)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const searchSpinner = p.spinner()
		searchSpinner.start("searching for content...")

		const searchResult = await errors.try(searchContent(titleQuery, contentType))
		if (searchResult.error) {
			searchSpinner.stop("search failed")
			logger.error("content search failed", { error: searchResult.error })
			throw errors.wrap(searchResult.error, "content search")
		}

		const results = searchResult.data
		searchSpinner.stop(`found ${results.length} result(s)`)

		if (results.length === 0) {
			p.note("no content found matching your query", "no results")
			process.exit(0)
		}

		selectedContent = await p.select({
			message: "select content:",
			options: results.map((r) => ({
				value: r,
				label: `${r.title} (${r.type}) [${r.id}]`
			}))
		}) as unknown as ContentResult

		if (p.isCancel(selectedContent)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		p.note(`ID: ${selectedContent.id}
Title: ${selectedContent.title}
Type: ${selectedContent.type}
Path: ${selectedContent.path}`, "selected content")
	}

	const fetchSpinner = p.spinner()
	fetchSpinner.start("fetching assessment results...")

	const resultsResponse = await errors.try(
		fetchAssessmentResults(userSourcedId, selectedContent.id, selectedContent.type)
	)
	if (resultsResponse.error) {
		fetchSpinner.stop("fetch failed")
		logger.error("assessment results fetch failed", { error: resultsResponse.error })
		throw errors.wrap(resultsResponse.error, "assessment results fetch")
	}

	const assessmentResults = resultsResponse.data
	fetchSpinner.stop(`found ${assessmentResults.length} result(s)`)

	if (assessmentResults.length === 0) {
		p.note("no assessment results found for this user/content combination", "no results")
		process.exit(0)
	}

	const isInteractive = isInteractiveContentType(selectedContent.type)
	if (isInteractive) {
		p.note(assessmentResults.map((r) => formatResult(r, getAttemptNumber(r))).join("\n"), "assessment attempts")
	} else {
		const firstResult = assessmentResults[0]
		if (!firstResult) {
			throw errors.new("expected at least one result")
		}
		p.note(formatResult(firstResult), "assessment result")
	}

	// Offer to fetch caliper events
	const shouldFetchCaliper = await p.confirm({
		message: "do you want to fetch caliper events for this content?",
		initialValue: false
	})

	if (p.isCancel(shouldFetchCaliper)) {
		p.cancel("operation cancelled")
		process.exit(0)
	}

	if (shouldFetchCaliper) {
		const caliperSpinner = p.spinner()
		caliperSpinner.start("fetching caliper events...")

		const caliperResult = await errors.try(
			fetchCaliperEventsForContent(userSourcedId, selectedContent.id)
		)
		if (caliperResult.error) {
			caliperSpinner.stop("caliper fetch failed")
			logger.error("caliper events fetch failed", { error: caliperResult.error })
			p.note("failed to fetch caliper events", "error")
		} else {
			const caliperEvents = caliperResult.data
			caliperSpinner.stop(`found ${caliperEvents.length} caliper event(s)`)

			if (caliperEvents.length === 0) {
				p.note("no caliper events found for this user/content combination", "no caliper events")
			} else {
				p.note(
					caliperEvents.map((e, i) => formatCaliperEvent(e, i)).join("\n"),
					"caliper events"
				)
			}
		}
	}

	const shouldUpdate = await p.confirm({
		message: "do you want to update xp metadata?",
		initialValue: false
	})

	if (p.isCancel(shouldUpdate)) {
		p.cancel("operation cancelled")
		process.exit(0)
	}

	if (shouldUpdate) {
		let resultToUpdate: AssessmentResult

		if (isInteractive && assessmentResults.length > 1) {
			const attemptChoice = await p.select({
				message: "which attempt do you want to update?",
				options: assessmentResults.map((r) => {
					const attempt = getAttemptNumber(r)
					const scoreLabel = typeof r.score === "number" ? (r.score <= 1.1 ? `${(r.score * 100).toFixed(0)}%` : `${r.score}%`) : "N/A"
					const dateLabel = typeof r.scoreDate === "string" && r.scoreDate.length > 0 ? new Date(r.scoreDate).toLocaleString() : "unknown date"
					return {
						value: r,
						label: attempt !== undefined ? `Attempt ${attempt} - Score: ${scoreLabel} - ${dateLabel}` : `Score: ${scoreLabel} - ${dateLabel}`
					}
				})
			}) as unknown as AssessmentResult

			if (p.isCancel(attemptChoice)) {
				p.cancel("operation cancelled")
				process.exit(0)
			}

			resultToUpdate = attemptChoice
		} else {
			resultToUpdate = assessmentResults[0]!
		}

		const xpValue = await p.text({
			message: "enter xp value (integer):",
			placeholder: "e.g., 100",
			validate: (value) => {
				const num = Number.parseInt(value)
				if (Number.isNaN(num)) {
					return "must be a valid integer"
				}
				if (num < 0) {
					return "xp cannot be negative"
				}
			}
		})

		if (p.isCancel(xpValue)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const xpReason = await p.text({
			message: "enter xp reason:",
			placeholder: "e.g., Banked XP",
			validate: (value) => {
				if (!value || value.trim().length === 0) {
					return "xp reason is required"
				}
			}
		})

		if (p.isCancel(xpReason)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const multiplierInput = await p.text({
			message: "enter multiplier (decimal):",
			placeholder: "e.g., 1.0",
			initialValue: "1.0",
			validate: (value) => {
				const num = Number.parseFloat(value)
				if (Number.isNaN(num)) {
					return "must be a valid number"
				}
				if (num < 0) {
					return "multiplier cannot be negative"
				}
			}
		})

		if (p.isCancel(multiplierInput)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const penaltyApplied = await p.confirm({
			message: "was a penalty applied?",
			initialValue: false
		})

		if (p.isCancel(penaltyApplied)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}

		const xpMetadata: XpMetadataUpdate = {
			xp: Number.parseInt(xpValue),
			xpReason: xpReason.trim(),
			multiplier: Number.parseFloat(multiplierInput),
			penaltyApplied
		}

		const updateSpinner = p.spinner()
		updateSpinner.start("updating assessment result...")

		const updateResult = await errors.try(updateAssessmentResult(resultToUpdate, xpMetadata))
		if (updateResult.error) {
			updateSpinner.stop("update failed")
			logger.error("assessment result update failed", { error: updateResult.error })
			throw errors.wrap(updateResult.error, "assessment result update")
		}

		updateSpinner.stop("update complete")

		const updatedResult = updateResult.data
		p.note(formatResult(updatedResult), "updated result")
	}

	p.outro("✅ lookup complete")
}

async function updateAssessmentResult(
	result: AssessmentResult,
	xpUpdate: XpMetadataUpdate
): Promise<AssessmentResult> {
	const existingMetadata = result.metadata || {}

	const updatedMetadata = {
		...existingMetadata,
		xp: xpUpdate.xp,
		xpReason: xpUpdate.xpReason,
		multiplier: xpUpdate.multiplier,
		penaltyApplied: xpUpdate.penaltyApplied,
		accuracy: existingMetadata.accuracy || 100,
		masteredUnits: existingMetadata.masteredUnits || 0,
		completedAt: existingMetadata.completedAt || result.scoreDate || new Date().toISOString()
	}

	const payload = {
		result: {
			assessmentLineItem: { sourcedId: result.assessmentLineItem.sourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: result.student.sourcedId, type: "user" as const },
			scoreStatus: result.scoreStatus,
			scoreDate: result.scoreDate || new Date().toISOString(),
			score: result.score || 0,
			comment: result.comment || undefined,
			metadata: updatedMetadata
		}
	}

	logger.info("updating assessment result", {
		sourcedId: result.sourcedId,
		xpUpdate,
		updatedMetadata
	})

	const updateResponse = await errors.try(oneroster.putResult(result.sourcedId, payload))
	if (updateResponse.error) {
		logger.error("failed to update assessment result", { error: updateResponse.error, sourcedId: result.sourcedId })
		throw errors.wrap(updateResponse.error, "assessment result update")
	}

	return updateResponse.data
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
