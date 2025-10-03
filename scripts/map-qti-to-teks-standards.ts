#!/usr/bin/env bun
import * as p from "@clack/prompts"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import * as fs from "node:fs"
import * as path from "node:path"
import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

const TeksMappingsSchema = z.object({
	mappings: z.array(
		z.object({
			question_id: z.string(),
			question_st: z.string()
		})
	)
})

interface TeksMapping {
	question_id: string
	question_st: string
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

async function mapQuestionsToTeksWithOpenAI(
	xmlMap: Map<string, string>,
	curriculumPdfPath: string
): Promise<TeksMapping[]> {
	const openaiKey = process.env.OPENAI_API_KEY
	if (!openaiKey) {
		throw errors.new("OPENAI_API_KEY environment variable not set")
	}
	
	const client = new OpenAI({ apiKey: openaiKey })
	
	logger.debug("reading curriculum pdf file", { curriculumPdfPath })
	const readPdfResult = errors.trySync(() => fs.readFileSync(curriculumPdfPath))
	if (readPdfResult.error) {
		logger.error("failed to read curriculum pdf", { error: readPdfResult.error, curriculumPdfPath })
		throw errors.wrap(readPdfResult.error, "read curriculum pdf")
	}
	
	const pdfData = readPdfResult.data
	const base64Pdf = pdfData.toString("base64")
	const pdfFilename = path.basename(curriculumPdfPath)
	
	logger.debug("encoding curriculum pdf", { pdfFilename, sizeBytes: pdfData.length })
	
	const xmlEntries = Array.from(xmlMap.entries())
	const xmlContext = xmlEntries
		.map(([id, content]) => {
			return `XML ID: ${id}\n\`\`\`xml\n${content}\n\`\`\``
		})
		.join("\n\n")
	
	const prompt = `You are tasked with mapping question XML files to their corresponding TEKS (Texas Essential Knowledge and Skills) standards from a STAAR curriculum PDF.

⚠️ CRITICAL: You MUST map ALL ${xmlMap.size} questions. Do NOT skip any questions. Every single XML file listed below MUST appear in your response.

I have ${xmlMap.size} XML files, each representing a question from STAAR tests. Each XML file has an ID.

Here are ALL ${xmlMap.size} XML files that MUST be mapped:

${xmlContext}

The PDF attached contains the complete TEKS standards for STAAR Grade 4 mathematics, including the exact wording and description of each standard.

Your task:
1. Carefully read the curriculum PDF to understand the EXACT wording and scope of each TEKS standard
2. For EACH AND EVERY XML question, determine what mathematical skill or concept it is primarily assessing
3. Match EVERY question to the single TEKS standard that BEST describes what the question is testing
4. Return a JSON array with EXACTLY ${xmlMap.size} mappings - one for each XML ID listed above

CRITICAL MAPPING GUIDELINES:

**Read the standards carefully:**
- Each standard has specific wording that defines its scope (e.g., "identify relative sizes" vs "convert measurements" vs "solve problems using operations")
- Match questions to standards based on the PRIMARY skill being assessed, not secondary skills used in the process

**Key Decision Framework:**

1. **What is the question asking the student to DO?**
   - Identify/recognize/compare → Often .A standards (but not always)
   - Convert/transform → Often .B standards (but not always)
   - Calculate/solve/compute → Often standards involving operations
   - Represent/model → Standards about representations
   - Apply/use → Standards about application

2. **What mathematical operation or skill is REQUIRED?**
   - If arithmetic is required (add/subtract/multiply/divide), it's likely a problem-solving standard
   - If only comparison/recognition is required, it's likely an identification standard
   - If conversion between units is required, it's a conversion standard

3. **Distinguish between similar-sounding standards:**
   - Read the EXACT wording in the PDF for each sub-standard (A, B, C, etc.)
   - A question about "which mass is closest to X" is asking for IDENTIFICATION of relative sizes, not solving a problem with operations
   - A question requiring you to "find the total" or "calculate the difference" IS solving a problem with operations

4. **For ambiguous cases:**
   - Choose the standard that matches the PRIMARY cognitive demand
   - A question may involve multiple skills, but focus on what it's mainly testing

**Supporting vs Readiness Standards:**
- The PDF marks standards as "Supporting Standard" or "Readiness Standard"
- This classification doesn't affect which standard you choose - match based on content, not readiness level

IMPORTANT notes:
- Multiple questions can map to the same TEKS standard (this is completely normal and expected)
- However, each XML ID can only appear ONCE in your response - do NOT create duplicate entries for the same question
- Every question will have exactly one TEKS standard
- Use the standard format like "4.2.A" or "4.10.B" (number.number.letter)
- Double-check your mappings by re-reading the standard's exact wording in the PDF
- The property name for the standard should be "question_st" (short for question standard)

⚠️ FINAL REMINDER BEFORE RESPONDING:
1. Count your JSON array entries - must be EXACTLY ${xmlMap.size}
2. Check for duplicate XML IDs - each ID from the list above must appear EXACTLY ONCE
3. If any XML ID appears more than once, you have made a CRITICAL ERROR and must fix it
4. Multiple questions CAN map to the same TEKS standard (this is OK), but each XML ID must appear only once

YOUR RESPONSE WILL BE REJECTED IF:
- You have duplicate XML IDs (same question appearing multiple times)
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
				format: zodTextFormat(TeksMappingsSchema, "teks_mappings")
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
	p.intro("📚 QTI to TEKS Standards Mapper")
	
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
	
	let mappings: TeksMapping[] = []
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
			p.outro("✅ keeping existing mappings, no changes made")
			process.exit(0)
		}
	}
	
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
	
	const curriculumPdfPath = path.join(
		process.cwd(),
		"data",
		"exports",
		"qti",
		"staar-4-math-assessed-curriculum.pdf"
	)
	
	const pdfExistsResult = errors.trySync(() => fs.existsSync(curriculumPdfPath))
	if (pdfExistsResult.error) {
		logger.error("failed to check for curriculum pdf", { error: pdfExistsResult.error })
		throw errors.wrap(pdfExistsResult.error, "check curriculum pdf")
	}
	
	if (!pdfExistsResult.data) {
		throw errors.new("curriculum pdf not found at expected path")
	}
	
	const mapSpinner = p.spinner()
	mapSpinner.start("mapping questions to teks with openai (this may take a minute)...")
	
	const mappingResult = await errors.try(mapQuestionsToTeksWithOpenAI(xmlMap, curriculumPdfPath))
	if (mappingResult.error) {
		mapSpinner.stop("mapping failed")
		logger.error("openai mapping failed", { error: mappingResult.error })
		throw errors.wrap(mappingResult.error, "map questions to teks")
	}
	
	mappings = mappingResult.data
	mapSpinner.stop("mapping complete")
	
	const xmlIds = Array.from(xmlMap.keys())
	const mappedIds = new Set(mappings.map((m) => m.question_id))
	const missingIds = xmlIds.filter((id) => !mappedIds.has(id))
	
	const questionIdCounts = new Map<string, number>()
	for (const mapping of mappings) {
		questionIdCounts.set(mapping.question_id, (questionIdCounts.get(mapping.question_id) || 0) + 1)
	}
	
	const duplicateIds = Array.from(questionIdCounts.entries())
		.filter(([_, count]) => count > 1)
		.map(([id, count]) => ({ question_id: id, count }))
	
	if (duplicateIds.length > 0) {
		logger.error("duplicate question IDs in mappings", { duplicateIds })
		const dupeDetails = duplicateIds
			.map((d) => `${d.question_id} (${d.count} times)`)
			.join(", ")
		throw errors.new(`duplicate question IDs found: ${dupeDetails}`)
	}
	
	if (missingIds.length > 0) {
		logger.error("some questions were not mapped", { 
			total: xmlIds.length,
			mapped: mappings.length,
			missing: missingIds.length,
			missingIds
		})
		throw errors.new(`missing mappings for ${missingIds.length} question(s): ${missingIds.join(", ")}`)
	}
	
	logger.debug("validated all questions are mapped", { count: mappings.length })
	
	const outputPath = path.join(
		process.cwd(),
		"data",
		"exports",
		"qti",
		questionId,
		"question-mappings.json"
	)
	
	const saveSpinner = p.spinner()
	saveSpinner.start("saving teks mappings to file...")
	
	const jsonOutput = JSON.stringify(mappings, null, 2)
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, jsonOutput, "utf-8"))
	if (writeResult.error) {
		saveSpinner.stop("save failed")
		logger.error("failed to write output file", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "write output file")
	}
	
	saveSpinner.stop(`saved ${mappings.length} mappings`)
	logger.info("saved teks mappings to file", { outputPath })
	
	p.outro("✅ teks mapping complete")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

