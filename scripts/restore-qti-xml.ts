import * as fs from "node:fs/promises"
import * as errors from "@superbuilders/errors"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions, niceArticles } from "@/db/schemas"
import * as logger from "@superbuilders/slog"

interface RestoreOptions {
	backupPath: string
	dryRun: boolean
	type: "questions" | "articles"
}

async function main(options: RestoreOptions): Promise<void> {
	logger.info("starting qti xml restore", {
		backupPath: options.backupPath,
		dryRun: options.dryRun,
		type: options.type
	})

	const readResult = await errors.try(fs.readFile(options.backupPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read backup file", { error: readResult.error, path: options.backupPath })
		throw errors.wrap(readResult.error, "read backup")
	}

	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse backup json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse backup")
	}

	const backup = parseResult.data

	if (options.type === "questions") {
		await restoreQuestions(backup.questions || [], options.dryRun)
	} else {
		await restoreArticles(backup.articles || [], options.dryRun)
	}

	logger.info("restore complete", { dryRun: options.dryRun })
}

async function restoreQuestions(
	questions: Array<{ id: string; xml: string | null; structuredJson: unknown }>,
	dryRun: boolean
): Promise<void> {
	logger.info("restoring questions", { count: questions.length, dryRun })

	let restored = 0
	for (const q of questions) {
		if (!q.xml) {
			logger.debug("skipping question without xml", { questionId: q.id })
			continue
		}

		if (dryRun) {
			logger.info("dry-run: would restore question", {
				questionId: q.id,
				xmlLength: q.xml.length
			})
		} else {
			const updateResult = await errors.try(
				db
					.update(niceQuestions)
					.set({
						xml: q.xml,
						structuredJson: q.structuredJson
					})
					.where(eq(niceQuestions.id, q.id))
			)

			if (updateResult.error) {
				logger.error("failed to restore question", {
					questionId: q.id,
					error: updateResult.error
				})
				continue
			}

			logger.debug("restored question", { questionId: q.id })
		}

		restored++
	}

	logger.info("questions restore summary", {
		total: questions.length,
		restored,
		dryRun
	})
}

async function restoreArticles(
	articles: Array<{ id: string; xml: string | null }>,
	dryRun: boolean
): Promise<void> {
	logger.info("restoring articles", { count: articles.length, dryRun })

	let restored = 0
	for (const a of articles) {
		if (!a.xml) {
			logger.debug("skipping article without xml", { articleId: a.id })
			continue
		}

		if (dryRun) {
			logger.info("dry-run: would restore article", {
				articleId: a.id,
				xmlLength: a.xml.length
			})
		} else {
			const updateResult = await errors.try(
				db.update(niceArticles).set({ xml: a.xml }).where(eq(niceArticles.id, a.id))
			)

			if (updateResult.error) {
				logger.error("failed to restore article", {
					articleId: a.id,
					error: updateResult.error
				})
				continue
			}

			logger.debug("restored article", { articleId: a.id })
		}

		restored++
	}

	logger.info("articles restore summary", {
		total: articles.length,
		restored,
		dryRun
	})
}

// Parse CLI args
const argv = process.argv.slice(2)
if (argv.length === 0) {
	console.log("usage: bun run scripts/restore-qti-xml.ts <backup-file> [--apply] [--type questions|articles]")
	process.exit(1)
}

const backupPath = argv[0]
if (!backupPath) {
	throw errors.new("backup file path required")
}

const options: RestoreOptions = {
	backupPath,
	dryRun: true,
	type: "questions"
}

for (let i = 1; i < argv.length; i++) {
	const arg = argv[i]
	if (!arg) continue

	if (arg === "--apply") {
		options.dryRun = false
	} else if (arg === "--type") {
		const nextArg = argv[i + 1]
		if (nextArg !== "questions" && nextArg !== "articles") {
			throw errors.new("--type must be 'questions' or 'articles'")
		}
		options.type = nextArg
		i++
	}
}

const result = await errors.try(main(options))
if (result.error) {
	logger.error("restore failed", { error: result.error })
	process.exit(1)
}
