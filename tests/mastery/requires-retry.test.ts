import { describe, expect, test } from "bun:test"
import { determineRequiresRetry } from "@/lib/mastery/core"
import { XP_PROFICIENCY_THRESHOLD } from "@/lib/constants/progress"

/**
 * Tests for the requiresRetry metadata field logic.
 *
 * Business Rules:
 * 1. If totalQuestions is 0 (all reported/skipped), mastery is NOT demonstrated → requires retry
 * 2. If accuracy >= 80% (XP_PROFICIENCY_THRESHOLD), mastery achieved → no retry needed
 * 3. If accuracy < 80% BUT user was already proficient from a prior attempt → no retry needed
 * 4. If accuracy < 80% AND user was NOT previously proficient → requires retry
 */
describe("determineRequiresRetry pure function", () => {
	describe("Mastery threshold boundary cases", () => {
		test("exactly at mastery threshold (80%) → requiresRetry = false", () => {
			const result = determineRequiresRetry(80, 10, false)
			expect(result).toBe(false)
		})

		test("above mastery threshold (90%) → requiresRetry = false", () => {
			const result = determineRequiresRetry(90, 10, false)
			expect(result).toBe(false)
		})

		test("perfect score (100%) → requiresRetry = false", () => {
			const result = determineRequiresRetry(100, 10, false)
			expect(result).toBe(false)
		})

		test("just below mastery threshold (79%) → requiresRetry = true", () => {
			const result = determineRequiresRetry(79, 10, false)
			expect(result).toBe(true)
		})

		test("well below mastery threshold (50%) → requiresRetry = true", () => {
			const result = determineRequiresRetry(50, 10, false)
			expect(result).toBe(true)
		})

		test("zero accuracy (0%) → requiresRetry = true", () => {
			const result = determineRequiresRetry(0, 10, false)
			expect(result).toBe(true)
		})
	})

	describe("XP farming prevention (wasAlreadyProficient)", () => {
		test("low accuracy BUT already proficient → requiresRetry = false", () => {
			// User got 50% this time, but achieved 80%+ on a previous attempt
			const result = determineRequiresRetry(50, 10, true)
			expect(result).toBe(false)
		})

		test("zero accuracy BUT already proficient → requiresRetry = false", () => {
			// User got 0% this time, but achieved 80%+ on a previous attempt
			const result = determineRequiresRetry(0, 10, true)
			expect(result).toBe(false)
		})

		test("at threshold AND already proficient → requiresRetry = false", () => {
			// Redundant case: both conditions are met
			const result = determineRequiresRetry(80, 10, true)
			expect(result).toBe(false)
		})

		test("above threshold AND already proficient → requiresRetry = false", () => {
			const result = determineRequiresRetry(100, 10, true)
			expect(result).toBe(false)
		})
	})

	describe("Zero questions edge case (all reported/skipped)", () => {
		test("totalQuestions = 0 with high 'accuracy' → requiresRetry = true", () => {
			// When all questions are reported/skipped, accuracy might default to 100%
			// but mastery is NOT demonstrated → must require retry
			const result = determineRequiresRetry(100, 0, false)
			expect(result).toBe(true)
		})

		test("totalQuestions = 0 AND already proficient → requiresRetry = true", () => {
			// Even if previously proficient, zero scorable questions means no demonstration
			const result = determineRequiresRetry(100, 0, true)
			expect(result).toBe(true)
		})

		test("totalQuestions = 0 with zero accuracy → requiresRetry = true", () => {
			const result = determineRequiresRetry(0, 0, false)
			expect(result).toBe(true)
		})
	})

	describe("Realistic scenarios", () => {
		test("First attempt: 10/10 correct (100%) → no retry needed", () => {
			const accuracy = 100
			const totalQuestions = 10
			const wasAlreadyProficient = false

			const result = determineRequiresRetry(accuracy, totalQuestions, wasAlreadyProficient)
			expect(result).toBe(false)
		})

		test("First attempt: 8/10 correct (80%) → no retry needed", () => {
			const accuracy = 80
			const totalQuestions = 10
			const wasAlreadyProficient = false

			const result = determineRequiresRetry(accuracy, totalQuestions, wasAlreadyProficient)
			expect(result).toBe(false)
		})

		test("First attempt: 7/10 correct (70%) → retry required", () => {
			const accuracy = 70
			const totalQuestions = 10
			const wasAlreadyProficient = false

			const result = determineRequiresRetry(accuracy, totalQuestions, wasAlreadyProficient)
			expect(result).toBe(true)
		})

		test("Retry attempt: 6/10 correct (60%) after previous 90% → no retry needed", () => {
			const accuracy = 60
			const totalQuestions = 10
			const wasAlreadyProficient = true // achieved 90% previously

			const result = determineRequiresRetry(accuracy, totalQuestions, wasAlreadyProficient)
			expect(result).toBe(false)
		})

		test("Retry attempt: 9/10 correct (90%) after previous 50% → no retry needed", () => {
			const accuracy = 90
			const totalQuestions = 10
			const wasAlreadyProficient = false // previous attempt was 50%

			const result = determineRequiresRetry(accuracy, totalQuestions, wasAlreadyProficient)
			expect(result).toBe(false)
		})

		test("All questions reported as broken → retry required", () => {
			const accuracy = 100 // Default when no scorable questions
			const totalQuestions = 0 // All reported
			const wasAlreadyProficient = false

			const result = determineRequiresRetry(accuracy, totalQuestions, wasAlreadyProficient)
			expect(result).toBe(true)
		})

		test("4/5 correct (80%) on small exercise → no retry needed", () => {
			const accuracy = 80
			const totalQuestions = 5
			const wasAlreadyProficient = false

			const result = determineRequiresRetry(accuracy, totalQuestions, wasAlreadyProficient)
			expect(result).toBe(false)
		})

		test("3/5 correct (60%) on small exercise → retry required", () => {
			const accuracy = 60
			const totalQuestions = 5
			const wasAlreadyProficient = false

			const result = determineRequiresRetry(accuracy, totalQuestions, wasAlreadyProficient)
			expect(result).toBe(true)
		})
	})

	describe("Threshold constant verification", () => {
		test("XP_PROFICIENCY_THRESHOLD is 80", () => {
			// Verify our tests align with the actual constant
			expect(XP_PROFICIENCY_THRESHOLD).toBe(80)
		})

		test("function uses XP_PROFICIENCY_THRESHOLD correctly", () => {
			// Just below threshold
			expect(determineRequiresRetry(XP_PROFICIENCY_THRESHOLD - 1, 10, false)).toBe(true)
			// At threshold
			expect(determineRequiresRetry(XP_PROFICIENCY_THRESHOLD, 10, false)).toBe(false)
			// Above threshold
			expect(determineRequiresRetry(XP_PROFICIENCY_THRESHOLD + 1, 10, false)).toBe(false)
		})
	})
})

describe("requiresRetry integration scenarios", () => {
	describe("Banked XP for passive content", () => {
		test("Banked XP implies mastery → requiresRetry should be false", () => {
			// Banked XP is only awarded when the exercise is mastered
			// So passive resources that get banked XP should always have requiresRetry = false
			// This is a documentation test - the actual implementation is in bank.ts
			const accuracy = 100 // Banked XP only awarded on mastery
			const totalQuestions = 0 // Passive content has no questions
			const wasAlreadyProficient = false

			// Note: In the actual implementation, banked XP explicitly sets requiresRetry: false
			// because it's only triggered when the linked exercise achieves mastery.
			// The pure function would return true for totalQuestions=0, but the banked XP
			// logic overrides this since mastery was already verified at the exercise level.
		})
	})

	describe("Unit Test vs Exercise behavior", () => {
		test("Unit test at 70% → retry required (below 80% threshold)", () => {
			const accuracy = 70
			const result = determineRequiresRetry(accuracy, 10, false)
			expect(result).toBe(true)
		})

		test("Exercise at 70% → retry required (below 80% threshold)", () => {
			const accuracy = 70
			const result = determineRequiresRetry(accuracy, 5, false)
			expect(result).toBe(true)
		})

		test("Course Challenge at 85% → no retry needed", () => {
			const accuracy = 85
			const result = determineRequiresRetry(accuracy, 20, false)
			expect(result).toBe(false)
		})
	})

	describe("Edge cases with decimal accuracy", () => {
		test("79.9% accuracy (rounds to 79 or 80?) → implementation decides", () => {
			// The accuracy passed should already be an integer (0-100)
			// If 79.9 is passed, it should be treated as < 80
			const result = determineRequiresRetry(79.9, 10, false)
			expect(result).toBe(true) // 79.9 < 80
		})

		test("80.1% accuracy → no retry needed", () => {
			const result = determineRequiresRetry(80.1, 10, false)
			expect(result).toBe(false) // 80.1 >= 80
		})
	})
})

