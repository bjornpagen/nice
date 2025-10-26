import { redisCache } from "@/lib/cache"
import { getUserUnitProgressRaw } from "@/lib/progress/raw/user-progress"

export async function getUserUnitProgressRedis(userId: string, courseId: string) {
	const cacheKeyParts: (string | number)[] = ["user-progress", userId, courseId]
	const cachedArray = await redisCache(
		async () => {
			const progress = await getUserUnitProgressRaw(userId, courseId)
			return Array.from(progress.entries())
		},
		cacheKeyParts,
		{ revalidate: 3600 }
	)

	return new Map(cachedArray)
}
