#!/usr/bin/env bun
import * as p from "@clack/prompts"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import * as fs from "node:fs"
import * as path from "node:path"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import { z } from "zod"
import yaml from "yaml"

const BATCH_SIZE = 10
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

const GeminiResponseSchema = z.object({
	thinking: z.string(),
	result: z.array(z.string())
})

const QuestionMappingSchema = z.object({
	question_id: z.string(),
	question_st: z.string(),
	question_no: z.number().optional()
})

type QuestionMapping = z.infer<typeof QuestionMappingSchema>

interface SkillMapping extends QuestionMapping {
	question_ma?: string[]
}

interface MathAcademySkill {
	source: string
	sourceId: string
	name: string
	workedExample: string[]
	subGroup?: {
		source: string
		name: string
		sourceId: string
	}
}

async function readXmlFiles(dirPath: string): Promise<Map<string, string>> {
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

async function loadQuestionMappings(dirPath: string): Promise<QuestionMapping[]> {
	const mappingPath = path.join(dirPath, "question-mappings.json")
	
	logger.debug("reading question mappings", { mappingPath })
	
	const readResult = errors.trySync(() => fs.readFileSync(mappingPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read question mappings", { error: readResult.error, mappingPath })
		throw errors.wrap(readResult.error, "read question mappings")
	}
	
	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse question mappings json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse question mappings json")
	}
	
	const validationResult = z.array(QuestionMappingSchema).safeParse(parseResult.data)
	if (!validationResult.success) {
		logger.error("question mappings validation failed", { error: validationResult.error })
		throw errors.wrap(validationResult.error, "question mappings validation")
	}
	
	logger.debug("loaded question mappings", { count: validationResult.data.length })
	
	return validationResult.data
}

async function loadMathAcademySkills(skillsPath: string): Promise<MathAcademySkill[]> {
	logger.debug("reading math academy skills", { skillsPath })
	
	const readResult = errors.trySync(() => fs.readFileSync(skillsPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read skills file", { error: readResult.error, skillsPath })
		throw errors.wrap(readResult.error, "read skills file")
	}
	
	const parseResult = errors.trySync(() => yaml.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse skills yaml", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse skills yaml")
	}
	
	logger.debug("loaded math academy skills", { count: parseResult.data.length })
	
	return parseResult.data
}

async function loadTeksStandards(standardsPath: string): Promise<Record<string, string>> {
	logger.debug("reading teks standards", { standardsPath })
	
	const readResult = errors.trySync(() => fs.readFileSync(standardsPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read teks standards", { error: readResult.error, standardsPath })
		throw errors.wrap(readResult.error, "read teks standards")
	}
	
	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse teks standards json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse teks standards json")
	}
	
	logger.debug("loaded teks standards", { count: Object.keys(parseResult.data).length })
	
	return parseResult.data
}

async function mapQuestionToSkillWithGemini(
	questionXml: string,
	teksStandard: string,
	skills: MathAcademySkill[],
	questionId: string
): Promise<string[]> {
	const geminiKey = process.env.GEMINI_API_KEY
	if (!geminiKey) {
		throw errors.new("GEMINI_API_KEY environment variable not set")
	}
	
	const genai = new GoogleGenerativeAI(geminiKey)
	
	const skillsXml = skills
		.map((skill) => {
			return `<skill>
  <sourceId>${skill.sourceId}</sourceId>
  <name>${skill.name}</name>
  <workedExample>${skill.workedExample[0]}</workedExample>
</skill>`
		})
		.join("\n")
	
	const prompt = `You are an expert mathematics curriculum specialist and a meticulous data analyst. Your task is to accurately map a given math question to a specific skill from the Math Academy curriculum.

You will be provided with three pieces of information encapsulated in XML tags:
1.  <question_xml>: The full XML content of a question item.
2.  <teks_standard>: The Texas Essential Knowledge and Skills (TEKS) standard associated with the question.
3.  <math_academy_skills>: A list of available Math Academy skills, each with a name, a unique sourceId, and a workedExample.

**CRITICAL MATCHING STRATEGY (FOLLOW THIS ORDER):**

**STEP 1: ANALYZE THE TEKS STANDARD (PRIMARY FILTER)**

The TEKS standard defines the COGNITIVE TASK TYPE and MATHEMATICAL DOMAIN the student must demonstrate. Extract:
- The ACTION VERB: What must the student DO? (e.g., "classify", "convert", "solve", "identify", "represent", "compare", "calculate")
- The MATHEMATICAL CONCEPT: What is being worked with? (e.g., "two-dimensional figures", "measurements", "fractions", "whole numbers")
- The CONTEXT/CRITERIA: Based on what properties or using what methods?

Examples:
- "classify two-dimensional figures based on presence/absence of parallel or perpendicular lines" → TASK TYPE: classification of geometric figures by line properties
- "convert measurements within the same system" → TASK TYPE: unit conversion within a measurement system
- "solve problems involving multiplication and division" → TASK TYPE: multi-step problem solving with operations

**STEP 2: FILTER SKILLS BY TASK TYPE**

Look for skills whose workedExample demonstrates the SAME COGNITIVE TASK TYPE as the TEKS standard.

CRITICAL: Focus on WHAT THE STUDENT MUST DO, not on keywords in the content.

Wrong approach: "Question mentions 'obtuse angles' → match any skill with 'obtuse' in the name"
Correct approach: "TEKS asks student to CLASSIFY figures → match skills that teach CLASSIFICATION of figures"

**STEP 3: USE QUESTION CONTENT FOR FINAL SELECTION**

Among the skills that match the task type, use the specific numbers, figures, or context in <question_xml> to choose the best fit.

**COMMON TASK TYPE DISTINCTIONS:**

- CLASSIFICATION (classify, sort, categorize) ≠ IDENTIFICATION (identify, recognize single instance)
- PROBLEM SOLVING (solve word problems) ≠ COMPUTATION (calculate, find the value)
- CONVERSION (convert units, transform) ≠ COMPARISON (compare, order)
- REPRESENTATION (represent using models/diagrams) ≠ READING/INTERPRETING (read from a model)

**Instructions - Follow these steps precisely:**

1.  **Analyze the TEKS Standard (PRIMARY):**
    *   Inside an <analysis_standard> tag:
    *   Extract the action verb, mathematical concept, and context from the <teks_standard>.
    *   State the COGNITIVE TASK TYPE this standard requires.
    *   Example: "TASK TYPE: classify two-dimensional figures based on geometric properties"

2.  **Analyze the Question:**
    *   Inside an <analysis_question> tag:
    *   Parse the <question_xml> and identify what the student is being asked to DO.
    *   Confirm whether the question's task aligns with the TEKS standard task type.
    *   Note the specific mathematical content (numbers, figures, units, etc.).

3.  **Filter Skills by Task Type:**
    *   Inside an <analysis_task_filter> tag:
    *   For each skill in <math_academy_skills>, determine if its workedExample teaches the SAME cognitive task type as the TEKS standard.
    *   List which skills pass this filter and which don't (with brief reasoning).
    *   DO NOT match on superficial keywords - match on the type of cognitive work required.

4.  **Score Filtered Skills:**
    *   Inside an <analysis_skills> tag:
    *   For ONLY the skills that passed the task type filter, score them from 1-5 based on how well their specific content matches the question's specific content.
    *   Include: sourceId, skill_concept, match_score, justification.

5.  **Final Selection:**
    *   Inside an <analysis_final_selection> tag:
    *   Select the sourceId with the highest match_score.
    *   Explain why this skill best teaches the task type AND specific content.
    *   Mention at least one other plausible skill and why it was not chosen.

**CRITICAL - OUTPUT FORMAT:**

Your response MUST be a valid JSON object with exactly two keys:

{
  "thinking": "string containing ALL your analysis with <analysis_standard>, <analysis_question>, <analysis_task_filter>, <analysis_skills>, and <analysis_final_selection> tags",
  "result": ["MA-EXAMPLE-13603"]
}

The "result" array MUST contain ONLY the sourceId strings (e.g., "MA-EXAMPLE-13603").

DO NOT PUT ANY OF THE FOLLOWING IN THE "result" ARRAY:
- XML tags like <analysis_question> or <analysis_final_selection>
- Explanatory text, justifications, or reasoning
- JSON objects or any structure other than plain strings
- Any text that is not a bare sourceId

CORRECT "result" examples:
["MA-EXAMPLE-13603"]
["MA-EXAMPLE-13603", "MA-EXAMPLE-10421"]

WRONG "result" examples:
["<analysis_question>...", "MA-EXAMPLE-13603"]
["{\"sourceId\": \"MA-EXAMPLE-13603\"}"]
["The best skill is MA-EXAMPLE-13603"]
["MA-EXAMPLE-13603", "<analysis_final_selection>..."]

ALL analysis MUST go in the "thinking" field, NOT in "result".

<question_xml>
${questionXml}
</question_xml>

<teks_standard>
${teksStandard}
</teks_standard>

<math_academy_skills>
${skillsXml}
</math_academy_skills>`
	
	const model = genai.getGenerativeModel({
		model: "gemini-2.5-pro",
		generationConfig: {
			responseMimeType: "application/json",
			responseSchema: {
				type: SchemaType.OBJECT,
				properties: {
					thinking: { type: SchemaType.STRING },
					result: {
						type: SchemaType.ARRAY,
						items: { type: SchemaType.STRING }
					}
				},
				required: ["thinking", "result"]
			}
		}
	})
	
	logger.debug("calling gemini api", { 
		model: "gemini-2.5-pro", 
		questionId,
		promptLength: prompt.length 
	})
	
	const response = await errors.try(
		model.generateContent(prompt)
	)
	if (response.error) {
		logger.error("gemini api call failed", { error: response.error, questionId })
		throw errors.wrap(response.error, "gemini api call")
	}
	
	const result = response.data.response
	const jsonText = result.text()
	
	logger.debug("received gemini response", {
		questionId,
		responseLength: jsonText.length,
		candidatesCount: result.candidates?.length
	})
	
	const parseResult = errors.trySync(() => JSON.parse(jsonText))
	if (parseResult.error) {
		logger.error("failed to parse json response", { error: parseResult.error, jsonText, questionId })
		throw errors.wrap(parseResult.error, "json parse")
	}
	
	const validationResult = GeminiResponseSchema.safeParse(parseResult.data)
	if (!validationResult.success) {
		logger.error("validation failed", { error: validationResult.error, questionId })
		throw errors.wrap(validationResult.error, "response validation")
	}
	
	logger.debug("mapped question to skills", {
		questionId,
		sourceIds: validationResult.data.result,
		thinkingLength: validationResult.data.thinking.length
	})
	
	return validationResult.data.result
}

async function processBatch(
	batch: QuestionMapping[],
	xmlMap: Map<string, string>,
	teksStandards: Record<string, string>,
	skills: MathAcademySkill[]
): Promise<Array<{ questionId: string; sourceIds?: string[]; error?: unknown }>> {
	const batchResults = await Promise.allSettled(
		batch.map(async (mapping) => {
			const xml = xmlMap.get(mapping.question_id)
			if (!xml) {
				logger.error("xml not found for question", { questionId: mapping.question_id })
				throw errors.new(`xml not found for question: ${mapping.question_id}`)
			}
			
			const teksStandard = teksStandards[mapping.question_st]
			if (!teksStandard) {
				logger.error("teks standard not found", { 
					questionId: mapping.question_id, 
					standard: mapping.question_st 
				})
				throw errors.new(`teks standard not found: ${mapping.question_st}`)
			}
			
			const sourceIds = await mapQuestionToSkillWithGemini(
				xml,
				teksStandard,
				skills,
				mapping.question_id
			)
			
			return { questionId: mapping.question_id, sourceIds }
		})
	)
	
	return batchResults.map((result, idx) => {
		if (result.status === "fulfilled") {
			return result.value
		}
		const questionId = batch[idx]?.question_id
		if (!questionId) {
			throw errors.new("batch index mismatch")
		}
		logger.error("question mapping failed", { 
			questionId,
			error: result.reason 
		})
		return { questionId, error: result.reason }
	})
}

async function main() {
	const spinner = p.spinner()
	
	spinner.start("validating environment")
	
	const geminiKey = process.env.GEMINI_API_KEY
	if (!geminiKey) {
		spinner.stop("missing gemini api key")
		p.cancel("GEMINI_API_KEY environment variable not set")
		process.exit(1)
	}
	
	const args = process.argv.slice(2)
	if (args.length !== 1) {
		spinner.stop("invalid arguments")
		p.cancel("usage: bun run scripts/map-questions-to-ma-skills.ts <test-directory-id>")
		process.exit(1)
	}
	
	const testDirId = args[0]
	if (!testDirId) {
		throw errors.new("test directory id not provided")
	}
	const testDirPath = path.join(process.cwd(), "data", "exports", "qti", testDirId)
	
	const existsResult = errors.trySync(() => fs.existsSync(testDirPath))
	if (existsResult.error) {
		logger.error("failed to check directory existence", { error: existsResult.error })
		throw errors.wrap(existsResult.error, "check directory existence")
	}
	if (!existsResult.data) {
		spinner.stop("directory not found")
		p.cancel(`directory not found: ${testDirPath}`)
		process.exit(1)
	}
	
	spinner.stop("environment validated")
	
	spinner.start("loading data files")
	
	const skillsPath = path.join(process.cwd(), "data", "exports", "qti", "grade4-all-skills.yml")
	const teksPath = path.join(process.cwd(), "data", "exports", "qti", "teks-standards.json")
	
	const skills = await loadMathAcademySkills(skillsPath)
	const teksStandards = await loadTeksStandards(teksPath)
	const xmlMap = await readXmlFiles(testDirPath)
	const questionMappings = await loadQuestionMappings(testDirPath)
	
	spinner.stop("data files loaded")
	
	logger.info("starting skill mapping", {
		testDirId,
		questionCount: questionMappings.length,
		skillCount: skills.length
	})
	
	spinner.start(`mapping ${questionMappings.length} questions to skills`)
	
	const results = new Map<string, { questionId: string; sourceIds?: string[]; error?: unknown }>()
	let questionsToProcess = questionMappings
	
	for (let retryRound = 0; retryRound <= MAX_RETRIES; retryRound++) {
		if (questionsToProcess.length === 0) {
			break
		}
		
		if (retryRound > 0) {
			logger.info("retrying failed questions", { 
				retryRound, 
				questionsToRetry: questionsToProcess.length 
			})
			spinner.message(`retry round ${retryRound}: ${questionsToProcess.length} questions`)
			
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
		}
		
		const roundResults: Array<{ questionId: string; sourceIds?: string[]; error?: unknown }> = []
		
		for (let i = 0; i < questionsToProcess.length; i += BATCH_SIZE) {
			const batch = questionsToProcess.slice(i, i + BATCH_SIZE)
			const batchNumber = Math.floor(i / BATCH_SIZE) + 1
			const totalBatches = Math.ceil(questionsToProcess.length / BATCH_SIZE)
			
			const roundLabel = retryRound > 0 ? `retry ${retryRound}, ` : ""
			spinner.message(`processing ${roundLabel}batch ${batchNumber}/${totalBatches}`)
			
			logger.debug("processing batch", { 
				retryRound,
				batchNumber, 
				totalBatches, 
				batchSize: batch.length 
			})
			
			const batchResults = await processBatch(batch, xmlMap, teksStandards, skills)
			roundResults.push(...batchResults)
			
			const successCount = batchResults.filter((r) => !r.error).length
			const errorCount = batchResults.filter((r) => r.error).length
			
			logger.debug("batch completed", { 
				retryRound,
				batchNumber, 
				successCount, 
				errorCount 
			})
		}
		
		for (const result of roundResults) {
			results.set(result.questionId, result)
		}
		
		const failedInThisRound = roundResults.filter((r) => r.error)
		if (retryRound < MAX_RETRIES && failedInThisRound.length > 0) {
			questionsToProcess = questionMappings.filter((mapping) => {
				const result = results.get(mapping.question_id)
				return result?.error !== undefined
			})
			
			logger.debug("questions failed in round", { 
				retryRound, 
				failedCount: failedInThisRound.length,
				nextRoundCount: questionsToProcess.length 
			})
		} else {
			questionsToProcess = []
		}
	}
	
	spinner.stop("mapping completed")
	
	const allResults = Array.from(results.values())
	const successfulResults = allResults.filter((r) => !r.error)
	const failedResults = allResults.filter((r) => r.error)
	
	logger.info("mapping results", {
		total: allResults.length,
		successful: successfulResults.length,
		failed: failedResults.length
	})
	
	if (failedResults.length > 0) {
		logger.warn("some questions failed to map", {
			failedQuestionIds: failedResults.map((r) => r.questionId)
		})
	}
	
	spinner.start("augmenting question mappings")
	
	const augmentedMappings: SkillMapping[] = questionMappings.map((mapping) => {
		const result = results.get(mapping.question_id)
		if (!result) {
			throw errors.new(`result not found for question: ${mapping.question_id}`)
		}
		if (result.error) {
			return mapping
		}
		if (!result.sourceIds) {
			throw errors.new(`source ids missing for question: ${mapping.question_id}`)
		}
		return {
			...mapping,
			question_ma: result.sourceIds
		}
	})
	
	const outputPath = path.join(testDirPath, "question-mappings.json")
	const writeData = JSON.stringify(augmentedMappings, null, 2)
	
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, writeData, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write augmented mappings", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "write augmented mappings")
	}
	
	spinner.stop("question mappings updated")
	
	logger.info("script completed", {
		outputPath,
		totalQuestions: augmentedMappings.length,
		successfullyMapped: successfulResults.length,
		failed: failedResults.length
	})
	
	p.outro(`successfully mapped ${successfulResults.length}/${allResults.length} questions`)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

