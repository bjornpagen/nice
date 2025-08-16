/**
 * Formats a resource title for display by appending a bracketed type label.
 * Labels are properly capitalized and idempotent (won't double-label).
 */
export function formatResourceTitleForDisplay(
	title: string,
	activityType: "Video" | "Article" | "Exercise" | "Quiz" | "UnitTest" | "CourseChallenge"
): string {
	const label = (() => {
		switch (activityType) {
			case "Video":
				return "Video"
			case "Article":
				return "Article"
			case "Exercise":
				return "Exercise"
			case "Quiz":
				return "Quiz"
			case "UnitTest":
				return "Test"
			case "CourseChallenge":
				return "Course Challenge"
		}
	})()

	const suffix = ` [${label}]`
	
	// Check if the title already ends with this label (case-insensitive)
	if (title.trim().toLowerCase().endsWith(suffix.toLowerCase())) {
		return title // Already labeled, return as-is
	}
	
	return `${title}${suffix}`
}
