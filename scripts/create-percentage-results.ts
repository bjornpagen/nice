import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as fs from "node:fs/promises"
import * as path from "node:path"
import { oneroster } from "@/lib/clients"

interface AssessmentLineItem {
	sourcedId: string
	status: string
	title: string
	componentResource: {
		sourcedId: string
	}
	course: {
		sourcedId: string
	}
	metadata: {
		lessonType: string
		courseSourcedId: string
	}
}

async function main() {
	// CRITICAL: Replace this with your actual OneRoster user sourcedId
	const USER_SOURCED_ID = "f60046c1-44ab-4c00-8328-8a7a3bd0d401"
	
	// Get percentage from CLI argument
	const passPercentageArg = process.argv[2]
	
	if (!passPercentageArg) {
		logger.error("missing required argument: pass percentage")
		console.error("\nUsage: bun run scripts/create-percentage-results.ts <percentage>")
		console.error("Example: bun run scripts/create-percentage-results.ts 60")
		console.error("\nwhere <percentage> is 0-100:")
		console.error("  0   = all assessments fail (score 0)")
		console.error("  60  = 60% pass (score 100), 40% fail (score 0)")
		console.error("  100 = all assessments pass (score 100)")
		throw errors.new("missing pass percentage argument")
	}
	
	const PASS_PERCENTAGE = Number.parseInt(passPercentageArg, 10)
	
	if (Number.isNaN(PASS_PERCENTAGE) || PASS_PERCENTAGE < 0 || PASS_PERCENTAGE > 100) {
		logger.error("invalid pass percentage", { passPercentageArg, PASS_PERCENTAGE })
		throw errors.new("pass percentage must be an integer between 0 and 100")
	}

	const assessmentLineItemsPath = path.join(
		process.cwd(),
		"data/ms-biology/oneroster/assessmentLineItems.json"
	)

	logger.info("reading assessment line items", { path: assessmentLineItemsPath })

	const fileResult = await errors.try(fs.readFile(assessmentLineItemsPath, "utf-8"))
	if (fileResult.error) {
		logger.error("failed to read file", { error: fileResult.error, path: assessmentLineItemsPath })
		throw errors.wrap(fileResult.error, "file read")
	}

	const parseResult = errors.trySync(() => JSON.parse(fileResult.data) as AssessmentLineItem[])
	if (parseResult.error) {
		logger.error("failed to parse json", { error: parseResult.error })
		throw errors.wrap(parseResult.error, "json parse")
	}

	const lineItems = parseResult.data

	// Filter to only active line items
	const activeLineItems = lineItems.filter((item) => item.status === "active")

	logger.info("found assessment line items", {
		total: lineItems.length,
		active: activeLineItems.length,
		tobedeleted: lineItems.filter((item) => item.status === "tobedeleted").length,
		passPercentage: PASS_PERCENTAGE
	})

	// Shuffle the line items to randomize which ones pass/fail
	const shuffled = [...activeLineItems].sort(() => Math.random() - 0.5)
	
	// Calculate how many should pass based on percentage
	const targetPassCount = Math.round((activeLineItems.length * PASS_PERCENTAGE) / 100)
	
	logger.info("calculating pass/fail distribution", {
		totalAssessments: activeLineItems.length,
		targetPassCount,
		targetFailCount: activeLineItems.length - targetPassCount
	})

	let successCount = 0
	let failureCount = 0
	let passedCount = 0
	let failedCount = 0

	for (let i = 0; i < shuffled.length; i++) {
		const lineItem = shuffled[i]
		if (!lineItem) {
			continue
		}
		
		const resultSourcedId = `nice_${USER_SOURCED_ID}_${lineItem.sourcedId}`

		// Determine total questions based on lesson type
		const totalQuestions = lineItem.metadata.lessonType === "exercise" ? 5 : 10
		
		// Determine if this assessment should pass (score 100) or fail (score 0)
		// First N assessments pass, remaining assessments fail
		const shouldPass = i < targetPassCount
		const correctAnswers = shouldPass ? totalQuestions : 0  // All correct or all wrong
		const score = shouldPass ? 100 : 0  // Binary: 100 = pass, 0 = fail
		const accuracyPercent = shouldPass ? 100 : 0
		const masteredUnits = shouldPass ? 1 : 0

		const resultPayload = {
			result: {
				assessmentLineItem: { sourcedId: lineItem.sourcedId, type: "assessmentLineItem" as const },
				student: { sourcedId: USER_SOURCED_ID, type: "user" as const },
				scoreStatus: "fully graded" as const,
				scoreDate: new Date().toISOString(),
				score,
				comment: `${correctAnswers}/${totalQuestions} correct on first attempt`,
				metadata: {
					accuracyPercent,
					masteredUnits,
					correctAnswers,
					totalQuestions
				}
			}
		}

		logger.info("creating result", {
			resultSourcedId,
			lineItemTitle: lineItem.title,
			lessonType: lineItem.metadata.lessonType,
			score,
			shouldPass
		})

		const createResult = await errors.try(oneroster.putResult(resultSourcedId, resultPayload))
		if (createResult.error) {
			logger.error("failed to create result", {
				error: createResult.error,
				resultSourcedId,
				lineItemTitle: lineItem.title
			})
			failureCount++
			continue
		}

		logger.info("successfully created result", {
			resultSourcedId,
			lineItemTitle: lineItem.title,
			score
		})
		successCount++
		
		if (shouldPass) {
			passedCount++
		} else {
			failedCount++
		}

		// Small delay to avoid rate limiting
		await new Promise((resolve) => setTimeout(resolve, 100))
	}

	const actualPassPercentage = Math.round((passedCount / activeLineItems.length) * 100)

	logger.info("completed creating results", {
		total: activeLineItems.length,
		apiSuccess: successCount,
		apiFailure: failureCount,
		passedCount,
		failedCount,
		targetPassPercentage: PASS_PERCENTAGE,
		actualPassPercentage
	})
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

