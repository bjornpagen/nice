import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { put } from "@vercel/blob"
import { env } from "@/env"

/**
 * Uploads a screenshot buffer to Vercel Blob with upsert behavior.
 * Uses override: true to replace existing files with the same path.
 */
export async function uploadScreenshot(
	questionId: string,
	screenshotType: "production" | "perseus",
	screenshotBuffer: Buffer
): Promise<string> {
	const filename = `${questionId}-${screenshotType}.png`
	const blobPath = `qa-screenshots/${screenshotType}/${filename}`

	const uploadResult = await errors.try(
		put(blobPath, screenshotBuffer, {
			access: "public",
			contentType: "image/png",
			allowOverwrite: true,
			token: env.BLOB_READ_WRITE_TOKEN
		})
	)

	if (uploadResult.error) {
		logger.error("blob upload failed", { screenshotType, questionId, error: uploadResult.error })
		throw errors.wrap(uploadResult.error, `blob upload failed for ${screenshotType} screenshot`)
	}

	return uploadResult.data.url
}

/**
 * Uploads both production and perseus screenshots to Vercel Blob.
 * Returns both URLs for database storage.
 */
export async function uploadScreenshots(
	questionId: string,
	productionBuffer: Buffer,
	perseusBuffer: Buffer
): Promise<{
	productionUrl: string
	perseusUrl: string
}> {
	// Upload both screenshots in parallel for better performance
	const uploadResults = await Promise.allSettled([
		uploadScreenshot(questionId, "production", productionBuffer),
		uploadScreenshot(questionId, "perseus", perseusBuffer)
	])

	// Check if production upload succeeded
	const productionResult = uploadResults[0]
	if (productionResult.status === "rejected") {
		logger.error("production screenshot upload failed", { questionId, reason: productionResult.reason })
		throw errors.new(`production screenshot upload failed: ${productionResult.reason}`)
	}

	// Check if perseus upload succeeded
	const perseusResult = uploadResults[1]
	if (perseusResult.status === "rejected") {
		logger.error("perseus screenshot upload failed", { questionId, reason: perseusResult.reason })
		throw errors.new(`perseus screenshot upload failed: ${perseusResult.reason}`)
	}

	return {
		productionUrl: productionResult.value,
		perseusUrl: perseusResult.value
	}
}
