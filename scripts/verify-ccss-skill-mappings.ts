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

const SkillVerificationSchema = z.object({
	sourceId: z.string(),
	isAccurate: z.boolean(),
	confidence: z.enum(["high", "medium", "low"]),
	reasoning: z.string()
})

const GeminiResponseSchema = z.object({
	thinking: z.string(),
	result: z.array(SkillVerificationSchema)
})

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

interface YamlSkillEntry {
	sourceId: string
	name: string
	workedExample: string[]
	subGroup?: {
		source: string
		name: string
		sourceId: string
	}
}

interface YamlStandardEntry {
	standardCode: string
	standardDesc: string
	maSkills: YamlSkillEntry[]
}

interface SkillVerification {
	sourceId: string
	isAccurate: boolean
	confidence: "high" | "medium" | "low"
	reasoning: string
}

interface StandardVerificationResult {
	standardCode: string
	standardDesc: string
	totalSkills: number
	accurateSkills: number
	inaccurateSkills: number
	skillVerifications: SkillVerification[]
}

async function loadMappings(mappingPath: string): Promise<YamlStandardEntry[]> {
	logger.debug("reading ccss mappings", { mappingPath })
	
	const readResult = errors.trySync(() => fs.readFileSync(mappingPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read mappings file", { error: readResult.error, mappingPath })
		throw errors.wrap(readResult.error, "read mappings file")
	}
	
	const parseResult = errors.trySync(() => yaml.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse mappings yaml", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse mappings yaml")
	}
	
	logger.debug("loaded ccss mappings", { count: parseResult.data.length })
	
	return parseResult.data
}

async function verifyStandardMappingWithGemini(
	standard: YamlStandardEntry
): Promise<SkillVerification[]> {
	const geminiKey = process.env.GEMINI_API_KEY
	if (!geminiKey) {
		throw errors.new("GEMINI_API_KEY environment variable not set")
	}
	
	const genai = new GoogleGenerativeAI(geminiKey)
	
	const skillsXml = standard.maSkills
		.map((skill) => {
			return `<skill>
  <sourceId>${skill.sourceId}</sourceId>
  <name>${skill.name}</name>
  <workedExample>${skill.workedExample[0]}</workedExample>
</skill>`
		})
		.join("\n")
	
	const prompt = `You are an expert mathematics curriculum alignment auditor. Your task is to verify whether each Math Academy skill in a given list truly belongs to a specific Common Core State Standard (CCSS).

You will be provided with:
1.  <target_ccss>: A single Common Core standard with its code and description.
2.  <mapped_skills>: A list of Math Academy skills currently mapped to this standard.

**Your Goal:**

For EACH skill in the <mapped_skills> list, determine whether it is an accurate match for the <target_ccss>. Provide your assessment, confidence level, and reasoning for each skill.

**Verification Criteria:**

A skill is **ACCURATE** if:
- The concept demonstrated in its workedExample falls directly within the scope of the CCSS description
- It is a necessary component or direct application of the standard
- A student mastering this skill would be demonstrating proficiency in the standard

A skill is **INACCURATE** if:
- It is a prerequisite skill from an earlier grade (teaches foundational concepts needed before the standard)
- It is an extension or advancement beyond the standard's scope
- It addresses a tangentially related but distinct mathematical concept
- It is simply mislabeled or incorrectly mapped

**Confidence Levels:**
- **high**: The classification is obvious and unambiguous
- **medium**: The skill is borderline; reasonable people might disagree
- **low**: Unclear without additional context; uncertain classification

**Instructions:**

1.  **Analyze the Standard:**
    *   Inside an <analysis_standard> tag, deconstruct the <target_ccss> description.
    *   Identify the exact mathematical scope, the cognitive task required, and any explicit constraints.

2.  **Evaluate Each Skill:**
    *   Inside an <analysis_skills> tag, systematically evaluate EVERY skill in <mapped_skills>.
    *   For each skill, determine:
        - Does its workedExample demonstrate the standard's required concept?
        - Is it at the correct grade level (Grade 4)?
        - Is it a direct application or a prerequisite/extension?

3.  **Provide Assessments:**
    *   For each skill, state: sourceId, isAccurate (true/false), confidence (high/medium/low), and a 1-2 sentence reasoning.

**CRITICAL - OUTPUT FORMAT:**

Your response MUST be a valid JSON object with exactly two keys:

{
  "thinking": "string containing ALL your analysis with <analysis_standard> and <analysis_skills> tags",
  "result": [
    {
      "sourceId": "MA-EXAMPLE-2540",
      "isAccurate": true,
      "confidence": "high",
      "reasoning": "This skill directly teaches identifying and drawing lines, which is explicitly required by the standard."
    },
    {
      "sourceId": "MA-EXAMPLE-13567",
      "isAccurate": false,
      "confidence": "high",
      "reasoning": "This is a prerequisite skill about place value identification, not about the standard's focus on expanded form representation."
    }
  ]
}

The "result" array MUST contain an object for EVERY skill in <mapped_skills>.

Each object MUST have exactly four keys:
- "sourceId": string (the skill's ID)
- "isAccurate": boolean (true if skill belongs to standard, false otherwise)
- "confidence": string (must be "high", "medium", or "low")
- "reasoning": string (1-2 sentence explanation)

DO NOT include XML tags or analysis in the "result" array. ALL analysis goes in "thinking".

<target_ccss>
{
  "standard_code": "${standard.standardCode}",
  "standard_desc": "${standard.standardDesc}"
}
</target_ccss>

<mapped_skills>
${skillsXml}
</mapped_skills>`
	
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
						items: {
							type: SchemaType.OBJECT,
							properties: {
								sourceId: { type: SchemaType.STRING },
								isAccurate: { type: SchemaType.BOOLEAN },
								confidence: { 
									type: SchemaType.STRING,
									format: "enum",
									enum: ["high", "medium", "low"]
								},
								reasoning: { type: SchemaType.STRING }
							},
							required: ["sourceId", "isAccurate", "confidence", "reasoning"]
						}
					}
				},
				required: ["thinking", "result"]
			}
		}
	})
	
	logger.debug("calling gemini api", { 
		model: "gemini-2.5-pro", 
		standardCode: standard.standardCode,
		skillCount: standard.maSkills.length,
		promptLength: prompt.length 
	})
	
	const response = await errors.try(
		model.generateContent(prompt)
	)
	if (response.error) {
		logger.error("gemini api call failed", { error: response.error, standardCode: standard.standardCode })
		throw errors.wrap(response.error, "gemini api call")
	}
	
	const result = response.data.response
	const jsonText = result.text()
	
	logger.debug("received gemini response", {
		standardCode: standard.standardCode,
		responseLength: jsonText.length,
		candidatesCount: result.candidates?.length
	})
	
	const parseResult = errors.trySync(() => JSON.parse(jsonText))
	if (parseResult.error) {
		logger.error("failed to parse json response", { error: parseResult.error, jsonText, standardCode: standard.standardCode })
		throw errors.wrap(parseResult.error, "json parse")
	}
	
	const validationResult = GeminiResponseSchema.safeParse(parseResult.data)
	if (!validationResult.success) {
		logger.error("validation failed", { error: validationResult.error, standardCode: standard.standardCode })
		throw errors.wrap(validationResult.error, "response validation")
	}
	
	logger.debug("verified standard mappings", {
		standardCode: standard.standardCode,
		skillsEvaluated: validationResult.data.result.length,
		thinkingLength: validationResult.data.thinking.length
	})
	
	return validationResult.data.result
}

async function processBatch(
	batch: YamlStandardEntry[]
): Promise<Array<{ standardCode: string; verifications?: SkillVerification[]; error?: unknown }>> {
	const batchResults = await Promise.allSettled(
		batch.map(async (standard) => {
			if (standard.maSkills.length === 0) {
				logger.debug("skipping standard with no skills", { standardCode: standard.standardCode })
				return { standardCode: standard.standardCode, verifications: [] }
			}
			
			const verifications = await verifyStandardMappingWithGemini(standard)
			
			return { standardCode: standard.standardCode, verifications }
		})
	)
	
	return batchResults.map((result, idx) => {
		if (result.status === "fulfilled") {
			return result.value
		}
		const standardCode = batch[idx]?.standardCode
		if (!standardCode) {
			throw errors.new("batch index mismatch")
		}
		logger.error("standard verification failed", { 
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
	
	spinner.start("loading mappings")
	
	const mappingPath = path.join(process.cwd(), "data", "exports", "qti", "ccss-to-ma-skills-mapping.yml")
	
	const standards = await loadMappings(mappingPath)
	
	spinner.stop("mappings loaded")
	
	logger.info("starting verification", {
		standardCount: standards.length,
		totalSkills: standards.reduce((sum, s) => sum + s.maSkills.length, 0)
	})
	
	spinner.start(`verifying ${standards.length} standards`)
	
	const results = new Map<string, { standardCode: string; verifications?: SkillVerification[]; error?: unknown }>()
	let standardsToProcess = standards
	
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
		
		const roundResults: Array<{ standardCode: string; verifications?: SkillVerification[]; error?: unknown }> = []
		
		for (let i = 0; i < standardsToProcess.length; i += BATCH_SIZE) {
			const batch = standardsToProcess.slice(i, i + BATCH_SIZE)
			const batchNumber = Math.floor(i / BATCH_SIZE) + 1
			const totalBatches = Math.ceil(standardsToProcess.length / BATCH_SIZE)
			
			const roundLabel = retryRound > 0 ? `retry ${retryRound}, ` : ""
			spinner.message(`verifying ${roundLabel}batch ${batchNumber}/${totalBatches}`)
			
			logger.debug("processing batch", { 
				retryRound,
				batchNumber, 
				totalBatches, 
				batchSize: batch.length 
			})
			
			const batchResults = await processBatch(batch)
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
			standardsToProcess = standards.filter((standard) => {
				const result = results.get(standard.standardCode)
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
	
	spinner.stop("verification completed")
	
	const allResults = Array.from(results.values())
	const successfulResults = allResults.filter((r) => !r.error)
	const failedResults = allResults.filter((r) => r.error)
	
	logger.info("verification results", {
		total: allResults.length,
		successful: successfulResults.length,
		failed: failedResults.length
	})
	
	if (failedResults.length > 0) {
		logger.warn("some standards failed verification", {
			failedStandardCodes: failedResults.map((r) => r.standardCode)
		})
	}
	
	spinner.start("generating verification report")
	
	const verificationResults: StandardVerificationResult[] = standards.map((standard) => {
		const result = results.get(standard.standardCode)
		if (!result) {
			throw errors.new(`result not found for standard: ${standard.standardCode}`)
		}
		if (result.error) {
			return {
				standardCode: standard.standardCode,
				standardDesc: standard.standardDesc,
				totalSkills: standard.maSkills.length,
				accurateSkills: 0,
				inaccurateSkills: 0,
				skillVerifications: []
			}
		}
		if (!result.verifications) {
			throw errors.new(`verifications missing for standard: ${standard.standardCode}`)
		}
		
		const accurateCount = result.verifications.filter((v) => v.isAccurate).length
		const inaccurateCount = result.verifications.filter((v) => !v.isAccurate).length
		
		return {
			standardCode: standard.standardCode,
			standardDesc: standard.standardDesc,
			totalSkills: standard.maSkills.length,
			accurateSkills: accurateCount,
			inaccurateSkills: inaccurateCount,
			skillVerifications: result.verifications
		}
	})
	
	const outputPath = path.join(process.cwd(), "data", "exports", "qti", "ccss-skill-mapping-verification.json")
	const writeData = JSON.stringify(verificationResults, null, 2)
	
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, writeData, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write verification report", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "write verification report")
	}
	
	spinner.stop("verification report generated")
	
	const totalSkillsVerified = verificationResults.reduce((sum, r) => sum + r.totalSkills, 0)
	const totalAccurate = verificationResults.reduce((sum, r) => sum + r.accurateSkills, 0)
	const totalInaccurate = verificationResults.reduce((sum, r) => sum + r.inaccurateSkills, 0)
	const accuracyRate = totalSkillsVerified > 0 
		? Math.round((totalAccurate / totalSkillsVerified) * 100) 
		: 0
	
	logger.info("script completed", {
		outputPath,
		standardsVerified: verificationResults.length,
		totalSkillsVerified,
		totalAccurate,
		totalInaccurate,
		accuracyRate
	})
	
	p.outro(`verified ${totalSkillsVerified} skills across ${verificationResults.length} standards (${accuracyRate}% accurate)`)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

