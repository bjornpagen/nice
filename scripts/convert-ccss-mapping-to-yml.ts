#!/usr/bin/env bun
import * as p from "@clack/prompts"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import * as fs from "node:fs"
import * as path from "node:path"
import yaml from "yaml"

interface StandardToSkillsMapping {
	standard_code: string
	standard_desc: string
	ma_skills: string[]
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

async function main() {
	const spinner = p.spinner()
	
	spinner.start("loading data files")
	
	const inputPath = path.join(process.cwd(), "data", "exports", "qti", "ccss-to-ma-skills-mapping.json")
	const skillsPath = path.join(process.cwd(), "data", "exports", "qti", "grade4-all-skills.yml")
	
	logger.debug("reading mapping file", { inputPath })
	
	const readResult = errors.trySync(() => fs.readFileSync(inputPath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read mapping file", { error: readResult.error, inputPath })
		throw errors.wrap(readResult.error, "read mapping file")
	}
	
	const parseResult = errors.trySync(() => JSON.parse(readResult.data))
	if (parseResult.error) {
		logger.error("failed to parse mapping json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "parse mapping json")
	}
	
	const mappings: StandardToSkillsMapping[] = parseResult.data
	const skillMap = await loadMathAcademySkills(skillsPath)
	
	logger.debug("loaded mappings", { count: mappings.length })
	
	spinner.stop("data files loaded")
	
	spinner.start("converting to yml format")
	
	const yamlEntries: YamlStandardEntry[] = mappings.map((mapping) => {
		const skillEntries: YamlSkillEntry[] = []
		
		for (const skillId of mapping.ma_skills) {
			const skill = skillMap.get(skillId)
			if (!skill) {
				logger.warn("skill not found in grade4 skills", { 
					skillId, 
					standardCode: mapping.standard_code 
				})
				continue
			}
			
			skillEntries.push({
				sourceId: skill.sourceId,
				name: skill.name,
				workedExample: skill.workedExample,
				subGroup: skill.subGroup
			})
		}
		
		return {
			standardCode: mapping.standard_code,
			standardDesc: mapping.standard_desc,
			maSkills: skillEntries
		}
	})
	
	const yamlString = yaml.stringify(yamlEntries, {
		aliasDuplicateObjects: false
	})
	
	logger.debug("generated yml", { length: yamlString.length })
	
	spinner.stop("conversion completed")
	
	spinner.start("writing yml file")
	
	const outputPath = path.join(process.cwd(), "data", "exports", "qti", "ccss-to-ma-skills-mapping.yml")
	
	const writeResult = errors.trySync(() => fs.writeFileSync(outputPath, yamlString, "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write yml file", { error: writeResult.error, outputPath })
		throw errors.wrap(writeResult.error, "write yml file")
	}
	
	spinner.stop("yml file written")
	
	const totalSkills = yamlEntries.reduce((sum, e) => sum + e.maSkills.length, 0)
	const standardsWithSkills = yamlEntries.filter((e) => e.maSkills.length > 0).length
	const standardsWithoutSkills = yamlEntries.filter((e) => e.maSkills.length === 0).length
	
	logger.info("script completed", {
		inputPath,
		outputPath,
		standardCount: yamlEntries.length,
		standardsWithSkills,
		standardsWithoutSkills,
		totalSkills,
		avgSkillsPerStandard: Math.round((totalSkills / yamlEntries.length) * 10) / 10
	})
	
	p.outro(`converted ${yamlEntries.length} standards to yml (${totalSkills} skills embedded)`)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

