#!/usr/bin/env bun
import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { caliper } from "@/lib/clients"

// Usage:
//   bun run scripts/dump-user-caliper-events.ts [userSourcedId]
// If no argument is provided, defaults to the requested user id below.

const DEFAULT_USER_SOURCED_ID = "e32bbbbb-0db0-461c-8bac-3b93e37bb4ad"

function buildActorId(userSourcedId: string): string {
	return `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${userSourcedId}`
}

async function main() {
	const argUserId = process.argv[2]
	const userSourcedId = argUserId && argUserId.trim() !== "" ? argUserId : DEFAULT_USER_SOURCED_ID

	logger.info("starting dump of caliper events for user", { userSourcedId })

	const actorId = buildActorId(userSourcedId)

	const fetchResult = await errors.try(caliper.getEvents(actorId))
	if (fetchResult.error) {
		logger.error("failed to fetch caliper events", { userSourcedId, actorId, error: fetchResult.error })
		throw errors.wrap(fetchResult.error, "caliper events fetch")
	}

	const events = fetchResult.data
	logger.info("fetched caliper events", { count: events.length })

	const outfile = path.join(process.cwd(), `caliper-events-${userSourcedId}.json`)
	const writeResult = await errors.try(fs.promises.writeFile(outfile, JSON.stringify(events, null, 2), "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write caliper events file", { file: outfile, error: writeResult.error })
		throw errors.wrap(writeResult.error, "write caliper events file")
	}

	logger.info("caliper events written", { file: outfile })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
process.exit(0)
