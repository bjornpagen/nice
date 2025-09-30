import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"

interface RestoreOptions {
	backupDir: string
	dryRun: boolean
	specificIdentifier?: string
}

async function main(options: RestoreOptions): Promise<void> {
	logger.info("starting qti standardization backup restore", {
		backupDir: options.backupDir,
		dryRun: options.dryRun,
		specificIdentifier: options.specificIdentifier
	})

	const readDirResult = await errors.try(fs.readdir(options.backupDir))
	if (readDirResult.error) {
		logger.error("failed to read backup directory", { error: readDirResult.error, backupDir: options.backupDir })
		throw errors.wrap(readDirResult.error, "read backup directory")
	}

	const xmlFiles = readDirResult.data.filter((file) => file.endsWith(".xml"))

	if (xmlFiles.length === 0) {
		logger.warn("no xml backup files found", { backupDir: options.backupDir })
		return
	}

	logger.info("found xml backup files", { count: xmlFiles.length })

	let restored = 0
	let skipped = 0
	let errors_count = 0

	for (const xmlFile of xmlFiles) {
		const identifier = xmlFile.replace(".xml", "")

		if (options.specificIdentifier && identifier !== options.specificIdentifier) {
			skipped++
			continue
		}

		const backupFilePath = path.join(options.backupDir, xmlFile)

		const readResult = await errors.try(fs.readFile(backupFilePath, "utf-8"))
		if (readResult.error) {
			logger.error("failed to read backup file", { error: readResult.error, backupFilePath, identifier })
			errors_count++
			continue
		}

		const originalXml = readResult.data

		if (options.dryRun) {
			logger.info("dry-run: would restore", {
				identifier,
				xmlLength: originalXml.length
			})
		} else {
			const updateResult = await errors.try(
				qti.updateAssessmentItem({
					identifier,
					xml: originalXml,
					metadata: undefined
				})
			)

			if (updateResult.error) {
				logger.error("failed to restore qti assessment item", {
					error: updateResult.error,
					identifier
				})
				errors_count++
				continue
			}

			logger.info("restored qti assessment item", { identifier })
		}

		restored++
	}

	logger.info("restore complete", {
		total: xmlFiles.length,
		restored,
		skipped,
		errors: errors_count,
		dryRun: options.dryRun
	})
}

const argv = process.argv.slice(2)
if (argv.length === 0) {
	console.log("usage: bun run scripts/restore-qti-standardization-backups.ts <backup-dir> [--apply] [--identifier <id>]")
	console.log("\nexample:")
	console.log("  bun run scripts/restore-qti-standardization-backups.ts data/backups/qti-standardization")
	console.log("  bun run scripts/restore-qti-standardization-backups.ts data/backups/qti-standardization --apply")
	console.log("  bun run scripts/restore-qti-standardization-backups.ts data/backups/qti-standardization --apply --identifier nice_x123")
	process.exit(1)
}

const backupDir = argv[0]
if (!backupDir) {
	throw errors.new("backup directory path required")
}

const options: RestoreOptions = {
	backupDir,
	dryRun: true
}

for (let i = 1; i < argv.length; i++) {
	const arg = argv[i]
	if (!arg) continue

	if (arg === "--apply") {
		options.dryRun = false
	} else if (arg === "--identifier") {
		const nextArg = argv[i + 1]
		if (!nextArg) {
			throw errors.new("--identifier requires a value")
		}
		options.specificIdentifier = nextArg
		i++
	}
}

const result = await errors.try(main(options))
if (result.error) {
	logger.error("restore failed", { error: result.error })
	process.exit(1)
}
