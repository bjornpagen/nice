import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import * as logger from "@superbuilders/slog"

interface BackupOptions {
	outputDir: string
	includeQuestions: boolean
	includeArticles: boolean
	courseIds?: string[]
}

async function main(options: BackupOptions): Promise<void> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
	const backupDir = path.join(options.outputDir, `qti-backup-${timestamp}`)

	logger.info("starting qti xml backup", {
		backupDir,
		includeQuestions: options.includeQuestions,
		includeArticles: options.includeArticles,
		courseIds: options.courseIds
	})

	const mkdirResult = await errors.try(fs.mkdir(backupDir, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create backup directory", { error: mkdirResult.error, backupDir })
		throw errors.wrap(mkdirResult.error, "mkdir backup")
	}

	if (options.includeQuestions) {
		await backupQuestions(backupDir, options.courseIds)
	}

	if (options.includeArticles) {
		await backupArticles(backupDir, options.courseIds)
	}

	logger.info("backup complete", { backupDir })
}

async function backupQuestions(backupDir: string, courseIds?: string[]): Promise<void> {
	logger.info("backing up questions xml")

	const questionsResult = await errors.try(
		db.query.niceQuestions.findMany({
			columns: {
				id: true,
				exerciseId: true,
				xml: true,
				structuredJson: true
			}
		})
	)

	if (questionsResult.error) {
		logger.error("failed to fetch questions", { error: questionsResult.error })
		throw errors.wrap(questionsResult.error, "fetch questions")
	}

	const questions = questionsResult.data
	const questionsWithXml = questions.filter((q) => q.xml)

	logger.info("found questions with xml", {
		total: questions.length,
		withXml: questionsWithXml.length
	})

	const backup = {
		timestamp: new Date().toISOString(),
		count: questionsWithXml.length,
		questions: questionsWithXml.map((q) => ({
			id: q.id,
			exerciseId: q.exerciseId,
			xml: q.xml,
			structuredJson: q.structuredJson
		}))
	}

	const questionsPath = path.join(backupDir, "questions.json")
	const writeResult = await errors.try(fs.writeFile(questionsPath, JSON.stringify(backup, null, 2)))

	if (writeResult.error) {
		logger.error("failed to write questions backup", { error: writeResult.error })
		throw errors.wrap(writeResult.error, "write questions")
	}

	logger.info("questions backup written", { path: questionsPath, count: questionsWithXml.length })
}

async function backupArticles(backupDir: string, courseIds?: string[]): Promise<void> {
	logger.info("backing up articles xml")

	const articlesResult = await errors.try(
		db.query.niceArticles.findMany({
			columns: {
				id: true,
				title: true,
				slug: true,
				xml: true
			}
		})
	)

	if (articlesResult.error) {
		logger.error("failed to fetch articles", { error: articlesResult.error })
		throw errors.wrap(articlesResult.error, "fetch articles")
	}

	const articles = articlesResult.data
	const articlesWithXml = articles.filter((a) => a.xml)

	logger.info("found articles with xml", {
		total: articles.length,
		withXml: articlesWithXml.length
	})

	const backup = {
		timestamp: new Date().toISOString(),
		count: articlesWithXml.length,
		articles: articlesWithXml.map((a) => ({
			id: a.id,
			title: a.title,
			slug: a.slug,
			xml: a.xml
		}))
	}

	const articlesPath = path.join(backupDir, "articles.json")
	const writeResult = await errors.try(fs.writeFile(articlesPath, JSON.stringify(backup, null, 2)))

	if (writeResult.error) {
		logger.error("failed to write articles backup", { error: writeResult.error })
		throw errors.wrap(writeResult.error, "write articles")
	}

	logger.info("articles backup written", { path: articlesPath, count: articlesWithXml.length })
}

// Parse CLI args
const argv = process.argv.slice(2)
const options: BackupOptions = {
	outputDir: "./backups",
	includeQuestions: true,
	includeArticles: true
}

for (let i = 0; i < argv.length; i++) {
	const arg = argv[i]
	if (!arg) continue

	if (arg === "--output-dir" || arg === "-o") {
		const nextArg = argv[i + 1]
		if (!nextArg) {
			throw errors.new("--output-dir requires a value")
		}
		options.outputDir = nextArg
		i++
	} else if (arg === "--questions-only") {
		options.includeArticles = false
	} else if (arg === "--articles-only") {
		options.includeQuestions = false
	}
}

const result = await errors.try(main(options))
if (result.error) {
	logger.error("backup failed", { error: result.error })
	process.exit(1)
}
