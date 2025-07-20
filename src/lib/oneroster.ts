import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- Constants ---
const PAGINATION_LIMIT = 3000 // Max limit per OneRoster spec

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

// --- Query Options Type for Collection Methods ---
type QueryOptions = {
	filter?: string
	sort?: string
	orderBy?: "asc" | "desc"
}

// --- Paginated Response Type ---
type PaginatedFetchOptions<T> = QueryOptions & {
	endpoint: string
	responseKey: keyof T
	schema: z.ZodType<T>
}

// --- Strict Schemas for OneRoster Entities ---
// For reading (GET responses) - type is optional
const GUIDRefReadSchema = z.object({
	sourcedId: z.string(),
	type: z
		.enum([
			"course",
			"academicSession",
			"org",
			"courseComponent",
			"resource",
			"class",
			"user",
			"term",
			"schoolYear",
			"componentResource",
			"category"
		])
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
		"schoolYear",
		"componentResource",
		"category",
		"assessmentLineItem",
		"lineItem"
	])
})

const ResourceSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	format: z.string().optional(), // Made optional to handle existing resources without format
	vendorResourceId: z.string(),
	vendorId: z.string().nullable().optional(),
	applicationId: z.string().nullable().optional(),
	roles: z.array(z.string()).optional(),
	importance: z.string().optional(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type Resource = z.infer<typeof ResourceSchema>

// Read schemas (for GET responses)
const CourseReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	courseCode: z.string().optional().nullable(),
	org: GUIDRefReadSchema,
	academicSession: GUIDRefReadSchema.optional().nullable(), // Made optional and nullable for reads
	subjects: z.array(z.string()).optional().nullable(),
	metadata: z.record(z.string(), z.unknown()).optional().nullable()
})

const CourseComponentReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	course: GUIDRefReadSchema,
	parent: GUIDRefReadSchema.optional().nullable(),
	sortOrder: z.number(),
	metadata: z.record(z.string(), z.unknown()).optional()
})

const ComponentResourceReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	courseComponent: GUIDRefReadSchema,
	resource: GUIDRefReadSchema,
	sortOrder: z.number()
})

// Write schemas (for POST/PUT requests)
const CourseWriteSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	courseCode: z.string().optional().nullable(),
	org: GUIDRefWriteSchema,
	academicSession: GUIDRefWriteSchema,
	subjects: z.array(z.string()).optional().nullable(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type Course = z.infer<typeof CourseWriteSchema>

const CourseComponentWriteSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	course: GUIDRefWriteSchema,
	parent: GUIDRefWriteSchema.optional().nullable(),
	sortOrder: z.number(),
	metadata: z.record(z.string(), z.unknown()).optional()
})
export type CourseComponent = z.infer<typeof CourseComponentWriteSchema>

const ComponentResourceWriteSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	courseComponent: GUIDRefWriteSchema,
	resource: GUIDRefWriteSchema,
	sortOrder: z.number()
})
export type ComponentResource = z.infer<typeof ComponentResourceWriteSchema>

// --- NEW: Schemas for API responses ---
const GetResourceResponseSchema = z.object({ resource: ResourceSchema.optional() })
const GetCourseResponseSchema = z.object({ course: CourseReadSchema.optional() })
const GetCourseComponentResponseSchema = z.object({ courseComponent: CourseComponentReadSchema.optional() })
const GetComponentResourceResponseSchema = z.object({
	componentResource: ComponentResourceReadSchema.optional()
})

// NEW: Schemas for create/update method inputs
const CreateResourceInputSchema = ResourceSchema.omit({ sourcedId: true }).extend({
	sourcedId: z.string().optional()
})
const CreateCourseInputSchema = CourseWriteSchema.omit({ sourcedId: true }).extend({
	sourcedId: z.string().optional()
})
const CreateCourseComponentInputSchema = CourseComponentWriteSchema.omit({ sourcedId: true }).extend({
	sourcedId: z.string().optional()
})
const CreateComponentResourceInputSchema = ComponentResourceWriteSchema.omit({ sourcedId: true }).extend({
	sourcedId: z.string().optional()
})

// --- NEW: Add Schemas for Class and Enrollment ---
const ClassReadSchema = z.object({
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
export type Class = z.infer<typeof ClassReadSchema>

const ClassWriteSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	title: z.string(),
	classType: z.enum(["homeroom", "scheduled"]),
	course: GUIDRefWriteSchema,
	// The API spec uses 'org' for the school reference in the POST body
	school: GUIDRefWriteSchema.optional(), // Make optional as it's passed as 'org'
	org: GUIDRefWriteSchema.optional(), // 'org' is used for the school
	terms: z.array(GUIDRefWriteSchema)
})

const GetClassResponseSchema = z.object({ class: ClassReadSchema.optional() })

const CreateClassInputSchema = ClassWriteSchema

// --- NEW: Custom Error for API Failures ---
export const ErrOneRosterAPI = errors.new("oneroster api error")
export const ErrOneRosterNotFound = errors.new("oneroster resource not found")

// Export the read schema types that will be used by server actions
export type CourseReadSchemaType = z.infer<typeof CourseReadSchema>
export type ClassReadSchemaType = z.infer<typeof ClassReadSchema>

// Add these new schemas for paginated list responses
const GetAllCoursesResponseSchema = z.object({ courses: z.array(CourseReadSchema) })
const GetAllClassesResponseSchema = z.object({ classes: z.array(ClassReadSchema) })

// NEW: Response schemas for batch fetching methods
const GetCourseComponentsResponseSchema = z.object({ courseComponents: z.array(CourseComponentReadSchema) })
const GetResourcesResponseSchema = z.object({ resources: z.array(ResourceSchema) })
const GetComponentResourcesResponseSchema = z.object({
	componentResources: z.array(ComponentResourceReadSchema)
})

// --- NEW: Schemas for User ---
const UserRoleSchema = z.object({
	roleType: z.string(),
	role: z.string(),
	org: GUIDRefReadSchema,
	userProfile: z.string().optional(),
	beginDate: z.string().nullable().optional(),
	endDate: z.string().nullable().optional()
})

const UserReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	dateLastModified: z.string().datetime().optional(),
	username: z.string().nullable().optional(),
	userIds: z.array(z.object({ type: z.string(), identifier: z.string() })).optional(),
	enabledUser: z.union([z.boolean(), z.string()]),
	givenName: z.string(),
	familyName: z.string(),
	middleName: z.string().nullable().optional(),
	role: z.string().optional(), // Top-level role, if present
	roles: z.array(UserRoleSchema),
	agents: z.array(GUIDRefReadSchema).optional(),
	orgs: z.array(GUIDRefReadSchema).optional(),
	primaryOrg: GUIDRefReadSchema.optional().nullable(),
	email: z.string().nullable().optional(),
	sms: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	grades: z.array(z.string()).optional()
})
export type User = z.infer<typeof UserReadSchema>

const GetAllUsersResponseSchema = z.object({
	users: z.array(UserReadSchema)
})

// ADDED: A new schema for writing user data, enforcing required fields for creation.
const UserWriteSchema = z.object({
	sourcedId: z.string(),
	status: z.enum(["active", "tobedeleted"]).default("active"),
	enabledUser: z.boolean(),
	givenName: z.string(),
	familyName: z.string(),
	email: z.string().email().nullable().optional(),
	roles: z
		.array(
			z.object({
				roleType: z.enum(["primary", "secondary"]),
				role: z.enum(["administrator", "aide", "guardian", "parent", "proctor", "relative", "student", "teacher"]),
				org: z.object({
					sourcedId: z.string()
				})
			})
		)
		.min(1)
})
export type UserWrite = z.infer<typeof UserWriteSchema>

// --- Schemas for Enrollment ---
// Custom schema for the primary field that handles string/boolean coercion
const primaryFieldSchema = z
	.any()
	.transform((val) => {
		if (val === undefined || val === null) return undefined
		if (typeof val === "boolean") return val
		if (typeof val === "string") return val.toLowerCase() === "true"
		return false
	})
	.optional()

const EnrollmentSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	dateLastModified: z.string().datetime(),
	role: z.string(),
	// MODIFIED: Use custom transform to handle both string and boolean values for 'primary' field.
	// This makes the client resilient to the API returning "true" as a string.
	primary: primaryFieldSchema,
	user: GUIDRefReadSchema,
	class: GUIDRefReadSchema
})
export type Enrollment = z.infer<typeof EnrollmentSchema>

const GetAllEnrollmentsResponseSchema = z.object({
	enrollments: z.array(EnrollmentSchema)
})

const CreateEnrollmentInputSchema = z.object({
	status: z.enum(["active", "tobedeleted", "inactive"]).default("active"),
	role: z.enum(["student", "teacher", "proctor", "administrator"]),
	user: GUIDRefWriteSchema,
	class: GUIDRefWriteSchema,
	primary: z.boolean().optional()
})
export type CreateEnrollmentInput = z.infer<typeof CreateEnrollmentInputSchema>

// --- NEW: Schemas for AssessmentLineItem (Gradebook) ---
const AssessmentLineItemSchema = z.object({
	sourcedId: z.string(),
	status: z.string().optional(),
	title: z.string(),
	category: GUIDRefReadSchema.optional(), // Made optional - API may not return it
	componentResource: GUIDRefReadSchema.optional(),
	description: z.string().optional(),
	resultValueMin: z.number().optional(),
	resultValueMax: z.number().optional()
})
export type AssessmentLineItem = z.infer<typeof AssessmentLineItemSchema>

const CreateAssessmentLineItemInputSchema = z.object({
	sourcedId: z.string(),
	title: z.string(),
	category: GUIDRefWriteSchema,
	componentResource: GUIDRefWriteSchema.optional(),
	description: z.string().optional(),
	resultValueMin: z.number().optional(),
	resultValueMax: z.number().optional()
})
export type CreateAssessmentLineItemInput = z.infer<typeof CreateAssessmentLineItemInputSchema>

// --- NEW: Schemas for AssessmentResult ---
const ScoreStatusEnum = z.enum(["exempt", "fully graded", "not submitted", "partially graded", "submitted"])

const AssessmentResultSchema = z.object({
	sourcedId: z.string(),
	status: z.enum(["active", "tobedeleted"]),
	dateLastModified: z.string().datetime(),
	assessmentLineItem: GUIDRefReadSchema,
	student: GUIDRefReadSchema,
	scoreStatus: ScoreStatusEnum,
	// MODIFIED: score is no longer a required number.
	// It can be a number, null, or undefined.
	score: z.number().nullable().optional(),
	scoreDate: z.string().datetime(),
	comment: z.string().nullable().optional()
})
export type AssessmentResult = z.infer<typeof AssessmentResultSchema>

const CreateResultInputSchema = z.object({
	result: z.object({
		assessmentLineItem: GUIDRefWriteSchema,
		student: GUIDRefWriteSchema,
		scoreStatus: ScoreStatusEnum,
		scoreDate: z.string().datetime(),
		score: z.number()
	})
})
export type CreateResultInput = z.infer<typeof CreateResultInputSchema>

export class Client {
	#accessToken: string | null = null
	#tokenPromise: Promise<string> | null = null
	#config: ApiClientConfig

	constructor(config: ApiClientConfig) {
		this.#config = config
		logger.debug("oneroster: initializing client")
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
		logger.debug("oneroster: fetching new access token")
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

		const validation = TokenResponseSchema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("oneroster auth: invalid token response schema", { error: validation.error })
			throw errors.wrap(validation.error, "oneroster token response validation")
		}

		logger.info("oneroster: access token acquired")
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
			if (response.status === 404) {
				throw errors.wrap(ErrOneRosterNotFound, `oneroster api error: status 404 on ${endpoint}`)
			}
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

	async #createEntity<T extends z.ZodType, U, R>(
		entityName: "resource" | "course" | "courseComponent" | "componentResource" | "class" | "enrollment" | "user",
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

	async getResource(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/resources/v1p2/resources/${sourcedId}`,
			{ method: "GET" },
			GetResourceResponseSchema,
			{ swallow404: true }
		)
		return result?.resource
	}

	async createResource(resource: z.infer<typeof CreateResourceInputSchema>) {
		return this.#createEntity(
			"resource",
			"/ims/oneroster/resources/v1p2/resources/",
			resource,
			CreateResourceInputSchema,
			z.unknown() // The success response is not standardized
		)
	}

	async updateResource(sourcedId: string, resource: z.infer<typeof CreateResourceInputSchema>) {
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

	async deleteResource(sourcedId: string): Promise<void> {
		logger.info("oneroster: deleting resource", { sourcedId })

		if (!sourcedId) {
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(`/ims/oneroster/resources/v1p2/resources/${sourcedId}`, { method: "DELETE" }, z.unknown())

		logger.info("oneroster: successfully deleted resource", { sourcedId })
	}

	async getCourse(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/courses/${sourcedId}`,
			{ method: "GET" },
			GetCourseResponseSchema,
			{ swallow404: true }
		)
		return result?.course
	}

	async createCourse(course: z.infer<typeof CreateCourseInputSchema>) {
		return this.#createEntity(
			"course",
			"/ims/oneroster/rostering/v1p2/courses/",
			course,
			CreateCourseInputSchema,
			z.unknown()
		)
	}

	async updateCourse(sourcedId: string, course: z.infer<typeof CourseWriteSchema>): Promise<unknown> {
		const validationResult = CourseWriteSchema.safeParse(course)
		if (!validationResult.success) {
			throw errors.wrap(validationResult.error, "invalid input for updateCourse")
		}

		return this.#request(
			`/ims/oneroster/rostering/v1p2/courses/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ course: validationResult.data })
			},
			z.unknown()
		)
	}

	async getCourseComponent(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/courses/components/${sourcedId}`,
			{ method: "GET" },
			GetCourseComponentResponseSchema,
			{ swallow404: true }
		)
		return result?.courseComponent
	}

	async updateCourseComponent(
		sourcedId: string,
		courseComponent: z.infer<typeof CourseComponentWriteSchema>
	): Promise<unknown> {
		const validationResult = CourseComponentWriteSchema.safeParse(courseComponent)
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

	async createCourseComponent(courseComponent: z.infer<typeof CreateCourseComponentInputSchema>) {
		return this.#createEntity(
			"courseComponent",
			"/ims/oneroster/rostering/v1p2/courses/components",
			courseComponent,
			CreateCourseComponentInputSchema,
			z.unknown()
		)
	}

	async getComponentResource(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/courses/component-resources/${sourcedId}`,
			{ method: "GET" },
			GetComponentResourceResponseSchema,
			{ swallow404: true }
		)
		return result?.componentResource
	}

	async createComponentResource(componentResource: z.infer<typeof CreateComponentResourceInputSchema>) {
		return this.#createEntity(
			"componentResource",
			"/ims/oneroster/rostering/v1p2/courses/component-resources",
			componentResource,
			CreateComponentResourceInputSchema,
			z.unknown()
		)
	}

	async updateComponentResource(
		sourcedId: string,
		componentResource: z.infer<typeof ComponentResourceWriteSchema>
	): Promise<unknown> {
		const validationResult = ComponentResourceWriteSchema.safeParse(componentResource)
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

	async getClass(sourcedId: string) {
		const result = await this.#request(
			`/ims/oneroster/rostering/v1p2/classes/${sourcedId}`,
			{ method: "GET" },
			GetClassResponseSchema,
			{ swallow404: true }
		)
		return result?.class
	}

	async createClass(classData: z.infer<typeof CreateClassInputSchema>) {
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

	async updateClass(sourcedId: string, classData: z.infer<typeof ClassWriteSchema>): Promise<unknown> {
		const validationResult = ClassWriteSchema.safeParse(classData)
		if (!validationResult.success) {
			logger.error("invalid input for updateClass", { error: validationResult.error, input: classData })
			throw errors.wrap(validationResult.error, "invalid input for updateClass")
		}

		// The API spec uses `org` for the school reference. We'll map `school` to `org` if provided.
		const payload = { ...validationResult.data }
		if (payload.school) {
			payload.org = payload.school
			delete payload.school
		}

		return this.#request(
			`/ims/oneroster/rostering/v1p2/classes/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ class: payload })
			},
			z.unknown()
		)
	}

	// ADDED: New method to create a user in OneRoster.
	async createUser(userData: z.infer<typeof UserWriteSchema>) {
		const validationResult = UserWriteSchema.safeParse(userData)
		if (!validationResult.success) {
			logger.error("invalid input for createUser", { error: validationResult.error, input: userData })
			throw errors.wrap(validationResult.error, "invalid input for createUser")
		}

		return this.#createEntity(
			"user",
			"/ims/oneroster/rostering/v1p2/users/",
			validationResult.data,
			UserWriteSchema,
			z.unknown() // Response schema is not critical here
		)
	}

	/**
	 * Generic method to fetch all paginated results from a collection endpoint
	 */
	async #fetchPaginatedCollection<T extends Record<string, unknown>, R>(
		options: PaginatedFetchOptions<T>
	): Promise<R[]> {
		const { endpoint, responseKey, schema, filter, sort, orderBy } = options
		const allResults: R[] = []
		let offset = 0
		const limit = PAGINATION_LIMIT // Max limit per OneRoster spec - not exposed to users

		while (true) {
			let url = `${endpoint}?limit=${limit}&offset=${offset}`

			// Add filter if provided
			if (filter) {
				url += `&filter=${encodeURIComponent(filter)}`
			}

			// Add sort if provided
			if (sort) {
				url += `&sort=${encodeURIComponent(sort)}`
				// orderBy is optional and only used with sort
				if (orderBy) {
					url += `&orderBy=${orderBy}`
				}
			}

			const response = await this.#request(url, { method: "GET" }, schema)

			// Handle null response or empty array
			if (!response || !(responseKey in response)) {
				break
			}

			const items = response[responseKey]
			if (!Array.isArray(items) || items.length === 0) {
				break
			}

			allResults.push(...items)
			offset += items.length

			// Check if we've fetched all items (response has fewer items than limit)
			if (items.length < limit) {
				break
			}
		}

		return allResults
	}

	/**
	 * Fetches all courses from the OneRoster API, handling pagination.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of all courses.
	 */
	async getAllCourses(options?: QueryOptions): Promise<CourseReadSchemaType[]> {
		logger.info("oneroster: fetching all courses", options)

		const courses = await this.#fetchPaginatedCollection<
			z.infer<typeof GetAllCoursesResponseSchema>,
			CourseReadSchemaType
		>({
			endpoint: "/ims/oneroster/rostering/v1p2/courses",
			responseKey: "courses",
			schema: GetAllCoursesResponseSchema,
			...options
		})

		logger.info("oneroster: successfully fetched all courses", { count: courses.length, ...options })
		return courses
	}

	/**
	 * Fetches all classes for a specific school (organization) from the OneRoster API,
	 * handling pagination.
	 * @param schoolSourcedId The sourcedId of the school/org.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of classes for that school.
	 */
	async getClassesForSchool(schoolSourcedId: string, options?: QueryOptions): Promise<ClassReadSchemaType[]> {
		logger.info("oneroster: fetching all classes for school", { schoolSourcedId, ...options })

		if (!schoolSourcedId) {
			throw errors.new("schoolSourcedId cannot be empty")
		}

		const classes = await this.#fetchPaginatedCollection<
			z.infer<typeof GetAllClassesResponseSchema>,
			ClassReadSchemaType
		>({
			endpoint: `/ims/oneroster/rostering/v1p2/schools/${schoolSourcedId}/classes`,
			responseKey: "classes",
			schema: GetAllClassesResponseSchema,
			...options
		})

		logger.info("oneroster: successfully fetched all classes for school", {
			schoolSourcedId,
			count: classes.length,
			...options
		})
		return classes
	}

	/**
	 * Fetches all classes from the OneRoster API, handling pagination.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of all classes.
	 */
	async getAllClasses(options?: QueryOptions): Promise<ClassReadSchemaType[]> {
		logger.info("oneroster: fetching all classes", options)

		const classes = await this.#fetchPaginatedCollection<
			z.infer<typeof GetAllClassesResponseSchema>,
			ClassReadSchemaType
		>({
			endpoint: "/ims/oneroster/rostering/v1p2/classes",
			responseKey: "classes",
			schema: GetAllClassesResponseSchema,
			...options
		})

		logger.info("oneroster: successfully fetched all classes", {
			count: classes.length,
			...options
		})
		return classes
	}

	/**
	 * Fetches all users from the OneRoster API, handling pagination.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of all users.
	 */
	async getAllUsers(options?: QueryOptions): Promise<User[]> {
		logger.info("oneroster: fetching all users", options)

		const users = await this.#fetchPaginatedCollection<z.infer<typeof GetAllUsersResponseSchema>, User>({
			endpoint: "/ims/oneroster/rostering/v1p2/users",
			responseKey: "users",
			schema: GetAllUsersResponseSchema,
			...options
		})

		logger.info("oneroster: successfully fetched all users", { count: users.length, ...options })
		return users
	}

	/**
	 * Fetches users from the OneRoster API by their email address.
	 * This is a convenience method that wraps getAllUsers with a filter.
	 * @param email The email address to search for.
	 * @returns A promise that resolves to the first matching user object, or null if not found.
	 */
	async getUsersByEmail(email: string): Promise<User | null> {
		logger.info("oneroster: fetching user by email", { email })

		if (!email) {
			throw errors.new("email cannot be empty")
		}

		// Use getAllUsers with a filter
		const users = await this.getAllUsers({
			filter: `email='${email}'`
		})

		if (users.length === 0) {
			logger.info("oneroster: no user found for email", { email })
			return null
		}

		const user = users[0]
		if (!user) {
			logger.info("oneroster: no user found for email", { email })
			return null
		}

		logger.info("oneroster: successfully fetched user by email", {
			email,
			sourcedId: user.sourcedId
		})
		return user
	}

	/**
	 * Fetches course components with optional filtering and sorting.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of course components.
	 */
	async getCourseComponents(options?: QueryOptions): Promise<z.infer<typeof CourseComponentReadSchema>[]> {
		logger.info("oneroster: fetching course components", options)

		const components = await this.#fetchPaginatedCollection<
			z.infer<typeof GetCourseComponentsResponseSchema>,
			z.infer<typeof CourseComponentReadSchema>
		>({
			endpoint: "/ims/oneroster/rostering/v1p2/courses/components",
			responseKey: "courseComponents",
			schema: GetCourseComponentsResponseSchema,
			...options
		})

		logger.info("oneroster: successfully fetched course components", {
			count: components.length,
			...options
		})
		return components
	}

	/**
	 * Fetches all resources for a specific course.
	 * @param courseSourcedId The sourcedId of the course.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of resources.
	 */
	async getResourcesForCourse(courseSourcedId: string, options?: QueryOptions): Promise<Resource[]> {
		logger.info("oneroster: fetching resources for course", { courseSourcedId, ...options })

		if (!courseSourcedId) {
			throw errors.new("courseSourcedId cannot be empty")
		}

		const resources = await this.#fetchPaginatedCollection<z.infer<typeof GetResourcesResponseSchema>, Resource>({
			endpoint: `/ims/oneroster/resources/v1p2/resources/courses/${courseSourcedId}/resources`,
			responseKey: "resources",
			schema: GetResourcesResponseSchema,
			...options
		})

		logger.info("oneroster: successfully fetched resources for course", {
			courseSourcedId,
			count: resources.length,
			...options
		})
		return resources
	}

	/**
	 * Fetches ALL resources in the system, handling pagination.
	 * This is necessary because the API does not support filtering resources by course.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of all resources.
	 */
	async getAllResources(options?: QueryOptions): Promise<Resource[]> {
		logger.info("oneroster: fetching ALL resources", options)

		const resources = await this.#fetchPaginatedCollection<z.infer<typeof GetResourcesResponseSchema>, Resource>({
			endpoint: "/ims/oneroster/resources/v1p2/resources",
			responseKey: "resources",
			schema: GetResourcesResponseSchema,
			...options
		})

		logger.info("oneroster: finished fetching all resources", {
			total: resources.length,
			...options
		})

		return resources
	}

	/**
	 * Fetches ALL component-resource relationships in the system, handling pagination.
	 * This is necessary because the API does not support filtering this endpoint by course or component.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of all component-resource relationships.
	 */
	async getAllComponentResources(options?: QueryOptions): Promise<z.infer<typeof ComponentResourceReadSchema>[]> {
		logger.info("oneroster: fetching ALL component resources", options)

		const componentResources = await this.#fetchPaginatedCollection<
			z.infer<typeof GetComponentResourcesResponseSchema>,
			z.infer<typeof ComponentResourceReadSchema>
		>({
			endpoint: "/ims/oneroster/rostering/v1p2/courses/component-resources",
			responseKey: "componentResources",
			schema: GetComponentResourcesResponseSchema,
			...options
		})

		logger.info("oneroster: successfully fetched all component resources", {
			count: componentResources.length,
			...options
		})
		return componentResources
	}

	/**
	 * Fetches all classes a specific user is enrolled in.
	 * Note: The /users/{id}/classes endpoint doesn't support status filtering,
	 * so this returns all classes the user has ever been enrolled in.
	 * @param userSourcedId The sourcedId of the user.
	 * @param options Query options for sorting and filtering
	 * @returns A promise that resolves to an array of classes.
	 */
	async getClassesForUser(userSourcedId: string, options?: QueryOptions): Promise<ClassReadSchemaType[]> {
		logger.info("oneroster: fetching classes for user", { userSourcedId, ...options })

		let endpoint = `/ims/oneroster/rostering/v1p2/users/${userSourcedId}/classes`

		// Build query parameters
		const params = new URLSearchParams()
		if (options?.filter) {
			params.append("filter", options.filter)
		}
		if (options?.sort) {
			params.append("sort", options.sort)
			if (options.orderBy) {
				params.append("orderBy", options.orderBy)
			}
		}

		if (params.toString()) {
			endpoint += `?${params.toString()}`
		}

		const response = await this.#request(endpoint, { method: "GET" }, GetAllClassesResponseSchema)
		if (!response || !response.classes) {
			logger.error("CRITICAL: Invalid API response for getClassesForUser", {
				userSourcedId,
				hasResponse: Boolean(response),
				responseData: response
			})
			throw errors.new("classes api response: invalid structure")
		}
		const classes = response.classes
		logger.info("oneroster: successfully fetched classes for user", {
			userSourcedId,
			count: classes.length,
			classIds: classes.map((c) => c.sourcedId),
			...options
		})
		return classes
	}

	/**
	 * Fetches course components for a specific course, filtered to only get parent components (units).
	 * @param courseSourcedId The sourcedId of the course.
	 * @param options Additional query options including filter, sort and orderBy
	 * @returns A promise that resolves to an array of parent course components (units).
	 */
	async getCourseComponentsForCourse(
		courseSourcedId: string,
		options?: QueryOptions
	): Promise<z.infer<typeof CourseComponentReadSchema>[]> {
		logger.info("oneroster: fetching course components for course", { courseSourcedId, ...options })

		if (!courseSourcedId) {
			throw errors.new("courseSourcedId cannot be empty")
		}

		// Merge the course filter with any additional filter
		const courseFilter = `course.sourcedId='${courseSourcedId}'`
		const filter = options?.filter ? `${courseFilter} AND ${options.filter}` : courseFilter

		const allComponents = await this.getCourseComponents({ ...options, filter })

		// Filter client-side to get only parent components (units) - no nested lessons
		const parentComponents = allComponents.filter((component) => !component.parent || !component.parent.sourcedId)

		// Sort by sortOrder to maintain proper unit ordering
		const sortedComponents = parentComponents.sort((a, b) => a.sortOrder - b.sortOrder)

		logger.info("oneroster: successfully fetched course components for course", {
			courseSourcedId,
			total: allComponents.length,
			parentComponents: sortedComponents.length,
			...options
		})

		return sortedComponents
	}

	/**
	 * Fetches all enrollments from the system with optional filtering and sorting.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of enrollments.
	 */
	async getAllEnrollments(options?: QueryOptions): Promise<Enrollment[]> {
		logger.info("oneroster: fetching all enrollments", options)

		const enrollments = await this.#fetchPaginatedCollection<
			z.infer<typeof GetAllEnrollmentsResponseSchema>,
			Enrollment
		>({
			endpoint: "/ims/oneroster/rostering/v1p2/enrollments",
			responseKey: "enrollments",
			schema: GetAllEnrollmentsResponseSchema,
			...options
		})

		logger.info("oneroster: successfully fetched all enrollments", {
			count: enrollments.length,
			...options
		})
		return enrollments
	}

	/**
	 * Fetches all enrollments for a specific user.
	 * This is a convenience method that wraps getAllEnrollments with a filter.
	 * @param userSourcedId The sourcedId of the user.
	 * @param options Additional query options including filter, sort and orderBy
	 * @returns A promise that resolves to an array of enrollments.
	 */
	async getEnrollmentsForUser(userSourcedId: string, options?: QueryOptions): Promise<Enrollment[]> {
		logger.info("oneroster: fetching enrollments for user", { userSourcedId, ...options })

		// Merge the user filter with any additional filter
		const userFilter = `user.sourcedId='${userSourcedId}' AND status='active'`
		const filter = options?.filter ? `${userFilter} AND ${options.filter}` : userFilter

		const enrollments = await this.getAllEnrollments({ ...options, filter })

		logger.info("oneroster: successfully fetched enrollments for user", {
			userSourcedId,
			count: enrollments.length,
			enrollmentClassIds: enrollments.map((e) => e.class.sourcedId),
			enrollmentStatuses: enrollments.map((e) => e.status),
			...options
		})
		return enrollments
	}

	/**
	 * Creates a new enrollment.
	 * @param enrollmentData The data for the new enrollment.
	 * @returns A promise that resolves to the API response.
	 */
	async createEnrollment(enrollmentData: CreateEnrollmentInput): Promise<unknown> {
		logger.info("oneroster: creating enrollment", {
			userSourcedId: enrollmentData.user.sourcedId,
			classSourcedId: enrollmentData.class.sourcedId
		})
		const validationResult = CreateEnrollmentInputSchema.safeParse(enrollmentData)
		if (!validationResult.success) {
			logger.error("invalid input for createEnrollment", { error: validationResult.error, input: enrollmentData })
			throw errors.wrap(validationResult.error, "invalid input for createEnrollment")
		}

		return this.#createEntity(
			"enrollment",
			"/ims/oneroster/rostering/v1p2/enrollments/",
			validationResult.data,
			CreateEnrollmentInputSchema,
			z.unknown()
		)
	}

	/**
	 * Deletes an enrollment by its sourcedId.
	 * @param enrollmentSourcedId The sourcedId of the enrollment to delete.
	 * @returns A promise that resolves when the deletion is complete.
	 */
	async deleteEnrollment(enrollmentSourcedId: string): Promise<void> {
		logger.info("oneroster: deleting enrollment", { enrollmentSourcedId })
		if (!enrollmentSourcedId) {
			throw errors.new("enrollmentSourcedId cannot be empty")
		}
		await this.#request(
			`/ims/oneroster/rostering/v1p2/enrollments/${enrollmentSourcedId}`,
			{ method: "DELETE" },
			z.null()
		)
	}

	async deleteCourseComponent(sourcedId: string): Promise<void> {
		logger.info("oneroster: deleting course component", { sourcedId })

		if (!sourcedId) {
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(
			`/ims/oneroster/rostering/v1p2/courses/components/${sourcedId}`,
			{ method: "DELETE" },
			z.unknown()
		)

		logger.info("oneroster: successfully deleted course component", { sourcedId })
	}

	async deleteCourse(sourcedId: string): Promise<void> {
		logger.info("oneroster: deleting course", { sourcedId })

		if (!sourcedId) {
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(`/ims/oneroster/rostering/v1p2/courses/${sourcedId}`, { method: "DELETE" }, z.unknown())

		logger.info("oneroster: successfully deleted course", { sourcedId })
	}

	async deleteClass(sourcedId: string): Promise<void> {
		logger.info("oneroster: deleting class", { sourcedId })

		if (!sourcedId) {
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(`/ims/oneroster/rostering/v1p2/classes/${sourcedId}`, { method: "DELETE" }, z.unknown())

		logger.info("oneroster: successfully deleted class", { sourcedId })
	}

	async deleteComponentResource(sourcedId: string): Promise<void> {
		logger.info("oneroster: deleting component resource", { sourcedId })

		if (!sourcedId) {
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(
			`/ims/oneroster/rostering/v1p2/courses/component-resources/${sourcedId}`,
			{ method: "DELETE" },
			z.unknown()
		)

		logger.info("oneroster: successfully deleted component resource", { sourcedId })
	}

	async deleteUser(sourcedId: string): Promise<void> {
		logger.info("oneroster: deleting user", { sourcedId })

		if (!sourcedId) {
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(`/ims/oneroster/rostering/v1p2/users/${sourcedId}`, { method: "DELETE" }, z.unknown())

		logger.info("oneroster: successfully deleted user", { sourcedId })
	}

	// --- NEW METHODS FOR AssessmentLineItem ---

	/**
	 * Creates or updates an Assessment Line Item. The sourcedId for the record is supplied
	 * by the requesting system, making this operation idempotent.
	 * @param {string} sourcedId - The unique identifier for the assessment line item.
	 * @param {object} payload - The assessment line item data.
	 * @returns {Promise<AssessmentLineItem>} The created or updated assessment line item object.
	 */
	async putAssessmentLineItem(
		sourcedId: string,
		payload: { assessmentLineItem: CreateAssessmentLineItemInput }
	): Promise<AssessmentLineItem> {
		logger.info("oneroster: putting assessment line item", { sourcedId })

		const validation = z.object({ assessmentLineItem: CreateAssessmentLineItemInputSchema }).safeParse(payload)
		if (!validation.success) {
			logger.error("invalid input for putAssessmentLineItem", { error: validation.error })
			throw errors.wrap(validation.error, "putAssessmentLineItem input validation")
		}

		const response = await this.#request(
			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			},
			// The API returns the full object on success.
			z.object({ assessmentLineItem: AssessmentLineItemSchema })
		)

		if (!response?.assessmentLineItem) {
			logger.error("oneroster: putAssessmentLineItem did not return the expected object")
			throw errors.new("invalid response from putAssessmentLineItem")
		}

		return response.assessmentLineItem
	}

	/**
	 * Retrieves a specific Assessment Line Item by its identifier.
	 * @param {string} sourcedId - The unique identifier of the assessment line item.
	 * @returns {Promise<AssessmentLineItem | null>} The assessment line item object, or null if not found.
	 */
	async getAssessmentLineItem(sourcedId: string): Promise<AssessmentLineItem | null> {
		logger.info("oneroster: getting assessment line item", { sourcedId })

		const response = await this.#request(
			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
			{ method: "GET" },
			z.object({ assessmentLineItem: AssessmentLineItemSchema.optional() }),
			{ swallow404: true } // Return null if not found
		)

		return response?.assessmentLineItem ?? null
	}

	/**
	 * Retrieves all Assessment Line Items.
	 * @param {QueryOptions} options - Optional query parameters for filtering, sorting, and pagination.
	 * @returns {Promise<AssessmentLineItem[]>} Array of assessment line items.
	 */
	async getAllAssessmentLineItems(options?: QueryOptions): Promise<AssessmentLineItem[]> {
		logger.info("oneroster: fetching ALL assessment line items", options)

		const GetAssessmentLineItemsResponseSchema = z.object({
			assessmentLineItems: z.array(AssessmentLineItemSchema)
		})

		const items = await this.#fetchPaginatedCollection<
			z.infer<typeof GetAssessmentLineItemsResponseSchema>,
			AssessmentLineItem
		>({
			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentLineItems",
			responseKey: "assessmentLineItems",
			schema: GetAssessmentLineItemsResponseSchema,
			...options
		})

		logger.info("oneroster: finished fetching all assessment line items", {
			total: items.length,
			...options
		})

		return items
	}

	/**
	 * Deletes an Assessment Line Item by its identifier.
	 * @param {string} sourcedId - The unique identifier of the assessment line item.
	 * @returns {Promise<void>}
	 */
	async deleteAssessmentLineItem(sourcedId: string): Promise<void> {
		logger.info("oneroster: deleting assessment line item", { sourcedId })

		if (!sourcedId) {
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(
			`/ims/oneroster/gradebook/v1p2/assessmentLineItems/${sourcedId}`,
			{ method: "DELETE" },
			z.unknown()
		)

		logger.info("oneroster: successfully deleted assessment line item", { sourcedId })
	}

	/**
	 * Creates a new Assessment Result in the gradebook.
	 * @param {CreateResultInput} payload - The result data to create.
	 * @returns {Promise<unknown>} The API response.
	 */
	async createResult(payload: CreateResultInput): Promise<unknown> {
		const validationResult = CreateResultInputSchema.safeParse(payload)
		if (!validationResult.success) {
			logger.error("invalid input for createResult", { error: validationResult.error, input: payload })
			throw errors.wrap(validationResult.error, "invalid input for createResult")
		}

		logger.info("creating assessment result", {
			studentId: payload.result.student.sourcedId,
			lineItemId: payload.result.assessmentLineItem.sourcedId
		})

		return this.#request(
			"/ims/oneroster/gradebook/v1p2/results/",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validationResult.data)
			},
			z.unknown() // The response for a single creation is not critical here.
		)
	}

	/**
	 * Creates or updates an Assessment Result.
	 * @param sourcedId The unique identifier for the result.
	 * @param payload The result data.
	 * @returns The created or updated result.
	 */
	async putResult(
		sourcedId: string,
		payload: { result: z.infer<typeof CreateResultInputSchema>["result"] }
	): Promise<AssessmentResult> {
		const validation = CreateResultInputSchema.safeParse(payload)
		if (!validation.success) {
			throw errors.wrap(validation.error, "putResult input validation")
		}

		const response = await this.#request(
			`/ims/oneroster/gradebook/v1p2/assessmentResults/${sourcedId}`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ assessmentResult: validation.data.result })
			},
			z.object({ assessmentResult: AssessmentResultSchema })
		)

		if (!response?.assessmentResult) {
			throw errors.new("invalid response from putResult")
		}

		return response.assessmentResult
	}

	/**
	 * Fetches all assessment results with optional filtering and sorting.
	 * @param options Query options including filter, sort, and orderBy
	 * @returns A promise that resolves to an array of assessment results.
	 */
	async getAllResults(options?: QueryOptions): Promise<AssessmentResult[]> {
		logger.info("oneroster: fetching all results", options)

		const results = await this.#fetchPaginatedCollection<{ assessmentResults: AssessmentResult[] }, AssessmentResult>({
			endpoint: "/ims/oneroster/gradebook/v1p2/assessmentResults",
			responseKey: "assessmentResults",
			schema: z.object({ assessmentResults: z.array(AssessmentResultSchema) }),
			...options
		})

		logger.info("oneroster: successfully fetched all results", {
			count: results.length,
			...options
		})
		return results
	}
}
