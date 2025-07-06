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
let cachedExamples: ConversionExample[] | null = null

/**
 * Loads all Perseus-to-QTI examples from the filesystem.
 * This function is lazy and will cache results after the first load.
 *
 * @returns A promise that resolves to an array of conversion examples.
 */
export async function loadConversionExamples(): Promise<ConversionExample[]> {
	// Return cached examples if already loaded
	if (cachedExamples !== null) {
		return cachedExamples
	}

	logger.info("loading perseus-to-qti conversion examples from filesystem")

	// Following Vercel docs pattern for file reading
	const EXAMPLES_DIR = `${process.cwd()}/src/lib/perseus-to-qti/examples`

	const filesResult = await errors.try(fs.readdir(EXAMPLES_DIR))
	if (filesResult.error) {
		logger.error("failed to read examples directory, cannot load examples", {
			error: filesResult.error,
			path: EXAMPLES_DIR
		})
		// Return an empty array to allow the app to function, albeit with lower AI accuracy.
		cachedExamples = []
		return cachedExamples
	}

	const perseusFiles = filesResult.data.filter((file) => file.endsWith(".perseus.json"))
	if (perseusFiles.length === 0) {
		logger.warn("no perseus example files found in examples directory", { path: EXAMPLES_DIR })
		cachedExamples = []
		return cachedExamples
	}

	const examplePromises = perseusFiles.map(async (perseusFile): Promise<ConversionExample | null> => {
		const baseName = perseusFile.replace(".perseus.json", "")
		const qtiFile = `${baseName}.qti.xml`
		const perseusPath = `${EXAMPLES_DIR}/${perseusFile}`
		const qtiPath = `${EXAMPLES_DIR}/${qtiFile}`

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
		loaded: validExamples.length,
		total: perseusFiles.length
	})

	// Cache the results
	cachedExamples = validExamples
	return cachedExamples
}
