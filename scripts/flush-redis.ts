#!/usr/bin/env bun
import * as readline from "node:readline/promises"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createClient } from "redis"
import { env } from "@/env.js"

async function confirmIfNeeded(message: string, skip: boolean): Promise<boolean> {
	if (skip) return true
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
	process.stdout.write(`${message}\nType "FLUSH" to proceed:\n> `)
	const answer = await rl.question("")
	rl.close()
	return answer.trim() === "FLUSH"
}

async function main() {
	logger.info("starting redis flush")

	const args = process.argv.slice(2)
	const flushAll = args.includes("--all")
	const assumeYes = args.includes("--yes")

	if (!env.REDIS_URL) {
		logger.error("missing redis url in env")
		throw errors.new("redis: REDIS_URL is required")
	}

	const proceed = await confirmIfNeeded(
		flushAll
			? "This will FLUSH ALL DATABASES on the Redis server configured by REDIS_URL."
			: "This will FLUSH THE CURRENT DATABASE on the Redis server configured by REDIS_URL.",
		assumeYes
	)
	if (!proceed) {
		process.stdout.write("Aborted.\n")
		return
	}

	const client = createClient({ url: env.REDIS_URL })

	const connectResult = await errors.try(client.connect())
	if (connectResult.error) {
		logger.error("failed to connect to redis", { error: connectResult.error })
		throw errors.wrap(connectResult.error, "redis connection")
	}

	logger.info("connected to redis")

	if (flushAll) {
		const flushResult = await errors.try(client.flushAll())
		if (flushResult.error) {
			logger.error("failed to flush all redis databases", { error: flushResult.error })
			throw errors.wrap(flushResult.error, "redis flushall")
		}
		logger.info("flushed all redis databases")
	} else {
		const flushResult = await errors.try(client.flushDb())
		if (flushResult.error) {
			logger.error("failed to flush redis db", { error: flushResult.error })
			throw errors.wrap(flushResult.error, "redis flushdb")
		}
		logger.info("flushed redis db")
	}

	const quitResult = await errors.try(client.quit())
	if (quitResult.error) {
		logger.error("failed to quit redis client", { error: quitResult.error })
	}
}

const result = await errors.try(main())
if (result.error) {
	logger.error("redis flush failed", { error: result.error })
	process.exit(1)
}

process.exit(0)
