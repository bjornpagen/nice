/**
 * Formats a resource title for display by appending a bracketed type label.
 * Labels are properly capitalized and idempotent (won't double-label).
 */
export function formatResourceTitleForDisplay(
	title: string,
	activityType: "Video" | "Article" | "Exercise" | "Quiz" | "UnitTest" | "CourseChallenge"
): string {
	let label: string
	switch (activityType) {
		case "Video":
			label = "Video"
			break
		case "Article":
			label = "Article"
			break
		case "Exercise":
			label = "Exercise"
			break
		case "Quiz":
			label = "Quiz"
			break
		case "UnitTest":
			label = "Test"
			break
		case "CourseChallenge":
			label = "Course Challenge"
			break
		default:
			label = ""
	}

	const suffix = ` [${label}]`

	// Check if the title already ends with this label (case-insensitive)
	if (title.trim().toLowerCase().endsWith(suffix.toLowerCase())) {
		return title // Already labeled, return as-is
	}

	return `${title}${suffix}`
}
