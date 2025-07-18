import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- NEW: EXPORTED CALIPER API ERRORS ---
export const ErrCaliperNotFound = errors.new("caliper resource not found")
export const ErrCaliperUnprocessable = errors.new("caliper request unprocessable/invalid")
export const ErrCaliperConflict = errors.new("caliper resource conflict")
export const ErrCaliperInternalServerError = errors.new("caliper internal server error")

// --- Zod Schemas for API Payloads ---
const TokenResponseSchema = z.object({
	access_token: z.string().min(1)
})

// --- API CLIENT CONFIG TYPE ---
type ApiClientConfig = {
	serverUrl: string
	tokenUrl: string
	clientId: string
	clientSecret: string
}

// --- Caliper Schemas based on OpenAPI Spec ---

export const TimebackUserSchema = z.object({
	id: z.string().url(),
	type: z.literal("TimebackUser"),
	email: z.string().email(),
	name: z.string().optional(),
	role: z.enum(["student", "teacher", "admin", "guide"]).optional()
})
export type TimebackUser = z.infer<typeof TimebackUserSchema>

export const TimebackActivityContextSchema = z.object({
	id: z.string().url(),
	type: z.literal("TimebackActivityContext"),
	subject: z.enum(["Science", "Math", "Reading", "Language", "Social Studies", "None"]),
	app: z.object({ id: z.string().url().optional(), name: z.string() }),
	course: z.object({ id: z.string().url().optional(), name: z.string() }).optional(),
	activity: z.object({ id: z.string().url().optional(), name: z.string() }).optional()
})
export type TimebackActivityContext = z.infer<typeof TimebackActivityContextSchema>

export const TimebackActivityMetricSchema = z.object({
	type: z.enum(["xpEarned", "totalQuestions", "correctQuestions", "masteredUnits"]),
	value: z.number()
})
export type TimebackActivityMetric = z.infer<typeof TimebackActivityMetricSchema>

export const TimebackActivityMetricsCollectionSchema = z.object({
	id: z.string().url(),
	type: z.literal("TimebackActivityMetricsCollection"),
	items: z.array(TimebackActivityMetricSchema)
})

export const TimebackActivityCompletedEventSchema = z.object({
	"@context": z.literal("http://purl.imsglobal.org/ctx/caliper/v1p2"),
	id: z
		.string()
		.uuid()
		.transform((val) => `urn:uuid:${val}`),
	type: z.literal("ActivityEvent"),
	profile: z.literal("TimebackProfile"),
	action: z.literal("Completed"),
	actor: TimebackUserSchema,
	object: TimebackActivityContextSchema,
	eventTime: z.string().datetime(),
	generated: TimebackActivityMetricsCollectionSchema
})
export type TimebackActivityCompletedEvent = z.infer<typeof TimebackActivityCompletedEventSchema>

export const TimeSpentMetricSchema = z.object({
	type: z.enum(["active", "inactive", "waste", "unknown", "anti-pattern"]),
	subType: z.string().optional(),
	value: z.number(), // Duration in seconds
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional()
})
export type TimeSpentMetric = z.infer<typeof TimeSpentMetricSchema>

export const TimebackTimeSpentMetricsCollectionSchema = z.object({
	id: z.string().url(),
	type: z.literal("TimebackTimeSpentMetricsCollection"),
	items: z.array(TimeSpentMetricSchema)
})

export const TimebackTimeSpentEventSchema = z.object({
	"@context": z.literal("http://purl.imsglobal.org/ctx/caliper/v1p2"),
	id: z
		.string()
		.uuid()
		.transform((val) => `urn:uuid:${val}`),
	type: z.literal("TimeSpentEvent"),
	profile: z.literal("TimebackProfile"),
	action: z.literal("SpentTime"),
	actor: TimebackUserSchema,
	object: TimebackActivityContextSchema,
	eventTime: z.string().datetime(),
	generated: TimebackTimeSpentMetricsCollectionSchema
})
export type TimebackTimeSpentEvent = z.infer<typeof TimebackTimeSpentEventSchema>

export const CaliperEnvelopeSchema = z.object({
	sensor: z.string().url(),
	sendTime: z.string().datetime(),
	dataVersion: z.literal("http://purl.imsglobal.org/ctx/caliper/v1p2"),
	data: z.array(z.union([TimebackActivityCompletedEventSchema, TimebackTimeSpentEventSchema])).min(1)
})
export type CaliperEnvelope = z.infer<typeof CaliperEnvelopeSchema>

export class CaliperApiClient {
	#accessToken: string | null = null
	#tokenPromise: Promise<string> | null = null
	#config: ApiClientConfig

	constructor(config: ApiClientConfig) {
		this.#config = config
		logger.debug("caliper: initializing client")
	}

	async #ensureAccessToken(): Promise<void> {
		if (this.#accessToken) return

		if (this.#tokenPromise) {
			this.#accessToken = await this.#tokenPromise
			return
		}

		this.#tokenPromise = this.#getAccessToken()
		const tokenResult = await errors.try(this.#tokenPromise)
		this.#tokenPromise = null

		if (tokenResult.error) {
			throw tokenResult.error
		}
		this.#accessToken = tokenResult.data
	}

	async #getAccessToken(): Promise<string> {
		logger.debug("caliper: fetching new access token")
		const params = new URLSearchParams({
			grant_type: "client_credentials",
			client_id: this.#config.clientId,
			client_secret: this.#config.clientSecret
		})

		const result = await errors.try(
			fetch(this.#config.tokenUrl, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: params
			})
		)
		if (result.error) {
			logger.error("caliper auth: token fetch failed", { error: result.error })
			throw errors.wrap(result.error, "caliper token fetch")
		}

		if (!result.data.ok) {
			const errorBody = await result.data.text()
			logger.error("caliper auth: token request rejected", { status: result.data.status, body: errorBody })
			throw errors.new(`caliper token request failed with status ${result.data.status}`)
		}

		const jsonResult = await errors.try(result.data.json())
		if (jsonResult.error) {
			logger.error("caliper auth: failed to parse token response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "caliper token response parsing")
		}

		const validation = TokenResponseSchema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("caliper auth: invalid token response schema", { error: validation.error })
			throw errors.wrap(validation.error, "caliper token response validation")
		}

		logger.info("caliper: access token acquired")
		return validation.data.access_token
	}

	async #request<T>(endpoint: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
		await this.#ensureAccessToken()
		const url = `${this.#config.serverUrl}${endpoint}`
		const headers = {
			...options.headers,
			Authorization: `Bearer ${this.#accessToken}`
		}

		const fetchResult = await errors.try(fetch(url, { ...options, headers }))
		if (fetchResult.error) {
			logger.error("caliper api request failed", { error: fetchResult.error, endpoint })
			throw errors.wrap(fetchResult.error, "caliper api request")
		}

		const response = fetchResult.data
		if (!response.ok) {
			const errorBody = await response.text()
			logger.error("caliper api returned non-ok status", {
				status: response.status,
				body: errorBody,
				endpoint
			})
			throw errors.new(`caliper api error: status ${response.status} on ${endpoint}`)
		}

		if (response.status === 204) {
			return schema.parse(null)
		}

		const jsonResult = await errors.try(response.json())
		if (jsonResult.error) {
			logger.error("caliper api: failed to parse json response", { error: jsonResult.error, endpoint })
			throw errors.wrap(jsonResult.error, "caliper api response parsing")
		}

		const validation = schema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("caliper api: invalid response schema", { error: validation.error, endpoint })
			throw errors.wrap(validation.error, "caliper api response validation")
		}
		return validation.data
	}

	public async sendCaliperEvents(envelope: CaliperEnvelope): Promise<void> {
		logger.info("caliper client: sending events", { eventCount: envelope.data.length })

		const validation = CaliperEnvelopeSchema.safeParse(envelope)
		if (!validation.success) {
			logger.error("invalid caliper envelope", { error: validation.error, envelope })
			throw errors.wrap(validation.error, "invalid caliper envelope")
		}

		await this.#request(
			"/caliper/event",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			z.unknown() // Expect a successful status code with no specific body to parse
		)

		logger.info("caliper client: events sent successfully")
	}
}
