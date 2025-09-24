// Centralized subject definitions for strong typing and single-source-of-truth mapping
export type CaliperSubject = "Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None"

export const SUBJECT_SLUGS = [
    "science",
    "math",
    "reading",
    "language",
    "social-studies",
    "humanities",
    "ela"
] as const

export type SubjectSlug = (typeof SUBJECT_SLUGS)[number]

// Runtime membership test without type assertions
const SUBJECT_SLUG_SET: ReadonlySet<string> = new Set(SUBJECT_SLUGS)
export function isSubjectSlug(value: string): value is SubjectSlug {
	return SUBJECT_SLUG_SET.has(value)
}

export const CALIPER_SUBJECT_MAPPING: Record<SubjectSlug, CaliperSubject> = {
	science: "Science",
	math: "Math",
	reading: "Reading",
	language: "Language",
	"social-studies": "Social Studies",
    humanities: "Social Studies",
    // Map ELA to Reading to align with Caliper subject taxonomy
    ela: "Reading"
} as const
