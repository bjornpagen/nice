/**
 * Script to verify QTI content is correct on the server side.
 * 
 * Usage: bun scripts/verify-qti-content.ts <identifier>
 * Example: bun scripts/verify-qti-content.ts nice_x33cf8d8cf1f5b7ee
 * 
 * This script fetches the raw QTI content from the server and checks for common issues
 * that might cause numbers to not render properly.
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"

async function main() {
	const identifier = process.argv[2]
	
	if (!identifier) {
		logger.error("missing identifier argument")
		console.log("\nUsage: bun scripts/verify-qti-content.ts <identifier>")
		console.log("Example: bun scripts/verify-qti-content.ts nice_x33cf8d8cf1f5b7ee")
		process.exit(1)
	}

	logger.info("verifying qti content", { identifier })

	// Try to fetch as stimulus first (articles use stimuli)
	const stimulusResult = await errors.try(qti.getStimulus(identifier))
	if (stimulusResult.data) {
		const stimulus = stimulusResult.data
		logger.info("found stimulus", { 
			identifier: stimulus.identifier,
			title: stimulus.title,
			rawXmlLength: stimulus.rawXml.length 
		})
		
		console.log("\n=== STIMULUS CONTENT ===")
		console.log("Title:", stimulus.title)
		console.log("Identifier:", stimulus.identifier)
		console.log("\n=== RAW XML ===")
		console.log(stimulus.rawXml)
		
		// Check for number patterns
		const numberPattern = /\d+/g
		const numbers = stimulus.rawXml.match(numberPattern)
		console.log("\n=== NUMBERS FOUND IN XML ===")
		if (numbers) {
			console.log("Count:", numbers.length)
			console.log("Examples:", numbers.slice(0, 20).join(", "))
		} else {
			console.log("WARNING: No numbers found in XML!")
		}
		
		// Check for potential issues
		console.log("\n=== POTENTIAL ISSUES ===")
		
		// Check for unusual character encodings
		const hasUnicodeNumbers = /[\u0660-\u0669\u06F0-\u06F9\u0966-\u096F]/.test(stimulus.rawXml)
		if (hasUnicodeNumbers) {
			console.log("WARNING: Contains non-ASCII number characters (Arabic/Devanagari numerals)")
		}
		
		// Check for numbers inside comments or CDATA that might not render
		const hasCommentedNumbers = /<!--[^>]*\d[^>]*-->/.test(stimulus.rawXml)
		if (hasCommentedNumbers) {
			console.log("WARNING: Some numbers appear to be inside XML comments")
		}
		
		// Check for zero-width characters that might hide numbers
		const hasZeroWidth = /[\u200B\u200C\u200D\uFEFF]/.test(stimulus.rawXml)
		if (hasZeroWidth) {
			console.log("WARNING: Contains zero-width characters that might affect rendering")
		}
		
		if (!hasUnicodeNumbers && !hasCommentedNumbers && !hasZeroWidth && numbers && numbers.length > 0) {
			console.log("✓ No obvious issues detected - numbers appear to be correct in server content")
			console.log("✓ Issue is likely CLIENT-SIDE (browser extension, cache, or font)")
		}
		
		return
	}

	// Try assessment item
	const itemResult = await errors.try(qti.getAssessmentItem(identifier))
	if (itemResult.data) {
		const item = itemResult.data
		logger.info("found assessment item", { 
			identifier: item.identifier,
			title: item.title,
			rawXmlLength: item.rawXml.length 
		})
		
		console.log("\n=== ASSESSMENT ITEM CONTENT ===")
		console.log("Title:", item.title)
		console.log("Identifier:", item.identifier)
		console.log("\n=== RAW XML ===")
		console.log(item.rawXml)
		
		// Check for number patterns
		const numberPattern = /\d+/g
		const numbers = item.rawXml.match(numberPattern)
		console.log("\n=== NUMBERS FOUND IN XML ===")
		if (numbers) {
			console.log("Count:", numbers.length)
			console.log("Examples:", numbers.slice(0, 20).join(", "))
		} else {
			console.log("WARNING: No numbers found in XML!")
		}
		
		return
	}

	logger.error("content not found", { 
		identifier,
		stimulusError: stimulusResult.error,
		itemError: itemResult.error
	})
	console.log("\nERROR: Could not find content with identifier:", identifier)
	console.log("Tried both stimulus and assessment item endpoints.")
	process.exit(1)
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}


