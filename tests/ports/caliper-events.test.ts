import { describe, expect, spyOn, test } from "bun:test"
import * as errors from "@superbuilders/errors"

// Import after mocks
const analytics = await import("@/lib/ports/analytics")
const { NICE_APP_NAME, NICE_SENSOR_DOMAIN, NICE_ONEROSTER_BASE } = analytics
const caliper = await import("@/lib/caliper")
const clients = await import("@/lib/clients")
const { env } = await import("@/env")
const mockCaliperSend = spyOn(clients.caliper, "sendCaliperEvents").mockImplementation((_e) => Promise.resolve())

describe("Caliper Analytics Port - ActivityCompleted events", () => {
	test("happy path: builds correct envelope structure with normalized activity id", async () => {
		mockCaliperSend.mockClear()
		const res1 = await errors.try(
			analytics.sendActivityCompletedEvent({
				actor: {
					id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u1`,
					type: "TimebackUser",
					email: "u1@example.com"
				},
				context: {
					id: `${NICE_SENSOR_DOMAIN}/act/1`,
					type: "TimebackActivityContext",
					subject: "Math",
					app: { name: NICE_APP_NAME },
					course: {
						name: "algebra",
						id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/courses/course1`
					},
					activity: { id: "nice_unit_foo", name: "exercise" }
				},
				performance: { totalQuestions: 5, correctQuestions: 4, masteredUnits: 1 },
				finalXp: 120,
				correlationId: "corr-1"
			})
		)
		if (res1.error) throw res1.error

		expect(mockCaliperSend).toHaveBeenCalled()
		const envelopeUnknown = mockCaliperSend.mock.calls[0]?.[0]
		const envelopeResult = caliper.CaliperEnvelopeSchema.safeParse(envelopeUnknown)
		if (!envelopeResult.success) {
			throw errors.new("invalid envelope shape")
		}
		const envelope = envelopeResult.data
		expect(envelope.sensor).toBe(env.NEXT_PUBLIC_APP_DOMAIN)
		expect(envelope?.dataVersion).toBe("http://purl.imsglobal.org/ctx/caliper/v1p2")
		expect(Array.isArray(envelope?.data)).toBe(true)
		const event = envelope.data?.[0]
		expect(event?.["@context"]).toBe("http://purl.imsglobal.org/ctx/caliper/v1p2")
		expect(event?.type).toBe("ActivityEvent")
		expect(event?.profile).toBe("TimebackProfile")
		expect(event?.action).toBe("Completed")
		expect(event?.actor?.type).toBe("TimebackUser")
		expect(event?.object?.type).toBe("TimebackActivityContext")
		expect(typeof event?.id).toBe("string")
		expect(event?.generated?.type).toBe("TimebackActivityMetricsCollection")
		const items = event?.generated?.items
		expect(Array.isArray(items)).toBe(true)
		const metricTypes = new Set(items?.map((m) => m.type))
		expect(metricTypes.has("xpEarned")).toBe(true)
		expect(metricTypes.has("totalQuestions")).toBe(true)
		expect(metricTypes.has("correctQuestions")).toBe(true)
		expect(metricTypes.has("masteredUnits")).toBe(true)
		// activity id should normalize to OneRoster resource URI with extracted id
		expect(event?.object?.activity?.id?.startsWith(env.TIMEBACK_ONEROSTER_SERVER_URL)).toBe(true)
	})

	test("throws if activity id is missing", async () => {
		mockCaliperSend.mockClear()
		const result = await errors.try(
			analytics.sendActivityCompletedEvent({
				actor: {
					id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u1`,
					type: "TimebackUser",
					email: "u1@example.com"
				},
				context: {
					id: `${NICE_SENSOR_DOMAIN}/act/1`,
					type: "TimebackActivityContext",
					subject: "Math",
					app: { name: NICE_APP_NAME },
					course: {
						name: "algebra",
						id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/courses/course1`
					}
				},
				performance: { totalQuestions: 1, correctQuestions: 1, masteredUnits: 1 },
				finalXp: 10,
				correlationId: "corr-2"
			})
		)
		expect(Boolean(result.error)).toBe(true)
		expect(mockCaliperSend).not.toHaveBeenCalled()
	})

	test("rejects non-uuid idempotencyKey via schema validation", async () => {
		mockCaliperSend.mockClear()
		const result2 = await errors.try(
			analytics.sendActivityCompletedEvent({
				actor: {
					id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u1`,
					type: "TimebackUser",
					email: "u1@example.com"
				},
				context: {
					id: `${NICE_SENSOR_DOMAIN}/act/1`,
					type: "TimebackActivityContext",
					subject: "Math",
					app: { name: NICE_APP_NAME },
					activity: { id: "nice_foo", name: "exercise" }
				},
				performance: { totalQuestions: 1, correctQuestions: 1, masteredUnits: 1 },
				finalXp: 10,
				correlationId: "corr-3",
				idempotencyKey: "not-a-uuid"
			})
		)
		expect(Boolean(result2.error)).toBe(true)
		expect(mockCaliperSend).not.toHaveBeenCalled()
	})

	test("client error does not throw (best-effort)", async () => {
		mockCaliperSend.mockImplementationOnce((_e) => Promise.reject(errors.new("network")))
		await analytics.sendActivityCompletedEvent({
			actor: {
				id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u1`,
				type: "TimebackUser",
				email: "u1@example.com"
			},
			context: {
				id: `${NICE_SENSOR_DOMAIN}/act/1`,
				type: "TimebackActivityContext",
				subject: "Math",
				app: { name: NICE_APP_NAME },
				activity: { id: "nice_foo", name: "exercise" }
			},
			performance: { totalQuestions: 1, correctQuestions: 1, masteredUnits: 1 },
			finalXp: 10,
			correlationId: "corr-4"
		})
		// no throw
		expect(true).toBe(true)
	})

	test("preserves activity id when already a URL", async () => {
		mockCaliperSend.mockClear()
		const res2 = await errors.try(
			analytics.sendActivityCompletedEvent({
				actor: {
					id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u1`,
					type: "TimebackUser",
					email: "u1@example.com"
				},
				context: {
					id: `${NICE_SENSOR_DOMAIN}/act/1`,
					type: "TimebackActivityContext",
					subject: "Math",
					app: { name: NICE_APP_NAME },
					activity: {
						id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/resources/nice_bar`,
						name: "exercise"
					}
				},
				performance: { totalQuestions: 1, correctQuestions: 1, masteredUnits: 1 },
				finalXp: 10,
				correlationId: "corr-5"
			})
		)
		if (res2.error) throw res2.error
		const envUnknown = mockCaliperSend.mock.calls[0]?.[0]
		const envResult = caliper.CaliperEnvelopeSchema.safeParse(envUnknown)
		if (!envResult.success) {
			throw errors.new("invalid envelope shape")
		}
		const preservedIdUnknown = envResult.data?.data?.[0]?.object?.activity?.id
		if (typeof preservedIdUnknown !== "string") {
			throw errors.new("missing activity id")
		}
		expect(preservedIdUnknown.endsWith("/ims/oneroster/rostering/v1p2/resources/nice_bar")).toBe(true)
	})

	test("throws when actor id is not OneRoster domain", async () => {
		const bad = await errors.try(
			analytics.sendActivityCompletedEvent({
				actor: { id: "https://wrong.example.com/users/u1", type: "TimebackUser", email: "u1@example.com" },
				context: {
					id: `${NICE_SENSOR_DOMAIN}/act/1`,
					type: "TimebackActivityContext",
					subject: "Math",
					app: { name: NICE_APP_NAME },
					activity: { id: "nice_foo", name: "exercise" }
				},
				performance: { totalQuestions: 1, correctQuestions: 1, masteredUnits: 1 },
				finalXp: 10,
				correlationId: "corr-bad-actor"
			})
		)
		expect(Boolean(bad.error)).toBe(true)
	})
})

describe("Caliper Analytics Port - TimeSpent events", () => {
	test("happy path: builds correct time spent envelope and normalizes id", async () => {
		mockCaliperSend.mockClear()
		const res3 = await errors.try(
			analytics.sendTimeSpentEvent({
				actor: {
					id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u2`,
					type: "TimebackUser",
					email: "u2@example.com"
				},
				context: {
					id: `${NICE_SENSOR_DOMAIN}/act/2`,
					type: "TimebackActivityContext",
					subject: "Math",
					app: { name: NICE_APP_NAME },
					activity: { id: "nice_unit_baz", name: "exercise" }
				},
				durationInSeconds: 10,
				correlationId: "corr-6"
			})
		)
		if (res3.error) throw res3.error
		const envUnknown2 = mockCaliperSend.mock.calls[0]?.[0]
		const env2Result = caliper.CaliperEnvelopeSchema.safeParse(envUnknown2)
		if (!env2Result.success) {
			throw errors.new("invalid envelope shape")
		}
		const envelope = env2Result.data
		expect(typeof envelope.sensor).toBe("string")
		expect(envelope.data?.[0]?.type).toBe("TimeSpentEvent")
		expect(envelope.data?.[0]?.generated?.type).toBe("TimebackTimeSpentMetricsCollection")
		const metric = envelope.data?.[0]?.generated?.items?.[0]
		expect(metric?.type).toBe("active")
		expect(metric?.value).toBe(10)
		// Narrow for time spent metrics only
		if (metric && metric.type === "active") {
			expect(typeof metric.startDate).toBe("string")
			expect(typeof metric.endDate).toBe("string")
		}
		expect(envelope.data?.[0]?.object?.activity?.id?.endsWith("/ims/oneroster/rostering/v1p2/resources/nice_baz")).toBe(
			true
		)
	})

	test("time spent works without activity id (optional)", async () => {
		mockCaliperSend.mockClear()
		const res4 = await errors.try(
			analytics.sendTimeSpentEvent({
				actor: {
					id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u3`,
					type: "TimebackUser",
					email: "u3@example.com"
				},
				context: {
					id: `${NICE_SENSOR_DOMAIN}/act/3`,
					type: "TimebackActivityContext",
					subject: "Math",
					app: { name: NICE_APP_NAME }
				},
				durationInSeconds: 5,
				correlationId: "corr-7"
			})
		)
		if (res4.error) throw res4.error
		expect(mockCaliperSend).toHaveBeenCalled()
	})

	test("invalid actor email fails envelope validation", async () => {
		mockCaliperSend.mockClear()
		const result3 = await errors.try(
			analytics.sendTimeSpentEvent({
				actor: {
					id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u4`,
					type: "TimebackUser",
					email: "not-an-email"
				},
				context: {
					id: `${NICE_SENSOR_DOMAIN}/act/4`,
					type: "TimebackActivityContext",
					subject: "Math",
					app: { name: NICE_APP_NAME }
				},
				durationInSeconds: 5,
				correlationId: "corr-8"
			})
		)
		expect(Boolean(result3.error)).toBe(true)
		expect(mockCaliperSend).not.toHaveBeenCalled()
	})

	test("client error does not throw (best-effort)", async () => {
		mockCaliperSend.mockImplementationOnce((_e) => Promise.reject(errors.new("network")))
		await analytics.sendTimeSpentEvent({
			actor: {
				id: `${NICE_ONEROSTER_BASE}/ims/oneroster/rostering/v1p2/users/u5`,
				type: "TimebackUser",
				email: "u5@example.com"
			},
			context: {
				id: `${NICE_SENSOR_DOMAIN}/act/5`,
				type: "TimebackActivityContext",
				subject: "Math",
				app: { name: NICE_APP_NAME },
				activity: { id: "nice_qux", name: "exercise" }
			},
			durationInSeconds: 12,
			correlationId: "corr-9"
		})
		expect(true).toBe(true)
	})
})
