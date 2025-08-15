import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { put } from "@vercel/blob"
import { env } from "@/env"

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Waits for a newly uploaded public Blob URL to become globally readable.
 * Uses bounded polling with HEAD requests to avoid downloading the body.
 */
async function waitForBlobAvailability(
	url: string,
	params: {
		questionId: string
		screenshotType: "production" | "perseus"
		maxWaitMs?: number
		initialDelayMs?: number
	}
): Promise<void> {
	const { questionId, screenshotType } = params
	const maxWaitMs = params.maxWaitMs ?? 10000
	let nextDelayMs = params.initialDelayMs ?? 300
	const start = Date.now()
	let attempt = 0

	logger.debug("verifying blob availability", { questionId, screenshotType })

	while (Date.now() - start < maxWaitMs) {
		// Backoff before probing to give the CDN time to propagate
		await sleep(nextDelayMs)

		attempt += 1
		// Use a probe query param to avoid any stale negative cache entries
		const probeUrl = `${url}${url.includes("?") ? "&" : "?"}__probe=${Date.now()}`
		const headResult = await errors.try(
			fetch(probeUrl, {
				method: "HEAD",
				headers: { "Cache-Control": "no-cache" }
			})
		)
		if (headResult.error) {
			logger.error("blob availability probe failed", { questionId, screenshotType, error: headResult.error })
			throw errors.wrap(headResult.error, "blob availability probe")
		}

		const response = headResult.data
		if (response.ok) {
			logger.debug("blob is available", { questionId, screenshotType, attempt, status: response.status })
			return
		}

		const elapsedMs = Date.now() - start
		logger.debug("blob not yet available", {
			questionId,
			screenshotType,
			attempt,
			status: response.status,
			elapsedMs,
			nextDelayMs
		})

		// Exponential backoff with jitter, cap per-interval delay to 2000ms
		const base = Math.min(nextDelayMs * 2, 2000)
		const jitter = 0.8 + Math.random() * 0.4 // 0.8x - 1.2x
		nextDelayMs = Math.floor(base * jitter)
	}

	logger.error("blob did not become available in time", { questionId, screenshotType, maxWaitMs })
	throw errors.new("blob not readable after delay")
}

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

	// Ensure the public URL is actually readable before returning
	const url = uploadResult.data.url
	const availabilityResult = await errors.try(waitForBlobAvailability(url, { questionId, screenshotType }))
	if (availabilityResult.error) {
		logger.error("blob availability check failed", { questionId, screenshotType, error: availabilityResult.error })
		throw errors.wrap(availabilityResult.error, "blob availability check")
	}

	return url
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
