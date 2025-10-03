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
	question_no: z.number().optional(),
	question_ma: z.array(z.string()).optional()
})

type QuestionMapping = z.infer<typeof QuestionMappingSchema>

interface SkillMapping extends QuestionMapping {
	question_cc?: string[]
}

interface CommonCoreStandard {
	standard_code: string
	standard_desc: string
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

async function loadMathAcademySkills(skillsPath: string): Promise<Map<string, MathAcademySkill>> {
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
	
	const skills: MathAcademySkill[] = parseResult.data
	const skillMap = new Map<string, MathAcademySkill>()
	
	for (const skill of skills) {
		skillMap.set(skill.sourceId, skill)
	}
	
	logger.debug("loaded math academy skills", { count: skillMap.size })
	
	return skillMap
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

async function loadCommonCoreStandards(standardsPath: string): Promise<CommonCoreStandard[]> {
	logger.debug("reading common core standards", { standardsPath })
	
	const readResult = errors.trySync(() => fs.readFileSync(standardsPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read common core standards", { error: readResult.error, standardsPath })
		throw errors.wrap(readResult.error, "read common core standards")
	}
	
	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse common core standards json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse common core standards json")
	}
	
	logger.debug("loaded common core standards", { count: parseResult.data.length })
	
	return parseResult.data
}

async function mapQuestionToCommonCoreWithGemini(
	questionXml: string,
	teksStandard: string,
	maSkill: MathAcademySkill | undefined,
	commonCoreStandards: CommonCoreStandard[],
	questionId: string
): Promise<string[]> {
	const geminiKey = process.env.GEMINI_API_KEY
	if (!geminiKey) {
		throw errors.new("GEMINI_API_KEY environment variable not set")
	}
	
	const genai = new GoogleGenerativeAI(geminiKey)
	
	const ccStandardsJson = JSON.stringify(commonCoreStandards, null, 2)
	
	const maSkillXml = maSkill
		? `<math_academy_skill>
  <sourceId>${maSkill.sourceId}</sourceId>
  <name>${maSkill.name}</name>
  <workedExample>${maSkill.workedExample[0]}</workedExample>
</math_academy_skill>`
		: "<math_academy_skill>No Math Academy skill mapped for this question.</math_academy_skill>"
	
	const prompt = `You are an expert mathematics curriculum specialist with deep expertise in aligning educational standards across different frameworks, specifically the Texas Essential Knowledge and Skills (TEKS), Math Academy skills, and the Common Core State Standards (CCSS). Your task is to perform a precise crosswalk, mapping a given math question and its existing classifications to the most accurate Common Core standard.

You will be provided with four pieces of information encapsulated in XML tags:
1.  <question_xml>: The full XML content of a question item.
2.  <teks_standard>: The Texas standard currently associated with the question.
3.  <math_academy_skill>: The Math Academy skill currently mapped to the question.
4.  <common_core_standards>: A comprehensive JSON list of Common Core standards, each with a standard_code and standard_desc.

**Your Goal:**

Identify the single best Common Core standard_code that aligns with the core mathematical concept presented in the question. Your analysis should treat the <question_xml> as the primary source of truth, using the <teks_standard> and <math_academy_skill> as powerful contextual clues to help define the question's precise academic focus.

**Crucial Rule on Specificity:** You must select the **most specific (most granular) standard** that accurately describes the question's task. For example, if a question only assesses the concept in K.CC.B.4.a, you must choose that code specifically, not its broader parent K.CC.B.4.

**Instructions - Follow these steps precisely:**

1.  **Synthesize the Core Concept:**
    *   Inside a <analysis_synthesis> tag, provide a concise, one-sentence summary of the core mathematical concept being tested.
    *   To create this summary, you must synthesize evidence from all three sources: the question's prompt and options (<question_xml>), the description of the TEKS standard (<teks_standard>), and the focus of the mapped Math Academy skill (<math_academy_skill>).

2.  **Evaluate and Score Common Core Standards:**
    *   Inside an <analysis_evaluation> tag, systematically filter down and evaluate the most plausible standards from the <common_core_standards> list. You do not need to list all of them, but you must evaluate at least 5-10 of the strongest candidates.
    *   For each candidate standard, create an entry that includes:
        *   standard_code: The CCSS code.
        *   standard_desc: The CCSS description.
        *   match_score: A numerical score from 1 (poor match) to 5 (perfect match) indicating how well the standard_desc aligns with your synthesized core concept.
        *   justification: A brief explanation for your score, noting any specific keywords or concepts that align or misalign.

3.  **Final Selection and Justification:**
    *   Inside an <analysis_final_selection> tag:
    *   State the standard_code with the highest match_score that is also the most specific standard available.
    *   Provide a detailed final justification explaining why this standard is the most precise fit. Your justification must explicitly reference the content of the question.
    *   Identify the next-best standard (the "runner-up") and briefly explain why it is less accurate or less specific than your final choice.
    *   A mapping to two standards is a rare exception. You may only do this if the question genuinely assesses two distinct concepts with equal weight, and you must provide an exceptionally strong justification.

**CRITICAL - OUTPUT FORMAT:**

Your response MUST be a valid JSON object with exactly two keys:

{
  "thinking": "string containing ALL your analysis with <analysis_synthesis>, <analysis_evaluation>, and <analysis_final_selection> tags",
  "result": ["4.NBT.A.2"]
}

The "result" array MUST contain ONLY the standard_code strings (e.g., "4.NBT.A.2").

DO NOT PUT ANY OF THE FOLLOWING IN THE "result" ARRAY:
- XML tags like <analysis_synthesis> or <analysis_final_selection>
- Explanatory text, justifications, or reasoning
- JSON objects or any structure other than plain strings
- Any text that is not a bare standard_code

CORRECT "result" examples:
["4.NBT.A.2"]
["4.G.A.1", "4.MD.C.6"]

WRONG "result" examples:
["<analysis_synthesis>...", "4.NBT.A.2"]
["{\"standard_code\": \"4.NBT.A.2\"}"]
["The best standard is 4.NBT.A.2"]
["4.NBT.A.2", "<analysis_final_selection>..."]

ALL analysis MUST go in the "thinking" field, NOT in "result".

<question_xml>
${questionXml}
</question_xml>

<teks_standard>
${teksStandard}
</teks_standard>

${maSkillXml}

<common_core_standards>
${ccStandardsJson}
</common_core_standards>`
	
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
	
	logger.debug("mapped question to common core", {
		questionId,
		standardCodes: validationResult.data.result,
		thinkingLength: validationResult.data.thinking.length
	})
	
	return validationResult.data.result
}

async function processBatch(
	batch: QuestionMapping[],
	xmlMap: Map<string, string>,
	teksStandards: Record<string, string>,
	maSkills: Map<string, MathAcademySkill>,
	commonCoreStandards: CommonCoreStandard[]
): Promise<Array<{ questionId: string; standardCodes?: string[]; error?: unknown }>> {
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
			
			let maSkill: MathAcademySkill | undefined = undefined
			if (mapping.question_ma && mapping.question_ma.length > 0) {
				const firstMaSkillId = mapping.question_ma[0]
				if (!firstMaSkillId) {
					throw errors.new(`ma skill id missing at index 0 for question: ${mapping.question_id}`)
				}
				maSkill = maSkills.get(firstMaSkillId)
				if (!maSkill) {
					logger.warn("ma skill not found", { 
						questionId: mapping.question_id, 
						skillId: firstMaSkillId 
					})
				}
			}
			
			const standardCodes = await mapQuestionToCommonCoreWithGemini(
				xml,
				teksStandard,
				maSkill,
				commonCoreStandards,
				mapping.question_id
			)
			
			return { questionId: mapping.question_id, standardCodes }
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
		p.cancel("usage: bun run scripts/map-questions-to-common-core.ts <test-directory-id>")
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
	
	const maSkillsPath = path.join(process.cwd(), "data", "exports", "qti", "grade4-all-skills.yml")
	const teksPath = path.join(process.cwd(), "data", "exports", "qti", "teks-standards.json")
	const ccPath = path.join(process.cwd(), "data", "exports", "qti", "grade4-common-core-standards.json")
	
	const maSkills = await loadMathAcademySkills(maSkillsPath)
	const teksStandards = await loadTeksStandards(teksPath)
	const commonCoreStandards = await loadCommonCoreStandards(ccPath)
	const xmlMap = await readXmlFiles(testDirPath)
	const questionMappings = await loadQuestionMappings(testDirPath)
	
	spinner.stop("data files loaded")
	
	logger.info("starting common core mapping", {
		testDirId,
		questionCount: questionMappings.length,
		ccStandardCount: commonCoreStandards.length
	})
	
	spinner.start(`mapping ${questionMappings.length} questions to common core`)
	
	const results = new Map<string, { questionId: string; standardCodes?: string[]; error?: unknown }>()
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
		
		const roundResults: Array<{ questionId: string; standardCodes?: string[]; error?: unknown }> = []
		
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
			
			const batchResults = await processBatch(batch, xmlMap, teksStandards, maSkills, commonCoreStandards)
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
		if (!result.standardCodes) {
			throw errors.new(`standard codes missing for question: ${mapping.question_id}`)
		}
		return {
			...mapping,
			question_cc: result.standardCodes
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

