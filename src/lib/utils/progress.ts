import type { AssessmentProgress, UnitProficiency } from "@/lib/data/progress"

/**
 * Aggregates individual resource progress into unit-level proficiency percentages.
 * Only exercises with 100% scores (proficient/mastered) count toward proficiency.
 *
 * @param progressMap - Map of resourceId -> AssessmentProgress from getUserUnitProgress
 * @param units - Unit structure with exercises to aggregate
 * @returns Array of unit proficiency percentages
 */
export function aggregateUnitProficiencies(
	progressMap: Map<string, AssessmentProgress>,
	units: Array<{
		id: string
		children: Array<{ type: string; id: string; children?: Array<{ type: string; id: string }> }>
	}>
): UnitProficiency[] {
    return units.map((unit) => {
		const assessableContentIds: string[] = []

        // Collect all assessable content IDs from this unit
        // IMPORTANT: "skills" are Exercises ONLY. Quizzes/UnitTests are excluded.
		for (const child of unit.children) {
			if (child.type === "Lesson" && child.children) {
				// Add exercises from within lessons
				for (const content of child.children) {
					if (content.type === "Exercise") {
						assessableContentIds.push(content.id)
					}
				}
			}
		}

		// Count proficient exercises (100% score = proficient/mastered)
		let proficientCount = 0
		for (const contentId of assessableContentIds) {
			const progress = progressMap.get(contentId)
			if (progress?.completed && progress?.score && progress.score >= 100) {
				proficientCount++
			}
		}

		// Calculate proficiency percentage
		const proficiencyPercentage =
			assessableContentIds.length > 0 ? Math.round((proficientCount / assessableContentIds.length) * 100) : 0

		return {
			unitId: unit.id,
			proficiencyPercentage,
			proficientExercises: proficientCount,
			totalExercises: assessableContentIds.length
		}
	})
}
