import * as React from "react"
import "server-only"
import * as logger from "@superbuilders/slog"
import { getUserUnitProgressRaw } from "@/lib/data/progress/raw"

export const getCachedUserUnitProgress = React.cache(async (userId: string, courseId: string) => {
	logger.debug("user progress cache invoked", { userId, courseId })
	return getUserUnitProgressRaw(userId, courseId)
})
