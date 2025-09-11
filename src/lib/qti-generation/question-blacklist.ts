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
	"xaccdb4d741f06434",
	"xb539972a1236641d",
	"x5fbcdb2296575aa2",
	"x7f851d2ab72a780f",
	"xfe66935d5b26cae8",
	"x0703ac4307f78eba",
	"xa4de3b821aaf5e4f",
	"xe82a2dc05379901c",
	"x51c9a020c042c5e4",
	"x377621c7da23faf7",
	"xfd47300ffe57abcc",
	"x91ccfe22a342c73e",
	"x7a9510d2eadddf4d"
])

export function isQuestionIdBlacklisted(questionId: string): boolean {
	return QuestionIdBlacklist.has(questionId)
}

// Custom error used to mark a blacklisted question migration attempt
export const ErrQuestionBlacklisted = errors.new("question is blacklisted")
