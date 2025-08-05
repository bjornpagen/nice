import { promises as fs } from "node:fs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

/**
 * Represents a single "before and after" conversion example.
 */
interface ConversionExample {
	name: string
	perseus: unknown | null // Can be null for negative examples without Perseus source
	qti: string
	type: "positive" | "negative"
}

// Cache for loaded examples to avoid re-reading files on every request
let cachedStimulusExamples: ConversionExample[] | null = null

/**
 * Loads all Perseus-to-QTI stimulus examples from the filesystem.
 * This function is lazy and will cache results after the first load.
 *
 * @returns A promise that resolves to an array of conversion examples.
 */
export async function loadConversionExamples(): Promise<ConversionExample[]> {
	if (cachedStimulusExamples !== null) {
		return cachedStimulusExamples
	}

	logger.info("loading perseus-to-qti stimulus conversion examples from filesystem")

	const EXAMPLES_DIR = `${process.cwd()}/examples/qti-generation`
	const perseusExt = ".perseus.json"
	const qtiExt = ".qti.xml"
	const baseDir = `${EXAMPLES_DIR}/assessment-stimulus`

	// Load examples from both positive and negative directories
	const allExamples: ConversionExample[] = []

	for (const exampleType of ["positive", "negative"] as const) {
		const exampleDir = `${baseDir}/${exampleType}`

		const filesResult = await errors.try(fs.readdir(exampleDir))
		if (filesResult.error) {
			logger.warn("failed to read stimulus examples directory, skipping", {
				error: filesResult.error,
				path: exampleDir,
				exampleType
			})
			continue
		}

		// For negative examples, we support both:
		// 1. Perseus + QTI pairs (traditional examples)
		// 2. Standalone QTI files (for cases where Perseus source doesn't make sense)
		const perseusFiles = filesResult.data.filter((file) => file.endsWith(perseusExt))
		const qtiFiles = filesResult.data.filter((file) => file.endsWith(qtiExt))

		// Get all unique base names from both perseus and qti files
		const baseNames = new Set<string>()
		for (const perseusFile of perseusFiles) {
			baseNames.add(perseusFile.replace(perseusExt, ""))
		}
		// For negative examples, also include standalone QTI files
		if (exampleType === "negative") {
			for (const qtiFile of qtiFiles) {
				baseNames.add(qtiFile.replace(qtiExt, ""))
			}
		}

		if (baseNames.size === 0) {
			logger.warn("no stimulus example files found in examples directory", {
				path: exampleDir,
				exampleType
			})
			continue
		}

		const examplePromises = Array.from(baseNames).map(async (baseName): Promise<ConversionExample | null> => {
			const perseusFile = `${baseName}${perseusExt}`
			const qtiFile = `${baseName}${qtiExt}`
			const perseusPath = `${exampleDir}/${perseusFile}`
			const qtiPath = `${exampleDir}/${qtiFile}`

			// For negative examples, perseus file is optional
			const isNegative = exampleType === "negative"

			// Check if files exist
			const [perseusExistsResult, qtiExistsResult] = await Promise.all([
				errors.try(fs.access(perseusPath)),
				errors.try(fs.access(qtiPath))
			])

			const perseusExists = !perseusExistsResult.error
			const qtiExists = !qtiExistsResult.error

			// Skip if QTI doesn't exist
			if (!qtiExists) {
				logger.warn("qti file not found, skipping example", {
					baseName,
					qtiFile
				})
				return null
			}

			// For positive examples, perseus must exist
			if (!isNegative && !perseusExists) {
				logger.warn("perseus file not found for positive example, skipping", {
					baseName,
					perseusFile
				})
				return null
			}

			// Read QTI file (always required)
			const qtiContentResult = await errors.try(fs.readFile(qtiPath, "utf-8"))
			if (qtiContentResult.error) {
				logger.warn("failed to read qti file, skipping example", {
					file: qtiFile,
					error: qtiContentResult.error
				})
				return null
			}

			// Read and parse Perseus file if it exists
			let perseusData: unknown = null
			if (perseusExists) {
				const perseusContentResult = await errors.try(fs.readFile(perseusPath, "utf-8"))
				if (perseusContentResult.error) {
					logger.warn("failed to read perseus file, skipping example", {
						file: perseusFile,
						error: perseusContentResult.error
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

				perseusData = perseusJsonResult.data
			}

			return {
				name: baseName,
				perseus: perseusData,
				qti: qtiContentResult.data,
				type: exampleType
			}
		})

		const results = await Promise.all(examplePromises)
		const validExamples = results.filter((e): e is ConversionExample => e !== null)
		allExamples.push(...validExamples)

		logger.info("loaded stimulus examples from directory", {
			exampleType,
			loaded: validExamples.length,
			total: perseusFiles.length
		})
	}

	logger.info("successfully loaded all qti stimulus conversion examples", {
		totalLoaded: allExamples.length,
		positiveCount: allExamples.filter((e) => e.type === "positive").length,
		negativeCount: allExamples.filter((e) => e.type === "negative").length
	})

	// Cache the results
	cachedStimulusExamples = allExamples
	return allExamples
}
