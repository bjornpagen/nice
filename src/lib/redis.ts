import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createClient } from "redis"
import { env } from "@/env"

type RedisClientCore = ReturnType<typeof createClient>

class InMemoryRedisClient {
	private kv = new Map<string, string>()
	private hashes = new Map<string, Map<string, string>>()
	public isReady = true
	public isOpen = true

	on(_event: string, _listener: (...args: unknown[]) => void): this {
		// No-op event emitter to satisfy interface parity
		return this
	}

	async connect(): Promise<this> {
		return this
	}

	async get(key: string): Promise<string | null> {
		return this.kv.get(key) ?? null
	}

	async set(
		key: string,
		value: string,
		options?: { EX?: number; NX?: boolean; KEEPTTL?: boolean }
	): Promise<"OK" | null> {
		if (options?.NX && this.kv.has(key)) {
			return null
		}
		this.kv.set(key, value)
		return "OK"
	}

	async del(...keys: string[]): Promise<number> {
		let deleted = 0
		for (const key of keys) {
			if (this.kv.delete(key)) {
				deleted++
			}
			if (this.hashes.delete(key)) {
				deleted++
			}
		}
		return deleted
	}

	async expire(_key: string, _seconds: number): Promise<number> {
		// TTL handling is not required for unit tests; acknowledge the command.
		return 1
	}

	async hGetAll(key: string): Promise<Record<string, string>> {
		const hash = this.hashes.get(key)
		if (!hash) {
			return {}
		}
		return Object.fromEntries(hash.entries())
	}

	async hSet(key: string, field: string, value: string): Promise<number> {
		let hash = this.hashes.get(key)
		if (!hash) {
			hash = new Map()
			this.hashes.set(key, hash)
		}
		const existed = hash.has(field)
		hash.set(field, value)
		return existed ? 0 : 1
	}

	async hSetNX(key: string, field: string, value: string): Promise<number> {
		let hash = this.hashes.get(key)
		if (!hash) {
			hash = new Map()
			this.hashes.set(key, hash)
		}
		if (hash.has(field)) {
			return 0
		}
		hash.set(field, value)
		return 1
	}

	async watch(_key: string): Promise<"OK"> {
		return "OK"
	}

	async unwatch(): Promise<"OK"> {
		return "OK"
	}

	multi(): InMemoryRedisMulti {
		return new InMemoryRedisMulti(this)
	}
}

class InMemoryRedisMulti {
	private commands: Array<() => Promise<unknown>> = []

	constructor(private readonly client: InMemoryRedisClient) {}

	set(key: string, value: string, options?: { EX?: number; NX?: boolean; KEEPTTL?: boolean }) {
		this.commands.push(() => this.client.set(key, value, options))
		return this
	}

	expire(key: string, seconds: number) {
		this.commands.push(() => this.client.expire(key, seconds))
		return this
	}

	hSet(key: string, field: string, value: string) {
		this.commands.push(() => this.client.hSet(key, field, value))
		return this
	}

	del(...keys: string[]) {
		this.commands.push(() => this.client.del(...keys))
		return this
	}

	hSetNX(key: string, field: string, value: string) {
		this.commands.push(() => this.client.hSetNX(key, field, value))
		return this
	}

	async exec(): Promise<unknown[]> {
		const results: unknown[] = []
		for (const command of this.commands) {
			results.push(await command())
		}
		this.commands = []
		return results
	}
}

type RedisClientLike = RedisClientCore | InMemoryRedisClient

declare global {
	var redisClient: RedisClientLike | undefined
	var redisConnectionPromise: Promise<RedisClientLike> | undefined
}

const redisUrl = env.REDIS_URL
const parsedRedisUrl = new URL(redisUrl)

// Instantiate client once, reuse globally
if (!globalThis.redisClient) {
	if (parsedRedisUrl.protocol === "memory:") {
		globalThis.redisClient = new InMemoryRedisClient()
	} else {
		globalThis.redisClient = createClient({
			url: redisUrl,
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
}

const redis = globalThis.redisClient

// Create connection promise once, reuse globally
if (!globalThis.redisConnectionPromise) {
	if (redis instanceof InMemoryRedisClient) {
		globalThis.redisConnectionPromise = Promise.resolve(redis)
	} else {
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
}

// Await connection at module load time - fail fast if Redis unavailable
const connectResult = await errors.try(globalThis.redisConnectionPromise!)
if (connectResult.error) {
	logger.error("redis connection failed", { error: connectResult.error })
	throw errors.wrap(connectResult.error, "redis connection")
}

export { redis }
