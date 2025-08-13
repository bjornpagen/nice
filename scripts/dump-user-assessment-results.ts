#!/usr/bin/env bun
import * as fs from "node:fs"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

// Usage:
//   bun run scripts/dump-user-assessment-results.ts [userSourcedId]
// If no argument is provided, defaults to the requested user id below.

const DEFAULT_USER_SOURCED_ID = "e32bbbbb-0db0-461c-8bac-3b93e37bb4ad"

async function main() {
	const argUserId = process.argv[2]
	const userSourcedId = argUserId && argUserId.trim() !== "" ? argUserId : DEFAULT_USER_SOURCED_ID

	logger.info("starting dump of user assessment results", { userSourcedId })

	// Fetch all assessment results for the user, filtering to active only
	const fetchResult = await errors.try(
		oneroster.getAllResults({
			filter: `status='active' AND student.sourcedId='${userSourcedId}'`,
			sort: "scoreDate",
			orderBy: "asc"
		})
	)
	if (fetchResult.error) {
		logger.error("failed to fetch assessment results", { userSourcedId, error: fetchResult.error })
		throw errors.wrap(fetchResult.error, "oneroster results fetch")
	}

	// Ensure strict oldest -> newest ordering client-side as well
	const results = [...fetchResult.data]
		.filter((r) => r.status === "active")
		.sort((a, b) => new Date(a.scoreDate).getTime() - new Date(b.scoreDate).getTime())

	logger.info("fetched assessment results", { count: results.length })

	const outfile = path.join(process.cwd(), `assessment-results-${userSourcedId}.json`)
	const writeResult = await errors.try(fs.promises.writeFile(outfile, JSON.stringify(results, null, 2), "utf-8"))
	if (writeResult.error) {
		logger.error("failed to write results file", { file: outfile, error: writeResult.error })
		throw errors.wrap(writeResult.error, "write results file")
	}

	logger.info("results written", { file: outfile })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}
process.exit(0)
