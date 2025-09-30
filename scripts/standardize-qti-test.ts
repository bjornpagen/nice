#!/usr/bin/env bun
import * as p from "@clack/prompts"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { inngest } from "@/inngest/client"

async function main() {
	p.intro("🔧 Standardize QTI Test Phrasing")

	const testUrl = await p.text({
		message: "enter qti assessment test url:",
		placeholder: "https://qti.alpha-1edtech.com/api/assessment-tests/nice_xeea483e9835f1f34/questions",
		validate: (value) => {
			if (!value) {
				return "url is required"
			}
			if (!value.startsWith("https://qti.alpha-1edtech.com/api/assessment-tests/")) {
				return "url must be a valid qti assessment test url"
			}
		}
	})

	if (p.isCancel(testUrl)) {
		p.cancel("operation cancelled")
		process.exit(0)
	}

	const spinner = p.spinner()
	spinner.start("triggering standardization...")

	const sendResult = await errors.try(
		inngest.send({
			name: "qti/test.standardize-phrasing",
			data: {
				testUrl: testUrl as string
			}
		})
	)

	if (sendResult.error) {
		spinner.stop("failed to trigger event")
		logger.error("failed to send inngest event", { error: sendResult.error })
		throw errors.wrap(sendResult.error, "inngest event send")
	}

	spinner.stop("standardization triggered")

	p.note(
		`event sent successfully\n\nthe orchestrator will:\n1. fetch all questions from the test url\n2. fan out to individual workers\n3. analyze each question with openai\n4. backup original xml before any changes\n5. apply standardizations where needed\n\ncheck inngest dashboard for progress:\nhttps://app.inngest.com`,
		"success"
	)

	p.outro("✅ standardization started")
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

