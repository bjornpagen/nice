import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { sessionPool } from "@/lib/utils/browserbase-session-pool"

// Fixed viewport used for screenshots to control window size explicitly
const SCREENSHOT_VIEWPORT = { width: 820, height: 1180 }

/**
 * Captures a screenshot of the production QTI embed using session pool
 */
export async function captureProductionQTIScreenshot(questionId: string): Promise<Buffer> {
	// Acquire a session from the pool
	const sessionResult = await errors.try(sessionPool.acquireSession())
	if (sessionResult.error) {
		logger.error("failed to acquire browserbase session for production screenshot", {
			questionId,
			error: sessionResult.error
		})
		throw errors.wrap(sessionResult.error, "failed to acquire browserbase session")
	}

	const { sessionId, browser } = sessionResult.data

	const contexts = browser.contexts()
	if (contexts.length === 0) {
		sessionPool.releaseSession(sessionId)
		logger.error("no browser contexts available for production screenshot", { questionId, sessionId })
		throw errors.new("no browser contexts available")
	}

	const context = contexts[0]
	if (!context) {
		sessionPool.releaseSession(sessionId)
		logger.error("context is undefined despite length check for production screenshot", { questionId, sessionId })
		throw errors.new("context is undefined despite length check")
	}

	const pageResult = await errors.try(context.newPage())
	if (pageResult.error) {
		sessionPool.releaseSession(sessionId)
		logger.error("failed to create new page for production screenshot", {
			questionId,
			sessionId,
			error: pageResult.error
		})
		throw errors.wrap(pageResult.error, "failed to create new page")
	}

	const page = pageResult.data
	const productionUrl = `https://alpha-powerpath-ui-production.up.railway.app/qti-embed/nice_${questionId}`

	// Set explicit viewport size before navigation to control window dimensions
	const viewportResult = await errors.try(page.setViewportSize(SCREENSHOT_VIEWPORT))
	if (viewportResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to set viewport for production screenshot", {
			questionId,
			sessionId,
			viewport: SCREENSHOT_VIEWPORT,
			error: viewportResult.error
		})
		throw errors.wrap(viewportResult.error, "failed to set viewport")
	}

	const navigationResult = await errors.try(page.goto(productionUrl, { waitUntil: "networkidle" }))
	if (navigationResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to navigate to production qti embed", {
			questionId,
			sessionId,
			productionUrl,
			error: navigationResult.error
		})
		throw errors.wrap(navigationResult.error, "failed to navigate to production qti embed")
	}

	// Set zoom level to 0.8 (80%) for better screenshot clarity
	const zoomResult = await errors.try(page.evaluate("document.body.style.zoom='0.8'"))
	if (zoomResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to set page zoom level for production screenshot", {
			questionId,
			sessionId,
			error: zoomResult.error
		})
		throw errors.wrap(zoomResult.error, "failed to set page zoom level")
	}

	// Wait 10 seconds for complete rendering as specified in PRD
	const timeoutResult = await errors.try(page.waitForTimeout(10000))
	if (timeoutResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to wait for complete rendering in production screenshot", {
			questionId,
			sessionId,
			error: timeoutResult.error
		})
		throw errors.wrap(timeoutResult.error, "failed to wait for complete rendering")
	}

	const screenshotResult = await errors.try(page.screenshot({ fullPage: true, type: "png" }))

	// Always close page and release session back to pool
	await page.close()
	sessionPool.releaseSession(sessionId)

	if (screenshotResult.error) {
		logger.error("failed to capture production screenshot", { questionId, sessionId, error: screenshotResult.error })
		throw errors.wrap(screenshotResult.error, "failed to capture production screenshot")
	}

	const data = screenshotResult.data
	if (!Buffer.isBuffer(data)) {
		logger.error("screenshot capture returned non-buffer data for production", {
			questionId,
			sessionId,
			dataType: typeof data
		})
		throw errors.new("screenshot capture returned non-buffer data")
	}

	return data
}

/**
 * Captures a screenshot of Perseus with the provided parsed data using session pool
 */
export async function capturePerseusScreenshot(_questionId: string, parsedData: unknown): Promise<Buffer> {
	// Acquire a session from the pool
	const sessionResult = await errors.try(sessionPool.acquireSession())
	if (sessionResult.error) {
		logger.error("failed to acquire browserbase session for perseus screenshot", {
			questionId: _questionId,
			error: sessionResult.error
		})
		throw errors.wrap(sessionResult.error, "failed to acquire browserbase session")
	}

	const { sessionId, browser } = sessionResult.data

	const contexts = browser.contexts()
	if (contexts.length === 0) {
		sessionPool.releaseSession(sessionId)
		logger.error("no browser contexts available for perseus screenshot", { questionId: _questionId, sessionId })
		throw errors.new("no browser contexts available")
	}

	const context = contexts[0]
	if (!context) {
		sessionPool.releaseSession(sessionId)
		logger.error("context is undefined despite length check for perseus screenshot", {
			questionId: _questionId,
			sessionId
		})
		throw errors.new("context is undefined despite length check")
	}

	const pageResult = await errors.try(context.newPage())
	if (pageResult.error) {
		sessionPool.releaseSession(sessionId)
		logger.error("failed to create new page for perseus screenshot", {
			questionId: _questionId,
			sessionId,
			error: pageResult.error
		})
		throw errors.wrap(pageResult.error, "failed to create new page")
	}

	const page = pageResult.data
	const perseusUrl = "https://khan.github.io/perseus/?path=/story/renderers-server-item-renderer--interactive"

	// Set explicit viewport size before navigation to control window dimensions
	const viewportResult = await errors.try(page.setViewportSize(SCREENSHOT_VIEWPORT))
	if (viewportResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to set viewport for perseus screenshot", {
			questionId: _questionId,
			sessionId,
			viewport: SCREENSHOT_VIEWPORT,
			error: viewportResult.error
		})
		throw errors.wrap(viewportResult.error, "failed to set viewport")
	}

	const navigationResult = await errors.try(page.goto(perseusUrl, { waitUntil: "networkidle" }))
	if (navigationResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to navigate to perseus", {
			questionId: _questionId,
			sessionId,
			perseusUrl,
			error: navigationResult.error
		})
		throw errors.wrap(navigationResult.error, "failed to navigate to perseus")
	}

	// Use robust locator for the Perseus textarea
	const textareaLocator = page.locator("#storybook-root textarea")

	// Wait for the textarea to be visible and ready
	const waitResult = await errors.try(textareaLocator.waitFor({ state: "visible", timeout: 30000 }))
	if (waitResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to find perseus textarea", { questionId: _questionId, sessionId, error: waitResult.error })
		throw errors.wrap(waitResult.error, "failed to find perseus textarea")
	}

	// Clear existing content
	const clearResult = await errors.try(textareaLocator.clear())
	if (clearResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to clear perseus textarea", { questionId: _questionId, sessionId, error: clearResult.error })
		throw errors.wrap(clearResult.error, "failed to clear perseus textarea")
	}

	// Convert parsed data to JSON string and fill
	const jsonString = JSON.stringify(parsedData, null, 2)
	const fillResult = await errors.try(textareaLocator.fill(jsonString))
	if (fillResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to fill perseus textarea", { questionId: _questionId, sessionId, error: fillResult.error })
		throw errors.wrap(fillResult.error, "failed to fill perseus textarea")
	}

	// Set zoom level to 0.8 (80%) for consistent screenshot scaling with production
	const zoomResult = await errors.try(page.evaluate("document.body.style.zoom='0.8'"))
	if (zoomResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to set page zoom level for perseus screenshot", {
			questionId: _questionId,
			sessionId,
			error: zoomResult.error
		})
		throw errors.wrap(zoomResult.error, "failed to set page zoom level")
	}

	// Wait for Perseus to finish rendering by waiting for content to appear
	const contentLocator = page.locator("#storybook-root").locator(':has-text("Choice")')
	const renderWaitResult = await errors.try(contentLocator.waitFor({ state: "visible", timeout: 10000 }))
	if (renderWaitResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		logger.error("failed to wait for perseus rendering", {
			questionId: _questionId,
			sessionId,
			error: renderWaitResult.error
		})
		throw errors.wrap(renderWaitResult.error, "failed to wait for perseus rendering")
	}

	const screenshotResult = await errors.try(page.screenshot({ fullPage: true, type: "png" }))

	// Always close page and release session back to pool
	await page.close()
	sessionPool.releaseSession(sessionId)

	if (screenshotResult.error) {
		logger.error("failed to capture perseus screenshot", {
			questionId: _questionId,
			sessionId,
			error: screenshotResult.error
		})
		throw errors.wrap(screenshotResult.error, "failed to capture perseus screenshot")
	}

	const data = screenshotResult.data
	if (!Buffer.isBuffer(data)) {
		logger.error("screenshot capture returned non-buffer data for perseus", {
			questionId: _questionId,
			sessionId,
			dataType: typeof data
		})
		throw errors.new("screenshot capture returned non-buffer data")
	}

	return data
}
