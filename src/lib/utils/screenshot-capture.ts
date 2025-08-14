import * as errors from "@superbuilders/errors"
import { sessionPool } from "@/lib/utils/browserbase-session-pool"

/**
 * Captures a screenshot of the production QTI embed using session pool
 */
export async function captureProductionQTIScreenshot(questionId: string): Promise<Buffer> {
	// Acquire a session from the pool
	const sessionResult = await errors.try(sessionPool.acquireSession())
	if (sessionResult.error) {
		throw errors.wrap(sessionResult.error, "failed to acquire browserbase session")
	}

	const { sessionId, browser } = sessionResult.data

	const contexts = browser.contexts()
	if (contexts.length === 0) {
		sessionPool.releaseSession(sessionId)
		throw errors.new("no browser contexts available")
	}

	const context = contexts[0]
	if (!context) {
		sessionPool.releaseSession(sessionId)
		throw errors.new("context is undefined despite length check")
	}

	const pageResult = await errors.try(context.newPage())
	if (pageResult.error) {
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(pageResult.error, "failed to create new page")
	}

	const page = pageResult.data
	const productionUrl = `https://alpha-powerpath-ui-production.up.railway.app/qti-embed/nice_${questionId}`

	const navigationResult = await errors.try(page.goto(productionUrl, { waitUntil: "networkidle" }))
	if (navigationResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(navigationResult.error, "failed to navigate to production qti embed")
	}

	// Set zoom level to 0.8 (80%) for better screenshot clarity
	const zoomResult = await errors.try(page.evaluate("document.body.style.zoom='0.8'"))
	if (zoomResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(zoomResult.error, "failed to set page zoom level")
	}

	// Wait 10 seconds for complete rendering as specified in PRD
	const timeoutResult = await errors.try(page.waitForTimeout(10000))
	if (timeoutResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(timeoutResult.error, "failed to wait for complete rendering")
	}

	const screenshotResult = await errors.try(page.screenshot({ fullPage: true, type: "png" }))

	// Always close page and release session back to pool
	await page.close()
	sessionPool.releaseSession(sessionId)

	if (screenshotResult.error) {
		throw errors.wrap(screenshotResult.error, "failed to capture production screenshot")
	}

	const data = screenshotResult.data
	if (!Buffer.isBuffer(data)) {
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
		throw errors.wrap(sessionResult.error, "failed to acquire browserbase session")
	}

	const { sessionId, browser } = sessionResult.data

	const contexts = browser.contexts()
	if (contexts.length === 0) {
		sessionPool.releaseSession(sessionId)
		throw errors.new("no browser contexts available")
	}

	const context = contexts[0]
	if (!context) {
		sessionPool.releaseSession(sessionId)
		throw errors.new("context is undefined despite length check")
	}

	const pageResult = await errors.try(context.newPage())
	if (pageResult.error) {
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(pageResult.error, "failed to create new page")
	}

	const page = pageResult.data
	const perseusUrl = "https://khan.github.io/perseus/?path=/story/renderers-server-item-renderer--interactive"

	const navigationResult = await errors.try(page.goto(perseusUrl, { waitUntil: "networkidle" }))
	if (navigationResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(navigationResult.error, "failed to navigate to perseus")
	}

	// Use robust locator for the Perseus textarea
	const textareaLocator = page.locator("#storybook-root textarea")

	// Wait for the textarea to be visible and ready
	const waitResult = await errors.try(textareaLocator.waitFor({ state: "visible", timeout: 30000 }))
	if (waitResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(waitResult.error, "failed to find perseus textarea")
	}

	// Clear existing content
	const clearResult = await errors.try(textareaLocator.clear())
	if (clearResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(clearResult.error, "failed to clear perseus textarea")
	}

	// Convert parsed data to JSON string and fill
	const jsonString = JSON.stringify(parsedData, null, 2)
	const fillResult = await errors.try(textareaLocator.fill(jsonString))
	if (fillResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(fillResult.error, "failed to fill perseus textarea")
	}

	// Set zoom level to 0.8 (80%) for consistent screenshot scaling with production
	const zoomResult = await errors.try(page.evaluate("document.body.style.zoom='0.8'"))
	if (zoomResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(zoomResult.error, "failed to set page zoom level")
	}

	// Wait for Perseus to finish rendering by waiting for content to appear
	const contentLocator = page.locator("#storybook-root").locator(':has-text("Choice")')
	const renderWaitResult = await errors.try(contentLocator.waitFor({ state: "visible", timeout: 10000 }))
	if (renderWaitResult.error) {
		await page.close()
		sessionPool.releaseSession(sessionId)
		throw errors.wrap(renderWaitResult.error, "failed to wait for perseus rendering")
	}

	const screenshotResult = await errors.try(page.screenshot({ fullPage: true, type: "png" }))

	// Always close page and release session back to pool
	await page.close()
	sessionPool.releaseSession(sessionId)

	if (screenshotResult.error) {
		throw errors.wrap(screenshotResult.error, "failed to capture perseus screenshot")
	}

	const data = screenshotResult.data
	if (!Buffer.isBuffer(data)) {
		throw errors.new("screenshot capture returned non-buffer data")
	}

	return data
}
