import * as errors from "@superbuilders/errors"

// Global blacklist for problematic Perseus question IDs that must not be migrated to QTI
// Add IDs here to permanently block their migration.
export const QuestionIdBlacklist: ReadonlySet<string> = new Set<string>([
	"x3e2c9dfb802fd56c",
	"x1f771cd1eaeb333d",
	"x75cc9453b5b7ce5d",
	"xc15d67b4d2f03b67",
	"x492d195f20882635",
	"x75cc9453b5b7ce5d",
	"x306026236fac5948",
	"x9542fc5ac7e20ec6",
	"xe8b6a3dc03b7b6a4",
	"xa7f40f16422ca17d",
	"x76f53e7969c909b4",
	"xe484b6ee5e0adf27",
	"x2759ec290a99458d",
	"x0630ce7689f9aec4",
	"x11d42aefb42e9b05",
	"x8e92c6136cc86f7b",
	"x0630ce7689f9aec4",
	"x7fd415086ba3b8d0",
	"x339042ed2762375d",
	"x77b1684f658b4308",
	"xf1193bfdfd2bb6f7",
	"xaccdb4d741f06434"
])

export function isQuestionIdBlacklisted(questionId: string): boolean {
	return QuestionIdBlacklist.has(questionId)
}

// Custom error used to mark a blacklisted question migration attempt
export const ErrQuestionBlacklisted = errors.new("question is blacklisted")
