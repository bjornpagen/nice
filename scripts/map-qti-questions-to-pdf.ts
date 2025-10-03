#!/usr/bin/env bun
import * as p from "@clack/prompts"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import * as fs from "node:fs"
import * as path from "node:path"
import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

const QuestionMappingItemSchema = z.object({
	question_id: z.string(),
	question_no: z.number()
})

const QuestionMappingsArraySchema = z.array(QuestionMappingItemSchema)

const QuestionMappingsSchema = z.object({
	mappings: z.array(QuestionMappingItemSchema)
})

interface QuestionMapping {
	question_id: string
	question_no: number
	question_st?: string
}

async function readXmlFiles(questionId: string): Promise<Map<string, string>> {
	const dirPath = path.join(process.cwd(), "data", "exports", "qti", questionId)
	
	logger.debug("reading xml files", { dirPath })
	
	const readDirResult = errors.trySync(() => fs.readdirSync(dirPath))
	if (readDirResult.error) {
		logger.error("failed to read directory", { error: readDirResult.error, dirPath })
		throw errors.wrap(readDirResult.error, "read directory")
	}
	
	const files = readDirResult.data
	const xmlFiles = files.filter((f) => f.endsWith(".xml"))
	
	logger.debug("found xml files", { count: xmlFiles.length })
	
	const xmlMap = new Map<string, string>()
	
	for (const xmlFile of xmlFiles) {
		const xmlPath = path.join(dirPath, xmlFile)
		const readResult = errors.trySync(() => fs.readFileSync(xmlPath, "utf-8"))
		if (readResult.error) {
			logger.error("failed to read xml file", { error: readResult.error, xmlPath })
			throw errors.wrap(readResult.error, "read xml file")
		}
		
		const xmlId = path.basename(xmlFile, ".xml")
		xmlMap.set(xmlId, readResult.data)
		logger.debug("loaded xml file", { xmlId, path: xmlPath })
	}
	
	return xmlMap
}

async function findPdfFile(questionId: string): Promise<string> {
	const dirPath = path.join(process.cwd(), "data", "exports", "qti", questionId)
	
	logger.debug("searching for pdf file", { dirPath })
	
	const readDirResult = errors.trySync(() => fs.readdirSync(dirPath))
	if (readDirResult.error) {
		logger.error("failed to read directory for pdf", { error: readDirResult.error, dirPath })
		throw errors.wrap(readDirResult.error, "read directory for pdf")
	}
	
	const files = readDirResult.data
	const pdfFiles = files.filter((f) => f.endsWith(".pdf"))
	
	if (pdfFiles.length === 0) {
		throw errors.new("no pdf file found in directory")
	}
	
	if (pdfFiles.length > 1) {
		logger.warn("multiple pdf files found, using first", { count: pdfFiles.length, files: pdfFiles })
	}
	
	const pdfFile = pdfFiles[0]
	if (!pdfFile) {
		throw errors.new("pdf file is undefined")
	}
	
	const pdfPath = path.join(dirPath, pdfFile)
	logger.debug("found pdf file", { pdfPath })
	
	return pdfPath
}

async function parseCsvStandards(questionId: string): Promise<Map<number, string>> {
	const dirPath = path.join(process.cwd(), "data", "exports", "qti", questionId)
	
	logger.debug("searching for csv file", { dirPath })
	
	const readDirResult = errors.trySync(() => fs.readdirSync(dirPath))
	if (readDirResult.error) {
		logger.error("failed to read directory for csv", { error: readDirResult.error, dirPath })
		throw errors.wrap(readDirResult.error, "read directory for csv")
	}
	
	const files = readDirResult.data
	const csvFiles = files.filter((f) => f.endsWith(".csv"))
	
	if (csvFiles.length === 0) {
		logger.warn("no csv file found, standards will not be included")
		return new Map()
	}
	
	if (csvFiles.length > 1) {
		logger.warn("multiple csv files found, using first", { count: csvFiles.length, files: csvFiles })
	}
	
	const csvFile = csvFiles[0]
	if (!csvFile) {
		throw errors.new("csv file is undefined")
	}
	
	const csvPath = path.join(dirPath, csvFile)
	logger.debug("found csv file", { csvPath })
	
	const readCsvResult = errors.trySync(() => fs.readFileSync(csvPath, "utf-8"))
	if (readCsvResult.error) {
		logger.error("failed to read csv file", { error: readCsvResult.error, csvPath })
		throw errors.wrap(readCsvResult.error, "read csv file")
	}
	
	const csvContent = readCsvResult.data
	const lines = csvContent.split("\n").filter((line) => line.trim().length > 0)
	
	if (lines.length === 0) {
		throw errors.new("csv file is empty")
	}
	
	const header = lines[0]
	if (!header) {
		throw errors.new("csv header is undefined")
	}
	
	const headers = header.split(",")
	const itemIndex = headers.indexOf("ITEM")
	const standardIndex = headers.indexOf("CONTENT STUDENT EXPECTATION")
	
	if (itemIndex === -1) {
		throw errors.new("ITEM column not found in csv")
	}
	
	if (standardIndex === -1) {
		throw errors.new("CONTENT STUDENT EXPECTATION column not found in csv")
	}
	
	logger.debug("parsing csv", { itemIndex, standardIndex, rowCount: lines.length - 1 })
	
	const standardsMap = new Map<number, string>()
	
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i]
		if (!line) {
			continue
		}
		
		const cells = line.split(",")
		const itemCell = cells[itemIndex]
		const standardCell = cells[standardIndex]
		
		if (!itemCell || !standardCell) {
			logger.warn("skipping row with missing data", { rowIndex: i, itemCell, standardCell })
			continue
		}
		
		const itemNumber = Number.parseInt(itemCell.trim())
		if (Number.isNaN(itemNumber)) {
			logger.warn("skipping row with invalid item number", { rowIndex: i, itemCell })
			continue
		}
		
		const standardRaw = standardCell.trim()
		const standard = standardRaw.replace(/\(([A-Z])\)/, ".$1")
		standardsMap.set(itemNumber, standard)
		logger.debug("parsed standard", { itemNumber, standardRaw, standard })
	}
	
	logger.debug("parsed standards", { count: standardsMap.size })
	
	return standardsMap
}

async function mapQuestionsWithOpenAI(
	xmlMap: Map<string, string>,
	pdfPath: string,
	previousErrors?: { duplicateIds?: string[]; missingIds?: string[] }
): Promise<QuestionMapping[]> {
	const openaiKey = process.env.OPENAI_API_KEY
	if (!openaiKey) {
		throw errors.new("OPENAI_API_KEY environment variable not set")
	}
	
	const client = new OpenAI({ apiKey: openaiKey })
	
	logger.debug("reading pdf file for upload", { pdfPath })
	const readPdfResult = errors.trySync(() => fs.readFileSync(pdfPath))
	if (readPdfResult.error) {
		logger.error("failed to read pdf file", { error: readPdfResult.error, pdfPath })
		throw errors.wrap(readPdfResult.error, "read pdf file")
	}
	
	const pdfData = readPdfResult.data
	const base64Pdf = pdfData.toString("base64")
	const pdfFilename = path.basename(pdfPath)
	
	logger.debug("uploading pdf to openai", { pdfFilename, sizeBytes: pdfData.length })
	
	const xmlEntries = Array.from(xmlMap.entries())
	const xmlContext = xmlEntries
		.map(([id, content]) => {
			return `XML ID: ${id}\n\`\`\`xml\n${content}\n\`\`\``
		})
		.join("\n\n")
	
	let errorContext = ""
	if (previousErrors) {
		if (previousErrors.duplicateIds && previousErrors.duplicateIds.length > 0) {
			errorContext += `\n⚠️ PREVIOUS ATTEMPT ERROR: You created DUPLICATE mappings for these question IDs:\n${previousErrors.duplicateIds.map((id) => `  - ${id}`).join("\n")}\nDo NOT duplicate these IDs again. Each ID must appear EXACTLY ONCE.\n`
		}
		if (previousErrors.missingIds && previousErrors.missingIds.length > 0) {
			errorContext += `\n⚠️ PREVIOUS ATTEMPT ERROR: You FORGOT to map these question IDs:\n${previousErrors.missingIds.map((id) => `  - ${id}`).join("\n")}\nYou MUST include these IDs in your response.\n`
		}
	}
	
	const prompt = `You are tasked with mapping XML question files to their corresponding question numbers in a PDF test document.
${errorContext}
⚠️ CRITICAL: You MUST map ALL ${xmlMap.size} questions. Do NOT skip any questions. Every single XML file listed below MUST appear in your response.

I have ${xmlMap.size} XML files, each representing a question. Each XML file has an ID.

Here are ALL ${xmlMap.size} XML files that MUST be mapped:

${xmlContext}

The PDF attached contains the test with questions numbered sequentially starting from 1.

Your task:
1. Read the PDF and identify each question by its number (1, 2, 3, etc.)
2. For each XML file, extract the question text (ignore XML formatting like <qti-prompt>, MathML, etc.)
3. Match the question text from the XML to the VERBATIM text in the PDF - the text will be identical except for XML/MathML formatting
4. Return a JSON array with EXACTLY ${xmlMap.size} mappings - one for each XML ID listed above

MATCHING STRATEGY:
- The question text in the XML and PDF are VERBATIM copies (same words, same order)
- Ignore XML tags like <div>, <span>, <qti-prompt>, etc.
- Ignore MathML formatting - focus on the actual text and numbers
- Match based on TEXT SIMILARITY, not semantic understanding
- If a question has unique numbers or phrases, use those as anchors for matching

The response must be a valid JSON array with this exact structure:
[
  { "question_id": "_4a9b71aa-abbe-4533-b174-7eef8a0343c0", "question_no": 1 },
  { "question_id": "_47b7e0c2-56e3-411c-95d8-ff0f0a469f82", "question_no": 2 }
]

IMPORTANT:
- There is a one-to-one mapping between XML files and PDF questions
- Every XML file must be mapped to exactly one question number
- Each XML ID can only appear ONCE in your response
- Each question number can only appear ONCE in your response
- Do NOT create duplicate mappings - if two questions seem similar, look more carefully
- Return ONLY the JSON array, no additional text or explanation

⚠️ FINAL REMINDER BEFORE RESPONDING:
1. Count your JSON array entries - must be EXACTLY ${xmlMap.size}
2. Check for duplicate XML IDs - each ID from the list above must appear EXACTLY ONCE
3. Check for duplicate question numbers - each number from 1 to ${xmlMap.size} must appear EXACTLY ONCE
4. If any XML ID appears more than once, you have made a CRITICAL ERROR and must fix it
5. If any question number appears more than once, you have made a CRITICAL ERROR and must fix it

YOUR RESPONSE WILL BE REJECTED IF:
- You have duplicate XML IDs
- You have duplicate question numbers  
- You have fewer than ${xmlMap.size} entries
- You have more than ${xmlMap.size} entries

Before submitting your response, MANUALLY VERIFY each XML ID appears exactly once.`
	
	logger.info("sending request to openai with structured outputs", { 
		model: "gpt-4o",
		xmlCount: xmlMap.size,
		pdfFilename 
	})
	
	const responseResult = await errors.try(
		client.responses.parse({
			model: "gpt-4o",
			input: [
				{
					role: "user",
					content: [
						{
							type: "input_text",
							text: prompt
						},
						{
							type: "input_file",
							filename: pdfFilename,
							file_data: `data:application/pdf;base64,${base64Pdf}`
						}
					]
				}
			],
			text: {
				format: zodTextFormat(QuestionMappingsSchema, "question_mappings")
			}
		})
	)
	
	if (responseResult.error) {
		logger.error("openai api request failed", { error: responseResult.error })
		throw errors.wrap(responseResult.error, "openai api request")
	}
	
	const response = responseResult.data
	const parsed = response.output_parsed
	
	if (!parsed) {
		throw errors.new("openai response has no parsed output")
	}
	
	logger.debug("received structured response from openai", { 
		mappingCount: parsed.mappings.length
	})
	
	return parsed.mappings
}

async function main() {
	p.intro("🗺️  QTI Question to PDF Mapper")
	
	const questionId = await p.text({
		message: "enter question directory ID:",
		placeholder: "e.g., _67e2e255154239458b0c3de7",
		validate: (value) => {
			if (!value || value.trim().length === 0) {
				return "question ID is required"
			}
		}
	})
	
	if (p.isCancel(questionId)) {
		p.cancel("operation cancelled")
		process.exit(0)
	}
	
	const existingJsonPath = path.join(
		process.cwd(),
		"data",
		"exports",
		"qti",
		questionId,
		"question-mappings.json"
	)
	
	let mappings: QuestionMapping[] = []
	let useExisting = false
	
	const existsResult = errors.trySync(() => fs.existsSync(existingJsonPath))
	if (existsResult.error) {
		logger.error("failed to check for existing json", { error: existsResult.error })
		throw errors.wrap(existsResult.error, "check existing json")
	}
	
	if (existsResult.data) {
		const shouldUseExisting = await p.confirm({
			message: "existing question-mappings.json found. use it instead of calling openai?",
			initialValue: true
		})
		
		if (p.isCancel(shouldUseExisting)) {
			p.cancel("operation cancelled")
			process.exit(0)
		}
		
		if (shouldUseExisting) {
			useExisting = true
			
			const readJsonSpinner = p.spinner()
			readJsonSpinner.start("loading existing mappings...")
			
			const readJsonResult = errors.trySync(() => fs.readFileSync(existingJsonPath, "utf-8"))
			if (readJsonResult.error) {
				readJsonSpinner.stop("failed to read json")
				logger.error("failed to read existing json", { error: readJsonResult.error })
				throw errors.wrap(readJsonResult.error, "read existing json")
			}
			
			const parseJsonResult = errors.trySync(() => JSON.parse(readJsonResult.data))
			if (parseJsonResult.error) {
				readJsonSpinner.stop("failed to parse json")
				logger.error("failed to parse existing json", { error: parseJsonResult.error })
				throw errors.wrap(parseJsonResult.error, "parse existing json")
			}
			
			const validationResult = QuestionMappingsArraySchema.safeParse(parseJsonResult.data)
			if (!validationResult.success) {
				readJsonSpinner.stop("invalid json format")
				logger.error("invalid existing json format", { error: validationResult.error })
				throw errors.wrap(validationResult.error, "validate existing json")
			}
			
			mappings = validationResult.data
			readJsonSpinner.stop(`loaded ${mappings.length} existing mappings`)
		}
	}
	
	if (!useExisting) {
		const xmlSpinner = p.spinner()
		xmlSpinner.start("loading xml files...")
		
		const xmlMapResult = await errors.try(readXmlFiles(questionId))
		if (xmlMapResult.error) {
			xmlSpinner.stop("failed to load xml files")
			logger.error("xml loading failed", { error: xmlMapResult.error })
			throw errors.wrap(xmlMapResult.error, "load xml files")
		}
		
		const xmlMap = xmlMapResult.data
		xmlSpinner.stop(`loaded ${xmlMap.size} xml files`)
		
		const pdfSpinner = p.spinner()
		pdfSpinner.start("finding pdf file...")
		
		const pdfPathResult = await errors.try(findPdfFile(questionId))
		if (pdfPathResult.error) {
			pdfSpinner.stop("failed to find pdf")
			logger.error("pdf search failed", { error: pdfPathResult.error })
			throw errors.wrap(pdfPathResult.error, "find pdf file")
		}
		
		const pdfPath = pdfPathResult.data
		const pdfFilename = path.basename(pdfPath)
		pdfSpinner.stop(`found pdf: ${pdfFilename}`)
		
		const mapSpinner = p.spinner()
		
		let attempts = 0
		const maxAttempts = 3
		let mappingSuccess = false
		let previousErrors: { duplicateIds?: string[]; missingIds?: string[] } | undefined
		
		while (attempts < maxAttempts && !mappingSuccess) {
			attempts++
			
			if (attempts > 1) {
				mapSpinner.start(`retrying mapping (attempt ${attempts}/${maxAttempts})...`)
				logger.info("retrying openai mapping", { attempt: attempts, previousErrors })
			} else {
				mapSpinner.start("mapping questions with openai (this may take a minute)...")
			}
			
			const mappingResult = await errors.try(mapQuestionsWithOpenAI(xmlMap, pdfPath, previousErrors))
			if (mappingResult.error) {
				mapSpinner.stop("mapping failed")
				logger.error("openai mapping failed", { error: mappingResult.error, attempt: attempts })
				
				if (attempts >= maxAttempts) {
					throw errors.wrap(mappingResult.error, "map questions")
				}
				continue
			}
			
			mappings = mappingResult.data
			mapSpinner.stop("mapping complete")
		
			logger.debug("validating mappings", { 
				receivedMappings: mappings.length,
				expectedCount: xmlMap.size,
				attempt: attempts
			})
			
			const xmlIds = Array.from(xmlMap.keys())
			
			logger.debug("checking for duplicate question IDs")
			const questionIdCounts = new Map<string, number>()
			for (const mapping of mappings) {
				questionIdCounts.set(mapping.question_id, (questionIdCounts.get(mapping.question_id) || 0) + 1)
			}
			
			const duplicateQuestionIds = Array.from(questionIdCounts.entries())
				.filter(([_, count]) => count > 1)
				.map(([id, count]) => ({ question_id: id, count }))
			
			const mappedIds = new Set(mappings.map((m) => m.question_id))
			const missingIds = xmlIds.filter((id) => !mappedIds.has(id))
			
			logger.debug("checking for duplicate question numbers")
			const questionNoCounts = new Map<number, string[]>()
			for (const mapping of mappings) {
				if (!questionNoCounts.has(mapping.question_no)) {
					questionNoCounts.set(mapping.question_no, [])
				}
				questionNoCounts.get(mapping.question_no)?.push(mapping.question_id)
			}
			
			const duplicates = Array.from(questionNoCounts.entries())
				.filter(([_, ids]) => ids.length > 1)
				.map(([qno, ids]) => ({ question_no: qno, question_ids: ids }))
			
			logger.debug("duplicate check complete", { duplicateCount: duplicates.length })
			
			const hasErrors = duplicateQuestionIds.length > 0 || duplicates.length > 0 || missingIds.length > 0
			
			if (hasErrors) {
				if (duplicateQuestionIds.length > 0) {
					logger.error("duplicate question IDs in mappings", { duplicateQuestionIds, attempt: attempts })
				}
				if (duplicates.length > 0) {
					logger.error("duplicate question numbers detected", { duplicates, attempt: attempts })
				}
				if (missingIds.length > 0) {
					logger.error("some questions were not mapped", { 
						total: xmlIds.length,
						mapped: mappings.length,
						uniquelyMapped: mappedIds.size,
						missing: missingIds.length,
						missingIds,
						attempt: attempts
					})
				}
				
				if (attempts >= maxAttempts) {
					const errorMessages = []
					if (duplicateQuestionIds.length > 0) {
						const dupeDetails = duplicateQuestionIds
							.map((d) => `${d.question_id} (appears ${d.count} times)`)
							.join(", ")
						errorMessages.push(`duplicate question IDs: ${dupeDetails}`)
					}
					if (duplicates.length > 0) {
						const dupeDetails = duplicates
							.map((d) => `Q${d.question_no}: ${d.question_ids.join(", ")}`)
							.join("; ")
						errorMessages.push(`duplicate question numbers: ${dupeDetails}`)
					}
					if (missingIds.length > 0) {
						errorMessages.push(`missing mappings: ${missingIds.join(", ")}`)
					}
					throw errors.new(`validation failed after ${maxAttempts} attempts: ${errorMessages.join("; ")}`)
				}
				
				const allDuplicatedIdsFromQIds = duplicateQuestionIds.map((d) => d.question_id)
				const allDuplicatedIdsFromQNos = duplicates.flatMap((d) => d.question_ids)
				const allDuplicatedIds = [...new Set([...allDuplicatedIdsFromQIds, ...allDuplicatedIdsFromQNos])]
				
				previousErrors = {
					duplicateIds: allDuplicatedIds,
					missingIds: missingIds
				}
				continue
			}
			
			logger.debug("validated all questions are mapped", { count: mappings.length, attempt: attempts })
			mappingSuccess = true
		}
	}
	
	const csvSpinner = p.spinner()
	csvSpinner.start("parsing csv standards...")
	
	const standardsMapResult = await errors.try(parseCsvStandards(questionId))
	if (standardsMapResult.error) {
		csvSpinner.stop("failed to parse csv")
		logger.error("csv parsing failed", { error: standardsMapResult.error })
		throw errors.wrap(standardsMapResult.error, "parse csv standards")
	}
	
	const standardsMap = standardsMapResult.data
	csvSpinner.stop(`parsed ${standardsMap.size} standards`)
	
	for (const mapping of mappings) {
		const standard = standardsMap.get(mapping.question_no)
		if (standard) {
			mapping.question_st = standard
		}
	}
	
	const sortedMappings = mappings.sort((a, b) => a.question_no - b.question_no)
	
	const outputPath = path.join(
		process.cwd(),
		"data",
		"exports",
		"qti",
		questionId,
		"question-mappings.json"
	)
	
	const saveSpinner = p.spinner()
	saveSpinner.start("saving mappings to file...")
	
	const jsonOutput = JSON.stringify(sortedMappings, null, 2)
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, jsonOutput, "utf-8"))
	if (writeResult.error) {
		saveSpinner.stop("save failed")
		logger.error("failed to write output file", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "write output file")
	}
	
	saveSpinner.stop(`saved ${sortedMappings.length} mappings`)
	logger.info("saved mappings to file", { outputPath })
	
	p.outro("✅ mapping complete")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

