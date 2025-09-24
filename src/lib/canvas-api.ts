import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

// =================================================================================
// Zod Schemas for Canvas GraphQL "GetCourseModules" shape
// =================================================================================

const UserRefSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		__typename: z.string()
	})
	.strict()

const AssessmentRequestSchema = z
	.object({
		id: z.string(),
		anonymousId: z.string().optional(),
		available: z.boolean().optional(),
		createdAt: z.string().optional(),
		workflowState: z.string().optional(),
		user: UserRefSchema.optional(),
		anonymizedUser: UserRefSchema.optional(),
		__typename: z.string()
	})
	.strict()

const PeerReviewsSchema = z
	.object({
		anonymousReviews: z.boolean(),
		__typename: z.literal("PeerReviews")
	})
	.strict()

const AssignmentContentSchema = z
	.object({
		__typename: z.literal("Assignment"),
		name: z.string().optional(),
		_id: z.string().optional(),
		peerReviews: PeerReviewsSchema.optional(),
		assessmentRequestsForCurrentUser: z.array(AssessmentRequestSchema).optional()
	})
	.strict()

const PageContentSchema = z
	.object({
		__typename: z.literal("Page")
	})
	.strict()

const QuizContentSchema = z
	.object({
		__typename: z.literal("Quiz")
	})
	.strict()

const ExternalUrlContentSchema = z
	.object({
		__typename: z.literal("ExternalUrl")
	})
	.strict()

const SubHeaderContentSchema = z
	.object({
		__typename: z.literal("SubHeader")
	})
	.strict()

const ModuleItemContentSchema = z.union([
	AssignmentContentSchema,
	PageContentSchema,
	QuizContentSchema,
	ExternalUrlContentSchema,
	SubHeaderContentSchema
])

const ModuleItemSchema = z
	.object({
		content: ModuleItemContentSchema,
		__typename: z.literal("ModuleItem")
	})
	.strict()

const ModuleSchema = z
	.object({
		id: z.string(),
		moduleItems: z.array(ModuleItemSchema),
		__typename: z.literal("Module")
	})
	.strict()

const ModulesConnectionSchema = z
	.object({
		nodes: z.array(ModuleSchema),
		__typename: z.literal("ModuleConnection")
	})
	.strict()

const GetCourseModulesResponseSchema = z.object({
	data: z.object({
		course: z
			.object({
				modulesConnection: ModulesConnectionSchema,
				__typename: z.literal("Course")
			})
			.nullable()
	})
})

export type GetCourseModulesResponse = z.infer<typeof GetCourseModulesResponseSchema>

// =================================================================================
// Relay pagination primitives (pageInfo + generic connection builder)
// =================================================================================

const PageInfoSchema = z
	.object({
		hasNextPage: z.boolean(),
		endCursor: z.string().nullable().optional(),
		__typename: z.string().optional()
	})
	.strict()

// =================================================================================
// note: avoid a generic connection builder because zod loses node typing
// which degrades to unknown[] and harms type safety.

// =================================================================================
// Helpers
// =================================================================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function retryWithBackoff<T>(
	fn: () => Promise<T>,
	options: { retries: number; initialDelay: number }
): Promise<{ data: T | null; error: Error | null }> {
	let lastError: Error | null = null
    const attempts = Math.max(1, options.retries)
    for (let i = 0; i < attempts; i++) {
		const result = await errors.try(fn())
		if (result.error) {
			lastError = result.error
			const delay = options.initialDelay * 2 ** i
			logger.warn("operation failed, retrying after delay", {
				attempt: i + 1,
                maxRetries: attempts,
				delayMs: delay,
				error: lastError
			})
			await sleep(delay)
		} else {
			return { data: result.data, error: null }
		}
	}
	return { data: null, error: lastError }
}

export function assertSchema<T>(schema: z.ZodType<T>, raw: unknown): T {
	const result = schema.safeParse(raw)
	if (!result.success) {
		logger.error("Zod validation failed", { error: result.error })
		throw errors.wrap(result.error, "canvas-api: schema validation failed")
	}
	return result.data
}

// =================================================================================
// Canvas GraphQL Client
// =================================================================================

export interface CanvasClientOptionsCookieAuth {
    baseUrl: string
    cookie: string
    csrfToken: string
    userAgent?: string
}

export interface CanvasClientOptionsTokenAuth {
    baseUrl: string
    token: string
    userAgent?: string
}

export type CanvasClientOptions = CanvasClientOptionsCookieAuth | CanvasClientOptionsTokenAuth

export class CanvasClient {
	#baseUrl: string
	#headers: HeadersInit

    constructor(options: CanvasClientOptions) {
        this.#baseUrl = options.baseUrl.replace(/\/$/, "")
        const userAgent =
            options.userAgent ??
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36"

        // explicit auth mode selection: either token auth OR cookie+csrf
        if ("token" in options) {
            this.#headers = {
                accept: "*/*",
                "content-type": "application/json",
                authorization: `Bearer ${options.token}`,
                "user-agent": userAgent
            }
            return
        }

        this.#headers = {
            accept: "*/*",
            "content-type": "application/json",
            "x-requested-with": "XMLHttpRequest",
            "x-csrf-token": options.csrfToken,
            "user-agent": userAgent,
            cookie: options.cookie
        }
    }

	private async graphQL(body: unknown): Promise<unknown> {
		const url = `${this.#baseUrl}/api/graphql`
		logger.info("canvas graphql request", { url })
		const fetchResult = await errors.try(
			fetch(url, {
				method: "POST",
				headers: this.#headers,
				body: JSON.stringify(body)
			})
		)
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		const response = fetchResult.data
		if (!response.ok) {
			const textResult = await errors.try(response.text())
			if (textResult.error) {
				logger.error("canvas-api: request failed and body parse failed", {
					status: response.status,
					error: textResult.error
				})
				throw errors.new(`canvas-api: request failed with status ${response.status}`)
			}
			logger.error("canvas-api: request failed", { status: response.status, body: textResult.data })
			throw errors.new(`canvas-api: request failed with status ${response.status}`)
		}
		const textResult = await errors.try(response.text())
		if (textResult.error) {
			logger.error("canvas-api: failed to read response body", { error: textResult.error })
			throw errors.wrap(textResult.error, "canvas-api: failed to read response body")
		}
		const parseResult = errors.trySync(() => JSON.parse(textResult.data))
		if (parseResult.error) {
			logger.error("canvas-api: failed to parse json response", {
				error: parseResult.error,
				snippet: textResult.data.slice(0, 500)
			})
			throw errors.wrap(parseResult.error, "canvas-api: failed to parse json response")
		}
		const json: unknown = parseResult.data
		// detect graphql-level errors
		const maybeErrors = (json as { errors?: Array<{ message?: string; path?: unknown; extensions?: unknown }> }).errors
		if (Array.isArray(maybeErrors) && maybeErrors.length > 0) {
			logger.error("canvas-api: graphql returned errors", { errors: maybeErrors })
			throw errors.new("canvas-api: graphql error")
		}
		return json
	}

	// public raw query helper for dynamic scraping/introspection
	async rawQuery(operationName: string, query: string, variables?: Record<string, unknown>): Promise<unknown> {
		const body: Record<string, unknown> = { operationName, query }
		if (variables) {
			body.variables = variables
		}
		const result = await retryWithBackoff(() => this.graphQL(body), { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			logger.error("canvas-api: rawQuery failed", { operationName, error: result.error, hasData: !!result.data })
			throw result.error || errors.new("canvas-api: unexpected null result from rawQuery")
		}
		return result.data
	}

private async paginateConnection<TNode, TPageInfo extends { hasNextPage: boolean; endCursor?: string | null }>(
		fetchPage: (after: string | null) => Promise<{ nodes: TNode[]; pageInfo: TPageInfo }>,
	): Promise<TNode[]> {
		let after: string | null = null
		const allNodes: TNode[] = []
		for (;;) {
			const { nodes, pageInfo } = await fetchPage(after)
			if (nodes.length > 0) {
				allNodes.push(...nodes)
			}
			if (!pageInfo.hasNextPage) {
				return allNodes
			}
			after = (pageInfo.endCursor ?? null)
		}
	}

	async getCourseModules(courseId: string): Promise<GetCourseModulesResponse> {
		logger.info("fetching course modules", { courseId })
		const operationName = "GetCourseModules"
		const query =
			"query GetCourseModules($courseId: ID!) {\n  course(id: $courseId) {\n    modulesConnection {\n      nodes {\n        id: _id\n        moduleItems {\n          content {\n            ... on Assignment {\n              name\n              _id\n              peerReviews {\n                anonymousReviews\n                __typename\n              }\n              assessmentRequestsForCurrentUser {\n                id: _id\n                anonymousId\n                available\n                createdAt\n                workflowState\n                user {\n                  id: _id\n                  name\n                  __typename\n                }\n                anonymizedUser {\n                  id: _id\n                  name\n                  __typename\n                }\n                __typename\n              }\n              __typename\n            }\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"

		const body = { operationName, variables: { courseId }, query }

		const result = await retryWithBackoff(() => this.graphQL(body), {
			retries: 3,
			initialDelay: 1000
		})
		if (result.error || !result.data) {
			logger.error("getCourseModules failed", { error: result.error, hasData: !!result.data })
			throw result.error || errors.new("canvas-api: unexpected null result from getCourseModules")
		}
		const data = assertSchema(GetCourseModulesResponseSchema, result.data)
		return data
	}

	// =================================================================================
	// GraphQL: node / legacyNode helpers
	// =================================================================================

	private static readonly NodePayloadSchema = z.object({
		data: z.object({ node: z.object({ __typename: z.string() }).passthrough().nullable() })
	})

	async getNode(id: string): Promise<z.infer<typeof CanvasClient.NodePayloadSchema>["data"]["node"]> {
		logger.info("fetching graphql node", { id })
		const operationName = "GetNode"
		const query =
			"query GetNode($id: ID!) {\n  node(id: $id) {\n    __typename\n  }\n}"
		const body = { operationName, variables: { id }, query }
		const result = await retryWithBackoff(() => this.graphQL(body), { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			logger.error("getNode failed", { error: result.error, hasData: !!result.data })
			throw result.error || errors.new("canvas-api: unexpected null result from getNode")
		}
		const parsed = CanvasClient.NodePayloadSchema.safeParse(result.data)
		if (!parsed.success) {
			logger.error("Zod validation failed", { error: parsed.error })
			throw errors.wrap(parsed.error, "canvas-api: schema validation failed")
		}
		return parsed.data.data.node
	}

	private static readonly LegacyNodePayloadSchema = z.object({
		data: z.object({
			legacyNode: z.object({ __typename: z.string() }).passthrough().nullable()
		})
	})

	async getLegacyNode(
		_id: string,
		typeToken: string
	): Promise<z.infer<typeof CanvasClient.LegacyNodePayloadSchema>["data"]["legacyNode"]> {
		logger.info("fetching graphql legacyNode", { _id, type: typeToken })
		// embed enum token literally to satisfy schema (variables cannot use String for enum types)
		// validate token is safe (upper snake case)
		const isValidToken = /^[A-Z_]+$/.test(typeToken)
		if (!isValidToken) {
			logger.error("invalid legacyNode type token", { type: typeToken })
			throw errors.new("canvas-api: invalid legacy node type token")
		}
		const operationName = "GetLegacyNode"
		const query =
			`query GetLegacyNode($_id: ID!) {\n  legacyNode(_id: $_id, type: ${typeToken}) {\n    __typename\n  }\n}`
		const body = { operationName, variables: { _id }, query }
		const result = await retryWithBackoff(() => this.graphQL(body), { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			logger.error("getLegacyNode failed", { error: result.error, hasData: !!result.data })
			throw result.error || errors.new("canvas-api: unexpected null result from getLegacyNode")
		}
		const parsed = CanvasClient.LegacyNodePayloadSchema.safeParse(result.data)
		if (!parsed.success) {
			logger.error("Zod validation failed", { error: parsed.error })
			throw errors.wrap(parsed.error, "canvas-api: schema validation failed")
		}
		return parsed.data.data.legacyNode
	}

	// =================================================================================
	// GraphQL: list assignments/pages/quizzes with relay pagination
	// =================================================================================

	private static readonly AssignmentNodeSchema = z
		.object({
			_id: z.string(),
			name: z.string().nullable().optional(),
			__typename: z.literal("Assignment").optional()
		})
		.strict()

	private static readonly AssignmentsConnectionSchema = z
		.object({
			nodes: z.array(CanvasClient.AssignmentNodeSchema),
			pageInfo: PageInfoSchema,
			__typename: z.string().optional()
		})
		.strict()

	private static readonly AssignmentsResponseSchema = z.object({
		data: z.object({
			course: z
				.object({ assignmentsConnection: CanvasClient.AssignmentsConnectionSchema, __typename: z.string().optional() })
				.nullable()
		})
	})

	async listCourseAssignments(courseId: string): Promise<z.infer<typeof CanvasClient.AssignmentNodeSchema>[]> {
		logger.info("listing course assignments", { courseId })
		const operationName = "ListCourseAssignments"
		const query =
			"query ListCourseAssignments($courseId: ID!, $first: Int!, $after: String) {\n  course(id: $courseId) {\n    assignmentsConnection(first: $first, after: $after) {\n      nodes {\n        _id\n        name\n        __typename\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"

		const pageFetcher = async (after: string | null): Promise<{ nodes: z.infer<typeof CanvasClient.AssignmentNodeSchema>[]; pageInfo: z.infer<typeof PageInfoSchema> }> => {
			const variables = { courseId, first: 50, after }
			const body = { operationName, variables, query }
			const result = await retryWithBackoff(() => this.graphQL(body), { retries: 3, initialDelay: 1000 })
			if (result.error || !result.data) {
				logger.error("listCourseAssignments page fetch failed", { error: result.error, hasData: !!result.data })
				throw result.error || errors.new("canvas-api: unexpected null result from listCourseAssignments")
			}
			const parsed = CanvasClient.AssignmentsResponseSchema.safeParse(result.data)
			if (!parsed.success) {
				logger.error("Zod validation failed", { error: parsed.error })
				throw errors.wrap(parsed.error, "canvas-api: schema validation failed")
			}
			if (!parsed.data.data.course) {
				logger.error("graphql course not found", { courseId })
				throw errors.new("canvas-api: course not found")
			}
			return {
				nodes: parsed.data.data.course.assignmentsConnection.nodes,
				pageInfo: parsed.data.data.course.assignmentsConnection.pageInfo
			}
		}

		const nodes = await this.paginateConnection(pageFetcher)
		return nodes
	}

	private static readonly PageNodeSchema = z
		.object({
			_id: z.string().optional(),
			title: z.string().nullable().optional(),
			url: z.string().nullable().optional(),
			__typename: z.literal("Page").optional()
		})
		.strict()

	private static readonly PagesConnectionSchema = z
		.object({
			nodes: z.array(CanvasClient.PageNodeSchema),
			pageInfo: PageInfoSchema,
			__typename: z.string().optional()
		})
		.strict()

	private static readonly PagesResponseSchema = z.object({
		data: z.object({
			course: z
				.object({ pagesConnection: CanvasClient.PagesConnectionSchema, __typename: z.string().optional() })
				.nullable()
		})
	})

	async listCoursePages(courseId: string): Promise<z.infer<typeof CanvasClient.PageNodeSchema>[]> {
		logger.info("listing course pages", { courseId })
		const operationName = "ListCoursePages"
		const query =
			"query ListCoursePages($courseId: ID!, $first: Int!, $after: String) {\n  course(id: $courseId) {\n    pagesConnection(first: $first, after: $after) {\n      nodes {\n        _id\n        title\n        __typename\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"

		const pageFetcher = async (after: string | null): Promise<{ nodes: z.infer<typeof CanvasClient.PageNodeSchema>[]; pageInfo: z.infer<typeof PageInfoSchema> }> => {
			const variables = { courseId, first: 50, after }
			const body = { operationName, variables, query }
			const result = await retryWithBackoff(() => this.graphQL(body), { retries: 3, initialDelay: 1000 })
			if (result.error || !result.data) {
				logger.error("listCoursePages page fetch failed", { error: result.error, hasData: !!result.data })
				throw result.error || errors.new("canvas-api: unexpected null result from listCoursePages")
			}
			const parsed = CanvasClient.PagesResponseSchema.safeParse(result.data)
			if (!parsed.success) {
				logger.error("Zod validation failed", { error: parsed.error })
				throw errors.wrap(parsed.error, "canvas-api: schema validation failed")
			}
			if (!parsed.data.data.course) {
				logger.error("graphql course not found", { courseId })
				throw errors.new("canvas-api: course not found")
			}
			return {
				nodes: parsed.data.data.course.pagesConnection.nodes,
				pageInfo: parsed.data.data.course.pagesConnection.pageInfo
			}
		}

		const nodes = await this.paginateConnection(pageFetcher)
		return nodes
	}

	private static readonly QuizNodeSchema = z
		.object({
			_id: z.string(),
			title: z.string().nullable().optional(),
			__typename: z.literal("Quiz").optional()
		})
		.strict()

	private static readonly QuizzesConnectionSchema = z
		.object({
			nodes: z.array(CanvasClient.QuizNodeSchema),
			pageInfo: PageInfoSchema,
			__typename: z.string().optional()
		})
		.strict()

	private static readonly QuizzesResponseSchema = z.object({
		data: z.object({
			course: z
				.object({ quizzesConnection: CanvasClient.QuizzesConnectionSchema, __typename: z.string().optional() })
				.nullable()
		})
	})

	async listCourseQuizzes(courseId: string): Promise<z.infer<typeof CanvasClient.QuizNodeSchema>[]> {
		logger.info("listing course quizzes", { courseId })
		const operationName = "ListCourseQuizzes"
		const query =
			"query ListCourseQuizzes($courseId: ID!, $first: Int!, $after: String) {\n  course(id: $courseId) {\n    quizzesConnection(first: $first, after: $after) {\n      nodes {\n        _id\n        title\n        __typename\n      }\n      pageInfo {\n        hasNextPage\n        endCursor\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}"

		const pageFetcher = async (after: string | null): Promise<{ nodes: z.infer<typeof CanvasClient.QuizNodeSchema>[]; pageInfo: z.infer<typeof PageInfoSchema> }> => {
			const variables = { courseId, first: 50, after }
			const body = { operationName, variables, query }
			const result = await retryWithBackoff(() => this.graphQL(body), { retries: 3, initialDelay: 1000 })
			if (result.error || !result.data) {
				logger.error("listCourseQuizzes page fetch failed", { error: result.error, hasData: !!result.data })
				throw result.error || errors.new("canvas-api: unexpected null result from listCourseQuizzes")
			}
			const parsed = CanvasClient.QuizzesResponseSchema.safeParse(result.data)
			if (!parsed.success) {
				logger.error("Zod validation failed", { error: parsed.error })
				throw errors.wrap(parsed.error, "canvas-api: schema validation failed")
			}
			if (!parsed.data.data.course) {
				logger.error("graphql course not found", { courseId })
				throw errors.new("canvas-api: course not found")
			}
			return {
				nodes: parsed.data.data.course.quizzesConnection.nodes,
				pageInfo: parsed.data.data.course.quizzesConnection.pageInfo
			}
		}

		const nodes = await this.paginateConnection(pageFetcher)
		return nodes
	}

	// =================================================================================
	// GraphQL Introspection (pruned)
	// =================================================================================

	private static readonly IntrospectionSchema = z
		.object({
			data: z.object({
				__schema: z.object({
					types: z
						.array(
							z
								.object({
									kind: z.string(),
									name: z.string(),
									fields: z
										.array(z.object({ name: z.string() }).strict())
										.nullable()
										.optional()
								})
								.strict()
						)
						.optional(),
					queryType: z.object({ name: z.string() }).strict().optional(),
					mutationType: z.object({ name: z.string() }).strict().nullable().optional(),
					subscriptionType: z.object({ name: z.string() }).strict().nullable().optional()
				}).strict()
			})
		})

	async introspect(): Promise<{
		queryTypeName: string | null
		mutationTypeName: string | null
		subscriptionTypeName: string | null
		types: { name: string; kind: string; fieldNames: string[] }[]
	}> {
		logger.info("graphql introspection starting", {})
		const operationName = "IntrospectionQuery"
		const query =
			"query IntrospectionQuery {\n  __schema {\n    queryType { name }\n    mutationType { name }\n    subscriptionType { name }\n    types {\n      kind\n      name\n      fields { name }\n    }\n  }\n}"
		const body = { operationName, query }
		const result = await retryWithBackoff(() => this.graphQL(body), { retries: 3, initialDelay: 1000 })
		if (result.error || !result.data) {
			logger.error("introspection fetch failed", { error: result.error, hasData: !!result.data })
			throw result.error || errors.new("canvas-api: unexpected null result from introspection")
		}
		const parsed = CanvasClient.IntrospectionSchema.safeParse(result.data)
		if (!parsed.success) {
			logger.error("Zod validation failed", { error: parsed.error })
			throw errors.wrap(parsed.error, "canvas-api: schema validation failed")
		}
		const schema = parsed.data.data.__schema
		const types = (schema.types ?? []).map((t) => ({
			name: t.name,
			kind: t.kind,
			fieldNames: (t.fields ?? []).map((f) => f.name)
		}))
		return {
			queryTypeName: schema.queryType ? schema.queryType.name : null,
			mutationTypeName: schema.mutationType ? schema.mutationType.name : null,
			subscriptionTypeName: schema.subscriptionType ? schema.subscriptionType.name : null,
			types
		}
	}

	// =================================================================================
	// Classic Quizzes (REST)
	// =================================================================================

	// Schemas for classic quiz meta and submission questions
	private static readonly QuizMetaSchema = z
		.object({
			id: z.number(),
			title: z.string(),
			quiz_type: z.string(),
			points_possible: z.number().nullable().optional(),
			question_count: z.number(),
			question_types: z.array(z.string()).optional(),
			html_url: z.string().url()
		})
		.passthrough()

	private static readonly MCAnswerSchema = z
		.object({
			id: z.number(),
			text: z.string().nullable().optional(),
			html: z.string().nullable().optional()
		})
		.strict()

	private static readonly MCQuestionSchema = z
		.object({
			id: z.number(),
			question_type: z.literal("multiple_choice_question"),
			question_name: z.string(),
			question_text: z.string(),
			answers: z.array(CanvasClient.MCAnswerSchema),
			answer: z.string().nullable()
		})
		.strict()

	private static readonly MatchingPairSchema = z
		.object({
			id: z.number(),
			left: z.string().nullable().optional(),
			right: z.string().nullable().optional(),
			text: z.string().nullable().optional(),
			html: z.string().nullable().optional()
		})
		.strict()

	private static readonly MatchingQuestionSchema = z
		.object({
			id: z.number(),
			question_type: z.literal("matching_question"),
			question_name: z.string(),
			question_text: z.string(),
			answers: z.array(CanvasClient.MatchingPairSchema),
			matches: z.array(CanvasClient.MatchingPairSchema),
			answer: z.array(z.record(z.string(), z.unknown())).nullable().optional()
		})
		.strict()

	// Generic fallback for all other question types
	private static readonly GenericQuestionSchema = z
		.object({
			id: z.number(),
			question_type: z.string()
		})
		.passthrough()

	private static readonly QuizSubmissionQuestionsSchema = z.object({
		quiz_submission_questions: z.array(
			z.union([CanvasClient.MCQuestionSchema, CanvasClient.MatchingQuestionSchema, CanvasClient.GenericQuestionSchema])
		)
	})

	async getClassicQuizMeta(courseId: string, quizId: string): Promise<z.infer<typeof CanvasClient.QuizMetaSchema>> {
		logger.info("fetching classic quiz meta", { courseId, quizId })
		const url = `${this.#baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}`
		const fetchResult = await errors.try(
			fetch(url, {
				method: "GET",
				headers: this.#headers,
				credentials: "include"
			})
		)
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		if (!fetchResult.data.ok) {
			logger.error("canvas-api: request failed", { status: fetchResult.data.status, url })
			throw errors.new(`canvas-api: request failed with status ${fetchResult.data.status}`)
		}
		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
		}
		const data = assertSchema(CanvasClient.QuizMetaSchema, jsonResult.data)
		return data
	}

	async getClassicQuizSubmissionQuestions(
		submissionId: string
	): Promise<z.infer<typeof CanvasClient.QuizSubmissionQuestionsSchema>> {
		logger.info("fetching classic quiz submission questions", { submissionId })
		const url = `${this.#baseUrl}/api/v1/quiz_submissions/${submissionId}/questions`
		const fetchResult = await errors.try(
			fetch(url, {
				method: "GET",
				headers: this.#headers,
				credentials: "include"
			})
		)
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		if (!fetchResult.data.ok) {
			logger.error("canvas-api: request failed", { status: fetchResult.data.status, url })
			throw errors.new(`canvas-api: request failed with status ${fetchResult.data.status}`)
		}
		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
		}
		const data = assertSchema(CanvasClient.QuizSubmissionQuestionsSchema, jsonResult.data)
		return data
	}

	// Page (wiki) detail schema and method
	private static readonly PageDetailSchema = z
		.object({
			title: z.string(),
			created_at: z.string(),
			url: z.string(),
			editing_roles: z.string(),
			page_id: z.number(),
			published: z.boolean(),
			hide_from_students: z.boolean(),
			front_page: z.boolean(),
			html_url: z.string().url(),
			body: z.string().nullable().optional(),
			updated_at: z.string(),
			todo_date: z.string().nullable().optional(),
			publish_at: z.string().nullable().optional(),
			locked_for_user: z.boolean().optional()
		})
		.passthrough()

	async getPageDetail(courseId: string, pageUrl: string): Promise<z.infer<typeof CanvasClient.PageDetailSchema>> {
		logger.info("fetching page detail", { courseId, pageUrl })
		const url = `${this.#baseUrl}/api/v1/courses/${courseId}/pages/${encodeURIComponent(pageUrl)}`
		const fetchResult = await errors.try(
			fetch(url, {
				method: "GET",
				headers: this.#headers,
				credentials: "include"
			})
		)
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		if (!fetchResult.data.ok) {
			logger.error("canvas-api: request failed", { status: fetchResult.data.status, url })
			throw errors.new(`canvas-api: request failed with status ${fetchResult.data.status}`)
		}
		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
		}
		const data = assertSchema(CanvasClient.PageDetailSchema, jsonResult.data)
		return data
	}

	// Assignment detail schema and method
	private static readonly AssignmentDetailSchema = z
		.object({
			id: z.number(),
			name: z.string(),
			description: z.string().nullable().optional(),
			points_possible: z.number().nullable(),
			due_at: z.string().nullable(),
			html_url: z.string().url(),
			submission_types: z.array(z.string()).optional()
		})
		.passthrough()

	async getAssignmentDetail(
		courseId: string,
		assignmentId: string
	): Promise<z.infer<typeof CanvasClient.AssignmentDetailSchema>> {
		logger.info("fetching assignment detail", { courseId, assignmentId })
		const url = `${this.#baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}`
		const fetchResult = await errors.try(
			fetch(url, {
				method: "GET",
				headers: this.#headers,
				credentials: "include"
			})
		)
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		if (!fetchResult.data.ok) {
			logger.error("canvas-api: request failed", { status: fetchResult.data.status, url })
			throw errors.new(`canvas-api: request failed with status ${fetchResult.data.status}`)
		}
		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
		}
		const data = assertSchema(CanvasClient.AssignmentDetailSchema, jsonResult.data)
		return data
	}

	// =================================================================================
	// Modules (REST) and quiz submission helpers
	// =================================================================================

	// REST modules with items
	private static readonly RestModuleItemSchema = z
		.object({
			id: z.union([z.number(), z.string()]),
			title: z.string().optional(),
			type: z.string(),
			content_id: z.union([z.number(), z.string()]).nullable().optional(),
			page_url: z.string().optional(),
			html_url: z.string().url().optional()
		})
		.passthrough()

	private static readonly RestModuleSchema = z
		.object({
			id: z.union([z.number(), z.string()]),
			name: z.string().optional(),
			items_url: z.string().url().optional(),
			items: z.array(CanvasClient.RestModuleItemSchema).optional()
		})
		.passthrough()

	private async fetchAllPages(url: string): Promise<unknown[]> {
		const results: unknown[] = []
		let nextUrl: string | null = url
		while (nextUrl) {
			const fetchResult = await errors.try(
				fetch(nextUrl, {
					method: "GET",
					headers: this.#headers,
					credentials: "include"
				})
			)
			if (fetchResult.error) {
				logger.error("canvas-api: network request failed", { url: nextUrl, error: fetchResult.error })
				throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
			}
			const responseCandidate = fetchResult.data
			if (!responseCandidate) {
				logger.error("canvas-api: unexpected missing response", { url: nextUrl })
				throw errors.new("canvas-api: missing response")
			}
			const response: Response = responseCandidate
			if (!response.ok) {
				logger.error("canvas-api: request failed", { status: response.status, url: nextUrl })
				throw errors.new(`canvas-api: request failed with status ${response.status}`)
			}
			const jsonResult = await errors.try(response.json())
			if (jsonResult.error) {
				logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
				throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
			}
			const page = jsonResult.data
			if (Array.isArray(page)) results.push(...page)
			let linkHeader: string | null = null
			const headerLower = response.headers.get("link")
			if (typeof headerLower === "string") linkHeader = headerLower
			else {
				const headerUpper = response.headers.get("Link")
				if (typeof headerUpper === "string") linkHeader = headerUpper
			}
			if (linkHeader !== null && /rel="next"/.test(linkHeader)) {
				const match = linkHeader.match(/<([^>]+)>; rel="next"/)
				nextUrl = match?.[1] ?? null
			} else {
				nextUrl = null
			}
		}
		return results
	}

	async getModulesWithItems(courseId: string): Promise<Array<z.infer<typeof CanvasClient.RestModuleSchema>>> {
		logger.info("fetching modules with items", { courseId })
		const base = `${this.#baseUrl}/api/v1/courses/${courseId}/modules?include[]=items&per_page=100`
		const raw = await this.fetchAllPages(base)
		const parsed: Array<z.infer<typeof CanvasClient.RestModuleSchema>> = []
		for (const entry of raw) {
			const res = CanvasClient.RestModuleSchema.safeParse(entry)
			if (res.success) parsed.push(res.data)
			else {
				logger.warn("skipping unparsable module entry", { error: res.error })
			}
		}
		return parsed
	}

	// Assignment info map keyed by module item id
	private static readonly AssignmentInfoSchema = z.record(
		z.string(),
		z.object({
			points_possible: z.number().nullable().optional(),
			due_date: z.string().nullable().optional(),
			todo_date: z.string().nullable().optional()
		})
	)

	async getAssignmentInfoMap(courseId: string): Promise<z.infer<typeof CanvasClient.AssignmentInfoSchema>> {
		logger.info("fetching assignment info map", { courseId })
		const url = `${this.#baseUrl}/courses/${courseId}/modules/items/assignment_info`
		const fetchResult = await errors.try(fetch(url, { method: "GET", headers: this.#headers, credentials: "include" }))
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		if (!fetchResult.data.ok) {
			logger.error("canvas-api: request failed", { status: fetchResult.data.status, url })
			throw errors.new(`canvas-api: request failed with status ${fetchResult.data.status}`)
		}
		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
		}
		return assertSchema(CanvasClient.AssignmentInfoSchema, jsonResult.data)
	}

	// Create or get a quiz submission (starts an attempt)
	private static readonly QuizSubmissionCreatedSchema = z
		.object({
			quiz_submissions: z.array(
				z.object({ id: z.number(), quiz_id: z.number().optional(), attempt: z.number().optional() }).passthrough()
			)
		})
		.strict()

	private static readonly QuizSubmissionsListSchema = z
		.object({
			quiz_submissions: z.array(
				z
					.object({ id: z.number(), attempt: z.number().optional(), workflow_state: z.string().optional() })
					.passthrough()
			)
		})
		.strict()

	async createQuizSubmission(courseId: string, quizId: string | number): Promise<number> {
		logger.info("creating quiz submission", { courseId, quizId })
		const url = `${this.#baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/submissions`
		const fetchResult = await errors.try(fetch(url, { method: "POST", headers: this.#headers, credentials: "include" }))
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		if (!fetchResult.data.ok) {
			logger.error("canvas-api: request failed", { status: fetchResult.data.status, url })
			throw errors.new(`canvas-api: request failed with status ${fetchResult.data.status}`)
		}
		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
		}
		const payload = assertSchema(CanvasClient.QuizSubmissionCreatedSchema, jsonResult.data)
		if (!payload.quiz_submissions.length) {
			logger.error("canvas-api: createQuizSubmission returned empty list", { courseId, quizId })
			throw errors.new("canvas-api: create quiz submission returned empty list")
		}
		const firstSubmission = payload.quiz_submissions[0]
		if (!firstSubmission) {
			logger.error("canvas-api: quiz submissions array empty after validation", { courseId, quizId })
			throw errors.new("canvas-api: empty quiz submissions")
		}
		const firstSubmissionId: number = firstSubmission.id
		return firstSubmissionId
	}

	private async listQuizSubmissions(courseId: string, quizId: string | number): Promise<Array<{ id: number }>> {
		logger.info("listing quiz submissions", { courseId, quizId })
		const url = `${this.#baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/submissions`
		const fetchResult = await errors.try(fetch(url, { method: "GET", headers: this.#headers, credentials: "include" }))
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		if (!fetchResult.data.ok) {
			// Some courses/quizzes return 400 when no submissions exist yet. Treat as empty.
			if (fetchResult.data.status === 400 || fetchResult.data.status === 404) {
				logger.warn("quiz submissions not listable, treating as empty", {
					status: fetchResult.data.status,
					courseId,
					quizId
				})
				return []
			}
			logger.error("canvas-api: request failed", { status: fetchResult.data.status, url })
			throw errors.new(`canvas-api: request failed with status ${fetchResult.data.status}`)
		}
		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
		}
		const data = assertSchema(CanvasClient.QuizSubmissionsListSchema, jsonResult.data)
		return data.quiz_submissions.map((s) => ({ id: s.id }))
	}

	async getOrCreateQuizSubmissionId(courseId: string, quizId: string | number): Promise<number> {
		// First, reuse an existing submission if present
		const existing = await this.listQuizSubmissions(courseId, quizId)
		if (existing.length > 0) {
			// Use the last one (assume most recent)
			const last = existing[existing.length - 1]
			if (!last) {
				logger.error("canvas-api: missing existing submission after length check", {
					courseId,
					quizId,
					existingCount: existing.length
				})
				throw errors.new("canvas-api: missing existing submission")
			}
			return last.id
		}
		// Otherwise try to create
		const url = `${this.#baseUrl}/api/v1/courses/${courseId}/quizzes/${quizId}/submissions`
		const fetchResult = await errors.try(fetch(url, { method: "POST", headers: this.#headers, credentials: "include" }))
		if (fetchResult.error) {
			logger.error("canvas-api: network request failed", { url, error: fetchResult.error })
			throw errors.wrap(fetchResult.error, "canvas-api: network request failed")
		}
		if (!fetchResult.data.ok) {
			// If a submission already exists, Canvas may return 409. Re-list and reuse.
			if (fetchResult.data.status === 409) {
				logger.warn("quiz submission already exists, reusing existing", { courseId, quizId })
				const subs = await this.listQuizSubmissions(courseId, quizId)
				if (subs.length > 0) {
					const last = subs[subs.length - 1]
					if (!last) {
						logger.error("canvas-api: missing subs last after 409 reuse", { courseId, quizId, subsCount: subs.length })
						throw errors.new("canvas-api: missing submission after 409")
					}
					return last.id
				}
			}
			// Some courses/quizzes return 400/403 on create due to settings; try re-list and reuse
			if (fetchResult.data.status === 400 || fetchResult.data.status === 403) {
				logger.warn("quiz submission create not allowed, attempting reuse", {
					status: fetchResult.data.status,
					courseId,
					quizId
				})
				const subs = await this.listQuizSubmissions(courseId, quizId)
				if (subs.length > 0) {
					const last = subs[subs.length - 1]
					if (!last) {
						logger.error("canvas-api: missing subs last after 400/403 reuse", {
							courseId,
							quizId,
							subsCount: subs.length
						})
						throw errors.new("canvas-api: missing submission after 400/403")
					}
					return last.id
				}
			}
			logger.error("canvas-api: request failed", { status: fetchResult.data.status, url })
			throw errors.new(`canvas-api: request failed with status ${fetchResult.data.status}`)
		}
		const jsonResult = await errors.try(fetchResult.data.json())
		if (jsonResult.error) {
			logger.error("canvas-api: failed to parse json response", { error: jsonResult.error })
			throw errors.wrap(jsonResult.error, "canvas-api: failed to parse json response")
		}
		const payload = assertSchema(CanvasClient.QuizSubmissionCreatedSchema, jsonResult.data)
		if (!payload.quiz_submissions.length) {
			logger.error("canvas-api: createQuizSubmission returned empty list", { courseId, quizId })
			throw errors.new("canvas-api: create quiz submission returned empty list")
		}
		const first = payload.quiz_submissions[0]
		if (!first) {
			logger.error("canvas-api: empty quiz_submissions after parse", { courseId, quizId })
			throw errors.new("canvas-api: empty quiz_submissions")
		}
		return first.id
	}
}

// =================================================================================
// Factory from env (optional convenience)
// =================================================================================

export function createCanvasClientFromEnv(): CanvasClient {
	const baseUrl = process.env.CANVAS_BASE_URL
	const cookie = process.env.CANVAS_SESSION_COOKIE
	const csrf = process.env.CANVAS_CSRF_TOKEN
	if (!baseUrl || !cookie || !csrf) {
		logger.error("missing canvas environment configuration", {
			hasBaseUrl: !!baseUrl,
			hasCookie: !!cookie,
			hasCsrf: !!csrf
		})
		throw errors.new("canvas configuration missing env vars")
	}
	return new CanvasClient({ baseUrl, cookie, csrfToken: csrf })
}
