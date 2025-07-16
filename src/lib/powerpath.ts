import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// --- EXPORTED POWERPATH API ERRORS ---
export const ErrPowerPathNotFound = errors.new("powerpath resource not found")
export const ErrPowerPathUnprocessable = errors.new("powerpath request unprocessable/invalid")
export const ErrPowerPathConflict = errors.new("powerpath resource conflict")
export const ErrPowerPathInternalServerError = errors.new("powerpath internal server error")
export const ErrPowerPathForbidden = errors.new("powerpath access forbidden")
export const ErrPowerPathUnauthorized = errors.new("powerpath request unauthorized")
export const ErrPowerPathBadRequest = errors.new("powerpath bad request")

// --- ZOD SCHEMAS ---

// --- Base & Auth Schemas ---
const TokenResponseSchema = z.object({
	access_token: z.string().min(1)
})

// --- Shared & Common Schemas ---
const LessonTypeEnum = z.enum(["powerpath-100", "quiz", "test-out", "placement", "unit-test"])
const ScoreStatusEnum = z.enum(["exempt", "fully graded", "not submitted", "partially graded", "submitted"])

const PowerPathTestQuestionSchema = z.object({
	id: z.string().describe("The ID that represents the question in the test"),
	index: z.number().describe("The index of the question in the test"),
	title: z.string().describe("The title of the question"),
	url: z.string().url().describe("The URL of the QTI question"),
	difficulty: z.enum(["easy", "medium", "hard"]),
	humanApproved: z.boolean().nullable(),
	content: z.object({
		type: z.string().optional(),
		rawXml: z.string().describe("The raw XML question in QTI format")
	}),
	response: z.union([z.string(), z.array(z.string())]).optional(),
	correct: z.boolean().optional(),
	result: z
		.object({
			score: z.number(),
			feedback: z.string()
		})
		.optional(),
	learningObjectives: z.array(z.string()).optional()
})
export type PowerPathTestQuestion = z.infer<typeof PowerPathTestQuestionSchema>

// --- Schemas for Placement Endpoints ---
export const GetAllPlacementTestsInputSchema = z.object({
	student: z.string(),
	subject: z.string().min(1)
})
export type GetAllPlacementTestsInput = z.infer<typeof GetAllPlacementTestsInputSchema>

const PlacementTestResultSchema = z.object({
	component_resources: z.record(z.any()),
	resources: z.record(z.any()),
	resources_metadata: z.record(z.any()),
	assessment_line_items: z.record(z.any()).nullable(),
	assessment_results: z.array(z.record(z.any())).nullable()
})

export const GetAllPlacementTestsResponseSchema = z.object({
	placementTests: z.array(PlacementTestResultSchema)
})
export type GetAllPlacementTestsResponse = z.infer<typeof GetAllPlacementTestsResponseSchema>

export const GetCurrentLevelResponseSchema = z.object({
	gradeLevel: z.number().nullable(),
	onboarded: z.boolean(),
	availableTests: z.number()
})
export type GetCurrentLevelResponse = z.infer<typeof GetCurrentLevelResponseSchema>

export const GetNextPlacementTestResponseSchema = z.object({
	exhaustedTests: z.boolean(),
	gradeLevel: z.number().nullable(),
	lesson: z.string().nullable(),
	onboarded: z.boolean(),
	availableTests: z.number()
})
export type GetNextPlacementTestResponse = z.infer<typeof GetNextPlacementTestResponseSchema>

const SubjectProgressCourseSchema = z.object({
	courseCode: z.string().nullable(),
	dateLastModified: z.string(),
	grades: z.array(z.string()).nullable(),
	level: z.string().nullable(),
	orgSourcedId: z.string(),
	sourcedId: z.string(),
	status: z.string(),
	subjects: z.array(z.string()).nullable(),
	title: z.string()
})

export const GetSubjectProgressResponseSchema = z.object({
	progress: z.array(
		z.object({
			course: SubjectProgressCourseSchema,
			inEnrolled: z.boolean(),
			hasUsedTestOut: z.boolean(),
			testOutLessonId: z.string().nullable(),
			completedLessons: z.number(),
			totalLessons: z.number(),
			totalAttainableXp: z.number(),
			totalXpEarned: z.number()
		})
	)
})
export type GetSubjectProgressResponse = z.infer<typeof GetSubjectProgressResponseSchema>

// --- Schemas for Course Mastery & External Tests ---
const CreateExternalTestOutInputSchema = z.object({
	courseId: z.string(),
	lessonTitle: z.string().optional(),
	launchUrl: z.string().optional(),
	toolProvider: z.literal("edulastic"),
	unitTitle: z.string().optional(),
	courseComponentSourcedId: z.string().optional(),
	vendorId: z.string(),
	description: z.string().optional(),
	resourceMetadata: z.record(z.string(), z.any()).optional(),
	lessonType: z.literal("test-out"),
	xp: z.number().optional()
})
export type CreateExternalTestOutInput = z.infer<typeof CreateExternalTestOutInputSchema>

const CreateExternalPlacementInputSchema = z.object({
	courseId: z.string(),
	lessonTitle: z.string().optional(),
	launchUrl: z.string().optional(),
	toolProvider: z.literal("edulastic"),
	unitTitle: z.string().optional(),
	courseComponentSourcedId: z.string().optional(),
	vendorId: z.string(),
	description: z.string().optional(),
	resourceMetadata: z.record(z.string(), z.any()).optional(),
	lessonType: z.literal("placement"),
	grades: z.array(z.number()),
	courseIdOnFail: z.string().nullable().optional(),
	xp: z.number().optional()
})
export type CreateExternalPlacementInput = z.infer<typeof CreateExternalPlacementInputSchema>

export const CreateExternalTestResponseSchema = z.object({
	lessonType: LessonTypeEnum,
	lessonId: z.string(),
	courseComponentId: z.string(),
	resourceId: z.string(),
	launchUrl: z.string().optional(),
	toolProvider: z.string(),
	vendorId: z.string(),
	courseIdOnFail: z.string().nullable().optional(),
	grades: z.array(z.number()).optional()
})
export type CreateExternalTestResponse = z.infer<typeof CreateExternalTestResponseSchema>

export const ImportExternalTestAssignmentResultsInputSchema = z.object({
	student: z.string(),
	lesson: z.string(),
	applicationName: z.string().optional()
})
export type ImportExternalTestAssignmentResultsInput = z.infer<typeof ImportExternalTestAssignmentResultsInputSchema>

export const MakeExternalTestAssignmentInputSchema = z.object({
	student: z.string(),
	lesson: z.string(),
	applicationName: z.string().optional()
})
export type MakeExternalTestAssignmentInput = z.infer<typeof MakeExternalTestAssignmentInputSchema>

export const MakeExternalTestAssignmentResponseSchema = z.object({
	toolProvider: z.literal("edulastic"),
	lessonType: z.enum(["test-out", "placement", "unit-test"]),
	attempt: z.number(),
	credentials: z.object({
		email: z.string().email(),
		password: z.string()
	}),
	assignmentId: z.string(),
	classId: z.string(),
	testUrl: z.string().url(),
	testId: z.string()
})
export type MakeExternalTestAssignmentResponse = z.infer<typeof MakeExternalTestAssignmentResponseSchema>

const EdulasticCredentialsSchema = z.object({
	email: z.string().email(),
	password: z.string()
})

export const TestOutResultSchema = z.object({
	lessonType: z.literal("test-out"),
	lessonId: z.string().nullable(),
	finalized: z.boolean(),
	toolProvider: z.string().nullable(),
	attempt: z.number().optional(),
	credentials: EdulasticCredentialsSchema.optional(),
	assignmentId: z.string().optional(),
	classId: z.string().optional(),
	testUrl: z.string().url().optional(),
	testId: z.string().optional()
})
export type TestOutResult = z.infer<typeof TestOutResultSchema>

export const ImportExternalTestAssignmentResultsResponseSchema = TestOutResultSchema.extend({
	lessonType: z.enum(["test-out", "placement", "unit-test"]),
	courseIdOnFail: z.string().nullable(),
	hasFallbackCourse: z.boolean()
})
export type ImportExternalTestAssignmentResultsResponse = z.infer<
	typeof ImportExternalTestAssignmentResultsResponseSchema
>

// --- Schemas for Lesson Mastery ---
export const GetAttemptsInputSchema = z.object({
	student: z.string(),
	lesson: z.string()
})
export type GetAttemptsInput = z.infer<typeof GetAttemptsInputSchema>

const AttemptSchema = z.object({
	attempt: z.number().nullable(),
	score: z.number(),
	scoreStatus: ScoreStatusEnum,
	startedAt: z.string().datetime().nullable(),
	completedAt: z.string().datetime().nullable()
})
export type Attempt = z.infer<typeof AttemptSchema>

export const GetAttemptsResponseSchema = z.object({
	attempts: z.array(AttemptSchema)
})
export type GetAttemptsResponse = z.infer<typeof GetAttemptsResponseSchema>

export const GetNextQuestionResponseSchema = z.object({
	score: z.number(),
	question: PowerPathTestQuestionSchema
})
export type GetNextQuestionResponse = z.infer<typeof GetNextQuestionResponseSchema>

export const FinalStudentAssessmentResponseSchema = z.object({
	lessonType: z.enum(["quiz", "test-out", "placement", "unit-test"]),
	finalized: z.boolean(),
	attempt: z.number()
})
export type FinalStudentAssessmentResponse = z.infer<typeof FinalStudentAssessmentResponseSchema>

export const CreateNewAttemptInputSchema = z.object({
	student: z.string(),
	lesson: z.string()
})
export type CreateNewAttemptInput = z.infer<typeof CreateNewAttemptInputSchema>

export const CreateNewAttemptResponseSchema = z.object({
	attempt: AttemptSchema
})
export type CreateNewAttemptResponse = z.infer<typeof CreateNewAttemptResponseSchema>

export const ResetAttemptResponseSchema = z.object({
	success: z.boolean(),
	score: z.number()
})
export type ResetAttemptResponse = z.infer<typeof ResetAttemptResponseSchema>

export const UpdateStudentQuestionResponseInputSchema = z.object({
	student: z.string(),
	question: z.string(),
	response: z.union([z.string(), z.array(z.string())]),
	lesson: z.string()
})
export type UpdateStudentQuestionResponseInput = z.infer<typeof UpdateStudentQuestionResponseInputSchema>

const PowerPath100UpdateResponseSchema = z.object({
	lessonType: z.literal("powerpath-100"),
	powerpathScore: z.number(),
	responseResult: z.object({ score: z.number(), feedback: z.string().optional() }),
	questionResult: z.record(z.any()).optional(),
	testResult: z.record(z.any()).optional(),
	accuracy: z.number(),
	correctQuestions: z.number(),
	totalQuestions: z.number(),
	xp: z.number().nullable(),
	multiplier: z.number().nullable()
})

const BaseTestUpdateResponseSchema = z.object({
	questionResult: z.record(z.any()).optional()
})

const QuizUpdateResponseSchema = BaseTestUpdateResponseSchema.extend({
	lessonType: z.literal("quiz")
})
const TestOutUpdateResponseSchema = BaseTestUpdateResponseSchema.extend({
	lessonType: z.literal("test-out")
})
const PlacementUpdateResponseSchema = BaseTestUpdateResponseSchema.extend({
	lessonType: z.literal("placement")
})
const UnitTestUpdateResponseSchema = BaseTestUpdateResponseSchema.extend({
	lessonType: z.literal("unit-test")
})

export const UpdateStudentQuestionResponseResultSchema = z.discriminatedUnion("lessonType", [
	PowerPath100UpdateResponseSchema,
	QuizUpdateResponseSchema,
	TestOutUpdateResponseSchema,
	PlacementUpdateResponseSchema,
	UnitTestUpdateResponseSchema
])
export type UpdateStudentQuestionResponseResult = z.infer<typeof UpdateStudentQuestionResponseResultSchema>

const PowerPath100ProgressResultSchema = z.object({
	lessonType: z.literal("powerpath-100"),
	remainingQuestionsPerDifficulty: z.object({
		easy: z.number(),
		medium: z.number(),
		hard: z.number()
	}),
	score: z.number(),
	seenQuestions: z.array(PowerPathTestQuestionSchema),
	attempt: z.number(),
	xp: z.number().nullable(),
	multiplier: z.number().nullable(),
	accuracy: z.number(),
	correctQuestions: z.number(),
	totalQuestions: z.number()
})

const TestProgressResultSchema = z.object({
	lessonType: z.enum(["quiz", "test-out", "placement", "unit-test"]),
	finalized: z.boolean(),
	score: z.number().optional(),
	questions: z.array(PowerPathTestQuestionSchema),
	toolProvider: z.string().nullable(),
	attempt: z.number(),
	xp: z.number().nullable(),
	multiplier: z.number().nullable(),
	accuracy: z.number(),
	correctQuestions: z.number(),
	totalQuestions: z.number()
})

export const GetAssessmentProgressResponseSchema = z.discriminatedUnion("lessonType", [
	PowerPath100ProgressResultSchema,
	TestProgressResultSchema
])
export type GetAssessmentProgressResponse = z.infer<typeof GetAssessmentProgressResponseSchema>

// --- API CLIENT ---

type ApiClientConfig = {
	serverUrl: string
	tokenUrl: string
	clientId: string
	clientSecret: string
}

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

		if (tokenResult.error) {
			throw tokenResult.error
		}
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
		const headers = {
			...options.headers,
			Authorization: `Bearer ${this.#accessToken}`
		}

		const fetchResult = await errors.try(fetch(url, { ...options, headers }))
		if (fetchResult.error) {
			logger.error("powerpath api request failed", { error: fetchResult.error, endpoint })
			throw errors.wrap(fetchResult.error, "powerpath api request")
		}

		const response = fetchResult.data
		if (!response.ok) {
			const errorBody = await response.text()
			logger.error("powerpath api returned non-ok status", {
				status: response.status,
				body: errorBody,
				endpoint
			})
			if (response.status === 400) throw errors.wrap(ErrPowerPathBadRequest, `status 400 on ${endpoint}`)
			if (response.status === 401) throw errors.wrap(ErrPowerPathUnauthorized, `status 401 on ${endpoint}`)
			if (response.status === 403) throw errors.wrap(ErrPowerPathForbidden, `status 403 on ${endpoint}`)
			if (response.status === 404) throw errors.wrap(ErrPowerPathNotFound, `status 404 on ${endpoint}`)
			if (response.status === 409) throw errors.wrap(ErrPowerPathConflict, `status 409 on ${endpoint}`)
			if (response.status === 422)
				throw errors.wrap(ErrPowerPathUnprocessable, `status 422 on ${endpoint}: ${errorBody}`)
			if (response.status >= 500)
				throw errors.wrap(ErrPowerPathInternalServerError, `status ${response.status} on ${endpoint}: ${errorBody}`)

			throw errors.new(`powerpath api error: status ${response.status} on ${endpoint}`)
		}

		if (response.status === 204) {
			return schema.parse(null)
		}

		const jsonResult = await errors.try(response.json())
		if (jsonResult.error) {
			logger.error("powerpath api: failed to parse json response", { error: jsonResult.error, endpoint })
			throw errors.wrap(jsonResult.error, "powerpath api response parsing")
		}

		logger.debug("powerpath api: raw response", { endpoint, response: jsonResult.data })
		const validation = schema.safeParse(jsonResult.data)
		if (!validation.success) {
			logger.error("powerpath api: invalid response schema", {
				error: validation.error,
				endpoint,
				rawResponse: jsonResult.data
			})
			throw errors.wrap(validation.error, "powerpath api response validation")
		}
		return validation.data
	}

	async getAllPlacementTests(input: GetAllPlacementTestsInput): Promise<GetAllPlacementTestsResponse> {
		const validation = GetAllPlacementTestsInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "getAllPlacementTests input validation")
		}
		const params = new URLSearchParams(validation.data)
		return this.#request(
			`/powerpath/placement/getAllPlacementTests?${params.toString()}`,
			{ method: "GET" },
			GetAllPlacementTestsResponseSchema
		)
	}

	async getCurrentLevel(input: { student: string; subject: string }): Promise<GetCurrentLevelResponse> {
		const params = new URLSearchParams(input)
		return this.#request(
			`/powerpath/placement/getCurrentLevel?${params.toString()}`,
			{ method: "GET" },
			GetCurrentLevelResponseSchema
		)
	}

	async getNextPlacementTest(input: { student: string; subject: string }): Promise<GetNextPlacementTestResponse> {
		const params = new URLSearchParams(input)
		return this.#request(
			`/powerpath/placement/getNextPlacementTest?${params.toString()}`,
			{ method: "GET" },
			GetNextPlacementTestResponseSchema
		)
	}

	async getSubjectProgress(input: { student: string; subject: string }): Promise<GetSubjectProgressResponse> {
		const params = new URLSearchParams(input)
		return this.#request(
			`/powerpath/placement/getSubjectProgress?${params.toString()}`,
			{ method: "GET" },
			GetSubjectProgressResponseSchema
		)
	}

	async createExternalTest(
		input: CreateExternalTestOutInput | CreateExternalPlacementInput
	): Promise<CreateExternalTestResponse> {
		const endpoint =
			input.lessonType === "placement" ? "/powerpath/createExternalPlacementTest" : "/powerpath/createExternalTestOut"

		const validation =
			input.lessonType === "placement"
				? CreateExternalPlacementInputSchema.safeParse(input)
				: CreateExternalTestOutInputSchema.safeParse(input)

		if (!validation.success) {
			throw errors.wrap(validation.error, `createExternalTest input validation for ${input.lessonType}`)
		}

		return this.#request(
			endpoint,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			CreateExternalTestResponseSchema
		)
	}

	async makeExternalTestAssignment(
		input: MakeExternalTestAssignmentInput
	): Promise<MakeExternalTestAssignmentResponse> {
		const validation = MakeExternalTestAssignmentInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "makeExternalTestAssignment input validation")
		}
		return this.#request(
			"/powerpath/makeExternalTestAssignment",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			MakeExternalTestAssignmentResponseSchema
		)
	}

	async getTestOut(input: { student: string; course: string }): Promise<TestOutResult> {
		const params = new URLSearchParams(input)
		return this.#request(`/powerpath/testOut?${params.toString()}`, { method: "GET" }, TestOutResultSchema)
	}

	async createNewAttempt(input: CreateNewAttemptInput): Promise<CreateNewAttemptResponse> {
		const validation = CreateNewAttemptInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "createNewAttempt input validation")
		}
		return this.#request(
			"/powerpath/createNewAttempt",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			CreateNewAttemptResponseSchema
		)
	}

	async finalStudentAssessmentResponse(input: {
		student: string
		lesson: string
	}): Promise<FinalStudentAssessmentResponse> {
		return this.#request(
			"/powerpath/finalStudentAssessmentResponse",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input)
			},
			FinalStudentAssessmentResponseSchema
		)
	}

	async getAssessmentProgress(input: {
		student: string
		lesson: string
		attempt?: string
	}): Promise<GetAssessmentProgressResponse> {
		const params = new URLSearchParams(input)
		return this.#request(
			`/powerpath/getAssessmentProgress?${params.toString()}`,
			{ method: "GET" },
			GetAssessmentProgressResponseSchema
		)
	}

	async getAttempts(input: GetAttemptsInput): Promise<GetAttemptsResponse> {
		const validation = GetAttemptsInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "getAttempts input validation")
		}
		const params = new URLSearchParams(validation.data)
		return this.#request(`/powerpath/getAttempts?${params.toString()}`, { method: "GET" }, GetAttemptsResponseSchema)
	}

	async getNextQuestion(input: { student: string; lesson: string }): Promise<GetNextQuestionResponse> {
		const params = new URLSearchParams(input)
		return this.#request(
			`/powerpath/getNextQuestion?${params.toString()}`,
			{ method: "GET" },
			GetNextQuestionResponseSchema
		)
	}

	async resetAttempt(input: { student: string; lesson: string }): Promise<ResetAttemptResponse> {
		return this.#request(
			"/powerpath/resetAttempt",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(input)
			},
			ResetAttemptResponseSchema
		)
	}

	async updateStudentQuestionResponse(
		input: UpdateStudentQuestionResponseInput
	): Promise<UpdateStudentQuestionResponseResult> {
		const validation = UpdateStudentQuestionResponseInputSchema.safeParse(input)
		if (!validation.success) {
			throw errors.wrap(validation.error, "updateStudentQuestionResponse input validation")
		}
		return this.#request(
			"/powerpath/updateStudentQuestionResponse",
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(validation.data)
			},
			UpdateStudentQuestionResponseResultSchema
		)
	}
}
