#!/usr/bin/env bun
import * as p from "@clack/prompts"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import * as fs from "node:fs"
import * as path from "node:path"
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai"
import { z } from "zod"
import yaml from "yaml"

const BATCH_SIZE = 5
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000

const GeminiResponseSchema = z.object({
	thinking: z.string(),
	result: z.array(z.string())
})

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

interface StandardToSkillsMapping {
	standard_code: string
	standard_desc: string
	ma_skills: string[]
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

async function mapStandardToSkillsWithGemini(
	standard: CommonCoreStandard,
	skills: MathAcademySkill[]
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
	
	const prompt = `You are an expert mathematics curriculum designer and data specialist. Your task is to perform a precise curriculum alignment, mapping a single Grade 4 Common Core State Standard (CCSS) to the set of Math Academy skills that satisfy that standard.

You will be provided with two pieces of information encapsulated in XML tags:
1.  <target_ccss>: A single Common Core standard object containing its standard_code and standard_desc (description).
2.  <available_ma_skills>: A comprehensive list of Grade 4 Math Academy skills, each with a sourceId, name, and a workedExample demonstrating the skill's core concept.

**Your Goal:**

Identify **all** the Math Academy skills from the provided list that fall under the scope and instructional intent of the <target_ccss>.

**Contextual Understanding:**
Understand that CCSS standards are often **broad** descriptions of expected outcomes (e.g., "Fluently add and subtract multi-digit whole numbers"), while Math Academy skills are **granular** instructional units (e.g., "Adding 3-digit numbers with regrouping"). Therefore, you are expected to map **one** CCSS standard to **one or more** Math Academy skills to achieve full coverage of the standard.

**Instructions - Follow these steps precisely:**

1.  **Deconstruct the Target Standard:**
    *   Inside an <analysis_deconstruction> tag, analyze the <target_ccss>.
    *   Identify the active verbs (what the student must do), the specific mathematical objects (e.g., "fractions with denominators 2, 3, 4..."), and any explicit constraints or limitations noted in the description or footnotes (e.g., "limited to whole numbers less than or equal to 1,000,000").
    *   Define the exact scope of this standard.

2.  **Evaluate Math Academy Skills:**
    *   Inside an <analysis_evaluation> tag, iterate through the <available_ma_skills>. Perform a binary check for every skill: Does the concept demonstrated in the skill's workedExample and name fall directly within the scope defined in Step 1?
    *   **Criteria for inclusion:** The skill is a necessary component, practice, or direct application of the standard.
    *   **Criteria for exclusion:** The skill is a prerequisite from a prior grade, an extension for a future grade, or tangentially related but not explicitly required by the standard's defined scope.
    *   List the sourceId of every skill that meets the criteria for inclusion, providing a very brief justification for why it fits the standard.

3.  **Final Selection & Review:**
    *   Inside an <analysis_final_review> tag, review your selected list of skills.
    *   Do these skills collectively represent the intent of the standard? Ensure you have not included irrelevant skills or omitted obvious matches provided in the list.

**CRITICAL - OUTPUT FORMAT:**

Your response MUST be a valid JSON object with exactly two keys:

{
  "thinking": "string containing ALL your analysis with <analysis_deconstruction>, <analysis_evaluation>, and <analysis_final_review> tags",
  "result": ["MA-EXAMPLE-13603", "MA-EXAMPLE-13604", "MA-EXAMPLE-2540"]
}

The "result" array MUST contain ONLY the sourceId strings (e.g., "MA-EXAMPLE-13603").

DO NOT PUT ANY OF THE FOLLOWING IN THE "result" ARRAY:
- XML tags like <analysis_deconstruction> or <analysis_final_review>
- Explanatory text, justifications, or reasoning
- JSON objects or any structure other than plain strings
- Any text that is not a bare sourceId

CORRECT "result" examples:
["MA-EXAMPLE-13603"]
["MA-EXAMPLE-13603", "MA-EXAMPLE-10421", "MA-EXAMPLE-2540"]

WRONG "result" examples:
["<analysis_deconstruction>...", "MA-EXAMPLE-13603"]
["{\"sourceId\": \"MA-EXAMPLE-13603\"}"]
["Skills that match: MA-EXAMPLE-13603"]
["MA-EXAMPLE-13603", "<analysis_final_review>..."]

ALL analysis MUST go in the "thinking" field, NOT in "result".

<target_ccss>
{
  "standard_code": "${standard.standard_code}",
  "standard_desc": "${standard.standard_desc}"
}
</target_ccss>

<available_ma_skills>
${skillsXml}
</available_ma_skills>`
	
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
		standardCode: standard.standard_code,
		promptLength: prompt.length 
	})
	
	const response = await errors.try(
		model.generateContent(prompt)
	)
	if (response.error) {
		logger.error("gemini api call failed", { error: response.error, standardCode: standard.standard_code })
		throw errors.wrap(response.error, "gemini api call")
	}
	
	const result = response.data.response
	const jsonText = result.text()
	
	logger.debug("received gemini response", {
		standardCode: standard.standard_code,
		responseLength: jsonText.length,
		candidatesCount: result.candidates?.length
	})
	
	const parseResult = errors.trySync(() => JSON.parse(jsonText))
	if (parseResult.error) {
		logger.error("failed to parse json response", { error: parseResult.error, jsonText, standardCode: standard.standard_code })
		throw errors.wrap(parseResult.error, "json parse")
	}
	
	const validationResult = GeminiResponseSchema.safeParse(parseResult.data)
	if (!validationResult.success) {
		logger.error("validation failed", { error: validationResult.error, standardCode: standard.standard_code })
		throw errors.wrap(validationResult.error, "response validation")
	}
	
	logger.debug("mapped standard to skills", {
		standardCode: standard.standard_code,
		skillCount: validationResult.data.result.length,
		thinkingLength: validationResult.data.thinking.length
	})
	
	return validationResult.data.result
}

async function processBatch(
	batch: CommonCoreStandard[],
	skills: MathAcademySkill[]
): Promise<Array<{ standardCode: string; skillIds?: string[]; error?: unknown }>> {
	const batchResults = await Promise.allSettled(
		batch.map(async (standard) => {
			const skillIds = await mapStandardToSkillsWithGemini(standard, skills)
			
			return { standardCode: standard.standard_code, skillIds }
		})
	)
	
	return batchResults.map((result, idx) => {
		if (result.status === "fulfilled") {
			return result.value
		}
		const standardCode = batch[idx]?.standard_code
		if (!standardCode) {
			throw errors.new("batch index mismatch")
		}
		logger.error("standard mapping failed", { 
			standardCode,
			error: result.reason 
		})
		return { standardCode, error: result.reason }
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
	
	spinner.stop("environment validated")
	
	spinner.start("loading data files")
	
	const skillsPath = path.join(process.cwd(), "data", "exports", "qti", "grade4-all-skills.yml")
	const ccPath = path.join(process.cwd(), "data", "exports", "qti", "grade4-common-core-standards.json")
	
	const skills = await loadMathAcademySkills(skillsPath)
	const commonCoreStandards = await loadCommonCoreStandards(ccPath)
	
	spinner.stop("data files loaded")
	
	logger.info("starting ccss to ma skills mapping", {
		ccStandardCount: commonCoreStandards.length,
		maSkillCount: skills.length
	})
	
	spinner.start(`mapping ${commonCoreStandards.length} ccss standards to ma skills`)
	
	const results = new Map<string, { standardCode: string; skillIds?: string[]; error?: unknown }>()
	let standardsToProcess = commonCoreStandards
	
	for (let retryRound = 0; retryRound <= MAX_RETRIES; retryRound++) {
		if (standardsToProcess.length === 0) {
			break
		}
		
		if (retryRound > 0) {
			logger.info("retrying failed standards", { 
				retryRound, 
				standardsToRetry: standardsToProcess.length 
			})
			spinner.message(`retry round ${retryRound}: ${standardsToProcess.length} standards`)
			
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
		}
		
		const roundResults: Array<{ standardCode: string; skillIds?: string[]; error?: unknown }> = []
		
		for (let i = 0; i < standardsToProcess.length; i += BATCH_SIZE) {
			const batch = standardsToProcess.slice(i, i + BATCH_SIZE)
			const batchNumber = Math.floor(i / BATCH_SIZE) + 1
			const totalBatches = Math.ceil(standardsToProcess.length / BATCH_SIZE)
			
			const roundLabel = retryRound > 0 ? `retry ${retryRound}, ` : ""
			spinner.message(`processing ${roundLabel}batch ${batchNumber}/${totalBatches}`)
			
			logger.debug("processing batch", { 
				retryRound,
				batchNumber, 
				totalBatches, 
				batchSize: batch.length 
			})
			
			const batchResults = await processBatch(batch, skills)
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
			results.set(result.standardCode, result)
		}
		
		const failedInThisRound = roundResults.filter((r) => r.error)
		if (retryRound < MAX_RETRIES && failedInThisRound.length > 0) {
			standardsToProcess = commonCoreStandards.filter((standard) => {
				const result = results.get(standard.standard_code)
				return result?.error !== undefined
			})
			
			logger.debug("standards failed in round", { 
				retryRound, 
				failedCount: failedInThisRound.length,
				nextRoundCount: standardsToProcess.length 
			})
		} else {
			standardsToProcess = []
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
		logger.warn("some standards failed to map", {
			failedStandardCodes: failedResults.map((r) => r.standardCode)
		})
	}
	
	spinner.start("creating standard mappings")
	
	const mappings: StandardToSkillsMapping[] = commonCoreStandards.map((standard) => {
		const result = results.get(standard.standard_code)
		if (!result) {
			throw errors.new(`result not found for standard: ${standard.standard_code}`)
		}
		if (result.error) {
			return {
				standard_code: standard.standard_code,
				standard_desc: standard.standard_desc,
				ma_skills: []
			}
		}
		if (!result.skillIds) {
			throw errors.new(`skill ids missing for standard: ${standard.standard_code}`)
		}
		return {
			standard_code: standard.standard_code,
			standard_desc: standard.standard_desc,
			ma_skills: result.skillIds
		}
	})
	
	const outputPath = path.join(process.cwd(), "data", "exports", "qti", "ccss-to-ma-skills-mapping.json")
	const writeData = JSON.stringify(mappings, null, 2)
	
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, writeData, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write mappings", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "write mappings")
	}
	
	spinner.stop("mappings created")
	
	const totalSkillsMapped = mappings.reduce((sum, m) => sum + m.ma_skills.length, 0)
	const avgSkillsPerStandard = totalSkillsMapped / mappings.length
	
	logger.info("script completed", {
		outputPath,
		totalStandards: mappings.length,
		successfullyMapped: successfulResults.length,
		failed: failedResults.length,
		totalSkillsMapped,
		avgSkillsPerStandard: Math.round(avgSkillsPerStandard * 10) / 10
	})
	
	p.outro(`successfully mapped ${successfulResults.length}/${allResults.length} standards (avg ${Math.round(avgSkillsPerStandard)} skills/standard)`)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

