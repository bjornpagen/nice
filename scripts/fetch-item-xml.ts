import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { niceQuestions } from "@/db/schemas"
import { qti } from "@/lib/clients"

type CliArgs = {
	id: string
	only?: "qti" | "db"
}

function parseArgs(argv: string[]): CliArgs {
	const idFlagIndex = argv.indexOf("--id")
	if (idFlagIndex === -1 || !argv[idFlagIndex + 1]) {
		logger.error("missing required --id flag", {})
		throw errors.new("missing --id flag")
	}
	const id = argv[idFlagIndex + 1]
	const onlyIdx = argv.indexOf("--only")
	const onlyVal = onlyIdx !== -1 ? argv[onlyIdx + 1] : undefined
	let only: "qti" | "db" | undefined
	if (onlyVal === "qti") {
		only = "qti"
	} else if (onlyVal === "db") {
		only = "db"
	}
	if (typeof id !== "string" || id.trim() === "") {
		logger.error("invalid id value", { id })
		throw errors.new("invalid id")
	}
	return { id: id.trim(), only }
}

function fetchXmlFromDb(baseQuestionId: string): Promise<string> {
	logger.info("fetching xml from db", { baseQuestionId })
	return db
		.select({ xml: niceQuestions.xml })
		.from(niceQuestions)
		.where(eq(niceQuestions.id, baseQuestionId))
		.limit(1)
		.then((rows) => {
			const row = rows[0]
			if (!row) {
				logger.error("question not found in db", { baseQuestionId })
				throw errors.new("question not found")
			}
			if (!row.xml || row.xml.trim() === "") {
				logger.error("xml empty in db record", { baseQuestionId })
				throw errors.new("xml empty in db")
			}
			return row.xml
		})
}

async function fetchXmlFromQti(itemIdentifier: string): Promise<string> {
	logger.info("fetching xml from qti api", { itemIdentifier })
	const itemResult = await errors.try(qti.getAssessmentItem(itemIdentifier))
	if (itemResult.error) {
		logger.error("qti api fetch failed", { error: itemResult.error, itemIdentifier })
		throw errors.wrap(itemResult.error, "qti get assessment item")
	}
	const xml = itemResult.data.rawXml
	if (!xml || xml.trim() === "") {
		logger.error("qti api returned empty xml", { itemIdentifier })
		throw errors.new("empty xml from qti api")
	}
	return xml
}

async function writeXmlToTmp(idForFilename: string, xml: string): Promise<string> {
	const outDir = path.join(process.cwd(), "tmp")
	const outPath = path.join(outDir, `item-${idForFilename}.xml`)
	const mkdirResult = await errors.try(fs.mkdir(outDir, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create tmp directory", { error: mkdirResult.error, dir: outDir })
		throw errors.wrap(mkdirResult.error, "create tmp dir")
	}
	const writeResult = await errors.try(fs.writeFile(outPath, xml))
	if (writeResult.error) {
		logger.error("failed to write xml file", { error: writeResult.error, file: outPath })
		throw errors.wrap(writeResult.error, "write xml file")
	}
	return outPath
}

async function main(): Promise<void> {
	const { id, only } = parseArgs(process.argv)

	const tasks: Array<Promise<void>> = []

	// qti fetch if either explicitly requested or id looks like a qti item
	if (only !== "db" && (only === "qti" || id.startsWith("nice_"))) {
		tasks.push(
			(async () => {
				const xml = await fetchXmlFromQti(id)
				const outPath = await writeXmlToTmp(id, xml)
				logger.info("wrote qti item xml to file", { file: outPath })
			})()
		)
	}

	// db fetch if explicitly requested or id looks like base question id
	if (only !== "qti" && (only === "db" || !id.startsWith("nice_"))) {
		tasks.push(
			(async () => {
				const xml = await fetchXmlFromDb(id)
				const outPath = await writeXmlToTmp(id, xml)
				logger.info("wrote db question xml to file", { file: outPath })
			})()
		)
	}

	if (tasks.length === 0) {
		logger.error("nothing to fetch: check --id and --only", { id, only })
		throw errors.new("nothing to fetch")
	}

	await Promise.all(tasks)
}

// script error logging pattern
const result = await errors.try(main())
if (result.error) {
	logger.error("operation failed", { error: result.error })
	process.exit(1)
}
