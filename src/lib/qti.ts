import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { env } from "@/env"

// --- NEW: EXPORTED QTI API ERRORS ---
export const ErrQtiNotFound = errors.new("qti resource not found")
export const ErrQtiUnprocessable = errors.new("qti request unprocessable/invalid")
export const ErrQtiConflict = errors.new("qti resource conflict")
export const ErrQtiInternalServerError = errors.new("qti internal server error")

// --- ZOD SCHEMAS (Existing + New) ---

// --- Base & Auth Schemas (Existing) ---
const TokenResponseSchema = z.object({
	access_token: z.string().min(1)
})

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
	metadata: z.record(z.any()).optional(),
	rawXml: z.string(),
	content: z.record(z.any()),
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
	metadata: z.record(z.any()).optional()
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
	metadata: z.record(z.any()).optional(),
	rawXml: z.string(),
	content: z.record(z.any()),
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
	xml: z.string().min(1, { message: "XML content cannot be empty" })
})
export type CreateItemInput = z.infer<typeof CreateItemInputSchema>

const UpdateItemInputSchema = z.object({
	identifier: z.string().min(1),
	xml: z.string().min(1)
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
 * Schema for a reference to an assessment item within a section.
 */
const AssessmentItemRefSchema = z.object({
	identifier: z.string(),
	href: z.string().optional(),
	sequence: z.number().optional()
})
export type AssessmentItemRef = z.infer<typeof AssessmentItemRefSchema>

/**
 * Schema for an assessment section. Sections group assessment items within a test part.
 */
const AssessmentSectionSchema = z.object({
	identifier: z.string(),
	title: z.string(),
	visible: z.boolean(),
	required: z.boolean().optional(),
	fixed: z.boolean().optional(),
	sequence: z.number().optional(),
	"qti-assessment-item-ref": z.array(AssessmentItemRefSchema).optional()
})
export type AssessmentSection = z.infer<typeof AssessmentSectionSchema>

/**
 * Schema for a test part. Test parts group sections and define navigation/submission rules.
 */
const TestPartSchema = z.object({
	identifier: z.string(),
	navigationMode: z.enum(["linear", "nonlinear"]),
	submissionMode: z.enum(["individual", "simultaneous"]),
	"qti-assessment-section": z.array(AssessmentSectionSchema)
})
export type TestPart = z.infer<typeof TestPartSchema>

/**
 * Schema for an assessment test, the top-level container for a test.
 */
const AssessmentTestSchema = z.object({
	identifier: z.string(),
	title: z.string(),
	qtiVersion: z.string(),
	"qti-test-part": z.array(TestPartSchema),
	"qti-outcome-declaration": z.array(OutcomeDeclarationSchema).optional(),
	timeLimit: z.number().optional(),
	maxAttempts: z.number().optional(),
	toolsEnabled: z.record(z.boolean()).optional(),
	metadata: z.record(z.any()).optional(),
	rawXml: z.string(),
	content: z.record(z.any()),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	isValidXml: z.boolean().optional()
})
export type AssessmentTest = z.infer<typeof AssessmentTestSchema>

/**
 * Input for creating an Assessment Test.
 */
const CreateAssessmentTestInputSchema = z.object({
	identifier: z.string(),
	title: z.string(),
	"qti-test-part": z.array(TestPartSchema),
	"qti-outcome-declaration": z.array(OutcomeDeclarationSchema).optional()
})
export type CreateAssessmentTestInput = z.infer<typeof CreateAssessmentTestInputSchema>

/**
 * Input for updating an Assessment Test.
 */
export type UpdateAssessmentTestInput = CreateAssessmentTestInput

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

/**
 * Input for updating only the metadata of an assessment test.
 */
const UpdateAssessmentTestMetadataInputSchema = z.object({
	metadata: z.record(z.any())
})
export type UpdateAssessmentTestMetadataInput = z.infer<typeof UpdateAssessmentTestMetadataInputSchema>

/**
 * Input for creating a new test part.
 */
export type CreateTestPartInput = TestPart

/**
 * Input for creating a new section.
 */
export type CreateSectionInput = AssessmentSection

/**
 * Input for adding an item reference to a section.
 */
const AddItemToSectionInputSchema = AssessmentItemRefSchema.pick({ identifier: true, href: true, sequence: true })
export type AddItemToSectionInput = z.infer<typeof AddItemToSectionInputSchema>

/**
 * Input for reordering items within a section.
 */
const ReorderSectionItemsInputSchema = z.object({
	items: z.array(AssessmentItemRefSchema.pick({ identifier: true, sequence: true }))
})
export type ReorderSectionItemsInput = z.infer<typeof ReorderSectionItemsInputSchema>

/**
 * Client for interacting with the QTI API.
 * Manages OAuth2 authentication and provides methods for all assessment item operations.
 */
export class QtiApiClient {
	#accessToken: string | null = null

	constructor() {
		logger.debug("qti client: initializing with environment configuration", {
			clientId: env.TIMEBACK_CLIENT_ID,
			tokenUrl: env.TIMEBACK_TOKEN_URL,
			qtiServerUrl: env.TIMEBACK_QTI_SERVER_URL,
			hasClientSecret: !!env.TIMEBACK_CLIENT_SECRET
		})
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
			client_id: env.TIMEBACK_CLIENT_ID,
			client_secret: env.TIMEBACK_CLIENT_SECRET
		})

		const result = await errors.try(
			fetch(env.TIMEBACK_TOKEN_URL, {
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

		const url = `${env.TIMEBACK_QTI_SERVER_URL}${endpoint}`
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
			logger.error("qti api returned non-ok status", { status: response.status, body: errorBody, endpoint })

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
			// For DELETE requests, we return an empty object that will pass validation
			// The schema for DELETE should be z.null() or similar
			return schema.parse(null)
		}

		const jsonResult = await errors.try(response.json())
		if (jsonResult.error) {
			logger.error("qti api: failed to parse json response", { error: jsonResult.error, endpoint })
			throw errors.wrap(jsonResult.error, `qti api response parsing for ${endpoint}`)
		}

		const validation = schema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("qti api: invalid response schema", { error: validation.error, endpoint })
			throw errors.wrap(validation.error, `qti api response validation for ${endpoint}`)
		}

		return validation.data
	}

	// --- Stimulus Management Methods (New) ---

	/**
	 * Creates a new stimulus.
	 * @param {CreateStimulusInput} input - The stimulus data to create.
	 * @returns {Promise<Stimulus>} The created stimulus object.
	 */
	public async createStimulus(input: CreateStimulusInput): Promise<Stimulus> {
		logger.info("qti client: creating stimulus", { identifier: input.identifier })
		const validation = CreateStimulusInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for createStimulus", { error: validation.error })
			throw errors.wrap(validation.error, "createStimulus input validation")
		}
		return this.#request<Stimulus>(
			"/stimuli",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			StimulusSchema
		)
	}

	/**
	 * Retrieves a specific stimulus by its identifier.
	 * @param {string} identifier - The unique identifier of the stimulus.
	 * @returns {Promise<Stimulus>} The stimulus object.
	 */
	public async getStimulus(identifier: string): Promise<Stimulus> {
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
	public async updateStimulus(identifier: string, input: UpdateStimulusInput): Promise<Stimulus> {
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
	public async deleteStimulus(identifier: string): Promise<void> {
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
	public async searchStimuli(input: SearchStimuliInput): Promise<SearchStimuliResponse> {
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
	public async createAssessmentItem(input: CreateItemInput): Promise<AssessmentItem> {
		logger.info("qti client: creating assessment item")
		const validation = CreateItemInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for createAssessmentItem", { error: validation.error })
			throw errors.wrap(validation.error, "createAssessmentItem input validation")
		}

		// The API requires a JSON payload specifying the format is "xml".
		const payload = {
			format: "xml",
			xml: validation.data.xml
		}

		return this.#request<AssessmentItem>(
			"/assessment-items",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			},
			AssessmentItemSchema
		)
	}

	public async getAssessmentItem(identifier: string): Promise<AssessmentItem> {
		logger.info("qti client: getting assessment item", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for getAssessmentItem")
		}
		return this.#request(`/assessment-items/${identifier}`, { method: "GET" }, AssessmentItemSchema)
	}

	public async updateAssessmentItem(input: UpdateItemInput): Promise<AssessmentItem> {
		logger.info("qti client: updating assessment item", { identifier: input.identifier })
		const validation = UpdateItemInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for updateAssessmentItem", { error: validation.error })
			throw errors.wrap(validation.error, "updateAssessmentItem input validation")
		}
		const { identifier, xml } = validation.data

		// The API requires a JSON payload specifying the format is "xml", similar to create
		const payload = {
			format: "xml",
			xml: xml
		}

		return this.#request(
			`/assessment-items/${identifier}`,
			{ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
			AssessmentItemSchema
		)
	}

	public async deleteAssessmentItem(identifier: string): Promise<void> {
		logger.info("qti client: deleting assessment item", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for deleteAssessmentItem")
		}
		// The helper will return `null` on 204, which we can ignore.
		await this.#request(`/assessment-items/${identifier}`, { method: "DELETE" }, z.null())
	}

	public async searchAssessmentItems(input: SearchItemsInput): Promise<SearchAssessmentItemsResponse> {
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
	 * Creates a new assessment test.
	 * @param {CreateAssessmentTestInput} input - The test data, including parts and sections.
	 * @returns {Promise<AssessmentTest>} The created assessment test object.
	 */
	public async createAssessmentTest(input: CreateAssessmentTestInput): Promise<AssessmentTest> {
		logger.info("qti client: creating assessment test", { identifier: input.identifier })
		const validation = CreateAssessmentTestInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for createAssessmentTest", { error: validation.error })
			throw errors.wrap(validation.error, "createAssessmentTest input validation")
		}
		return this.#request<AssessmentTest>(
			"/assessment-tests",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			AssessmentTestSchema
		)
	}

	/**
	 * Retrieves a specific assessment test by its identifier.
	 * @param {string} identifier - The unique identifier of the test.
	 * @returns {Promise<AssessmentTest>} The assessment test object.
	 */
	public async getAssessmentTest(identifier: string): Promise<AssessmentTest> {
		logger.info("qti client: getting assessment test", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for getAssessmentTest")
		}
		return this.#request(`/assessment-tests/${identifier}`, { method: "GET" }, AssessmentTestSchema)
	}

	/**
	 * Updates an existing assessment test.
	 * @param {string} identifier - The identifier of the test to update.
	 * @param {UpdateAssessmentTestInput} input - The new test data.
	 * @returns {Promise<AssessmentTest>} The updated assessment test object.
	 */
	public async updateAssessmentTest(identifier: string, input: UpdateAssessmentTestInput): Promise<AssessmentTest> {
		logger.info("qti client: updating assessment test", { identifier })
		const validation = CreateAssessmentTestInputSchema.safeParse(input)
		if (!validation.success) {
			logger.error("qti client: invalid input for updateAssessmentTest", { error: validation.error })
			throw errors.wrap(validation.error, "updateAssessmentTest input validation")
		}
		return this.#request(
			`/assessment-tests/${identifier}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			AssessmentTestSchema
		)
	}

	/**
	 * Deletes an assessment test.
	 * @param {string} identifier - The identifier of the test to delete.
	 * @returns {Promise<void>}
	 */
	public async deleteAssessmentTest(identifier: string): Promise<void> {
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
	public async searchAssessmentTests(input: SearchAssessmentTestsInput): Promise<SearchAssessmentTestsResponse> {
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
	public async getAllQuestionsForTest(identifier: string): Promise<TestQuestionsResponse> {
		logger.info("qti client: getting all questions for test", { identifier })
		if (!identifier) {
			throw errors.new("qti client: identifier is required for getAllQuestionsForTest")
		}
		const endpoint = `/assessment-tests/${identifier}/questions`
		return this.#request(endpoint, { method: "GET" }, TestQuestionsResponseSchema)
	}

	/**
	 * Updates only the metadata of an assessment test.
	 * @param {string} identifier - The identifier of the test to update.
	 * @param {UpdateAssessmentTestMetadataInput} input - The new metadata.
	 * @returns {Promise<AssessmentTest>} The updated assessment test object.
	 */
	public async updateAssessmentTestMetadata(
		identifier: string,
		input: UpdateAssessmentTestMetadataInput
	): Promise<AssessmentTest> {
		logger.info("qti client: updating assessment test metadata", { identifier })
		const validation = UpdateAssessmentTestMetadataInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "updateAssessmentTestMetadata input validation")
		}
		const endpoint = `/assessment-tests/${identifier}/metadata`
		return this.#request(
			endpoint,
			{ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) },
			AssessmentTestSchema
		)
	}

	// --- Test Part Management Methods (New) ---

	/**
	 * Creates a new test part within an assessment test.
	 * @param {string} assessmentTestIdentifier - The identifier of the parent test.
	 * @param {CreateTestPartInput} input - The test part data.
	 * @returns {Promise<TestPart>} The created test part object.
	 */
	public async createTestPart(assessmentTestIdentifier: string, input: CreateTestPartInput): Promise<TestPart> {
		logger.info("qti client: creating test part", { assessmentTestIdentifier, partIdentifier: input.identifier })
		const validation = TestPartSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "createTestPart input validation")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts`
		return this.#request(
			endpoint,
			{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) },
			TestPartSchema
		)
	}

	/**
	 * Retrieves a specific test part by its identifier.
	 * @param {string} assessmentTestIdentifier - The identifier of the parent test.
	 * @param {string} testPartIdentifier - The identifier of the test part.
	 * @returns {Promise<TestPart>} The test part object.
	 */
	public async getTestPart(assessmentTestIdentifier: string, testPartIdentifier: string): Promise<TestPart> {
		logger.info("qti client: getting test part", { assessmentTestIdentifier, testPartIdentifier })
		if (!assessmentTestIdentifier || !testPartIdentifier) {
			throw errors.new("qti client: both assessmentTestIdentifier and testPartIdentifier are required for getTestPart")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}`
		return this.#request(endpoint, { method: "GET" }, TestPartSchema)
	}

	/**
	 * Updates an existing test part.
	 * @param {string} assessmentTestIdentifier - The identifier of the parent test.
	 * @param {string} testPartIdentifier - The identifier of the test part to update.
	 * @param {CreateTestPartInput} input - The new test part data.
	 * @returns {Promise<TestPart>} The updated test part object.
	 */
	public async updateTestPart(
		assessmentTestIdentifier: string,
		testPartIdentifier: string,
		input: CreateTestPartInput
	): Promise<TestPart> {
		logger.info("qti client: updating test part", { assessmentTestIdentifier, testPartIdentifier })
		const validation = TestPartSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "updateTestPart input validation")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}`
		return this.#request(
			endpoint,
			{ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) },
			TestPartSchema
		)
	}

	/**
	 * Deletes a test part.
	 * @param {string} assessmentTestIdentifier - The identifier of the parent test.
	 * @param {string} testPartIdentifier - The identifier of the test part to delete.
	 * @returns {Promise<void>}
	 */
	public async deleteTestPart(assessmentTestIdentifier: string, testPartIdentifier: string): Promise<void> {
		logger.info("qti client: deleting test part", { assessmentTestIdentifier, testPartIdentifier })
		if (!assessmentTestIdentifier || !testPartIdentifier) {
			throw errors.new(
				"qti client: both assessmentTestIdentifier and testPartIdentifier are required for deleteTestPart"
			)
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}`
		await this.#request(endpoint, { method: "DELETE" }, z.null())
	}

	// --- Section Management Methods (New) ---

	/**
	 * Creates a new section within a test part.
	 * @param {string} assessmentTestIdentifier - The identifier of the parent test.
	 * @param {string} testPartIdentifier - The identifier of the parent test part.
	 * @param {CreateSectionInput} input - The section data.
	 * @returns {Promise<AssessmentSection>} The created section object.
	 */
	public async createSection(
		assessmentTestIdentifier: string,
		testPartIdentifier: string,
		input: CreateSectionInput
	): Promise<AssessmentSection> {
		logger.info("qti client: creating section", { assessmentTestIdentifier, testPartIdentifier, input })
		const validation = AssessmentSectionSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "createSection input validation")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}/sections`
		return this.#request(
			endpoint,
			{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) },
			AssessmentSectionSchema
		)
	}

	/**
	 * Retrieves a specific section by its identifier.
	 * @param {string} assessmentTestIdentifier - The identifier of the parent test.
	 * @param {string} testPartIdentifier - The identifier of the parent test part.
	 * @param {string} sectionIdentifier - The identifier of the section.
	 * @returns {Promise<AssessmentSection>} The section object.
	 */
	public async getSection(
		assessmentTestIdentifier: string,
		testPartIdentifier: string,
		sectionIdentifier: string
	): Promise<AssessmentSection> {
		logger.info("qti client: getting section", { assessmentTestIdentifier, testPartIdentifier, sectionIdentifier })
		if (!assessmentTestIdentifier || !testPartIdentifier || !sectionIdentifier) {
			throw errors.new("qti client: all identifiers are required for getSection")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}/sections/${sectionIdentifier}`
		return this.#request(endpoint, { method: "GET" }, AssessmentSectionSchema)
	}

	/**
	 * Updates an existing section.
	 * @param {string} assessmentTestIdentifier - The identifier of the parent test.
	 * @param {string} testPartIdentifier - The identifier of the parent test part.
	 * @param {string} sectionIdentifier - The identifier of the section to update.
	 * @param {CreateSectionInput} input - The new section data.
	 * @returns {Promise<AssessmentSection>} The updated section object.
	 */
	public async updateSection(
		assessmentTestIdentifier: string,
		testPartIdentifier: string,
		sectionIdentifier: string,
		input: CreateSectionInput
	): Promise<AssessmentSection> {
		logger.info("qti client: updating section", { assessmentTestIdentifier, testPartIdentifier, sectionIdentifier })
		const validation = AssessmentSectionSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "updateSection input validation")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}/sections/${sectionIdentifier}`
		return this.#request(
			endpoint,
			{ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) },
			AssessmentSectionSchema
		)
	}

	/**
	 * Deletes a section.
	 * @param {string} assessmentTestIdentifier - The identifier of the parent test.
	 * @param {string} testPartIdentifier - The identifier of the parent test part.
	 * @param {string} sectionIdentifier - The identifier of the section to delete.
	 * @returns {Promise<void>}
	 */
	public async deleteSection(
		assessmentTestIdentifier: string,
		testPartIdentifier: string,
		sectionIdentifier: string
	): Promise<void> {
		logger.info("qti client: deleting section", { assessmentTestIdentifier, testPartIdentifier, sectionIdentifier })
		if (!assessmentTestIdentifier || !testPartIdentifier || !sectionIdentifier) {
			throw errors.new("qti client: all identifiers are required for deleteSection")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}/sections/${sectionIdentifier}`
		await this.#request(endpoint, { method: "DELETE" }, z.null())
	}

	/**
	 * Adds an assessment item reference to a section.
	 * @param {object} params - The identifiers for test, part, and section.
	 * @param {string} params.assessmentTestIdentifier
	 * @param {string} params.testPartIdentifier
	 * @param {string} params.sectionIdentifier
	 * @param {AddItemToSectionInput} input - The item reference to add.
	 * @returns {Promise<AssessmentSection>} The updated section object.
	 */
	public async addAssessmentItemToSection(
		params: { assessmentTestIdentifier: string; testPartIdentifier: string; sectionIdentifier: string },
		input: AddItemToSectionInput
	): Promise<AssessmentSection> {
		const { assessmentTestIdentifier, testPartIdentifier, sectionIdentifier } = params
		logger.info("qti client: adding item to section", { ...params, itemIdentifier: input.identifier })
		const validation = AddItemToSectionInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "addAssessmentItemToSection input validation")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}/sections/${sectionIdentifier}/items`
		return this.#request(
			endpoint,
			{ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) },
			AssessmentSectionSchema
		)
	}

	/**
	 * Removes an assessment item reference from a section.
	 * @param {object} params - The identifiers for test, part, section, and item.
	 * @param {string} params.assessmentTestIdentifier
	 * @param {string} params.testPartIdentifier
	 * @param {string} params.sectionIdentifier
	 * @param {string} params.itemIdentifier
	 * @returns {Promise<void>}
	 */
	public async removeAssessmentItemFromSection(params: {
		assessmentTestIdentifier: string
		testPartIdentifier: string
		sectionIdentifier: string
		itemIdentifier: string
	}): Promise<void> {
		const { assessmentTestIdentifier, testPartIdentifier, sectionIdentifier, itemIdentifier } = params
		logger.info("qti client: removing item from section", { ...params })
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}/sections/${sectionIdentifier}/items/${itemIdentifier}`
		await this.#request(endpoint, { method: "DELETE" }, z.null())
	}

	/**
	 * Reorders assessment items within a section.
	 * @param {object} params - The identifiers for test, part, and section.
	 * @param {string} params.assessmentTestIdentifier
	 * @param {string} params.testPartIdentifier
	 * @param {string} params.sectionIdentifier
	 * @param {ReorderSectionItemsInput} input - An array of item identifiers in the new order.
	 * @returns {Promise<AssessmentSection>} The updated section object.
	 */
	public async reorderSectionItems(
		params: { assessmentTestIdentifier: string; testPartIdentifier: string; sectionIdentifier: string },
		input: ReorderSectionItemsInput
	): Promise<AssessmentSection> {
		const { assessmentTestIdentifier, testPartIdentifier, sectionIdentifier } = params
		logger.info("qti client: reordering section items", { ...params, itemCount: input.items.length })
		const validation = ReorderSectionItemsInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "reorderSectionItems input validation")
		}
		const endpoint = `/assessment-tests/${assessmentTestIdentifier}/test-parts/${testPartIdentifier}/sections/${sectionIdentifier}/items/order`
		return this.#request(
			endpoint,
			{ method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validation.data) },
			AssessmentSectionSchema
		)
	}
}
