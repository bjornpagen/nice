import * as logger from "@superbuilders/slog"
import { redisCache } from "@/lib/cache"
import { qti } from "@/lib/clients"

export async function getAllQuestionsForTest(identifier: string) {
	logger.info("getAllQuestionsForTest called", { identifier })
	const operation = () => qti.getAllQuestionsForTest(identifier)
	return redisCache(operation, ["qti-getAllQuestionsForTest", identifier], { revalidate: 3600 * 24 }) // 24-hour cache
}

export async function getAssessmentTest(identifier: string) {
	logger.info("getAssessmentTest called", { identifier })
	const operation = () => qti.getAssessmentTest(identifier)
	return redisCache(operation, ["qti-getAssessmentTest", identifier], { revalidate: 3600 * 24 }) // 24-hour cache
}
