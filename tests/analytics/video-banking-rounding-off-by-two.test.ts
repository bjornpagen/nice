import { describe, expect, test } from "bun:test"
import { computeBankingMinutes } from "@/lib/data/fetchers/caliper"

// Focused unit test: verify banking uses ceil semantics with a 20s floor.
// This avoids networked Caliper fetches and isolates the rounding policy
// that caused the consistent -2 XP under-award.

describe("Video banking minute bucketing (ceil with 20s floor)", () => {
  test("380 seconds → 7 minutes (ceil)", () => {
    expect(computeBankingMinutes(380)).toBe(7)
  })

  test("<=20 seconds → 0 minutes", () => {
    expect(computeBankingMinutes(0)).toBe(0)
    expect(computeBankingMinutes(5)).toBe(0)
    expect(computeBankingMinutes(20)).toBe(0)
  })

  test("21..60 seconds → 1 minute", () => {
    expect(computeBankingMinutes(21)).toBe(1)
    expect(computeBankingMinutes(59)).toBe(1)
    expect(computeBankingMinutes(60)).toBe(1)
  })
})


