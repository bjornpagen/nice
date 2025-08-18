import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createClient } from "redis"
import { env } from "@/env"

declare global {
	// eslint-disable-next-line no-var
	var redisClient: ReturnType<typeof createClient> | undefined
	// eslint-disable-next-line no-var
	var redisConnectionPromise: Promise<void> | undefined
}

let redis: ReturnType<typeof createClient> | undefined
let connectionPromise: Promise<void> | undefined

const REDIS_CONFIG = {
	socket: {
		connectTimeout: 5000,
		reconnectStrategy: (retries: number) => {
			if (retries > 10) {
				logger.error("redis reconnection limit exceeded", { retries })
				return false
			}
			const delay = Math.min(retries * 100, 3000)
			logger.info("redis reconnecting", { retries, delayMs: delay })
			return delay
		}
	},
	pingInterval: 30000
}

if (!globalThis.redisClient && env.REDIS_URL) {
	globalThis.redisClient = createClient({
		url: env.REDIS_URL,
		...REDIS_CONFIG
	})
}
redis = globalThis.redisClient
connectionPromise = globalThis.redisConnectionPromise

if (redis && !connectionPromise) {
	redis.on("error", (err) => logger.error("redis client error", { error: err }))
	redis.on("connect", () => logger.info("redis client connected"))
	redis.on("ready", () => logger.info("redis client ready"))

	const createRedisConnection = async (client: ReturnType<typeof createClient>) => {
		const connectResult = await errors.try(client.connect())
		if (connectResult.error) {
			logger.error("failed to connect to redis", { error: connectResult.error })
			// CRITICAL: Throw an error if connection fails. The app cannot function without Redis.
			throw errors.wrap(connectResult.error, "redis connection failed")
		}
	}
	connectionPromise = createRedisConnection(redis)

	if (env.NODE_ENV === "development") {
		globalThis.redisConnectionPromise = connectionPromise
	}
}

// Graceful shutdown handling
if (typeof process !== "undefined" && redis) {
	const gracefulShutdown = async () => {
		logger.info("shutting down redis client")
		if (redis?.isOpen) {
			await redis.quit()
		}
	}

	process.on("SIGTERM", gracefulShutdown)
	process.on("SIGINT", gracefulShutdown)
}

export { redis }
