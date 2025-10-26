import * as React from "react"
import "server-only"
import * as logger from "@superbuilders/slog"
import { getUserUnitProgressRedis } from "@/lib/progress/redis/user-progress"

export const getCachedUserUnitProgress = React.cache(async (userId: string, courseId: string) => {
	logger.debug("user progress cache invoked", { userId, courseId })
	return getUserUnitProgressRedis(userId, courseId)
})
