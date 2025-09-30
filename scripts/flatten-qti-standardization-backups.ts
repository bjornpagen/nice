import * as fs from "node:fs/promises"
import * as path from "node:path"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

interface FlattenOptions {
	sourceDir: string
	dryRun: boolean
}

async function main(options: FlattenOptions): Promise<void> {
	logger.info("starting backup directory flattening", {
		sourceDir: options.sourceDir,
		dryRun: options.dryRun
	})

	const readDirResult = await errors.try(fs.readdir(options.sourceDir))
	if (readDirResult.error) {
		logger.error("failed to read source directory", { error: readDirResult.error, sourceDir: options.sourceDir })
		throw errors.wrap(readDirResult.error, "read source directory")
	}

	const subdirs = readDirResult.data

	let moved = 0
	let skipped = 0
	let errors_count = 0

	for (const subdir of subdirs) {
		const subdirPath = path.join(options.sourceDir, subdir)

		const statResult = await errors.try(fs.stat(subdirPath))
		if (statResult.error) {
			logger.error("failed to stat", { error: statResult.error, subdirPath })
			errors_count++
			continue
		}

		if (!statResult.data.isDirectory()) {
			logger.debug("skipping non-directory", { path: subdirPath })
			skipped++
			continue
		}

		const filesResult = await errors.try(fs.readdir(subdirPath))
		if (filesResult.error) {
			logger.error("failed to read subdirectory", { error: filesResult.error, subdirPath })
			errors_count++
			continue
		}

		const xmlFiles = filesResult.data.filter((file) => file.endsWith(".xml"))

		for (const xmlFile of xmlFiles) {
			const sourcePath = path.join(subdirPath, xmlFile)
			const destPath = path.join(options.sourceDir, xmlFile)

			const existsResult = await errors.try(fs.access(destPath))
			const destExists = !existsResult.error

			if (destExists) {
				logger.warn("destination file already exists, skipping", {
					xmlFile,
					sourcePath,
					destPath
				})
				skipped++
				continue
			}

			if (options.dryRun) {
				logger.info("dry-run: would move", {
					from: sourcePath,
					to: destPath
				})
			} else {
				const moveResult = await errors.try(fs.rename(sourcePath, destPath))
				if (moveResult.error) {
					logger.error("failed to move file", {
						error: moveResult.error,
						sourcePath,
						destPath
					})
					errors_count++
					continue
				}

				logger.debug("moved file", { from: sourcePath, to: destPath })
			}

			moved++
		}

		if (!options.dryRun) {
			const isEmpty = await errors.try(fs.readdir(subdirPath))
			if (!isEmpty.error && isEmpty.data.length === 0) {
				const rmdirResult = await errors.try(fs.rmdir(subdirPath))
				if (rmdirResult.error) {
					logger.error("failed to remove empty directory", {
						error: rmdirResult.error,
						subdirPath
					})
				} else {
					logger.debug("removed empty directory", { subdirPath })
				}
			}
		}
	}

	logger.info("flatten complete", {
		moved,
		skipped,
		errors: errors_count,
		dryRun: options.dryRun
	})
}

const argv = process.argv.slice(2)
if (argv.length === 0) {
	console.log("usage: bun run scripts/flatten-qti-standardization-backups.ts <source-dir> [--apply]")
	console.log("\nexample:")
	console.log("  bun run scripts/flatten-qti-standardization-backups.ts data/backups/qti-standardization")
	console.log("  bun run scripts/flatten-qti-standardization-backups.ts data/backups/qti-standardization --apply")
	process.exit(1)
}

const sourceDir = argv[0]
if (!sourceDir) {
	throw errors.new("source directory path required")
}

const options: FlattenOptions = {
	sourceDir,
	dryRun: true
}

for (let i = 1; i < argv.length; i++) {
	const arg = argv[i]
	if (!arg) continue

	if (arg === "--apply") {
		options.dryRun = false
	}
}

const result = await errors.try(main(options))
if (result.error) {
	logger.error("flatten failed", { error: result.error })
	process.exit(1)
}
