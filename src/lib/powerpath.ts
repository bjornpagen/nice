import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- ERROR CONSTANTS ---
export const ErrPowerPathAPI = errors.new("powerpath api error")
export const ErrPowerPathNotFound = errors.new("powerpath resource not found")
export const ErrJWTExpired = errors.new("jwt expired")

// --- API CLIENT CONFIG TYPE ---
type ApiClientConfig = {
	serverUrl: string
	tokenUrl: string
	clientId: string
	clientSecret: string
}

// --- ZOD SCHEMAS ---
const TokenResponseSchema = z.object({
	access_token: z.string().min(1)
})

// Schemas for updateStudentQuestionResponse
const UpdateStudentQuestionResponseInputSchema = z.object({
	student: z.string(),
	question: z.string(),
	response: z.union([z.string(), z.array(z.string())]),
	lesson: z.string()
})

const UpdateStudentQuestionResponseResultSchema = z.object({
	lessonType: z.enum(["quiz", "test-out", "placement", "unit-test", "coursechallenge", "powerpath-100"]),
	responseResult: z
		.object({
			score: z.number()
		})
		.optional()
})

// Schemas for finalStudentAssessmentResponse
const FinalizeAssessmentInputSchema = z.object({
	student: z.string(),
	lesson: z.string()
})

const FinalizeAssessmentResultSchema = z.object({
	lessonType: z.string(),
	finalized: z.boolean()
})

// Schemas for getAssessmentProgress
const PowerPathTestQuestionSchema = z.object({
	id: z.string(),
	correct: z.boolean().optional()
})

const GetAssessmentProgressResultSchema = z.object({
	lessonType: z.string(),
	finalized: z.boolean(),
	score: z.number().optional(),
	questions: z.array(PowerPathTestQuestionSchema),
	attempt: z.number() // ADDED: Ensure we capture the attempt number in the response
})

// ADDED: Schemas for createNewAttempt
const CreateNewAttemptInputSchema = z.object({
	student: z.string(),
	lesson: z.string()
})

const CreateNewAttemptResultSchema = z.object({
	attempt: z.object({
		attempt: z.number().nullable(),
		score: z.number(),
		scoreStatus: z.string(),
		startedAt: z.string().datetime().nullable(),
		completedAt: z.string().datetime().nullable()
	})
})

// --- EXPORTED TYPES ---
export type UpdateStudentQuestionResponseInput = z.infer<typeof UpdateStudentQuestionResponseInputSchema>
export type UpdateStudentQuestionResponseResult = z.infer<typeof UpdateStudentQuestionResponseResultSchema>
export type FinalizeAssessmentInput = z.infer<typeof FinalizeAssessmentInputSchema>
export type FinalizeAssessmentResult = z.infer<typeof FinalizeAssessmentResultSchema>
export type GetAssessmentProgressResult = z.infer<typeof GetAssessmentProgressResultSchema>
// ADDED: Exported types for the new endpoint
export type CreateNewAttemptInput = z.infer<typeof CreateNewAttemptInputSchema>
export type CreateNewAttemptResult = z.infer<typeof CreateNewAttemptResultSchema>

export class Client {
	#accessToken: string | null = null
	#tokenPromise: Promise<string> | null = null
	#config: ApiClientConfig

	constructor(config: ApiClientConfig) {
		this.#config = config
		logger.debug("powerpath: initializing client")
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
		if (tokenResult.error) throw tokenResult.error
		this.#accessToken = tokenResult.data
	}

	async #getAccessToken(): Promise<string> {
		logger.debug("powerpath: fetching new access token")
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
			logger.error("powerpath auth: token fetch failed", { error: result.error })
			throw errors.wrap(result.error, "powerpath token fetch")
		}
		if (!result.data.ok) {
			const errorBody = await result.data.text()
			logger.error("powerpath auth: token request rejected", { status: result.data.status, body: errorBody })
			throw errors.new(`powerpath token request failed with status ${result.data.status}`)
		}
		const jsonResult = await errors.try(result.data.json())
		if (jsonResult.error) {
			logger.error("powerpath auth: failed to parse token response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "powerpath token response parsing")
		}
		const validation = TokenResponseSchema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("powerpath auth: invalid token response schema", { error: validation.error })
			throw errors.wrap(validation.error, "powerpath token response validation")
		}
		logger.info("powerpath: access token acquired")
		return validation.data.access_token
	}

	async #request<T>(endpoint: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
		await this.#ensureAccessToken()
		const url = `${this.#config.serverUrl}${endpoint}`
		const headers = { ...options.headers, Authorization: `Bearer ${this.#accessToken}` }

		const fetchResult = await errors.try(fetch(url, { ...options, headers }))
		if (fetchResult.error) {
			logger.error("powerpath api request failed", { error: fetchResult.error, endpoint })
			throw errors.wrap(fetchResult.error, "powerpath api request")
		}

		const response = fetchResult.data
		if (!response.ok) {
			const errorBody = await response.text()
			logger.error("powerpath api returned non-ok status", { status: response.status, body: errorBody, endpoint })

			// Check for JWT expiration
			if (response.status === 401 && errorBody.toLowerCase().includes("jwt expired")) {
				logger.info("powerpath auth: jwt expired, attempting to refresh token", { endpoint })
				// Clear the expired token
				this.#accessToken = null
				// Get a new token
				await this.#ensureAccessToken()
				// Retry the request with the new token
				const retryHeaders = {
					...options.headers,
					Authorization: `Bearer ${this.#accessToken}`
				}
				const retryResult = await errors.try(fetch(url, { ...options, headers: retryHeaders }))
				if (retryResult.error) {
					logger.error("powerpath api request failed after token refresh", { error: retryResult.error, endpoint })
					throw errors.wrap(retryResult.error, "powerpath api request after token refresh")
				}
				const retryResponse = retryResult.data
				if (!retryResponse.ok) {
					const retryErrorBody = await retryResponse.text()
					logger.error("powerpath api returned non-ok status after token refresh", {
						status: retryResponse.status,
						body: retryErrorBody,
						endpoint
					})
					throw errors.wrap(
						ErrJWTExpired,
						`powerpath jwt refresh failed: status ${retryResponse.status} on ${endpoint}`
					)
				}
				// Process successful retry response
				if (retryResponse.status === 204) {
					const validation = schema.safeParse(null)
					if (!validation.success) {
						logger.error("powerpath api: schema validation failed for 204 response after token refresh", {
							error: validation.error,
							endpoint
						})
						throw errors.wrap(validation.error, "powerpath api 204 response validation after token refresh")
					}
					return validation.data
				}
				const retryJsonResult = await errors.try(retryResponse.json())
				if (retryJsonResult.error) {
					logger.error("powerpath api: failed to parse json response after token refresh", {
						error: retryJsonResult.error,
						endpoint
					})
					throw errors.wrap(retryJsonResult.error, "powerpath api response parsing after token refresh")
				}
				const retryValidation = schema.safeParse(retryJsonResult.data)
				if (!retryValidation.success) {
					logger.error("powerpath api: invalid response schema after token refresh", {
						error: retryValidation.error,
						endpoint
					})
					throw errors.wrap(retryValidation.error, "powerpath api response validation after token refresh")
				}
				return retryValidation.data
			}

			if (response.status === 404) {
				throw errors.wrap(ErrPowerPathNotFound, `powerpath api error: status 404 on ${endpoint}`)
			}
			throw errors.wrap(ErrPowerPathAPI, `status ${response.status} on ${endpoint}`)
		}

		if (response.status === 204) {
			const validation = schema.safeParse(null)
			if (!validation.success) {
				logger.error("powerpath api: schema validation failed for 204 response", { error: validation.error, endpoint })
				throw errors.wrap(validation.error, "powerpath api 204 response validation")
			}
			return validation.data
		}

		const jsonResult = await errors.try(response.json())
		if (jsonResult.error) {
			logger.error("powerpath api: failed to parse json response", { error: jsonResult.error, endpoint })
			throw errors.wrap(jsonResult.error, "powerpath api response parsing")
		}

		const validation = schema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("powerpath api: invalid response schema", { error: validation.error, endpoint })
			throw errors.wrap(validation.error, "powerpath api response validation")
		}
		return validation.data
	}

	async updateStudentQuestionResponse(
		input: UpdateStudentQuestionResponseInput
	): Promise<UpdateStudentQuestionResponseResult> {
		const validationResult = UpdateStudentQuestionResponseInputSchema.safeParse(input)
		if (!validationResult.success) {
			throw errors.wrap(validationResult.error, "invalid input for updateStudentQuestionResponse")
		}
		return this.#request(
			"/powerpath/updateStudentQuestionResponse",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validationResult.data)
			},
			UpdateStudentQuestionResponseResultSchema
		)
	}

	async finalStudentAssessmentResponse(input: FinalizeAssessmentInput): Promise<FinalizeAssessmentResult> {
		const validationResult = FinalizeAssessmentInputSchema.safeParse(input)
		if (!validationResult.success) {
			throw errors.wrap(validationResult.error, "invalid input for finalStudentAssessmentResponse")
		}
		return this.#request(
			"/powerpath/finalStudentAssessmentResponse",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validationResult.data)
			},
			FinalizeAssessmentResultSchema
		)
	}

	async getAssessmentProgress(student: string, lesson: string, attempt?: number): Promise<GetAssessmentProgressResult> {
		logger.debug("powerpath: getting assessment progress", { student, lesson, attempt })
		let endpoint = `/powerpath/getAssessmentProgress?student=${encodeURIComponent(student)}&lesson=${encodeURIComponent(
			lesson
		)}`
		// If an attempt number is provided, add it to the query string.
		if (attempt !== undefined) {
			endpoint += `&attempt=${attempt}`
		}
		return this.#request(endpoint, { method: "GET" }, GetAssessmentProgressResultSchema)
	}

	// ADDED: New method to create a new attempt
	async createNewAttempt(input: CreateNewAttemptInput): Promise<CreateNewAttemptResult> {
		const validationResult = CreateNewAttemptInputSchema.safeParse(input)
		if (!validationResult.success) {
			throw errors.wrap(validationResult.error, "invalid input for createNewAttempt")
		}
		return this.#request(
			"/powerpath/createNewAttempt",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validationResult.data)
			},
			CreateNewAttemptResultSchema
		)
	}
}
