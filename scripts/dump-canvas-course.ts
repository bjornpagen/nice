#!/usr/bin/env bun
import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { CanvasClient } from "@/lib/canvas-api"
import { createCanvasClientFromEnv } from "@/lib/canvas-api"

logger.setDefaultLogLevel(logger.INFO)

async function main() {
	const [, , courseIdArg, outDirArg] = process.argv
	if (!courseIdArg) {
		logger.error("missing course id argument")
		throw errors.new("canvas dump: missing course id")
	}
	const courseId: string = courseIdArg

	const outDir = outDirArg || path.join(process.cwd(), "data")
	const mkdirResult = await errors.try(fs.mkdir(outDir, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create output directory", { error: mkdirResult.error, outDir })
		throw errors.wrap(mkdirResult.error, "canvas dump: create output directory")
	}

	let client: CanvasClient
	const makeClientResult = errors.trySync(() => createCanvasClientFromEnv())
	if (makeClientResult.error) {
		logger.error("failed to create canvas client from env", { error: makeClientResult.error })
		throw makeClientResult.error
	}
	client = makeClientResult.data

	// Fetch modules and items via REST
	const modules = await client.getModulesWithItems(courseIdArg)
	logger.info("fetched modules via rest", { count: modules.length })

	// Fetch assignment_info map for enrichment
	const assignmentInfo = await client.getAssignmentInfoMap(courseIdArg)
	logger.info("fetched assignment info map", { entries: Object.keys(assignmentInfo).length })

	// Hydrate each module item with per-type details
	const hydratedModules: Array<{ id: string | number; name?: string; items: Array<Record<string, unknown>> }> = []

	for (const mod of modules) {
		const items: Array<Record<string, unknown>> = []
		const modItems = mod.items ?? []

		// Process items in small concurrent batches to avoid overwhelming APIs
		const batchSize = 8
		for (let i = 0; i < modItems.length; i += batchSize) {
			const chunk = modItems.slice(i, i + batchSize)
			const results = await Promise.all(
				chunk.map(async (item) => {
					const base = {
						id: item.id,
						title: item.title,
						type: item.type,
						contentId: item.content_id ?? null,
						pageUrl: item.page_url ?? null,
						htmlUrl: item.html_url ?? null,
						assignmentInfo: assignmentInfo[String(item.id)] ?? null
					}

					async function hydrateItem(): Promise<Record<string, unknown>> {
						// Hydrate per type
						if (item.type === "Page" && typeof item.page_url === "string") {
							const detail = await client.getPageDetail(courseId, item.page_url)
							return { ...base, detail }
						}

						if (item.type === "Assignment" && item.content_id != null) {
							const detail = await client.getAssignmentDetail(courseId, String(item.content_id))
							return { ...base, detail }
						}

						if (item.type === "Quiz" && item.content_id != null) {
							// Get quiz meta
							const quizMeta = await client.getClassicQuizMeta(courseId, String(item.content_id))
							// Inspect flags safely without type assertions
							const QuizFlagsSchema = z
								.object({
									quiz_type: z.string().optional(),
									locked_for_user: z.boolean().optional(),
									published: z.boolean().optional()
								})
								.passthrough()
							const flags = QuizFlagsSchema.safeParse(quizMeta)
							let skipNote: string | null = null
							if (flags.success) {
								const qt = (flags.data.quiz_type || "").toLowerCase()
								const isNew = qt.includes("next") || qt.includes("new")
								const locked = flags.data.locked_for_user === true
								const unpublished = flags.data.published === false
								if (isNew) skipNote = "new quizzes not supported via classic endpoints"
								else if (locked) skipNote = "quiz locked for user"
								else if (unpublished) skipNote = "quiz unpublished"
							}
							if (skipNote) {
								return { ...base, quizMeta, note: skipNote }
							}
							// Get or create a submission id to retrieve questions (avoid 409)
							const submissionId = await client.getOrCreateQuizSubmissionId(courseId, item.content_id)
							const questions = await client.getClassicQuizSubmissionQuestions(String(submissionId))
							return { ...base, quizMeta, submissionId, questions }
						}

						// ExternalUrl, SubHeader, or unknown types: return base only
						return base
					}
					const hydratedResult = await errors.try(hydrateItem())
					if (hydratedResult.error) {
						logger.warn("skipping item due to hydration error", {
							itemId: String(item.id),
							type: item.type,
							error: hydratedResult.error
						})
						return { ...base, error: String(hydratedResult.error) }
					}
					const AnyRecord = z.record(z.string(), z.unknown())
					const parsed = AnyRecord.safeParse(hydratedResult.data)
					if (!parsed.success) {
						logger.warn("skipping item due to invalid shape", {
							itemId: String(item.id),
							type: item.type,
							issues: parsed.error.issues
						})
						return { ...base, error: "invalid shape" }
					}
					return parsed.data
				})
			)
			for (const r of results) items.push(r)
		}

		hydratedModules.push({ id: mod.id, name: mod.name, items })
	}

	const output = {
		courseId: courseIdArg,
		generatedAt: new Date().toISOString(),
		modules: hydratedModules
	}

	const filePath = path.join(outDir, `canvas-course-${courseIdArg}-hydrated.json`)
	const writeResult = await errors.try(fs.writeFile(filePath, JSON.stringify(output, null, 2)))
	if (writeResult.error) {
		logger.error("failed to write hydrated course file", { error: writeResult.error, file: filePath })
		throw errors.wrap(writeResult.error, "canvas dump: write hydrated file")
	}
	logger.info("wrote hydrated modules json (with quiz questions)", { file: filePath })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("operation failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
