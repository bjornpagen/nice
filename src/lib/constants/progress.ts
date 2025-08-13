// Shared progress-related constants

// Completion threshold for videos, expressed in percentage (0-100)
export const VIDEO_COMPLETION_THRESHOLD_PERCENT = 95

// Derived convenience value for ratio checks on the client (0.0-1.0)
export const VIDEO_COMPLETION_THRESHOLD_RATIO = VIDEO_COMPLETION_THRESHOLD_PERCENT / 100

// --- NEW: Proficiency Calculation Constants ---

/** Threshold score (0.0-1.0) for an assessment to be considered proficient for XP farming prevention. */
export const XP_PROFICIENCY_THRESHOLD = 0.8

/** Threshold score (0.0-1.0) for a student to be considered "Familiar" with a skill. */
export const PROFICIENCY_THRESHOLD_FAMILIAR = 0.7

/** Threshold score (0.0-1.0) for a student to be considered "Proficient" with a skill. */
export const PROFICIENCY_THRESHOLD_PROFICIENT = 1.0

/** The score assigned when a student demonstrates mastery on a unit test for an already proficient skill. */
export const PROFICIENCY_SCORE_MASTERED = 1.1

/** The proficiency score assigned when a student drops from "Proficient" after missing a unit test question. */
export const PROFICIENCY_SCORE_FAMILIAR_PENALTY = 0.7

/** The proficiency score assigned when a student drops from "Familiar" after missing a unit test question. */
export const PROFICIENCY_SCORE_ATTEMPTED_PENALTY = 0.5
