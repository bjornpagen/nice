import * as logger from "@superbuilders/slog"
import { unstable_cacheLife as cacheLife } from "next/cache"
import { qti } from "@/lib/clients"

export async function getAllQuestionsForTest(identifier: string) {
	"use cache"
	logger.info("getAllQuestionsForTest called", { identifier })
	cacheLife("max")
	return qti.getAllQuestionsForTest(identifier)
}
