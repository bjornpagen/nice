import { promises as fs } from "node:fs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

/**
 * Represents a single "before and after" conversion example.
 */
interface ConversionExample {
	name: string
	perseus: unknown
	qti: string
}

// Cache for loaded examples to avoid re-reading files on every request
let cachedAssessmentItemExamples: ConversionExample[] | null = null
let cachedStimulusExamples: ConversionExample[] | null = null

/**
 * Loads all Perseus-to-QTI examples from the filesystem.
 * This function is lazy and will cache results after the first load.
 *
 * @param options An object to specify the conversion type. Defaults to 'assessmentItem'.
 * @returns A promise that resolves to an array of conversion examples.
 */
export async function loadConversionExamples(
	options: { type: "assessmentItem" | "stimulus" } = { type: "assessmentItem" }
): Promise<ConversionExample[]> {
	const { type } = options
	const isStimulus = type === "stimulus"
	const cached = isStimulus ? cachedStimulusExamples : cachedAssessmentItemExamples
	if (cached !== null) {
		return cached
	}

	logger.info("loading perseus-to-qti conversion examples from filesystem", { type })

	const EXAMPLES_DIR = `${process.cwd()}/src/lib/perseus-to-qti/examples`
	const perseusExt = isStimulus ? ".stimulus.json" : ".perseus.json"
	const qtiExt = isStimulus ? ".stimulus.xml" : ".qti.xml"
	const exampleDir = isStimulus ? `${EXAMPLES_DIR}/stimulus` : `${EXAMPLES_DIR}/assessment-items`

	const filesResult = await errors.try(fs.readdir(exampleDir))
	if (filesResult.error) {
		logger.error("failed to read examples directory, cannot load examples", {
			error: filesResult.error,
			path: exampleDir
		})
		const empty: ConversionExample[] = []
		if (isStimulus) {
			cachedStimulusExamples = empty
		} else {
			cachedAssessmentItemExamples = empty
		}
		return empty
	}

	const perseusFiles = filesResult.data.filter((file) => file.endsWith(perseusExt))
	if (perseusFiles.length === 0) {
		logger.warn("no perseus example files found in examples directory", { path: exampleDir, type })
		const empty: ConversionExample[] = []
		if (isStimulus) {
			cachedStimulusExamples = empty
		} else {
			cachedAssessmentItemExamples = empty
		}
		return empty
	}

	const examplePromises = perseusFiles.map(async (perseusFile): Promise<ConversionExample | null> => {
		const baseName = perseusFile.replace(perseusExt, "")
		const qtiFile = `${baseName}${qtiExt}`
		const perseusPath = `${exampleDir}/${perseusFile}`
		const qtiPath = `${exampleDir}/${qtiFile}`

		const [perseusContentResult, qtiContentResult] = await Promise.all([
			errors.try(fs.readFile(perseusPath, "utf-8")),
			errors.try(fs.readFile(qtiPath, "utf-8"))
		])

		if (perseusContentResult.error) {
			logger.warn("failed to read perseus file, skipping example", {
				file: perseusFile,
				error: perseusContentResult.error
			})
			return null
		}
		if (qtiContentResult.error) {
			logger.warn("qti file not found for perseus example, skipping", {
				perseusFile,
				qtiFile,
				error: qtiContentResult.error
			})
			return null
		}

		const perseusJsonResult = errors.trySync(() => JSON.parse(perseusContentResult.data))
		if (perseusJsonResult.error) {
			logger.warn("failed to parse perseus json, skipping example", {
				file: perseusFile,
				error: perseusJsonResult.error
			})
			return null
		}

		return {
			name: baseName,
			perseus: perseusJsonResult.data,
			qti: qtiContentResult.data
		}
	})

	const allResults = await Promise.all(examplePromises)
	const validExamples = allResults.filter((e): e is ConversionExample => e !== null)

	logger.info("successfully loaded qti conversion examples", {
		type,
		loaded: validExamples.length,
		total: perseusFiles.length
	})

	// Cache the results
	if (isStimulus) {
		cachedStimulusExamples = validExamples
	} else {
		cachedAssessmentItemExamples = validExamples
	}
	return validExamples
}
