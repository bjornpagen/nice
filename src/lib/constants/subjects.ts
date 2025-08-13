export const CALIPER_SUBJECT_MAPPING: Record<
	string,
	"Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None"
> = {
	science: "Science",
	math: "Math",
	reading: "Reading",
	language: "Language",
	"social-studies": "Social Studies"
} as const
