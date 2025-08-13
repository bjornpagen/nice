// Shared progress-related constants

// Completion threshold for videos, expressed in percentage (0-100)
export const VIDEO_COMPLETION_THRESHOLD_PERCENT = 95

// Derived convenience value for ratio checks on the client (0.0-1.0)
export const VIDEO_COMPLETION_THRESHOLD_RATIO = VIDEO_COMPLETION_THRESHOLD_PERCENT / 100

// --- NEW: Proficiency Calculation Constants ---

/** Threshold score (0-100) for an assessment to be considered proficient for XP farming prevention. */
export const XP_PROFICIENCY_THRESHOLD = 80

/** Threshold score (0-100) for a student to be considered "Familiar" with a skill. */
export const PROFICIENCY_THRESHOLD_FAMILIAR = 70

/** Threshold score (0-100) for a student to be considered "Proficient" with a skill. */
export const PROFICIENCY_THRESHOLD_PROFICIENT = 100

/** The proficiency score assigned when a student drops from "Proficient" after missing a unit test question. */
export const PROFICIENCY_SCORE_FAMILIAR_PENALTY = 70

/** The proficiency score assigned when a student drops from "Familiar" after missing a unit test question. */
export const PROFICIENCY_SCORE_ATTEMPTED_PENALTY = 50
