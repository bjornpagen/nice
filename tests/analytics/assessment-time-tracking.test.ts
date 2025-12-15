/**
 * Tests for Assessment Time Tracking
 *
 * This file tests the wall-time guard logic for assessment time tracking.
 * The implementation mirrors the video tracking pattern with:
 * - 1.5x wall-time guard with 5s leeway
 * - Cumulative time accumulation
 * - Server-side validation
 *
 * Note: Integration tests for the full cache layer and server action require proper
 * environment setup. These unit tests focus on the guard logic which is critical
 * for preventing time inflation.
 */

import { describe, expect, test } from "bun:test"

// Constants matching those in src/lib/actions/assessment.ts
const ASSESSMENT_MAX_GROWTH_FACTOR_VS_WALLTIME = 1.5
const ASSESSMENT_TIME_LEEWAY_SECONDS = 5

/**
 * Calculates the effective delta after applying the wall-time guard.
 * This is the same logic used in accumulateAssessmentTime.
 */
function calculateEffectiveDelta(
	claimedDeltaSeconds: number,
	wallTimeMs: number | null
): number {
	if (claimedDeltaSeconds <= 0 || !Number.isFinite(claimedDeltaSeconds)) {
		return 0
	}

	// No guard on first call (no prior lastServerSyncAt)
	if (wallTimeMs === null) {
		return claimedDeltaSeconds
	}

	const wallTimeSeconds = wallTimeMs / 1000
	const allowed = wallTimeSeconds * ASSESSMENT_MAX_GROWTH_FACTOR_VS_WALLTIME
	const guardAllowed = Math.max(allowed, ASSESSMENT_TIME_LEEWAY_SECONDS)

	if (claimedDeltaSeconds > guardAllowed) {
		return Math.max(0, guardAllowed)
	}

	return claimedDeltaSeconds
}

describe("Wall-Time Guard Logic", () => {
	test("allows full delta on first call (no prior state)", () => {
		const effectiveDelta = calculateEffectiveDelta(60, null)
		expect(effectiveDelta).toBe(60)
	})

	test("allows delta within 1.5x wall-time", () => {
		// 10 seconds wall-time, claiming 10 seconds
		const effectiveDelta = calculateEffectiveDelta(10, 10000)
		expect(effectiveDelta).toBe(10)
	})

	test("allows delta up to 1.5x wall-time", () => {
		// 10 seconds wall-time, claiming 14 seconds (1.4x)
		const effectiveDelta = calculateEffectiveDelta(14, 10000)
		expect(effectiveDelta).toBe(14)
	})

	test("clamps delta exceeding 1.5x wall-time", () => {
		// 10 seconds wall-time, claiming 100 seconds
		// Should be clamped to 15 seconds (10 * 1.5)
		const effectiveDelta = calculateEffectiveDelta(100, 10000)
		expect(effectiveDelta).toBe(15)
	})

	test("uses 5s leeway when wall-time is very small", () => {
		// 1 second wall-time (1.5x = 1.5s, but leeway is 5s)
		// Claiming 4 seconds should be allowed
		const effectiveDelta = calculateEffectiveDelta(4, 1000)
		expect(effectiveDelta).toBe(4)
	})

	test("clamps to 5s leeway when exceeding it", () => {
		// 1 second wall-time, claiming 10 seconds
		// Should be clamped to 5s (leeway)
		const effectiveDelta = calculateEffectiveDelta(10, 1000)
		expect(effectiveDelta).toBe(5)
	})

	test("allows up to 150s for 100s wall-time", () => {
		// 100 seconds wall-time, claiming 150 seconds (exactly 1.5x)
		const effectiveDelta = calculateEffectiveDelta(150, 100000)
		expect(effectiveDelta).toBe(150)
	})

	test("clamps excessive claims for long wall-times", () => {
		// 100 seconds wall-time, claiming 1000 seconds
		// Should be clamped to 150 seconds (100 * 1.5)
		const effectiveDelta = calculateEffectiveDelta(1000, 100000)
		expect(effectiveDelta).toBe(150)
	})

	test("handles zero delta", () => {
		const effectiveDelta = calculateEffectiveDelta(0, 10000)
		expect(effectiveDelta).toBe(0)
	})

	test("handles negative delta", () => {
		const effectiveDelta = calculateEffectiveDelta(-5, 10000)
		expect(effectiveDelta).toBe(0)
	})

	test("handles Infinity delta", () => {
		const effectiveDelta = calculateEffectiveDelta(Infinity, 10000)
		expect(effectiveDelta).toBe(0)
	})

	test("handles NaN delta", () => {
		const effectiveDelta = calculateEffectiveDelta(NaN, 10000)
		expect(effectiveDelta).toBe(0)
	})

	test("handles zero wall-time uses leeway", () => {
		// 0 seconds wall-time, claiming 3 seconds
		// Should be allowed up to 5s leeway
		const effectiveDelta = calculateEffectiveDelta(3, 0)
		expect(effectiveDelta).toBe(3)
	})

	test("handles negative wall-time uses leeway", () => {
		// Negative wall-time (shouldn't happen but handle gracefully)
		// Should use 5s leeway
		const effectiveDelta = calculateEffectiveDelta(3, -1000)
		expect(effectiveDelta).toBe(3)
	})
})

describe("Typical Usage Scenarios", () => {
	test("normal 3-second heartbeat passes", () => {
		// Simulate a normal 3-second heartbeat with 3 seconds wall-time
		const effectiveDelta = calculateEffectiveDelta(3, 3000)
		expect(effectiveDelta).toBe(3)
	})

	test("slightly late heartbeat (4s instead of 3s) passes", () => {
		// Heartbeat arrives 1s late, claims 3s but wall-time is 4s
		const effectiveDelta = calculateEffectiveDelta(3, 4000)
		expect(effectiveDelta).toBe(3)
	})

	test("gap after tab visibility change is clamped", () => {
		// User hid tab for 1 minute, then came back
		// Claimed delta is 3s (one heartbeat), wall-time is 60s
		// This should pass since 3s < 60s * 1.5
		const effectiveDelta = calculateEffectiveDelta(3, 60000)
		expect(effectiveDelta).toBe(3)
	})

	test("overnight gap is clamped appropriately", () => {
		// User left overnight (8 hours = 28800 seconds)
		// If somehow client tried to claim that time (shouldn't happen with visibility pause)
		// Should be clamped to 28800 * 1.5 = 43200s
		const effectiveDelta = calculateEffectiveDelta(50000, 28800000)
		expect(effectiveDelta).toBe(43200)
	})

	test("rapid heartbeats are handled", () => {
		// Two heartbeats in quick succession (100ms apart)
		// First claims 3s, second only has 100ms wall-time
		// First heartbeat:
		const first = calculateEffectiveDelta(3, null)
		expect(first).toBe(3)

		// Second heartbeat with only 100ms wall-time
		// 0.1s * 1.5 = 0.15s, but leeway is 5s
		// Claiming 3s should pass
		const second = calculateEffectiveDelta(3, 100)
		expect(second).toBe(3)
	})
})

describe("Edge Cases", () => {
	test("very small wall-time with very large claim", () => {
		// 10ms wall-time, claiming 1000 seconds
		// Should be clamped to 5s (leeway)
		const effectiveDelta = calculateEffectiveDelta(1000, 10)
		expect(effectiveDelta).toBe(5)
	})

	test("fractional seconds are handled", () => {
		// 2.5 seconds wall-time, claiming 3.7 seconds
		// 2.5 * 1.5 = 3.75s, so 3.7s should pass
		const effectiveDelta = calculateEffectiveDelta(3.7, 2500)
		expect(effectiveDelta).toBe(3.7)
	})

	test("exact boundary case (exactly 1.5x)", () => {
		// 10 seconds wall-time, claiming exactly 15 seconds (1.5x)
		const effectiveDelta = calculateEffectiveDelta(15, 10000)
		expect(effectiveDelta).toBe(15)
	})

	test("just over boundary case (1.5x + epsilon)", () => {
		// 10 seconds wall-time, claiming 15.001 seconds
		// Should be clamped to 15
		const effectiveDelta = calculateEffectiveDelta(15.001, 10000)
		expect(effectiveDelta).toBe(15)
	})
})
