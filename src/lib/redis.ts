import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createClient } from "redis"
import { env } from "@/env"

declare global {
	var redisClient: ReturnType<typeof createClient> | undefined
	var redisConnectionPromise: Promise<ReturnType<typeof createClient>> | undefined
}

// Create client once, reuse globally
if (!globalThis.redisClient) {
	globalThis.redisClient = createClient({
		url: env.REDIS_URL,
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
	})
}

const redis = globalThis.redisClient

// Create connection promise once, reuse globally
if (!globalThis.redisConnectionPromise) {
	redis.on("error", (err) => logger.error("redis client error", { error: err }))
	redis.on("connect", () => logger.info("redis client connected"))
	redis.on("ready", () => logger.info("redis client ready"))

	// Only connect if not already connected
	if (redis.isOpen || redis.isReady) {
		logger.info("redis client already connected or ready")
		globalThis.redisConnectionPromise = Promise.resolve(redis)
	} else {
		globalThis.redisConnectionPromise = redis.connect()
	}
}

// Await connection at module load time - fail fast if Redis unavailable
const connectResult = await errors.try(globalThis.redisConnectionPromise!)
if (connectResult.error) {
	logger.error("redis connection failed", { error: connectResult.error })
	throw errors.wrap(connectResult.error, "redis connection")
}

export { redis }
