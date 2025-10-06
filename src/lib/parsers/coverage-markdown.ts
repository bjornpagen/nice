import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// Types for parsed coverage data
export interface ParsedContent {
	type: "Video" | "Exercise" | "YT Video"
	id: string
	slug: string
	title: string
	standard: string
	link?: string
}

export interface ParsedLesson {
	title: string
	path: string // Original Khan path from markdown
	contents: ParsedContent[]
}

export interface ParsedUnit {
	title: string
	lessons: ParsedLesson[]
}

export interface ParsedCoverage {
	grade: string
	units: ParsedUnit[]
}

/**
 * Parse a coverage markdown file to extract course structure
 */
export function parseCoverageMarkdown(markdown: string, grade: string): ParsedCoverage {
	logger.info("parsing coverage markdown", { grade })
	
	const lines = markdown.split("\n")
	const units: ParsedUnit[] = []
	
	let currentUnit: ParsedUnit | null = null
	let currentLesson: ParsedLesson | null = null
	let inContentSection = false
	let currentStandard = ""
	
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		if (!line) continue
		
		// Check for unit header (## Unit: ...)
		const unitMatch = line.match(/^## Unit: (.+)$/)
		if (unitMatch) {
			// Save previous lesson if exists
			if (currentLesson && currentUnit) {
				currentUnit.lessons.push(currentLesson)
				currentLesson = null
			}
			
			currentUnit = {
				title: unitMatch[1]!.trim(),
				lessons: []
			}
			units.push(currentUnit)
			inContentSection = false
			continue
		}
		
		// Check for lesson header (### ...)
		const lessonMatch = line.match(/^### (.+)$/)
		if (lessonMatch && currentUnit) {
			// Save previous lesson if exists
			if (currentLesson) {
				currentUnit.lessons.push(currentLesson)
			}
			
			currentLesson = {
				title: lessonMatch[1]!.trim(),
				path: "",
				contents: []
			}
			inContentSection = false
			continue
		}
		
		// Check for path line
		if (line.startsWith("Path: ") && currentLesson) {
			currentLesson.path = line.substring(6).trim()
			continue
		}
		
		// Check for content section start
		if (line.includes("**Content (in CSV order):**")) {
			inContentSection = true
			continue
		}
		
		// Parse content items
		if (inContentSection && currentLesson && line.startsWith("- ")) {
			// Parse content type and title
			const contentMatch = line.match(/^- \[(Video|Exercise|YT Video)\] (.+)$/)
			if (contentMatch) {
				const contentType = contentMatch[1] as "Video" | "Exercise" | "YT Video"
				const contentTitle = contentMatch[2]!.trim()
				
				// For YT Videos, just store basic info
				if (contentType === "YT Video") {
					// Look for link on next line
					const nextLine = lines[i + 1]
					const linkMatch = nextLine?.match(/Link: (.+)$/)
					currentLesson.contents.push({
						type: contentType,
						id: "", // YT videos don't have IDs in our system
						slug: "", // YT videos don't have slugs
						title: contentTitle,
						standard: currentStandard,
						link: linkMatch ? linkMatch[1]!.trim() : undefined
					})
					if (linkMatch) i++ // Skip the link line
					continue
				}
				
				// Regular video or exercise - parse the metadata lines that follow
				const content: ParsedContent = {
					type: contentType,
					id: "",
					slug: "",
					title: contentTitle.replace(/ \((CC|TX)\)$/, ""), // Remove (CC) or (TX) suffix
					standard: ""
				}
				
				// Parse the metadata lines
				for (let j = i + 1; j < lines.length && j < i + 5; j++) {
					const metaLine = lines[j]
					if (!metaLine || !metaLine.startsWith("  ")) break
					
					const idMatch = metaLine.match(/- ID: (.+)$/)
					if (idMatch) {
						content.id = idMatch[1]!.trim()
					}
					
					const slugMatch = metaLine.match(/- Slug: (.+)$/)
					if (slugMatch) {
						content.slug = slugMatch[1]!.trim()
					}
					
					const standardMatch = metaLine.match(/- Standard: (.+)$/)
					if (standardMatch) {
						content.standard = standardMatch[1]!.trim()
						currentStandard = content.standard // Store for YT videos
					}
				}
				
				if (content.id && content.slug) {
					currentLesson.contents.push(content)
				}
			}
		}
	}
	
	// Save last lesson if exists
	if (currentLesson && currentUnit) {
		currentUnit.lessons.push(currentLesson)
	}
	
	logger.info("parsed coverage", { 
		grade, 
		unitCount: units.length,
		lessonCount: units.reduce((sum, u) => sum + u.lessons.length, 0),
		contentCount: units.reduce((sum, u) => 
			u.lessons.reduce((lsum, l) => lsum + l.contents.length, sum), 0)
	})
	
	return { grade, units }
}

/**
 * Generate a URL-safe slug from a title
 */
export function generateSlug(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/--+/g, "-")
}
