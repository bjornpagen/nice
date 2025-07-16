import * as logger from "@superbuilders/slog"
import { unstable_cache as cache } from "next/cache"
import { qti } from "@/lib/clients"

export const getAllQuestionsForTest = cache(
	async (identifier: string) => {
		logger.info("getAllQuestionsForTest called", { identifier })
		return qti.getAllQuestionsForTest(identifier)
	},
	["qti-getAllQuestionsForTest"],
	{ revalidate: false } // equivalent to cacheLife("max")
)
