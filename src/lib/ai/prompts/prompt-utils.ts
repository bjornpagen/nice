import fs from "node:fs/promises"
import path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

/**
 * Loads a text-based asset from the prompts directory.
 * @param fileName - The name of the file to load (e.g., 'qti_analysis_report.md').
 * @returns The content of the file as a string.
 */
export async function loadPromptAsset(fileName: string): Promise<string> {
	const filePath = path.join(process.cwd(), "src/lib/ai/prompts", fileName)
	const result = await errors.try(fs.readFile(filePath, "utf-8"))
	if (result.error) {
		logger.error("failed to load prompt asset", { fileName, error: result.error })
		throw errors.wrap(result.error, "prompt asset loading")
	}
	return result.data
}
