import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import type { env } from "@/env"

// --- Zod Schemas for API Payloads ---
const OneRosterTokenResponseSchema = z.object({
	access_token: z.string().min(1)
})

// --- NEW: API CLIENT CONFIG TYPE ---
type OneRosterApiClientConfig = {
	serverUrl: (typeof env)["TIMEBACK_ONEROSTER_SERVER_URL"]
	tokenUrl: (typeof env)["TIMEBACK_TOKEN_URL"]
	clientId: (typeof env)["TIMEBACK_CLIENT_ID"]
	clientSecret: (typeof env)["TIMEBACK_CLIENT_SECRET"]
}

// --- NEW: Strict Schemas for OneRoster Entities ---
// For reading (GET responses) - type is optional
const GUIDRefReadSchema = z.object({
	sourcedId: z.string(),
	type: z
		.enum(["course", "academicSession", "org", "courseComponent", "resource", "class", "user", "term", "schoolYear"])
		.optional()
})

// For writing (POST/PUT requests) - type is required
const GUIDRefWriteSchema = z.object({
	sourcedId: z.string(),
	type: z.enum([
		"course",
		"academicSession",
		"org",
		"courseComponent",
		"resource",
		"class",
		"user",
		"term",
		"schoolYear"
	])
})

const OneRosterResourceSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	format: z.string().optional(), // Made optional to handle existing resources without format
	vendorResourceId: z.string(),
	vendorId: z.string().nullable().optional(),
	applicationId: z.string().nullable().optional(),
	roles: z.array(z.string()).optional(),
	importance: z.string().optional(),
	metadata: z.record(z.unknown()).optional()
})
export type OneRosterResource = z.infer<typeof OneRosterResourceSchema>

// Read schemas (for GET responses)
const OneRosterCourseReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	courseCode: z.string().optional().nullable(),
	org: GUIDRefReadSchema,
	academicSession: GUIDRefReadSchema.optional(), // Also make this optional for reads
	subjects: z.array(z.string()).optional().nullable(),
	metadata: z.record(z.unknown()).optional()
})

const OneRosterCourseComponentReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	course: GUIDRefReadSchema,
	parent: GUIDRefReadSchema.optional().nullable(),
	sortOrder: z.number(),
	metadata: z.record(z.unknown()).optional()
})

const OneRosterComponentResourceReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	courseComponent: GUIDRefReadSchema,
	resource: GUIDRefReadSchema,
	sortOrder: z.number()
})

// Write schemas (for POST/PUT requests)
const OneRosterCourseWriteSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	courseCode: z.string().optional().nullable(),
	org: GUIDRefWriteSchema,
	academicSession: GUIDRefWriteSchema,
	subjects: z.array(z.string()).optional().nullable(),
	metadata: z.record(z.unknown()).optional()
})
export type OneRosterCourse = z.infer<typeof OneRosterCourseWriteSchema>

const OneRosterCourseComponentWriteSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	course: GUIDRefWriteSchema,
	parent: GUIDRefWriteSchema.optional().nullable(),
	sortOrder: z.number(),
	metadata: z.record(z.unknown()).optional()
})
export type OneRosterCourseComponent = z.infer<typeof OneRosterCourseComponentWriteSchema>

const OneRosterComponentResourceWriteSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	courseComponent: GUIDRefWriteSchema,
	resource: GUIDRefWriteSchema,
	sortOrder: z.number()
})
export type OneRosterComponentResource = z.infer<typeof OneRosterComponentResourceWriteSchema>

// --- NEW: Schemas for API responses ---
const GetResourceResponseSchema = z.object({ resource: OneRosterResourceSchema.optional() })
const GetCourseResponseSchema = z.object({ course: OneRosterCourseReadSchema.optional() })
const GetCourseComponentResponseSchema = z.object({ courseComponent: OneRosterCourseComponentReadSchema.optional() })
const GetComponentResourceResponseSchema = z.object({
	componentResource: OneRosterComponentResourceReadSchema.optional()
})

// NEW: Schemas for create/update method inputs
const CreateResourceInputSchema = OneRosterResourceSchema.omit({ sourcedId: true }).extend({
	sourcedId: z.string().optional()
})
const CreateCourseInputSchema = OneRosterCourseWriteSchema.omit({ sourcedId: true }).extend({
	sourcedId: z.string().optional()
})
const CreateCourseComponentInputSchema = OneRosterCourseComponentWriteSchema.omit({ sourcedId: true }).extend({
	sourcedId: z.string().optional()
})
const CreateComponentResourceInputSchema = OneRosterComponentResourceWriteSchema.omit({ sourcedId: true }).extend({
	sourcedId: z.string().optional()
})

// --- NEW: Add Schemas for Class and Enrollment ---
const OneRosterClassReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	classCode: z.string().optional().nullable(),
	classType: z.enum(["homeroom", "scheduled"]),
	location: z.string().optional().nullable(),
	grades: z.array(z.string()).optional(),
	subjects: z.array(z.string()).optional(),
	course: GUIDRefReadSchema,
	school: GUIDRefReadSchema,
	terms: z.array(GUIDRefReadSchema)
})
export type OneRosterClass = z.infer<typeof OneRosterClassReadSchema>

const OneRosterClassWriteSchema = z.object({
	sourcedId: z.string(),
	title: z.string(),
	classType: z.enum(["homeroom", "scheduled"]),
	course: GUIDRefWriteSchema,
	// The API spec uses 'org' for the school reference in the POST body
	school: GUIDRefWriteSchema.optional(), // Make optional as it's passed as 'org'
	org: GUIDRefWriteSchema.optional(), // 'org' is used for the school
	terms: z.array(GUIDRefWriteSchema)
})

const OneRosterEnrollmentReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	role: z.enum(["administrator", "proctor", "student", "teacher"]),
	primary: z.boolean().optional(),
	beginDate: z.string().nullable().optional(),
	endDate: z.string().nullable().optional(),
	user: GUIDRefReadSchema,
	class: GUIDRefReadSchema
})

const OneRosterEnrollmentWriteSchema = z.object({
	sourcedId: z.string(),
	role: z.enum(["administrator", "proctor", "student", "teacher"]),
	user: GUIDRefWriteSchema,
	class: GUIDRefWriteSchema
})
export type OneRosterEnrollment = z.infer<typeof OneRosterEnrollmentWriteSchema>

const GetClassResponseSchema = z.object({ class: OneRosterClassReadSchema.optional() })
const GetEnrollmentResponseSchema = z.object({ enrollment: OneRosterEnrollmentReadSchema.optional() })

const CreateClassInputSchema = OneRosterClassWriteSchema
const CreateEnrollmentInputSchema = OneRosterEnrollmentWriteSchema

// --- NEW: Custom Error for API Failures ---
export const ErrOneRosterAPI = errors.new("oneroster api error")

export class OneRosterApiClient {
	#accessToken: string | null = null
	#tokenPromise: Promise<string> | null = null
	#config: OneRosterApiClientConfig

	constructor(config: OneRosterApiClientConfig) {
		this.#config = config
		logger.debug("OneRosterApiClient: initializing with provided configuration")
	}

	async #ensureAccessToken(): Promise<void> {
		if (this.#accessToken) return

		// If a token request is already in flight, wait for it to complete.
		if (this.#tokenPromise) {
			this.#accessToken = await this.#tokenPromise
			return
		}

		// Otherwise, initiate a new token request and store the promise.
		this.#tokenPromise = this.#getAccessToken()
		const tokenResult = await errors.try(this.#tokenPromise)
		// Clear the promise after it has settled (either resolved or rejected).
		this.#tokenPromise = null

		if (tokenResult.error) {
			throw tokenResult.error
		}
		this.#accessToken = tokenResult.data
	}

	async #getAccessToken(): Promise<string> {
		logger.debug("OneRosterApiClient: fetching new access token")
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
			logger.error("oneroster auth: token fetch failed", { error: result.error })
			throw errors.wrap(result.error, "oneroster token fetch")
		}

		if (!result.data.ok) {
			const errorBody = await result.data.text()
			logger.error("oneroster auth: token request rejected", { status: result.data.status, body: errorBody })
			throw errors.new(`oneroster token request failed with status ${result.data.status}`)
		}

		const jsonResult = await errors.try(result.data.json())
		if (jsonResult.error) {
			logger.error("oneroster auth: failed to parse token response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "oneroster token response parsing")
		}

		const validation = OneRosterTokenResponseSchema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("oneroster auth: invalid token response schema", { error: validation.error })
			throw errors.wrap(validation.error, "oneroster token response validation")
		}

		logger.info("OneRosterApiClient: access token acquired")
		return validation.data.access_token
	}

	async #request<T>(
		endpoint: string,
		options: RequestInit,
		schema: z.ZodType<T>,
		requestOptions?: { swallow404?: boolean }
	): Promise<T | null> {
		await this.#ensureAccessToken()
		const url = `${this.#config.serverUrl}${endpoint}`
		const headers = {
			...options.headers,
			Authorization: `Bearer ${this.#accessToken}`
		}

		const fetchResult = await errors.try(fetch(url, { ...options, headers }))
		if (fetchResult.error) {
			logger.error("oneroster api request failed", { error: fetchResult.error, endpoint })
			throw errors.wrap(fetchResult.error, "oneroster api request")
		}

		const response = fetchResult.data
		if (!response.ok) {
			if (response.status === 404 && requestOptions?.swallow404) {
				logger.debug("swallowing 404 for idempotent check", { endpoint })
				return null
			}

			const text = await response.text()
			const requestBodySample = typeof options.body === "string" ? options.body.substring(0, 500) : undefined
			logger.error("oneroster api returned non-ok status", {
				status: response.status,
				body: text,
				endpoint,
				method: options.method,
				requestBody: requestBodySample
			})
			// ✅ USE THE CUSTOM ERROR TYPE
			throw errors.wrap(ErrOneRosterAPI, `status ${response.status} on ${endpoint}`)
		}

		// Handle 204 No Content for DELETE requests gracefully
		if (response.status === 204) {
			return schema.parse(null)
		}

		// Check if response body is empty before attempting to parse
		const text = await response.text()
		if (!text || text.trim() === "") {
			// Empty response body - return null or empty object based on schema
			return schema.parse(null)
		}

		const jsonResult = errors.trySync(() => JSON.parse(text))
		if (jsonResult.error) {
			logger.error("oneroster api: failed to parse json response", {
				error: jsonResult.error,
				endpoint,
				responseText: text
			})
			throw errors.wrap(jsonResult.error, `oneroster api response parsing for ${endpoint}`)
		}

		const validation = schema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("oneroster api: invalid response schema", { error: validation.error, endpoint })
			throw errors.wrap(validation.error, `oneroster api response validation for ${endpoint}`)
		}
		return validation.data
	}

	async #_createEntity<T extends z.ZodType, U, R>(
		entityName: "resource" | "course" | "courseComponent" | "componentResource" | "class" | "enrollment",
		endpoint: string,
		input: U,
		inputSchema: T,
		responseSchema: z.ZodType<R>
	): Promise<R | null> {
		const validationResult = inputSchema.safeParse(input)
		if (!validationResult.success) {
			logger.error("invalid input for creating entity", { entityName, error: validationResult.error, input })
			throw errors.wrap(validationResult.error, `invalid input for ${entityName}`)
		}

		return this.#request(
			endpoint,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ [entityName]: validationResult.data })
			},
			responseSchema
		)
	}

	public async getResource(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/resources/v1p2/resources/${sourcedId}`,
			{ method: "GET" },
			GetResourceResponseSchema,
			{ swallow404: true }
		)
		return result?.resource
	}

	public async createResource(resource: z.infer<typeof CreateResourceInputSchema>) {
		return this.#_createEntity(
			"resource",
			"/ims/oneroster/resources/v1p2/resources/",
			resource,
			CreateResourceInputSchema,
			z.unknown() // The success response is not standardized
		)
	}

	public async updateResource(sourcedId: string, resource: z.infer<typeof CreateResourceInputSchema>) {
		// Note: The input for update is the same shape as create.
		const validationResult = CreateResourceInputSchema.safeParse(resource)
		if (!validationResult.success) {
			throw errors.wrap(validationResult.error, "invalid input for updateResource")
		}

		return this.#request(
			`/ims/oneroster/resources/v1p2/resources/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ resource: validationResult.data })
			},
			z.unknown()
		)
	}

	public async getCourse(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/courses/${sourcedId}`,
			{ method: "GET" },
			GetCourseResponseSchema,
			{ swallow404: true }
		)
		return result?.course
	}

	public async createCourse(course: z.infer<typeof CreateCourseInputSchema>) {
		return this.#_createEntity(
			"course",
			"/ims/oneroster/rostering/v1p2/courses/",
			course,
			CreateCourseInputSchema,
			z.unknown()
		)
	}

	public async getCourseComponent(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/courses/components/${sourcedId}`,
			{ method: "GET" },
			GetCourseComponentResponseSchema,
			{ swallow404: true }
		)
		return result?.courseComponent
	}

	public async updateCourseComponent(
		sourcedId: string,
		courseComponent: z.infer<typeof OneRosterCourseComponentWriteSchema>
	): Promise<unknown> {
		const validationResult = OneRosterCourseComponentWriteSchema.safeParse(courseComponent)
		if (!validationResult.success) {
			throw errors.wrap(validationResult.error, "invalid input for updateCourseComponent")
		}

		return this.#request(
			`/ims/oneroster/rostering/v1p2/courses/components/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ courseComponent: validationResult.data })
			},
			z.unknown()
		)
	}

	public async createCourseComponent(courseComponent: z.infer<typeof CreateCourseComponentInputSchema>) {
		return this.#_createEntity(
			"courseComponent",
			"/ims/oneroster/rostering/v1p2/courses/components",
			courseComponent,
			CreateCourseComponentInputSchema,
			z.unknown()
		)
	}

	public async getComponentResource(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/courses/component-resources/${sourcedId}`,
			{ method: "GET" },
			GetComponentResourceResponseSchema,
			{ swallow404: true }
		)
		return result?.componentResource
	}

	public async createComponentResource(componentResource: z.infer<typeof CreateComponentResourceInputSchema>) {
		return this.#_createEntity(
			"componentResource",
			"/ims/oneroster/rostering/v1p2/courses/component-resources",
			componentResource,
			CreateComponentResourceInputSchema,
			z.unknown()
		)
	}

	public async updateComponentResource(
		sourcedId: string,
		componentResource: z.infer<typeof OneRosterComponentResourceWriteSchema>
	): Promise<unknown> {
		const validationResult = OneRosterComponentResourceWriteSchema.safeParse(componentResource)
		if (!validationResult.success) {
			throw errors.wrap(validationResult.error, "invalid input for updateComponentResource")
		}

		return this.#request(
			`/ims/oneroster/rostering/v1p2/courses/component-resources/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ componentResource: validationResult.data })
			},
			z.unknown()
		)
	}

	public async getClass(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/classes/${sourcedId}`,
			{ method: "GET" },
			GetClassResponseSchema,
			{ swallow404: true }
		)
		return result?.class
	}

	public async createClass(classData: z.infer<typeof CreateClassInputSchema>) {
		const validationResult = CreateClassInputSchema.safeParse(classData)
		if (!validationResult.success) {
			logger.error("invalid input for createClass", { error: validationResult.error, input: classData })
			throw errors.wrap(validationResult.error, "invalid input for createClass")
		}

		// The API spec uses `org` for the school reference. We'll map `school` to `org` if provided.
		const payload = { ...validationResult.data }
		if (payload.school) {
			payload.org = payload.school
			delete payload.school
		}

		return this.#request(
			"/ims/oneroster/rostering/v1p2/classes/",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ class: payload })
			},
			z.unknown() // Success response structure not critical for this operation
		)
	}

	public async getEnrollment(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/enrollments/${sourcedId}`,
			{ method: "GET" },
			GetEnrollmentResponseSchema,
			{ swallow404: true }
		)
		return result?.enrollment
	}

	public async createEnrollment(enrollmentData: z.infer<typeof CreateEnrollmentInputSchema>) {
		const validationResult = CreateEnrollmentInputSchema.safeParse(enrollmentData)
		if (!validationResult.success) {
			logger.error("invalid input for createEnrollment", { error: validationResult.error, input: enrollmentData })
			throw errors.wrap(validationResult.error, "invalid input for createEnrollment")
		}

		return this.#request(
			"/ims/oneroster/rostering/v1p2/enrollments/",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ enrollment: validationResult.data })
			},
			z.unknown()
		)
	}

	public async updateEnrollment(
		sourcedId: string,
		enrollment: z.infer<typeof OneRosterEnrollmentWriteSchema>
	): Promise<unknown> {
		const validationResult = OneRosterEnrollmentWriteSchema.safeParse(enrollment)
		if (!validationResult.success) {
			throw errors.wrap(validationResult.error, "invalid input for updateEnrollment")
		}

		return this.#request(
			`/ims/oneroster/rostering/v1p2/enrollments/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ enrollment: validationResult.data })
			},
			z.unknown()
		)
	}
}
