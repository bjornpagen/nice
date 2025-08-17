import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { Client } from "@/lib/qti"

async function main(): Promise<void> {
	const identifier = process.argv[2]
	if (!identifier) {
		logger.error("missing identifier arg")
		throw errors.new("print qti: missing identifier")
	}

	const qti = new Client({
		serverUrl: env.TIMEBACK_QTI_SERVER_URL,
		tokenUrl: env.TIMEBACK_TOKEN_URL,
		clientId: env.TIMEBACK_CLIENT_ID,
		clientSecret: env.TIMEBACK_CLIENT_SECRET
	})

	const result = await errors.try(qti.getAssessmentItem(identifier))
	if (result.error) {
		logger.error("failed to fetch assessment item", { identifier, error: result.error })
		throw errors.wrap(result.error, "get assessment item")
	}

	const itemUnknown: unknown = result.data
	const isRecord = (v: unknown): v is Record<string, unknown> =>
		typeof v === "object" && v !== null && !Array.isArray(v)
	if (!isRecord(itemUnknown)) {
		logger.error("unexpected item shape", { itemType: typeof itemUnknown })
		throw errors.new("unexpected qti item shape")
	}
	const item = itemUnknown
	const hasContent = Object.hasOwn(item, "content")
	const hasRawXml = Object.hasOwn(item, "rawXml")
	logger.info("assessment item fetched", { identifier, hasContent, hasRawXml })

	if (hasContent) {
		const contentUnknown = item.content
		const content = isRecord(contentUnknown) ? contentUnknown : undefined
		const interactionsUnknown = content?.interactions
		const interactions = isRecord(interactionsUnknown) ? interactionsUnknown : undefined
		const choiceKeys = interactions ? Object.keys(interactions) : []
		const firstInteraction = choiceKeys[0]
		let feedbackInline: Array<{ id: unknown; feedback: unknown }> | undefined
		const first = firstInteraction ? interactions?.[firstInteraction] : undefined
		if (isRecord(first)) {
			const choices = first.choices
			if (Array.isArray(choices)) {
				feedbackInline = choices.map((c) => {
					const rc = isRecord(c) ? c : undefined
					return { id: rc?.identifier, feedback: rc?.feedback }
				})
			}
		}
		logger.info("content summary", {
			choiceInteractionId: firstInteraction,
			choiceCount: isRecord(first) && Array.isArray(first.choices) ? first.choices.length : undefined
		})
		logger.info("sample choice feedback (first interaction)", { feedbackInline })
	}

	if (hasRawXml) {
		const xmlUnknown = item.rawXml
		const xml = typeof xmlUnknown === "string" ? xmlUnknown : ""
		logger.info("raw xml length", { length: typeof xml === "string" ? xml.length : 0 })
	}
}

async function runCli(): Promise<void> {
	const run = await errors.try(main())
	if (run.error) {
		logger.error("operation failed", { error: run.error })
		process.exit(1)
	}
}

void runCli()
