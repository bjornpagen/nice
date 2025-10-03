import { parseArgs } from "node:util"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { caliper, oneroster, qti } from "@/lib/clients"
import type { AssessmentItem } from "@/lib/qti"

const EXPORT_BASE_DIR = "./data/exports/qti"

const DEFAULT_IDS = [
	"_6825f945d2b1b04d85dceb99",
	"_680181cd955701fe81627ae0",
	"_6654fe60674ae4000915af66",
	"_670e4557db900d0008b22611",
	"_68266fdf0c14f0a5aaa5e6d1",
	"_67e2e255154239458b0c3de7",
	"_649ed7ed55615f0008c0d690"
]

async function findResourceInOneroster(resourceId: string) {
	logger.info("checking oneroster", { resourceId })
	
	const resourceResult = await errors.try(oneroster.getResource(resourceId))
	if (resourceResult.error) {
		logger.debug("oneroster resource not found", { resourceId, error: resourceResult.error })
		return null
	}
	if (!resourceResult.data) {
		logger.debug("oneroster resource returned null", { resourceId })
		return null
	}
	
	logger.info("found oneroster resource", { 
		resourceId, 
		title: resourceResult.data.title,
		metadata: resourceResult.data.metadata 
	})
	
	return resourceResult.data
}

function extractQuestionIdentifiers(rawXml: string): string[] {
	// log a sample of the xml to see the structure
	logger.debug("raw xml sample", { sample: rawXml.substring(0, 500) })
	
	// try multiple patterns bc qti xml format can vary
	const patterns = [
		/<assessmentItemRef[^>]*identifier="([^"]+)"/g,
		/<qti-assessment-item-ref[^>]*identifier="([^"]+)"/g,
		/<qti:assessmentItemRef[^>]*identifier="([^"]+)"/g,
		/identifier="([^"]+)"[^>]*href="[^"]*\.xml"/g  // sometimes identifier comes before href
	]
	
	const identifiers: string[] = []
	
	for (const pattern of patterns) {
		let match: RegExpExecArray | null
		while ((match = pattern.exec(rawXml)) !== null) {
			if (match[1] && !identifiers.includes(match[1])) {
				identifiers.push(match[1])
			}
		}
		
		if (identifiers.length > 0) {
			logger.debug("matched pattern", { pattern: pattern.source, count: identifiers.length })
			break
		}
	}
	
	return identifiers
}

async function fetchQuestionsForTest(testId: string, rawXml: string): Promise<AssessmentItem[]> {
	const questionIds = extractQuestionIdentifiers(rawXml)
	logger.info("extracted question identifiers", { testId, count: questionIds.length })
	
	// create export directory for this test
	const testExportDir = join(EXPORT_BASE_DIR, testId)
	const mkdirResult = await errors.try(mkdir(testExportDir, { recursive: true }))
	if (mkdirResult.error) {
		logger.error("failed to create export directory", { testId, dir: testExportDir, error: mkdirResult.error })
		throw errors.wrap(mkdirResult.error, "export directory creation")
	}
	logger.info("created export directory", { testId, dir: testExportDir })
	
	const questions: AssessmentItem[] = []
	
	for (const questionId of questionIds) {
		const itemResult = await errors.try(qti.getAssessmentItem(questionId))
		if (itemResult.error) {
			logger.warn("failed to fetch question", { testId, questionId, error: itemResult.error })
			continue
		}
		
		const item = itemResult.data
		logger.debug("fetched question", { 
			testId, 
			questionId, 
			title: item.title,
			type: item.type
		})
		
		// save raw xml to file
		const filename = `${item.identifier}.xml`
		const filepath = join(testExportDir, filename)
		const writeResult = await errors.try(writeFile(filepath, item.rawXml, "utf-8"))
		if (writeResult.error) {
			logger.error("failed to write question xml", { testId, questionId, filepath, error: writeResult.error })
			throw errors.wrap(writeResult.error, "question xml write")
		}
		logger.info("saved question xml", { testId, questionId, filepath })
		
		questions.push(item)
	}
	
	logger.info("fetched all questions for test", { testId, count: questions.length, exportDir: testExportDir })
	return questions
}

async function findAssessmentTestInQti(assessmentId: string) {
	logger.info("checking qti assessment test", { assessmentId })
	
	const assessmentResult = await errors.try(qti.getAssessmentTest(assessmentId))
	if (assessmentResult.error) {
		logger.debug("qti assessment test not found", { assessmentId, error: assessmentResult.error })
		return null
	}
	
	logger.info("found qti assessment test", { 
		assessmentId,
		title: assessmentResult.data.title,
		identifier: assessmentResult.data.identifier
	})
	
	return assessmentResult.data
}

async function findAssessmentItemInQti(itemId: string) {
	logger.info("checking qti assessment item", { itemId })
	
	const itemResult = await errors.try(qti.getAssessmentItem(itemId))
	if (itemResult.error) {
		logger.debug("qti assessment item not found", { itemId, error: itemResult.error })
		return null
	}
	
	logger.info("found qti assessment item", { 
		itemId,
		title: itemResult.data.title,
		type: itemResult.data.type
	})
	
	return itemResult.data
}

async function findResource(id: string) {
	logger.info("searching for resource", { id })
	
	// try oneroster first
	const onerosterResource = await findResourceInOneroster(id)
	if (onerosterResource) {
		// if found, check if it has qti metadata
		const qtiId = onerosterResource.metadata?.qtiAssessmentId
		if (qtiId) {
			logger.info("found qti reference in oneroster", { id, qtiId })
			const test = await findAssessmentTestInQti(qtiId as string)
			if (test) {
				await fetchQuestionsForTest(test.identifier, test.rawXml)
			}
		}
		return
	}
	
	// try qti assessment test
	const qtiAssessment = await findAssessmentTestInQti(id)
	if (qtiAssessment) {
		await fetchQuestionsForTest(qtiAssessment.identifier, qtiAssessment.rawXml)
		return
	}
	
	// try qti assessment item
	const qtiItem = await findAssessmentItemInQti(id)
	if (qtiItem) {
		return
	}
	
	logger.warn("resource not found anywhere", { id })
}

async function main() {
	const { values } = parseArgs({
		options: {
			ids: {
				type: "string",
				short: "i",
				multiple: true,
				description: "timeback ids to search for (can specify multiple times)"
			},
			all: {
				type: "boolean",
				short: "a",
				description: "search all default ids"
			}
		}
	})
	
	const idsToSearch = values.all ? DEFAULT_IDS : (values.ids ?? [])
	
	if (idsToSearch.length === 0) {
		logger.error("no ids provided", {})
		throw errors.new("must provide --ids or --all flag")
	}
	
	logger.info("starting search", { count: idsToSearch.length })
	
	for (const id of idsToSearch) {
		await findResource(id)
		logger.info("---")
	}
	
	logger.info("search complete")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

