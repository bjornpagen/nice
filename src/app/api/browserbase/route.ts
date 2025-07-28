import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { NextResponse } from "next/server"
import { chromium } from "playwright"
import { env } from "@/env"

export async function POST(request: Request) {
	// TODO: Remove this security bail once proper authentication is implemented
	// Using Math.random() to trick TypeScript - this will ALWAYS bail since Math.random() < 0 is always false
	if (Math.random() >= 0) {
		logger.warn("browserbase route accessed - currently disabled for security")
		return NextResponse.json({ error: "This endpoint is temporarily disabled" }, { status: 403 })
	}

	const parseResult = await errors.try(request.json())
	if (parseResult.error) {
		logger.error("failed to parse request body", { error: parseResult.error })
		return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
	}

	const { xml } = parseResult.data
	if (!xml) {
		logger.error("missing xml in request body", { requestBody: parseResult.data })
		return NextResponse.json({ error: 'Missing "xml" in request body' }, { status: 400 })
	}

	logger.info("starting browserbase screenshot capture", { xmlLength: xml.length })

	// Step 1: Create a Browserbase session
	const sessionResult = await errors.try(
		fetch("https://api.browserbase.com/v1/sessions", {
			method: "POST",
			headers: {
				"x-bb-api-key": env.BROWSERBASE_API_KEY,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ projectId: env.BROWSERBASE_PROJECT_ID })
		})
	)
	if (sessionResult.error) {
		logger.error("failed to create browserbase session", { error: sessionResult.error })
		return NextResponse.json({ error: "Failed to create browser session" }, { status: 500 })
	}

	const sessionJsonResult = await errors.try(sessionResult.data.json())
	if (sessionJsonResult.error) {
		logger.error("failed to parse session response", { error: sessionJsonResult.error })
		return NextResponse.json({ error: "Failed to parse session response" }, { status: 500 })
	}

	const { id: sessionId } = sessionJsonResult.data
	logger.debug("created browserbase session", { sessionId })

	// Step 2: Connect to the remote browser via CDP
	const wsUrl = `wss://connect.browserbase.com?apiKey=${env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`
	const browserResult = await errors.try(chromium.connectOverCDP(wsUrl))
	if (browserResult.error) {
		logger.error("failed to connect to browser", { error: browserResult.error, wsUrl })
		return NextResponse.json({ error: "Failed to connect to browser" }, { status: 500 })
	}

	const browser = browserResult.data
	logger.debug("connected to browser", { sessionId })

	// Step 3: Navigate, fill textarea, and capture screenshot
	const contexts = browser.contexts()
	if (contexts.length === 0) {
		logger.error("no browser contexts available", { sessionId })
		await browser.close()
		return NextResponse.json({ error: "No browser contexts available" }, { status: 500 })
	}

	const context = contexts[0]
	if (!context) {
		logger.error("context is undefined despite length check", { sessionId })
		await browser.close()
		return NextResponse.json({ error: "No browser context available" }, { status: 500 })
	}
	const pageResult = await errors.try(context.newPage())
	if (pageResult.error) {
		logger.error("failed to create new page", { error: pageResult.error, sessionId })
		await browser.close()
		return NextResponse.json({ error: "Failed to create browser page" }, { status: 500 })
	}

	const page = pageResult.data

	const navigationResult = await errors.try(
		page.goto("https://www.amp-up.io/testrunner/sandbox/", { waitUntil: "networkidle" })
	)
	if (navigationResult.error) {
		logger.error("failed to navigate to sandbox", { error: navigationResult.error, sessionId })
		await browser.close()
		return NextResponse.json({ error: "Failed to navigate to sandbox" }, { status: 500 })
	}

	const textareaSelector = "textarea.sandbox-item-xml-textarea"
	const selectorResult = await errors.try(page.waitForSelector(textareaSelector))
	if (selectorResult.error) {
		logger.error("failed to find textarea", { error: selectorResult.error, sessionId })
		await browser.close()
		return NextResponse.json({ error: "Failed to find textarea element" }, { status: 500 })
	}

	const fillResult = await errors.try(page.fill(textareaSelector, xml))
	if (fillResult.error) {
		logger.error("failed to fill textarea", { error: fillResult.error, sessionId })
		await browser.close()
		return NextResponse.json({ error: "Failed to fill textarea" }, { status: 500 })
	}

	const timeoutResult = await errors.try(page.waitForTimeout(2000))
	if (timeoutResult.error) {
		logger.error("failed to wait for timeout", { error: timeoutResult.error, sessionId })
		await browser.close()
		return NextResponse.json({ error: "Failed to wait for page updates" }, { status: 500 })
	}

	const screenshotResult = await errors.try(page.screenshot({ fullPage: true, type: "png" }))

	// Clean up browser regardless of screenshot result
	const closeResult = await errors.try(browser.close())
	if (closeResult.error) {
		logger.error("failed to close browser", { error: closeResult.error, sessionId })
	}

	if (screenshotResult.error) {
		logger.error("failed to capture screenshot", { error: screenshotResult.error, sessionId })
		return NextResponse.json({ error: "Failed to capture screenshot" }, { status: 500 })
	}

	const screenshotBuffer = screenshotResult.data
	logger.info("screenshot captured successfully", { sessionId })

	return new NextResponse(screenshotBuffer, {
		headers: { "Content-Type": "image/png" }
	})
}
