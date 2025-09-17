import * as fs from "fs"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

/**
 * extracts all 'input' object literals from a typescript test file using regex parsing.
 */
async function extractInputs(filePath: string): Promise<any[]> {
	logger.info("starting input extraction", { filePath })
	
	// read the entire file
	const readResult = errors.trySync(() => fs.readFileSync(filePath, "utf-8"))
	if (readResult.error) {
		logger.error("failed to read file", { error: readResult.error, filePath })
		throw errors.wrap(readResult.error, "file read")
	}

	const fileContent = readResult.data
	const allInputs: any[] = []

	// find all const input = patterns using regex
	// this regex finds the declaration and captures everything until the type assertion
	const inputPattern = /const input = ({[\s\S]*?})\s+as unknown as \w+/g
	
	let match: RegExpExecArray | null
	let matchCount = 0
	
	while ((match = inputPattern.exec(fileContent)) !== null) {
		matchCount++
		const objectString = match[1]
		
		if (!objectString) {
			logger.warn("match found but no object string captured", { matchNumber: matchCount })
			continue
		}
		
		logger.debug("found input object", { 
			matchNumber: matchCount,
			objectPreview: objectString.substring(0, 100) + "..."
		})

		// evaluate the string to convert it into a javascript object
		const evalResult = errors.trySync(() => eval(`(${objectString})`))
		if (evalResult.error) {
			logger.warn("failed to evaluate input object", { 
				matchNumber: matchCount,
				objectString: objectString.substring(0, 200) + "...", 
				error: evalResult.error 
			})
			continue
		}

		allInputs.push(evalResult.data)
	}

	logger.info("extraction completed", { extractedCount: allInputs.length, totalMatches: matchCount })
	return allInputs
}

// main execution
async function main(): Promise<void> {
	// get input file path from command line args
	const args = process.argv.slice(2)
	if (args.length === 0) {
		console.error("usage: bun run extract-inputs.ts <path-to-extracted-test-file> [output-file]")
		console.error("example: bun run extract-inputs.ts tests/widgets/triangle-diagram.extracted.test.ts")
		console.error("example: bun run extract-inputs.ts tests/widgets/triangle-diagram.extracted.test.ts my-outputs.json")
		process.exit(1)
	}

	const testFilePath = args[0]!  // we already checked args.length > 0
	const customOutputPath = args[1]
	
	// resolve relative path if needed
	const fullPath = testFilePath.startsWith("/") ? testFilePath : 
		`${process.cwd()}/${testFilePath}`
	
	const inputs = await extractInputs(fullPath)
	
	// determine output filename
	let outputFilename: string
	if (customOutputPath) {
		// use custom output path, resolve relative paths
		outputFilename = customOutputPath.startsWith("/") ? customOutputPath :
			`${process.cwd()}/${customOutputPath}`
	} else {
		// derive output filename from input filename
		const inputBasename = testFilePath.replace(/\.extracted\.test\.ts$/, "").replace(/.*\//, "")
		outputFilename = `${inputBasename}-inputs.json`
	}
	
	// write clean json output to file
	const jsonOutput = JSON.stringify(inputs, null, 2)
	const writeResult = errors.trySync(() => fs.writeFileSync(outputFilename, jsonOutput))
	if (writeResult.error) {
		logger.error("failed to write output file", { error: writeResult.error, outputFilename })
		throw errors.wrap(writeResult.error, "file write")
	}
	
	logger.info("extraction completed successfully", { 
		inputFile: testFilePath,
		outputFile: outputFilename,
		extractedCount: inputs.length 
	})
	
	console.log(`successfully extracted ${inputs.length} input objects from ${testFilePath}`)
	console.log(`output written to: ${outputFilename}`)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("extraction failed", { error: result.error })
	process.exit(1)
}
