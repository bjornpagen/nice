import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { promises as fs } from "node:fs"
import { resolveRelativeLinksToCanonicalDomain } from "@/lib/qti-stimulus/utils/link-resolver"

async function main(): Promise<void> {
  const file = `${process.cwd()}/examples/qti-generation/assessment-stimulus/negative/relative-path-instead-of-link.qti.xml`
  logger.info("reading test xml file", { file })

  const readResult = await errors.try(fs.readFile(file, "utf-8"))
  if (readResult.error) {
    logger.error("failed to read xml file", { error: readResult.error })
    throw errors.wrap(readResult.error, "file read")
  }

  const xml = readResult.data
  logger.info("resolving relative links in xml")

  const resolveResult = await errors.try(resolveRelativeLinksToCanonicalDomain(xml, logger))
  if (resolveResult.error) {
    logger.error("link resolution failed", { error: resolveResult.error })
    throw errors.wrap(resolveResult.error, "link resolution")
  }

  const output = resolveResult.data
  logger.info("resolved xml preview", { snippet: output.substring(0, 500) })

  const outFile = `${process.cwd()}/examples/qti-generation/assessment-stimulus/negative/relative-path-instead-of-link.resolved.xml`
  const writeResult = await errors.try(fs.writeFile(outFile, output, "utf-8"))
  if (writeResult.error) {
    logger.error("failed to write resolved xml", { error: writeResult.error, outFile })
    throw errors.wrap(writeResult.error, "file write")
  }
  logger.info("wrote resolved xml", { outFile })
}

const result = await errors.try(main())
if (result.error) {
  logger.error("operation failed", { error: result.error })
  process.exit(1)
}

