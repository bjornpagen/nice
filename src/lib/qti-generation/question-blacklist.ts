import * as errors from "@superbuilders/errors"

// Global blacklist for problematic Perseus question IDs that must not be migrated to QTI
// Add IDs here to permanently block their migration.
export const QuestionIdBlacklist: ReadonlySet<string> = new Set<string>([
	"x3e2c9dfb802fd56c",
	"x1f771cd1eaeb333d",
	"x75cc9453b5b7ce5d",
	"xc15d67b4d2f03b67",
	"x492d195f20882635",
])

export function isQuestionIdBlacklisted(questionId: string): boolean {
	return QuestionIdBlacklist.has(questionId)
}

// Custom error used to mark a blacklisted question migration attempt
export const ErrQuestionBlacklisted = errors.new("question is blacklisted")


