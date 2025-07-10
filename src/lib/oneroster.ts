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

// Export the read schemas that will be used by server actions
export type OneRosterCourseReadSchema = z.infer<typeof OneRosterCourseReadSchema>
export type OneRosterClassReadSchema = z.infer<typeof OneRosterClassReadSchema>

// Add these new schemas for paginated list responses
const GetAllCoursesResponseSchema = z.object({ courses: z.array(OneRosterCourseReadSchema) })
const GetAllClassesResponseSchema = z.object({ classes: z.array(OneRosterClassReadSchema) })

// NEW: Response schemas for batch fetching methods
const GetCourseComponentsResponseSchema = z.object({ courseComponents: z.array(OneRosterCourseComponentReadSchema) })
const GetResourcesResponseSchema = z.object({ resources: z.array(OneRosterResourceSchema) })
const GetComponentResourcesResponseSchema = z.object({
	componentResources: z.array(OneRosterComponentResourceReadSchema)
})

// --- NEW: Schemas for User ---
const OneRosterUserRoleSchema = z.object({
	roleType: z.string(),
	role: z.string(),
	org: GUIDRefReadSchema,
	userProfile: z.string().optional(),
	beginDate: z.string().nullable().optional(),
	endDate: z.string().nullable().optional()
})

const OneRosterUserReadSchema = z.object({
	sourcedId: z.string(),
	status: z.string(),
	dateLastModified: z.string().datetime().optional(),
	username: z.string().nullable().optional(),
	userIds: z.array(z.object({ type: z.string(), identifier: z.string() })).optional(),
	enabledUser: z.boolean(),
	givenName: z.string(),
	familyName: z.string(),
	middleName: z.string().nullable().optional(),
	role: z.string().optional(), // Top-level role, if present
	roles: z.array(OneRosterUserRoleSchema),
	agents: z.array(GUIDRefReadSchema).optional(),
	orgs: z.array(GUIDRefReadSchema).optional(),
	primaryOrg: GUIDRefReadSchema.optional().nullable(),
	email: z.string().nullable().optional(),
	sms: z.string().nullable().optional(),
	phone: z.string().nullable().optional(),
	grades: z.array(z.string()).optional()
})
export type OneRosterUser = z.infer<typeof OneRosterUserReadSchema>

const GetAllUsersResponseSchema = z.object({
	users: z.array(OneRosterUserReadSchema)
})

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

	public async deleteResource(sourcedId: string): Promise<void> {
		logger.info("OneRosterApiClient: deleting resource", { sourcedId })

		if (!sourcedId) {
			throw errors.new("sourcedId cannot be empty")
		}

		await this.#request(`/ims/oneroster/resources/v1p2/resources/${sourcedId}`, { method: "DELETE" }, z.unknown())

		logger.info("OneRosterApiClient: successfully deleted resource", { sourcedId })
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

	/**
	 * Fetches all courses from the OneRoster API, handling pagination.
	 * @returns A promise that resolves to an array of all courses.
	 */
	public async getAllCourses(): Promise<OneRosterCourseReadSchema[]> {
		logger.info("OneRosterApiClient: fetching all courses")
		const allCourses: OneRosterCourseReadSchema[] = []
		let offset = 0
		const limit = 3000 // Max limit per OneRoster spec

		while (true) {
			const endpoint = `/ims/oneroster/rostering/v1p2/courses?limit=${limit}&offset=${offset}`
			const response = await this.#request(endpoint, { method: "GET" }, GetAllCoursesResponseSchema)

			if (!response || response.courses.length === 0) {
				break // Exit loop if no more courses are returned
			}

			allCourses.push(...response.courses)
			offset += response.courses.length

			if (response.courses.length < limit) {
				break // Exit if the last page was not full
			}
		}

		logger.info("OneRosterApiClient: successfully fetched all courses", { count: allCourses.length })
		return allCourses
	}

	/**
	 * Fetches all classes for a specific school (organization) from the OneRoster API,
	 * handling pagination.
	 * @param schoolSourcedId The sourcedId of the school/org.
	 * @returns A promise that resolves to an array of classes for that school.
	 */
	public async getClassesForSchool(schoolSourcedId: string): Promise<OneRosterClassReadSchema[]> {
		logger.info("OneRosterApiClient: fetching all classes for school", { schoolSourcedId })
		const allClasses: OneRosterClassReadSchema[] = []
		let offset = 0
		const limit = 3000

		if (!schoolSourcedId) {
			throw errors.new("schoolSourcedId cannot be empty")
		}

		while (true) {
			// Use the specific endpoint for fetching classes by school/org
			const endpoint = `/ims/oneroster/rostering/v1p2/schools/${schoolSourcedId}/classes?limit=${limit}&offset=${offset}`
			const response = await this.#request(endpoint, { method: "GET" }, GetAllClassesResponseSchema)

			if (!response || response.classes.length === 0) {
				break
			}

			allClasses.push(...response.classes)
			offset += response.classes.length

			if (response.classes.length < limit) {
				break
			}
		}

		logger.info("OneRosterApiClient: successfully fetched all classes for school", {
			schoolSourcedId,
			count: allClasses.length
		})
		return allClasses
	}

	/**
	 * Fetches users from the OneRoster API by their email address.
	 * @param email The email address to search for.
	 * @returns A promise that resolves to the first matching user object, or null if not found.
	 */
	public async getUsersByEmail(email: string): Promise<OneRosterUser | null> {
		logger.info("OneRosterApiClient: fetching user by email", { email })

		if (!email) {
			throw errors.new("email cannot be empty")
		}

		// The filter parameter needs to be properly URL-encoded.
		const filter = `email='${email}'`
		const endpoint = `/ims/oneroster/rostering/v1p2/users?filter=${encodeURIComponent(filter)}&limit=1`

		const response = await this.#request(endpoint, { method: "GET" }, GetAllUsersResponseSchema)

		if (!response || response.users.length === 0) {
			logger.info("OneRosterApiClient: no user found for email", { email })
			return null
		}

		const user = response.users[0]
		if (!user) {
			logger.info("OneRosterApiClient: no user found for email", { email })
			return null
		}

		logger.info("OneRosterApiClient: successfully fetched user by email", {
			email,
			sourcedId: user.sourcedId
		})
		return user
	}

	/**
	 * Fetches course components with optional filtering.
	 * @param filter The filter query string (e.g., "course.sourcedId='courseid'")
	 * @returns A promise that resolves to an array of course components.
	 */
	public async getCourseComponents(filter?: string): Promise<z.infer<typeof OneRosterCourseComponentReadSchema>[]> {
		logger.info("OneRosterApiClient: fetching course components", { filter })
		const allComponents: z.infer<typeof OneRosterCourseComponentReadSchema>[] = []
		let offset = 0
		const limit = 3000

		while (true) {
			let endpoint = `/ims/oneroster/rostering/v1p2/courses/components?limit=${limit}&offset=${offset}`
			if (filter) {
				endpoint += `&filter=${encodeURIComponent(filter)}`
			}

			const response = await this.#request(endpoint, { method: "GET" }, GetCourseComponentsResponseSchema)

			if (!response || response.courseComponents.length === 0) {
				break
			}

			allComponents.push(...response.courseComponents)
			offset += response.courseComponents.length

			if (response.courseComponents.length < limit) {
				break
			}
		}

		logger.info("OneRosterApiClient: successfully fetched course components", {
			filter,
			count: allComponents.length
		})
		return allComponents
	}

	/**
	 * Fetches all resources for a specific course.
	 * @param courseSourcedId The sourcedId of the course.
	 * @returns A promise that resolves to an array of resources.
	 */
	public async getResourcesForCourse(courseSourcedId: string): Promise<OneRosterResource[]> {
		logger.info("OneRosterApiClient: fetching resources for course", { courseSourcedId })

		if (!courseSourcedId) {
			throw errors.new("courseSourcedId cannot be empty")
		}

		const allResources: OneRosterResource[] = []
		let offset = 0
		const limit = 3000

		while (true) {
			// ✅ CORRECT: Path updated to match the OpenAPI spec - added /resources before /courses
			const endpoint = `/ims/oneroster/resources/v1p2/resources/courses/${courseSourcedId}/resources?limit=${limit}&offset=${offset}`
			const response = await this.#request(endpoint, { method: "GET" }, GetResourcesResponseSchema)

			if (!response || response.resources.length === 0) {
				break
			}

			allResources.push(...response.resources)
			offset += response.resources.length

			if (response.resources.length < limit) {
				break
			}
		}

		logger.info("OneRosterApiClient: successfully fetched resources for course", {
			courseSourcedId,
			count: allResources.length
		})
		return allResources
	}

	/**
	 * Fetches ALL resources in the system, handling pagination.
	 * This is necessary because the API does not support filtering resources by course.
	 * @param filter Optional filter query string (e.g., "sourcedId~'nice:'")
	 * @returns A promise that resolves to an array of all resources.
	 */
	public async getAllResources(filter?: string): Promise<OneRosterResource[]> {
		logger.info("OneRosterApiClient: fetching ALL resources", { filter })
		const allResources: OneRosterResource[] = []
		let offset = 0
		const limit = 3000

		while (true) {
			let endpoint = `/ims/oneroster/resources/v1p2/resources?limit=${limit}&offset=${offset}`
			if (filter) {
				endpoint += `&filter=${encodeURIComponent(filter)}`
			}

			const response = await this.#request(endpoint, { method: "GET" }, GetResourcesResponseSchema)

			// Handle both null response and empty array
			if (!response || !response.resources || response.resources.length === 0) {
				logger.info("OneRosterApiClient: no more resources to fetch", { offset })
				break
			}

			// Parse and validate each resource
			const parsedResources = response.resources.map((resource) => {
				const parsed = OneRosterResourceSchema.parse(resource)
				return parsed
			})

			allResources.push(...parsedResources)
			logger.info("OneRosterApiClient: fetched batch of resources", {
				batch: parsedResources.length,
				total: allResources.length,
				offset
			})

			// Check if we've fetched all resources (response has fewer items than limit)
			if (response.resources.length < limit) {
				logger.info("OneRosterApiClient: reached last page of resources", {
					lastBatchSize: response.resources.length,
					total: allResources.length
				})
				break
			}

			// Move to next page
			offset += response.resources.length
		}

		logger.info("OneRosterApiClient: finished fetching all resources", {
			total: allResources.length,
			filter
		})

		return allResources
	}

	/**
	 * Fetches ALL component-resource relationships in the system, handling pagination.
	 * This is necessary because the API does not support filtering this endpoint by course or component.
	 * @param filter Optional filter query string (e.g., "sourcedId~'nice:'")
	 * @returns A promise that resolves to an array of all component-resource relationships.
	 */
	public async getAllComponentResources(
		filter?: string
	): Promise<z.infer<typeof OneRosterComponentResourceReadSchema>[]> {
		logger.info("OneRosterApiClient: fetching ALL component resources", { filter })
		const allComponentResources: z.infer<typeof OneRosterComponentResourceReadSchema>[] = []
		let offset = 0
		const limit = 3000

		while (true) {
			let endpoint = `/ims/oneroster/rostering/v1p2/courses/component-resources?limit=${limit}&offset=${offset}`
			if (filter) {
				endpoint += `&filter=${encodeURIComponent(filter)}`
			}

			const response = await this.#request(endpoint, { method: "GET" }, GetComponentResourcesResponseSchema)

			if (!response || response.componentResources.length === 0) {
				break
			}

			allComponentResources.push(...response.componentResources)
			offset += response.componentResources.length

			if (response.componentResources.length < limit) {
				break // Last page
			}
		}

		logger.info("OneRosterApiClient: successfully fetched all component resources", {
			count: allComponentResources.length,
			filter
		})
		return allComponentResources
	}
}
