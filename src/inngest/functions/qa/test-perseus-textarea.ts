import * as errors from "@superbuilders/errors"
import type { ElementHandle, Page } from "playwright"
import { z } from "zod"
import { inngest } from "@/inngest/client"
import { sessionPool } from "@/lib/utils/browserbase-session-pool"

const testPerseusTextareaInputSchema = z.object({
	jsonData: z.record(z.string(), z.any()).optional(),
	targetUrl: z.string().optional()
})

const PERSEUS_URL = "https://khan.github.io/perseus/?path=/story/renderers-server-item-renderer--interactive"

const DEFAULT_TEST_JSON = {
	hints: [],
	question: {
		images: {},
		content: "**Which of the following best describe what food provides to organisms?**\n\n[[☃ radio 1]]",
		widgets: {
			"radio 1": {
				type: "radio",
				graded: true,
				static: false,
				options: {
					choices: [
						{
							clue: "Food provides organisms with the molecules they need to live and grow.",
							content: "molecules that can be used for growth",
							correct: true
						},
						{
							clue: "Food provides organisms with the molecules they need to live and grow.",
							content: "energy that can power cell processes",
							correct: true
						},
						{
							clue: "Food does not directly provide organisms with new mitochondria.",
							content: "new mitochondria that can carry out cellular respiration",
							isNoneOfTheAbove: false
						}
					],
					randomize: true,
					countChoices: true,
					displayCount: null,
					multipleSelect: true,
					deselectEnabled: false,
					hasNoneOfTheAbove: false
				},
				version: { major: 1, minor: 0 },
				alignment: "default"
			}
		}
	},
	answerArea: {
		tTable: false,
		zTable: false,
		chi2Table: false,
		calculator: false,
		periodicTable: false
	},
	itemDataVersion: { major: 0, minor: 1 }
}

async function cleanupPageAndSession(
	page: Page,
	sessionId: string,
	logger: { warn: (msg: string, attrs?: unknown) => void }
) {
	const closeResult = await errors.try(page.close())
	if (closeResult.error) {
		logger.warn("failed to close page", { error: closeResult.error })
	}
	sessionPool.releaseSession(sessionId)
}

export const testPerseusTextarea = inngest.createFunction(
	{ id: "test-perseus-textarea", concurrency: { limit: 5 } },
	{ event: "qa/test.perseus.textarea" },
	async ({ event, logger }) => {
		const validationResult = testPerseusTextareaInputSchema.safeParse(event.data)
		if (!validationResult.success) {
			logger.error("invalid input data", { error: validationResult.error })
			throw errors.wrap(validationResult.error, "input validation")
		}

		const { jsonData = DEFAULT_TEST_JSON, targetUrl = PERSEUS_URL } = validationResult.data

		logger.info("starting perseus textarea test", {
			targetUrl,
			jsonDataSize: JSON.stringify(jsonData).length
		})

		// acquire a session from the pool
		const sessionResult = await errors.try(sessionPool.acquireSession())
		if (sessionResult.error) {
			logger.error("failed to acquire browserbase session", { error: sessionResult.error })
			throw errors.wrap(sessionResult.error, "session acquisition")
		}

		const { sessionId, browser } = sessionResult.data
		logger.info("acquired browserbase session", { sessionId })

		// create a new page
		const pageResult = await errors.try(browser.newPage())
		if (pageResult.error) {
			sessionPool.releaseSession(sessionId)
			logger.error("failed to create new page", { error: pageResult.error })
			throw errors.wrap(pageResult.error, "page creation")
		}
		const page = pageResult.data

		logger.debug("navigating to target url", { url: targetUrl })

		// navigate to the perseus page
		const navResult = await errors.try(
			page.goto(targetUrl, {
				waitUntil: "networkidle",
				timeout: 30000
			})
		)
		if (navResult.error) {
			await cleanupPageAndSession(page, sessionId, logger)
			logger.error("navigation failed", { error: navResult.error })
			throw errors.wrap(navResult.error, "navigation")
		}

		logger.info("successfully navigated to perseus page")

		// wait for page to fully load
		await page.waitForTimeout(3000)

		// take initial screenshot for debugging
		const screenshotResult = await errors.try(page.screenshot({ fullPage: true }))
		if (screenshotResult.error) {
			logger.warn("failed to take screenshot", { error: screenshotResult.error })
		} else {
			logger.info("captured initial page screenshot", {
				size: screenshotResult.data.length
			})
		}

		// look for textareas on the page
		const textareaResult = await errors.try(page.$$("textarea"))
		if (textareaResult.error) {
			await cleanupPageAndSession(page, sessionId, logger)
			logger.error("failed to find textareas", { error: textareaResult.error })
			throw errors.wrap(textareaResult.error, "textarea search")
		}

		const textareas = textareaResult.data
		logger.info("found textareas", { count: textareas.length })

		let targetElement: ElementHandle<HTMLElement | SVGElement>
		let elementType = ""

		if (textareas.length === 0) {
			// try looking for input elements or other possible inputs
			const inputResult = await errors.try(
				page.$$("input[type='text'], input:not([type]), [contenteditable], .ace_editor")
			)
			if (inputResult.error) {
				await cleanupPageAndSession(page, sessionId, logger)
				logger.error("failed to find input elements", { error: inputResult.error })
				throw errors.wrap(inputResult.error, "input search")
			}

			const inputs = inputResult.data
			logger.info("found input elements", { count: inputs.length })

			if (inputs.length === 0) {
				await cleanupPageAndSession(page, sessionId, logger)
				logger.error("no textarea or input elements found on page")
				throw errors.new("no textarea or input elements found on page")
			}

			const firstInput = inputs[0]
			if (!firstInput) {
				await cleanupPageAndSession(page, sessionId, logger)
				logger.error("first input element is undefined")
				throw errors.new("first input element is undefined")
			}
			targetElement = firstInput
			elementType = "input"
		} else {
			const firstTextarea = textareas[0]
			if (!firstTextarea) {
				await cleanupPageAndSession(page, sessionId, logger)
				logger.error("first textarea element is undefined")
				throw errors.new("first textarea element is undefined")
			}
			targetElement = firstTextarea
			elementType = "textarea"
		}

		// prepare the json string
		const jsonString = JSON.stringify(jsonData, null, 2)

		logger.debug("attempting to fill element", {
			elementType,
			jsonLength: jsonString.length
		})

		// try to fill the element
		const fillResult = await errors.try(targetElement.fill(jsonString))
		if (fillResult.error) {
			await cleanupPageAndSession(page, sessionId, logger)
			logger.error("failed to fill element", {
				elementType,
				error: fillResult.error
			})
			throw errors.wrap(fillResult.error, `${elementType} fill`)
		}

		logger.info("successfully filled element with json", { elementType })

		// take final screenshot to show result
		const finalScreenshotResult = await errors.try(page.screenshot({ fullPage: true }))
		if (finalScreenshotResult.error) {
			logger.warn("failed to take final screenshot", { error: finalScreenshotResult.error })
		} else {
			logger.info("captured final screenshot", {
				size: finalScreenshotResult.data.length
			})
		}

		// wait to see if anything happens
		await page.waitForTimeout(2000)

		logger.info("perseus textarea test completed successfully", {
			elementType,
			sessionId,
			jsonDataSize: jsonString.length
		})

		// cleanup
		const closeResult = await errors.try(page.close())
		if (closeResult.error) {
			logger.warn("failed to close page", { error: closeResult.error })
		}

		sessionPool.releaseSession(sessionId)
		logger.info("released session back to pool", { sessionId })

		return {
			success: true,
			elementType,
			jsonDataSize: jsonString.length,
			sessionId,
			message: `successfully filled ${elementType} with json data`
		}
	}
)
