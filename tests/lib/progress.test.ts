import { afterEach, describe, expect, mock, test } from "bun:test"

type OneRosterResult = {
	assessmentLineItem: { sourcedId: string }
	student: { sourcedId: string }
	scoreStatus: "fully graded" | "partially graded"
	scoreDate?: string
	score?: number
}

function emptyResults(): OneRosterResult[] {
	return []
}

const mockGetAllResults = mock((_args: { filter: string }) => Promise.resolve(emptyResults()))

mock.module("@/lib/clients", () => ({
	oneroster: {
		getAllResults: (args: { filter: string }) => mockGetAllResults(args)
	}
}))

// Utilities used inside progress.ts that we don't need to test here
mock.module("@/lib/utils/assessment-results", () => ({
	isInteractiveAttemptResult: () => true,
	isPassiveContentResult: () => true
}))

const progress = await import("@/lib/data/progress")

afterEach(() => {
	mockGetAllResults.mockClear()
})

describe("getUserUnitProgress - 0..100 normalization and proficiency", () => {
	test("rounds score and maps proficiency", async () => {
		const now = new Date().toISOString()
		mockGetAllResults.mockImplementationOnce((_q: { filter: string }) =>
			Promise.resolve([
				{
					assessmentLineItem: { sourcedId: "nice_res1_ali" },
					student: { sourcedId: "u1" },
					scoreStatus: "fully graded",
					scoreDate: now,
					score: 100
				},
				{
					assessmentLineItem: { sourcedId: "nice_res2_ali" },
					student: { sourcedId: "u1" },
					scoreStatus: "fully graded",
					scoreDate: now,
					score: 85.7
				},
				{
					assessmentLineItem: { sourcedId: "nice_res3_ali" },
					student: { sourcedId: "u1" },
					scoreStatus: "partially graded",
					scoreDate: now,
					score: 49.9
				}
			])
		)

		const map = await progress.getUserUnitProgress("u1", "course1")
		const p1 = map.get("nice_res1")
		const p2 = map.get("nice_res2")
		const p3 = map.get("nice_res3")

		expect(p1).toEqual({ completed: true, score: 100, proficiency: "proficient" })
		// 85.7 rounds to 86 -> familiar
		expect(p2).toEqual({ completed: true, score: 86, proficiency: "familiar" })
		// 49.9 rounds to 50 and is partial (no proficiency)
		expect(p3).toEqual({ completed: false, score: 50 })
	})
})
