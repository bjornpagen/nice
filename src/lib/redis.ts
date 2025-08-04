import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createClient } from "redis"
import { env } from "@/env"

// Declare a global variable to hold the Redis client promise.
// This prevents re-creating the client on every hot reload in development.
declare global {
	// eslint-disable-next-line no-var
	var redisClient: ReturnType<typeof createClient> | undefined
	// eslint-disable-next-line no-var
	var redisConnectionPromise: Promise<void> | undefined
}

let redis: ReturnType<typeof createClient> | undefined
let connectionPromise: Promise<void> | undefined

// Redis connection configuration with production-ready settings
const REDIS_CONFIG = {
	socket: {
		connectTimeout: 5000, // 5 second connection timeout
		reconnectStrategy: (retries: number) => {
			if (retries > 10) {
				logger.error("redis reconnection limit exceeded", { retries })
				return false // Stop reconnecting after 10 attempts
			}
			const delay = Math.min(retries * 100, 3000) // Max 3 second delay
			logger.info("redis reconnecting", { retries, delayMs: delay })
			return delay
		}
	},
	// Enable read-only mode for replicas if using Redis clusters
	readonly: false,
	// Ping Redis every 30 seconds to keep connection alive
	pingInterval: 30000
}

if (env.NODE_ENV === "production") {
	if (!env.REDIS_URL) {
		// In production, Redis is required for proper caching
		throw errors.new("redis: REDIS_URL is not set in production")
	}
	redis = createClient({
		url: env.REDIS_URL,
		...REDIS_CONFIG
	})
} else {
	// Development: optional Redis, use global to survive hot reloads
	if (!globalThis.redisClient && env.REDIS_URL) {
		globalThis.redisClient = createClient({
			url: env.REDIS_URL,
			...REDIS_CONFIG
		})
	}
	redis = globalThis.redisClient
	connectionPromise = globalThis.redisConnectionPromise
}

// Only set up connection if redis client exists
if (redis && !connectionPromise) {
	// Set up event handlers
	redis.on("error", (err) => logger.error("redis client error", { error: err }))
	redis.on("connect", () => logger.info("redis client connected"))
	redis.on("reconnecting", () => logger.info("redis client reconnecting"))
	redis.on("ready", () => logger.info("redis client ready"))
	redis.on("end", () => logger.warn("redis client connection ended"))

	// Create connection promise
	connectionPromise = (async () => {
		const connectResult = await errors.try(redis.connect())
		if (connectResult.error) {
			logger.error("failed to connect to redis", { error: connectResult.error })
			// In development, we can continue without Redis
			if (env.NODE_ENV === "production") {
				// In production, this is more serious but we still don't crash
				// The cache layer will handle the unavailable Redis gracefully
				logger.error("redis connection required in production", { error: connectResult.error })
			}
		}
	})()

	// Store in global for development hot reloads
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
