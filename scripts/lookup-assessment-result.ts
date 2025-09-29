#!/usr/bin/env bun
import * as p from "@clack/prompts"
import { eq, ilike, or } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas/nice"
import { oneroster } from "@/lib/clients"
import { type AssessmentResult } from "@/lib/oneroster"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { z } from "zod"

type ContentType = "Video" | "Article" | "Exercise"

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

	return []
}

async function fetchAssessmentResults(
	userSourcedId: string,
	contentId: string,
	contentType: ContentType
): Promise<AssessmentResult[]> {
	const lineItemId = `nice_${contentId}_ali`

	const isInteractive = contentType === "Exercise"

	if (isInteractive) {
		const basePrefix = `nice_${userSourcedId}_${lineItemId}_attempt_`

		const allResultsResponse = await errors.try(
			oneroster.getAllResults({
				filter: `sourcedId~'${basePrefix}'`
			})
		)
		if (allResultsResponse.error) {
			logger.error("failed to fetch interactive assessment results", { error: allResultsResponse.error })
			throw errors.wrap(allResultsResponse.error, "fetch interactive assessment results")
		}

		const allResults = allResultsResponse.data
		const filtered = allResults.filter((r: AssessmentResult) => r.sourcedId.startsWith(basePrefix))

		return filtered.sort(
			(a: AssessmentResult, b: AssessmentResult) => new Date(b.scoreDate || 0).getTime() - new Date(a.scoreDate || 0).getTime()
		)
	}

	const passiveResultId = `nice_${userSourcedId}_${lineItemId}`
	const resultResponse = await errors.try(oneroster.getResult(passiveResultId))
	if (resultResponse.error) {
		logger.error("failed to fetch passive content result", { error: resultResponse.error })
		throw errors.wrap(resultResponse.error, "fetch passive content result")
	}

	const result = resultResponse.data
	if (!result) {
		return []
	}

	return [result]
}

function formatResult(result: AssessmentResult, index?: number): string {
	const score = result.score !== null && result.score !== undefined ? result.score : "N/A"
	const normalizedScore = typeof score === "number" && score <= 1.1 ? `${(score * 100).toFixed(1)}%` : `${score}%`
	const scoreDate = result.scoreDate ? new Date(result.scoreDate).toLocaleString() : "N/A"
	const metadata = result.metadata ? JSON.stringify(result.metadata, null, 2) : "none"

	const header = index !== undefined ? `\n=== Attempt ${index + 1} ===` : "\n=== Result ==="

	return `${header}
ID: ${result.sourcedId}
Score: ${normalizedScore}
Status: ${result.scoreStatus}
Date: ${scoreDate}
Comment: ${result.comment || "none"}
Metadata: ${metadata}`
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

	const contentType = await p.select({
		message: "select content type:",
		options: [
			{ value: "Video" as const, label: "Video" },
			{ value: "Article" as const, label: "Article" },
			{ value: "Exercise" as const, label: "Exercise" }
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

	const selectedContent = await p.select({
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

	const isInteractive = selectedContent.type === "Exercise"
	if (isInteractive) {
		p.note(assessmentResults.map((r, i) => formatResult(r, i)).join("\n"), "assessment attempts")
	} else {
		const firstResult = assessmentResults[0]
		if (!firstResult) {
			throw errors.new("expected at least one result")
		}
		p.note(formatResult(firstResult), "assessment result")
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
				options: assessmentResults.map((r, i) => ({
					value: r,
					label: `Attempt ${i + 1} - Score: ${r.score} - ${new Date(r.scoreDate || "").toLocaleString()}`
				}))
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
