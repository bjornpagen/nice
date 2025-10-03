#!/usr/bin/env bun
import * as p from "@clack/prompts"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import * as fs from "node:fs"
import * as path from "node:path"
import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

const QuestionMappingSchema = z.object({
	question_id: z.string(),
	question_st: z.string()
})

const VerificationResultsSchema = z.object({
	verifications: z.array(
		z.object({
			question_id: z.string(),
			question_st: z.string(),
			is_correct: z.boolean(),
			confidence: z.enum(["high", "medium", "low"]),
			reasoning: z.string(),
			suggested_standard: z.string().nullable()
		})
	)
})

interface QuestionMapping {
	question_id: string
	question_st: string
}

interface VerificationResult {
	question_id: string
	question_st: string
	is_correct: boolean
	confidence: "high" | "medium" | "low"
	reasoning: string
	suggested_standard: string | null
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

async function readExistingMappings(questionId: string): Promise<QuestionMapping[]> {
	const jsonPath = path.join(
		process.cwd(),
		"data",
		"exports",
		"qti",
		questionId,
		"question-mappings.json"
	)
	
	logger.debug("reading existing mappings", { jsonPath })
	
	const readResult = errors.trySync(() => fs.readFileSync(jsonPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read mappings file", { error: readResult.error, jsonPath })
		throw errors.wrap(readResult.error, "read mappings file")
	}
	
	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse mappings json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse mappings json")
	}
	
	const validationResult = z.array(QuestionMappingSchema).safeParse(parseResult.data)
	if (!validationResult.success) {
		logger.error("invalid mappings format", { error: validationResult.error })
		throw errors.wrap(validationResult.error, "validate mappings format")
	}
	
	return validationResult.data
}

async function verifyMappingsWithOpenAI(
	xmlMap: Map<string, string>,
	mappings: QuestionMapping[],
	curriculumPdfPath: string
): Promise<VerificationResult[]> {
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
	
	const mappingsContext = mappings
		.map((m) => {
			const xmlContent = xmlMap.get(m.question_id)
			if (!xmlContent) {
				logger.warn("xml not found for question", { questionId: m.question_id })
				return null
			}
			return `Question ID: ${m.question_id}
Mapped to Standard: ${m.question_st}

Question XML:
\`\`\`xml
${xmlContent}
\`\`\``
		})
		.filter((m) => m !== null)
		.join("\n\n---\n\n")
	
	const prompt = `You are tasked with VERIFYING existing mappings between STAAR test questions and TEKS standards. Your job is to judge whether each mapping is CORRECT or INCORRECT.

The PDF attached contains the complete TEKS standards for STAAR Grade 4 mathematics.

Below are ${mappings.length} existing question-to-standard mappings. For each one, you must:

1. Read the question XML carefully to understand what skill/concept it's testing
2. Look up the assigned TEKS standard in the PDF and read its EXACT wording
3. Determine if the mapping is CORRECT (the question tests what the standard describes)
4. Provide your confidence level: high, medium, or low
5. Explain your reasoning in 1-2 sentences
6. If INCORRECT, suggest what the correct standard should be (use null if correct)

CRITICAL VERIFICATION GUIDELINES:

**What makes a mapping CORRECT:**
- The question's PRIMARY cognitive demand matches the standard's description
- The mathematical skill being tested aligns with what the standard specifies
- Example: A question asking "which mass is closest to X" maps correctly to 4.8.A ("identify relative sizes") because it's testing identification/comparison, not arithmetic

**What makes a mapping INCORRECT:**
- The question requires a different skill than the standard describes
- The standard mentions operations (add/subtract/multiply/divide) but the question only requires comparison
- The standard is about one concept but the question tests a different concept
- Example: A comparison question mapped to 4.8.C ("solve problems using operations") is INCORRECT because no arithmetic is required

**Confidence Levels:**
- HIGH: The mapping is clearly correct or clearly incorrect based on obvious alignment/misalignment
- MEDIUM: The mapping is probably correct/incorrect but could be ambiguous
- LOW: The mapping is difficult to judge due to overlapping concepts or unclear question content

**Key Decision Points:**
- Questions asking "which is closest/nearest" or "identify/compare" are testing IDENTIFICATION skills
- Questions requiring calculation ("find the total", "what is the difference") are testing PROBLEM-SOLVING with operations
- Questions about converting units are testing CONVERSION skills
- Questions about representing/modeling are testing REPRESENTATION skills

Here are the mappings to verify:

${mappingsContext}

For each mapping, verify if it's correct based on careful analysis of both the question content and the standard's exact wording in the PDF.`
	
	logger.info("sending verification request to openai", { 
		model: "gpt-4o",
		temperature: 0.2,
		mappingCount: mappings.length,
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
				format: zodTextFormat(VerificationResultsSchema, "verification_results")
			},
			temperature: 0.2
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
	
	logger.debug("received verification results from openai", { 
		verificationCount: parsed.verifications.length
	})
	
	return parsed.verifications
}

async function main() {
	p.intro("🔍 Question Mapping Verifier")
	
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
	
	const mappingsSpinner = p.spinner()
	mappingsSpinner.start("loading existing mappings...")
	
	const mappingsResult = await errors.try(readExistingMappings(questionId))
	if (mappingsResult.error) {
		mappingsSpinner.stop("failed to load mappings")
		logger.error("mappings loading failed", { error: mappingsResult.error })
		throw errors.wrap(mappingsResult.error, "load existing mappings")
	}
	
	const mappings = mappingsResult.data
	mappingsSpinner.stop(`loaded ${mappings.length} existing mappings`)
	
	const xmlIds = Array.from(xmlMap.keys())
	const mappedIds = new Set(mappings.map((m) => m.question_id))
	const missingIds = xmlIds.filter((id) => !mappedIds.has(id))
	
	if (missingIds.length > 0) {
		logger.error("some questions are missing from mappings", { 
			total: xmlIds.length,
			mapped: mappings.length,
			missing: missingIds.length,
			missingIds
		})
		throw errors.new(`cannot verify: missing mappings for ${missingIds.length} question(s): ${missingIds.join(", ")}`)
	}
	
	logger.debug("validated all questions have mappings", { count: mappings.length })
	
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
	
	const verifySpinner = p.spinner()
	verifySpinner.start("verifying mappings with openai (this may take a minute)...")
	
	const verificationResult = await errors.try(
		verifyMappingsWithOpenAI(xmlMap, mappings, curriculumPdfPath)
	)
	if (verificationResult.error) {
		verifySpinner.stop("verification failed")
		logger.error("verification failed", { error: verificationResult.error })
		throw errors.wrap(verificationResult.error, "verify mappings")
	}
	
	const verifications = verificationResult.data
	verifySpinner.stop("verification complete")
	
	const correctCount = verifications.filter((v) => v.is_correct).length
	const incorrectCount = verifications.filter((v) => !v.is_correct).length
	
	logger.info("verification summary", { 
		total: verifications.length,
		correct: correctCount,
		incorrect: incorrectCount
	})
	
	p.note(`Total: ${verifications.length}
Correct: ${correctCount}
Incorrect: ${incorrectCount}`, "verification summary")
	
	const incorrectMappings = verifications.filter((v) => !v.is_correct)
	
	if (incorrectMappings.length > 0) {
		const incorrectDetails = incorrectMappings
			.map((v) => {
				const suggestion = v.suggested_standard ? ` → suggested: ${v.suggested_standard}` : ""
				return `  ${v.question_id}
    current: ${v.question_st}${suggestion}
    confidence: ${v.confidence}
    reason: ${v.reasoning}`
			})
			.join("\n\n")
		
		p.note(incorrectDetails, "incorrect mappings")
	}
	
	const outputPath = path.join(
		process.cwd(),
		"data",
		"exports",
		"qti",
		questionId,
		"verification-results.json"
	)
	
	const saveSpinner = p.spinner()
	saveSpinner.start("saving verification results...")
	
	const jsonOutput = JSON.stringify(verifications, null, 2)
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, jsonOutput, "utf-8"))
	if (writeResult.error) {
		saveSpinner.stop("save failed")
		logger.error("failed to write output file", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "write output file")
	}
	
	saveSpinner.stop(`saved verification results`)
	logger.info("saved verification results to file", { outputPath })
	
	p.outro("✅ verification complete")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

