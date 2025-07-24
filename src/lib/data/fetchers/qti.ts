import * as logger from "@superbuilders/slog"
import { unstable_cache as cache } from "next/cache"
import { createCacheKey } from "@/lib/cache"
import { qti } from "@/lib/clients"

export const getAllQuestionsForTest = cache(
	async (identifier: string) => {
		logger.info("getAllQuestionsForTest called", { identifier })
		return qti.getAllQuestionsForTest(identifier)
	},
	createCacheKey(["qti-getAllQuestionsForTest"]),
	{ revalidate: false } // equivalent to cacheLife("max")
)

export const getAssessmentTest = cache(
	async (identifier: string) => {
		logger.info("getAssessmentTest called", { identifier })
		return qti.getAssessmentTest(identifier)
	},
	createCacheKey(["qti-getAssessmentTest"]),
	{ revalidate: false } // equivalent to cacheLife("max")
)
