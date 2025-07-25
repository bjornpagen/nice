import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- NEW: EXPORTED QTI API ERRORS ---
export const ErrQtiNotFound = errors.new("qti resource not found")
export const ErrQtiUnprocessable = errors.new("qti request unprocessable/invalid")
export const ErrQtiConflict = errors.new("qti resource conflict")
export const ErrQtiInternalServerError = errors.new("qti internal server error")
export const ErrJWTExpired = errors.new("jwt expired")

// --- ZOD SCHEMAS (Existing + New) ---

// --- Base & Auth Schemas (Existing) ---
const TokenResponseSchema = z.object({
	access_token: z.string().min(1)
})

// --- Process Response Schemas (New) ---
const ProcessResponseInputSchema = z.object({
	responseIdentifier: z.string(),
	value: z.union([z.string(), z.number(), z.array(z.unknown()), z.record(z.string(), z.unknown())])
})

const ProcessResponseResultSchema = z.object({
	score: z.number(),
	feedback: z
		.object({
			identifier: z.string(),
			value: z.string()
		})
		.optional()
})

// API Request schema - what the API actually expects
const ProcessResponseApiRequestSchema = z.object({
	identifier: z.string(),
	response: z.union([z.string(), z.array(z.string()), z.record(z.string(), z.string())])
})

export type ProcessResponseInput = z.infer<typeof ProcessResponseInputSchema>
export type ProcessResponseResult = z.infer<typeof ProcessResponseResultSchema>

// --- Stimulus Schemas (New) ---

/**
 * Schema for a single stimulus entity.
 * A stimulus provides context (e.g., a reading passage, image, video) for one or more assessment items.
 */
const StimulusSchema = z.object({
	identifier: z.string(),
	title: z.string(),
	label: z.string().optional(),
	language: z.string().optional(),
	stylesheet: z
		.object({
			href: z.string(),
			type: z.string()
		})
		.optional(),
	catalogInfo: z
		.array(
			z.object({
				id: z.string(),
				support: z.string(),
				content: z.string()
			})
		)
		.optional(),
	toolName: z.string().optional(),
	toolVersion: z.string().optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	rawXml: z.string(),
	content: z.record(z.string(), z.any()),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
})
export type Stimulus = z.infer<typeof StimulusSchema>

/**
 * Input for creating a stimulus. Can be provided as structured JSON or raw XML.
 */
const CreateStimulusInputSchema = z.object({
	identifier: z.string(),
	title: z.string(),
	content: z.string(),
	label: z.string().optional(),
	language: z.string().optional(),
	stylesheet: z
		.object({
			href: z.string(),
			type: z.string()
		})
		.optional(),
	catalogInfo: z
		.array(
			z.object({
				id: z.string(),
				support: z.string(),
				content: z.string()
			})
		)
		.optional(),
	toolName: z.string().optional(),
	toolVersion: z.string().optional(),
	metadata: z.record(z.string(), z.any()).optional()
})
export type CreateStimulusInput = z.infer<typeof CreateStimulusInputSchema>

/**
 * Input for updating a stimulus. The identifier is provided in the URL, and the body contains the fields to update.
 */
export type UpdateStimulusInput = CreateStimulusInput

/**
 * Input for searching for stimuli.
 */
const SearchStimuliInputSchema = z.object({
	limit: z.number().int().positive().optional().default(10),
	page: z.number().int().positive().optional().default(1),
	query: z.string().optional(),
	sort: z.enum(["title", "identifier", "createdAt", "updatedAt"]).optional(),
	order: z.enum(["asc", "desc"]).optional()
})
export type SearchStimuliInput = z.infer<typeof SearchStimuliInputSchema>

/**
 * Response schema for a search stimuli request, including pagination details.
 */
const SearchStimuliResponseSchema = z.object({
	items: z.array(StimulusSchema),
	total: z.number(),
	page: z.number(),
	pages: z.number(),
	limit: z.number()
})
export type SearchStimuliResponse = z.infer<typeof SearchStimuliResponseSchema>

// --- Assessment Item Schemas (Existing - Unchanged) ---
const ResponseDeclarationSchema = z.object({
	identifier: z.string(),
	cardinality: z.enum(["single", "multiple", "ordered", "record"]),
	baseType: z
		.enum([
			"identifier",
			"boolean",
			"integer",
			"float",
			"string",
			"point",
			"pair",
			"directedPair",
			"duration",
			"file",
			"uri"
		])
		.optional(),
	correctResponse: z
		.object({
			value: z.array(z.string())
		})
		.optional()
})

const OutcomeDeclarationSchema = z.object({
	identifier: z.string(),
	cardinality: z.enum(["single", "multiple", "ordered", "record"]),
	baseType: z
		.enum([
			"identifier",
			"boolean",
			"integer",
			"float",
			"string",
			"point",
			"pair",
			"directedPair",
			"duration",
			"file",
			"uri"
		])
		.optional()
})

const AssessmentItemSchema = z.object({
	identifier: z.string(),
	title: z.string(),
	// WORKAROUND: Added "gap-match" to handle a value returned by the live API
	// that is not present in its official OpenAPI specification. A bug report
	// has been filed with the QTI service provider. This is a temporary client-side
	// mitigation to prevent our SDK from crashing on their invalid responses.
	type: z.enum([
		"choice",
		"text-entry",
		"extended-text",
		"inline-choice",
		"match",
		"order",
		"associate",
		"select-point",
		"graphic-order",
		"graphic-associate",
		"graphic-gap-match",
		"hotspot",
		"hottext",
		"slider",
		"drawing",
		"media",
		"upload",
		"gap-match" // Add the undocumented type here
	]),
	qtiVersion: z.string(),
	timeDependent: z.boolean(),
	adaptive: z.boolean(),
	responseDeclarations: z.array(ResponseDeclarationSchema).optional(),
	outcomeDeclarations: z.array(OutcomeDeclarationSchema).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	rawXml: z.string(),
	content: z.record(z.string(), z.any()),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime()
})
export type AssessmentItem = z.infer<typeof AssessmentItemSchema>

const SearchResponseSchema = z.object({
	items: z.array(AssessmentItemSchema),
	total: z.number(),
	page: z.number(),
	pages: z.number(),
	limit: z.number()
})
export type SearchAssessmentItemsResponse = z.infer<typeof SearchResponseSchema>

const CreateItemInputSchema = z.object({
	xml: z.string().min(1, { message: "XML content cannot be empty" }),
	metadata: z.record(z.string(), z.any()).optional()
})
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>

const UpdateItemInputSchema = z.object({
	identifier: z.string().min(1),
	xml: z.string().min(1),
	metadata: z.record(z.string(), z.any()).optional()
})
export type UpdateItemInput = z.infer<typeof UpdateItemInputSchema>

const SearchItemsInputSchema = z.object({
	limit: z.number().int().positive().optional().default(10),
	page: z.number().int().positive().optional().default(1),
	query: z.string().optional(),
	sort: z.enum(["title", "identifier", "createdAt", "updatedAt"]).optional(),
	order: z.enum(["asc", "desc"]).optional()
})
export type SearchItemsInput = z.infer<typeof SearchItemsInputSchema>

// --- Assessment Test Schemas (New) ---

/**
 * Schema for an assessment test, the top-level container for a test.
 * This schema is used for responses from the API only.
 */
const AssessmentTestSchema = z.object({
	identifier: z.string(),
	title: z.string(),
	qtiVersion: z.string(),
	"qti-test-part": z.array(z.any()), // We no longer need the detailed schema since we're working with XML
	"qti-outcome-declaration": z.array(OutcomeDeclarationSchema).optional(),
	timeLimit: z.number().optional(),
	maxAttempts: z.number().optional(),
	toolsEnabled: z.record(z.string(), z.boolean()).optional(),
	metadata: z.record(z.string(), z.any()).optional(),
	rawXml: z.string(),
	content: z.record(z.string(), z.any()),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	isValidXml: z.boolean().optional()
})
export type AssessmentTest = z.infer<typeof AssessmentTestSchema>

/**
 * Input for creating an Assessment Test.
 */
const CreateAssessmentTestInputSchema = z.string().min(1, { message: "XML content cannot be empty" })
export type CreateAssessmentTestInput = z.infer<typeof CreateAssessmentTestInputSchema>

/**
 * Input for updating an Assessment Test.
 */
export type UpdateAssessmentTestInput = z.infer<typeof CreateAssessmentTestInputSchema>

/**
 * Input for searching for assessment tests.
 */
const SearchAssessmentTestsInputSchema = SearchItemsInputSchema.extend({
	navigationMode: z.enum(["linear", "nonlinear"]).optional(),
	submissionMode: z.enum(["individual", "simultaneous"]).optional()
})
export type SearchAssessmentTestsInput = z.infer<typeof SearchAssessmentTestsInputSchema>

/**
 * Response schema for a search assessment tests request, including pagination.
 */
const SearchAssessmentTestsResponseSchema = z.object({
	items: z.array(AssessmentTestSchema),
	total: z.number(),
	page: z.number(),
	pages: z.number(),
	limit: z.number()
})
export type SearchAssessmentTestsResponse = z.infer<typeof SearchAssessmentTestsResponseSchema>

/**
 * Schema for response when fetching all questions for a test.
 */
const TestQuestionsResponseSchema = z.object({
	assessmentTest: z.string(),
	title: z.string(),
	totalQuestions: z.number(),
	questions: z.array(
		z.object({
			reference: z.object({
				identifier: z.string(),
				href: z.string(),
				testPart: z.string(),
				section: z.string()
			}),
			question: AssessmentItemSchema
		})
	)
})
export type TestQuestionsResponse = z.infer<typeof TestQuestionsResponseSchema>

// --- Validation Schemas (New) ---

/**
 * Input for validating a QTI XML string.
 * You must provide a schema type and either the raw XML content or the ID of an existing entity.
 */
export const ValidateXmlInputSchema = z
	.object({
		xml: z.string().optional(),
		schema: z.enum(["test", "item", "stimulus"]),
		entityId: z.string().optional()
	})
	.refine((data) => data.xml || data.entityId, {
		message: "Either 'xml' or 'entityId' must be provided for validation."
	})
export type ValidateXmlInput = z.infer<typeof ValidateXmlInputSchema>

/**
 * Response from the QTI XML validation endpoint.
 */
const ValidateXmlRawResponseSchema = z.object({
	success: z.enum(["true", "false"]),
	entityId: z.string(),
	xmlContent: z.string(),
	validationErrors: z.array(z.string()),
	message: z.string()
})

export const ValidateXmlResponseSchema = ValidateXmlRawResponseSchema.transform((data) => ({
	...data,
	success: data.success === "true"
}))

export type ValidateXmlResponse = z.infer<typeof ValidateXmlResponseSchema>

// --- API CLIENT CONFIG TYPE ---
type ApiClientConfig = {
	serverUrl: string
	tokenUrl: string
	clientId: string
	clientSecret: string
}

/**
 * Client for interacting with the QTI API.
 * Manages OAuth2 authentication and provides methods for all assessment item operations.
 */
export class Client {
	#accessToken: string | null = null
	#config: ApiClientConfig

	constructor(config: ApiClientConfig) {
		this.#config = config
		logger.debug("qti client: initializing with provided configuration")
	}

	/**
	 * Ensures we have a valid access token, fetching one if needed.
	 * @private
	 */
	async #ensureAccessToken(): Promise<void> {
		if (this.#accessToken) {
			return
		}

		this.#accessToken = await this.#getAccessToken()
	}

	/**
	 * Fetches a new OAuth2 access token from the configured token URL.
	 * @private
	 * @returns {Promise<string>} The access token.
	 */
	async #getAccessToken(): Promise<string> {
		logger.debug("qti client: fetching access token")

		const tokenBody = new URLSearchParams({
			grant_type: "client_credentials",
			client_id: this.#config.clientId,
			client_secret: this.#config.clientSecret
		})

		const result = await errors.try(
			fetch(this.#config.tokenUrl, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: tokenBody
			})
		)
		if (result.error) {
			logger.error("qti auth: token fetch failed", { error: result.error })
			throw errors.wrap(result.error, "qti token fetch")
		}

		if (!result.data.ok) {
			const errorBody = await result.data.text()
			logger.error("qti auth: token request rejected", { status: result.data.status, body: errorBody })
			throw errors.new(`qti token request failed with status ${result.data.status}`)
		}

		const jsonResult = await errors.try(result.data.json())
		if (jsonResult.error) {
			logger.error("qti auth: failed to parse token response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "qti token response parsing")
		}

		const validation = TokenResponseSchema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("qti auth: invalid token response schema", { error: validation.error })
			throw errors.wrap(validation.error, "qti token response validation")
		}

		logger.info("qti client: access token acquired")
		return validation.data.access_token
	}

	/**
	 * A generic, private helper method to make authenticated requests to the QTI API.
	 * It handles token management, request execution, and response validation.
	 * @private
	 * @param {string} endpoint - The API endpoint to request (e.g., "/assessment-items").
	 * @param {RequestInit} options - The standard `fetch` options (method, headers, body).
	 * @param {z.ZodType<T>} schema - The Zod schema to validate the response.
	 * @returns {Promise<T>} The validated response data.
	 */
	async #request<T>(endpoint: string, options: RequestInit, schema: z.ZodType<T>): Promise<T> {
		await this.#ensureAccessToken()

		const url = `${this.#config.serverUrl}${endpoint}`
		const headers = {
			...options.headers,
			Authorization: `Bearer ${this.#accessToken}`
		}

		const fetchResult = await errors.try(fetch(url, { ...options, headers }))
		if (fetchResult.error) {
			logger.error("qti api request failed", { error: fetchResult.error, endpoint })
			throw errors.wrap(fetchResult.error, "qti api request")
		}

		const response = fetchResult.data
		if (!response.ok) {
			const errorBody = await response.text()
			logger.error("qti api returned non-ok status", { q: response.status, body: errorBody, endpoint })

			// Check for JWT expiration
			let isJwtExpired = false
			if (response.status === 401) {
				// Try to parse as JSON first
				const jsonParseResult = errors.trySync(() => JSON.parse(errorBody))
				if (!jsonParseResult.error) {
					// Check various possible JWT expiration fields
					const data = jsonParseResult.data
					isJwtExpired =
						data?.imsx_description?.toLowerCase().includes("jwt expired") ||
						data?.error?.toLowerCase().includes("jwt expired") ||
						data?.message?.toLowerCase().includes("jwt expired") ||
						JSON.stringify(data).toLowerCase().includes("jwt expired")
				} else {
					// Fallback to simple text search if not valid JSON
					isJwtExpired = errorBody.toLowerCase().includes("jwt expired")
				}
			}

			if (isJwtExpired) {
				logger.info("qti auth: jwt expired, attempting to refresh token", { endpoint })
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
					logger.error("qti api request failed after token refresh", { error: retryResult.error, endpoint })
					throw errors.wrap(retryResult.error, "qti api request after token refresh")
				}
				const retryResponse = retryResult.data
				if (!retryResponse.ok) {
					const retryErrorBody = await retryResponse.text()
					logger.error("qti api returned non-ok status after token refresh", {
						status: retryResponse.status,
						body: retryErrorBody,
						endpoint
					})
					throw errors.wrap(ErrJWTExpired, `qti jwt refresh failed: status ${retryResponse.status} on ${endpoint}`)
				}
				// Process successful retry response
				if (retryResponse.status === 204) {
					return schema.parse(null)
				}
				const retryJsonResult = await errors.try(retryResponse.json())
				if (retryJsonResult.error) {
					logger.error("qti api: failed to parse json response after token refresh", {
						error: retryJsonResult.error,
						endpoint
					})
					throw errors.wrap(retryJsonResult.error, "qti api response parsing after token refresh")
				}
				logger.debug("qti api: raw response after token refresh", { endpoint, response: retryJsonResult.data })
				const retryValidation = schema.safeParse(retryJsonResult.data)
				if (!retryValidation.success) {
					logger.error("qti api: invalid response schema after token refresh", {
						error: retryValidation.error,
						endpoint,
						rawResponse: retryJsonResult.data
					})
					throw errors.wrap(retryValidation.error, "qti api response validation after token refresh")
				}
				return retryValidation.data
			}

			// NEW: Throw specific, exported errors based on status code
			if (response.status === 404) {
				throw errors.wrap(ErrQtiNotFound, `qti api error: status 404 on ${endpoint}`)
			}
			if (response.status === 422) {
				throw errors.wrap(ErrQtiUnprocessable, `qti api error: status 422 on ${endpoint}: ${errorBody}`)
			}
			if (response.status === 500) {
				throw errors.wrap(ErrQtiInternalServerError, `qti api error: status 500 on ${endpoint}: ${errorBody}`)
			}
			if (response.status === 409) {
				throw errors.wrap(ErrQtiConflict, `qti api error: status 409 on ${endpoint}`)
			}

			throw errors.new(`qti api error: status ${response.status} on ${endpoint}`)
		}

		// Handle 204 No Content for DELETE requests
		if (response.status === 204) {
			return schema.parse(null)
		}

		const jsonResult = await errors.try(response.json())
		if (jsonResult.error) {
			logger.error("qti api: failed to parse json response", { error: jsonResult.error, endpoint })
			throw errors.wrap(jsonResult.error, "qti api response parsing")
		}

		// Log the raw response for debugging
		logger.debug("qti api: raw response", { endpoint, response: jsonResult.data })

		const validation = schema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("qti api: invalid response schema", {
				error: validation.error,
				endpoint,
				rawResponse: jsonResult.data
			})
			throw errors.wrap(validation.error, "qti api response validation")
		}

		return validation.data
	}

	/**
	 * Generic helper method to create entities with consistent validation and request handling
	 */
	async #createEntity<T extends z.ZodType, U, R>(
		entityName: "stimulus" | "assessmentItem" | "assessmentTest" | "testPart" | "section",
		endpoint: string,
		input: U,
		inputSchema: T,
		responseSchema: z.ZodType<R>,
		transformPayload?: (validatedData: z.infer<T>) => unknown
	): Promise<R> {
		const validationResult = inputSchema.safeParse(input)
		if (!validationResult.success) {
			logger.error("qti client: invalid input for creating entity", {
				entityName,
				error: validationResult.error,
				input
			})
			throw errors.wrap(validationResult.error, `invalid input for ${entityName}`)
		}

		const payload = transformPayload ? transformPayload(validationResult.data) : { [entityName]: validationResult.data }

		return this.#request(
			endpoint,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			},
			responseSchema
		)
	}

	/**
	 * Generic helper method to update entities with consistent validation and request handling
	 */
	async #updateEntity<T extends z.ZodType, U, R>(
		entityName: string,
		endpoint: string,
		input: U,
		inputSchema: T,
		responseSchema: z.ZodType<R>,
		transformPayload?: (validatedData: z.infer<T>) => unknown
	): Promise<R> {
		const validationResult = inputSchema.safeParse(input)
		if (!validationResult.success) {
			logger.error("qti client: invalid input for updating entity", {
				entityName,
				error: validationResult.error,
				input
			})
			throw errors.wrap(validationResult.error, `invalid input for ${entityName}`)
		}

		const payload = transformPayload ? transformPayload(validationResult.data) : { [entityName]: validationResult.data }

		return this.#request(
			endpoint,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			},
			responseSchema
		)
	}

	// --- Stimulus Management Methods (New) ---

	/**
	 * Creates a new stimulus.
	 * @param {CreateStimulusInput} input - The stimulus data to create.
	 * @returns {Promise<Stimulus>} The created stimulus object.
	 */
	async createStimulus(input: CreateStimulusInput): Promise<Stimulus> {
		logger.info("qti client: creating stimulus", { identifier: input.identifier })
		return this.#createEntity(
			"stimulus",
			"/stimuli",
			input,
			CreateStimulusInputSchema,
			StimulusSchema,
			(data) => data // No transformation needed, send data directly
		)
	}

	/**
	 * Retrieves a specific stimulus by its identifier.
	 * @param {string} identifier - The unique identifier of the stimulus.
	 * @returns {Promise<Stimulus>} The stimulus object.
	 */
	async getStimulus(identifier: string): Promise<Stimulus> {
		logger.info("qti client: getting stimulus", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for getStimulus")
		}
		return this.#request(`/stimuli/${identifier}`, { method: "GET" }, StimulusSchema)
	}

	/**
	 * Updates an existing stimulus.
	 * @param {string} identifier - The identifier of the stimulus to update.
	 * @param {UpdateStimulusInput} input - The new stimulus data.
	 * @returns {Promise<Stimulus>} The updated stimulus object.
	 */
	async updateStimulus(identifier: string, input: UpdateStimulusInput): Promise<Stimulus> {
		logger.info("qti client: updating stimulus", { identifier })
		const validation = CreateStimulusInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for updateStimulus", { error: validation.error })
			throw errors.wrap(validation.error, "updateStimulus input validation")
		}
		return this.#request(
			`/stimuli/${identifier}`,
			{ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) },
			StimulusSchema
		)
	}

	/**
	 * Deletes a stimulus.
	 * @param {string} identifier - The identifier of the stimulus to delete.
	 * @returns {Promise<void>}
	 */
	async deleteStimulus(identifier: string): Promise<void> {
		logger.info("qti client: deleting stimulus", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for deleteStimulus")
		}
		await this.#request(`/stimuli/${identifier}`, { method: "DELETE" }, z.null())
	}

	/**
	 * Searches for stimuli based on a set of criteria.
	 * @param {SearchStimuliInput} input - The search, pagination, and sorting parameters.
	 * @returns {Promise<SearchStimuliResponse>} A paginated list of stimuli.
	 */
	async searchStimuli(input: SearchStimuliInput): Promise<SearchStimuliResponse> {
		logger.info("qti client: searching stimuli", { input })
		const validation = SearchStimuliInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for searchStimuli", { error: validation.error })
			throw errors.wrap(validation.error, "searchStimuli input validation")
		}
		const params = new URLSearchParams()
		for (const [key, value] of Object.entries(validation.data)) {
			if (value !== undefined) {
				params.append(key, String(value))
			}
		}
		const endpoint = `/stimuli?${params.toString()}`
		return this.#request(endpoint, { method: "GET" }, SearchStimuliResponseSchema)
	}

	// --- Assessment Item Management Methods (Existing) ---
	async createAssessmentItem(input: CreateItemInput): Promise<AssessmentItem> {
		logger.info("qti client: creating assessment item")
		return this.#createEntity(
			"assessmentItem",
			"/assessment-items",
			input,
			CreateItemInputSchema,
			AssessmentItemSchema,
			(data) => ({
				format: "xml",
				xml: data.xml,
				metadata: data.metadata
			})
		)
	}

	async getAssessmentItem(identifier: string): Promise<AssessmentItem> {
		logger.info("qti client: getting assessment item", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for getAssessmentItem")
		}
		return this.#request(`/assessment-items/${identifier}`, { method: "GET" }, AssessmentItemSchema)
	}

	async updateAssessmentItem(input: UpdateItemInput): Promise<AssessmentItem> {
		logger.info("qti client: updating assessment item", { identifier: input.identifier })
		const validation = UpdateItemInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for updateAssessmentItem", { error: validation.error })
			throw errors.wrap(validation.error, "updateAssessmentItem input validation")
		}
		const { identifier, xml, metadata } = validation.data

		// The API requires a JSON payload specifying the format is "xml", similar to create
		const payload = {
			format: "xml",
			xml: xml,
			metadata: metadata
		}

		return this.#request(
			`/assessment-items/${identifier}`,
			{ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
			AssessmentItemSchema
		)
	}

	async deleteAssessmentItem(identifier: string): Promise<void> {
		logger.info("qti client: deleting assessment item", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for deleteAssessmentItem")
		}
		// The helper will return `null` on 204, which we can ignore.
		await this.#request(`/assessment-items/${identifier}`, { method: "DELETE" }, z.null())
	}

	async searchAssessmentItems(input: SearchItemsInput): Promise<SearchAssessmentItemsResponse> {
		logger.info("qti client: searching assessment items", { input })
		const validation = SearchItemsInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for searchAssessmentItems", { error: validation.error })
			throw errors.wrap(validation.error, "searchAssessmentItems input validation")
		}

		const params = new URLSearchParams()
		for (const [key, value] of Object.entries(validation.data)) {
			if (value !== undefined) {
				params.append(key, String(value))
			}
		}

		const endpoint = `/assessment-items?${params.toString()}`
		return this.#request(endpoint, { method: "GET" }, SearchResponseSchema)
	}

	// --- Assessment Test Management Methods (New) ---

	/**
	 * Creates a new assessment test from a raw XML payload.
	 * @param {string} xml - The raw QTI XML string for the assessment test.
	 * @returns {Promise<AssessmentTest>} The created assessment test object.
	 */
	async createAssessmentTest(xml: CreateAssessmentTestInput): Promise<AssessmentTest> {
		const validationResult = CreateAssessmentTestInputSchema.safeParse(xml)
		if (!validationResult.success) {
			logger.error("qti client: invalid input for createAssessmentTest", { error: validationResult.error })
			throw errors.wrap(validationResult.error, "createAssessmentTest input validation")
		}

		logger.info("qti client: creating assessment test from XML")
		return this.#request(
			"/assessment-tests",
			{
				method: "POST",
				headers: { "Content-Type": "application/xml" },
				body: validationResult.data
			},
			AssessmentTestSchema
		)
	}

	/**
	 * Retrieves a specific assessment test by its identifier.
	 * @param {string} identifier - The unique identifier of the test.
	 * @returns {Promise<AssessmentTest>} The assessment test object.
	 */
	async getAssessmentTest(identifier: string): Promise<AssessmentTest> {
		logger.info("qti client: getting assessment test", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for getAssessmentTest")
		}
		return this.#request(`/assessment-tests/${identifier}`, { method: "GET" }, AssessmentTestSchema)
	}

	/**
	 * Updates an existing assessment test from a raw XML payload.
	 * @param {string} identifier - The identifier of the test to update.
	 * @param {string} xml - The new raw QTI XML for the assessment test.
	 * @returns {Promise<AssessmentTest>} The updated assessment test object.
	 */
	async updateAssessmentTest(identifier: string, xml: UpdateAssessmentTestInput): Promise<AssessmentTest> {
		const validationResult = CreateAssessmentTestInputSchema.safeParse(xml)
		if (!validationResult.success) {
			logger.error("qti client: invalid input for updateAssessmentTest", { error: validationResult.error })
			throw errors.wrap(validationResult.error, "updateAssessmentTest input validation")
		}
		logger.info("qti client: updating assessment test from XML", { identifier })
		return this.#request(
			`/assessment-tests/${identifier}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/xml" },
				body: validationResult.data
			},
			AssessmentTestSchema
		)
	}

	/**
	 * Deletes an assessment test.
	 * @param {string} identifier - The identifier of the test to delete.
	 * @returns {Promise<void>}
	 */
	async deleteAssessmentTest(identifier: string): Promise<void> {
		logger.info("qti client: deleting assessment test", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for deleteAssessmentTest")
		}
		await this.#request(`/assessment-tests/${identifier}`, { method: "DELETE" }, z.null())
	}

	/**
	 * Searches for assessment tests based on a set of criteria.
	 * @param {SearchAssessmentTestsInput} input - The search, pagination, and sorting parameters.
	 * @returns {Promise<SearchAssessmentTestsResponse>} A paginated list of tests.
	 */
	async searchAssessmentTests(input: SearchAssessmentTestsInput): Promise<SearchAssessmentTestsResponse> {
		logger.info("qti client: searching assessment tests", { input })
		const validation = SearchAssessmentTestsInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for searchAssessmentTests", { error: validation.error })
			throw errors.wrap(validation.error, "searchAssessmentTests input validation")
		}
		const params = new URLSearchParams()
		for (const [key, value] of Object.entries(validation.data)) {
			if (value !== undefined) {
				params.append(key, String(value))
			}
		}
		const endpoint = `/assessment-tests?${params.toString()}`
		return this.#request(endpoint, { method: "GET" }, SearchAssessmentTestsResponseSchema)
	}

	/**
	 * Retrieves all questions referenced within a given assessment test.
	 * @param {string} identifier - The identifier of the assessment test.
	 * @returns {Promise<TestQuestionsResponse>} An object containing all questions and their context.
	 */
	async getAllQuestionsForTest(identifier: string): Promise<TestQuestionsResponse> {
		logger.info("qti client: getting all questions for test", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for getAllQuestionsForTest")
		}
		const endpoint = `/assessment-tests/${identifier}/questions`
		return this.#request(endpoint, { method: "GET" }, TestQuestionsResponseSchema)
	}

	/**
	 * Processes a user's response for a given assessment item and returns the result.
	 * @param {string} identifier - The unique identifier of the assessment item.
	 * @param {ProcessResponseInput} input - The user's response data.
	 * @returns {Promise<ProcessResponseResult>} The result of the response processing.
	 */
	async processResponse(identifier: string, input: ProcessResponseInput): Promise<ProcessResponseResult> {
		logger.info("qti client: processing response", { identifier })
		const validation = ProcessResponseInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "processResponse input validation")
		}

		const { responseIdentifier, value } = validation.data

		let responsePayload: string | string[] | Record<string, string>

		if (typeof value === "object" && !Array.isArray(value) && value !== null) {
			// It's a record for multi-input, convert all values to string
			responsePayload = Object.fromEntries(Object.entries(value).map(([key, val]) => [key, String(val)]))
		} else if (Array.isArray(value)) {
			// It's an array for ordered questions
			responsePayload = value.map(String)
		} else {
			// It's a single value
			responsePayload = String(value)
		}

		const apiRequest = {
			identifier: responseIdentifier,
			response: responsePayload
		}

		// Add detailed logging to debug the issue
		logger.debug("qti client: prepared api request", {
			identifier,
			responseIdentifier,
			originalValue: value,
			responsePayload,
			apiRequest
		})

		// Validate the transformed request
		const apiValidation = ProcessResponseApiRequestSchema.safeParse(apiRequest)
		if (!apiValidation.success) {
			throw errors.wrap(apiValidation.error, "processResponse api request validation")
		}

		const endpoint = `/assessment-items/${identifier}/process-response`
		return this.#request(
			endpoint,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(apiValidation.data)
			},
			ProcessResponseResultSchema
		)
	}

	// --- Validation Methods (New) ---

	/**
	 * Validates a QTI XML string against the corresponding XSD specification.
	 * You can provide the XML directly or reference an existing entity by its ID.
	 * @param {ValidateXmlInput} input - The validation input, containing the schema type and either XML content or an entity ID.
	 * @returns {Promise<ValidateXmlResponse>} The validation result.
	 */
	async validateXml(input: ValidateXmlInput): Promise<ValidateXmlResponse> {
		logger.info("qti client: validating xml", { schema: input.schema, entityId: input.entityId })
		const validation = ValidateXmlInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "validateXml input validation")
		}

		const endpoint = "/validate"
		const rawResponse = await this.#request(
			endpoint,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			ValidateXmlRawResponseSchema
		)

		// Transform the raw response to convert success string to boolean
		return {
			...rawResponse,
			success: rawResponse.success === "true"
		}
	}
}
