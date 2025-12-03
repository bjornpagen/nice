import type { CourseProgressResult, LessonPlanTreeResult } from "@/lib/powerpath"

// --- CONSTANTS ---

/**
 * Science course sequence with hardcoded Course Challenge resource IDs.
 * The challengeId is the specific interactive resource that must be mastered (≥80%)
 * to trigger progression to the next course.
 * 
 * CRITICAL: These IDs are static configuration to avoid expensive API lookups.
 * Run `bun run scripts/verify-science-progression-config.ts` to validate.
 */
export const SCIENCE_COURSE_SEQUENCE: ReadonlyArray<{
	readonly title: string
	readonly courseId: string
	readonly challengeId: string | null // null = terminal course with no progression trigger
}> = [
	{
		title: "Middle School Biology",
		courseId: "nice_x0c5bb03129646fd6",
		challengeId: "nice_x0c5bb03129646fd6"
	},
	{
		title: "Middle School Chemistry",
		courseId: "nice_xc370bc422b7f75fc",
		challengeId: "nice_xc370bc422b7f75fc"
	},
	{
		title: "Middle School Physics",
		courseId: "nice_x1baed5db7c1bb50b",
		challengeId: "nice_x1baed5db7c1bb50b"
	},
	{
		title: "Middle School Earth & Space Science",
		courseId: "nice_x87d03b443efbea0a",
		challengeId: "nice_x87d03b443efbea0a"
	},
	{
		title: "MS Science Supplementary",
		courseId: "nice_x27ad39d4b4427987",
		challengeId: null // No Course Challenge - terminal course
	}
]

// Keep for legacy compatibility
export const HARDCODED_SCIENCE_COURSE_IDS = SCIENCE_COURSE_SEQUENCE.map(c => c.courseId)

export const MASTERY_THRESHOLD = 95 as const
export const PER_ITEM_MASTERY_THRESHOLD = 80 as const

// --- TYPES ---
export type ProgressStatus = "not_started" | "in_progress" | "completed"

export type ComponentProgress = {
	sourcedId: string
	progress: number
	status: ProgressStatus
	results: Array<Record<string, unknown>>
	title?: string
	assessmentLineItemSourcedId?: string
}

export type ResourceProgress = {
	sourcedId: string
	progress: number
	status: ProgressStatus
	results: Array<Record<string, unknown>>
}

export type ProcessedResource = {
	sourcedId: string
	title?: string
	sortOrder?: string
	componentProgress: ResourceProgress
	[key: string]: unknown
}

export type ProcessedComponent = {
	sourcedId: string
	title: string
	sortOrder?: string
	componentProgress: ComponentProgress
	componentResources?: ProcessedResource[]
	items?: ProcessedComponent[]
	[key: string]: unknown
}

export type MergedLessonPlan = {
	id?: string
	course: Record<string, unknown>
	components: ProcessedComponent[]
}

// --- ID TRANSFORMATION ---
function buildCompoundResourceId(componentId: string, resourceSourcedId: string): string {
	const resourceSuffix = resourceSourcedId.split("_").pop()
	if (!resourceSuffix) {
		throw new Error(`invalid resource sourcedId format: ${resourceSourcedId}`)
	}
	return `${componentId}_${resourceSuffix}`
}

// --- PROGRESS CALCULATION ---
function calculateProgressFromResults(results: Array<Record<string, unknown>>): number {
	if (results.length === 0) return 0
	if (results.some((r) => r.inProgress === "true")) return 50

	const latestResult = results[results.length - 1]
	if (latestResult && typeof latestResult.score === "number") {
		// Mastery policy: any score >= PER_ITEM_MASTERY_THRESHOLD is treated as 100
		const score = latestResult.score
		return score >= PER_ITEM_MASTERY_THRESHOLD ? 100 : score
	}

	return results.length > 0 ? 100 : 0
}

function determineStatusFromResults(results: Array<Record<string, unknown>>): ProgressStatus {
	if (results.length === 0) return "not_started"
	if (results.some((r) => r.inProgress === "true")) return "in_progress"

	const latestResult = results[results.length - 1]
	if (latestResult && typeof latestResult.score === "number") {
		// Completed only when score meets mastery threshold
		return latestResult.score >= PER_ITEM_MASTERY_THRESHOLD ? "completed" : "in_progress"
	}

	// If we have results but no numeric score, consider it completed
	return "completed"
}

// --- PROGRESS MAPS ---
function buildProgressMaps(progressData: CourseProgressResult): {
	componentMap: Map<string, ComponentProgress>
	resourceMap: Map<string, ResourceProgress>
} {
	const componentMap = new Map<string, ComponentProgress>()
	const resourceMap = new Map<string, ResourceProgress>()

	for (const item of progressData.lineItems) {
		if (item.type === "component") {
			componentMap.set(item.courseComponentSourcedId, {
				sourcedId: item.courseComponentSourcedId,
				progress: calculateProgressFromResults(item.results),
				status: determineStatusFromResults(item.results),
				results: item.results,
				title: item.title,
				assessmentLineItemSourcedId: item.assessmentLineItemSourcedId
			})
		} else if (item.type === "resource") {
			resourceMap.set(item.courseComponentResourceSourcedId, {
				sourcedId: item.courseComponentResourceSourcedId,
				progress: calculateProgressFromResults(item.results),
				status: determineStatusFromResults(item.results),
				results: item.results
			})
		}
	}

	return { componentMap, resourceMap }
}

// --- AGGREGATION ---
function aggregateResourceProgress(
	resourceIds: string[],
	resourceMap: Map<string, ResourceProgress>
): { progress: number; status: ProgressStatus; results: Array<Record<string, unknown>> } {
	const progresses = resourceIds
		.map((id) => resourceMap.get(id))
		.filter((p): p is ResourceProgress => p !== undefined)

	if (progresses.length === 0) {
		return { progress: 0, status: "not_started", results: [] }
	}

	const avgProgress = progresses.reduce((sum, p) => sum + p.progress, 0) / progresses.length
	const anyStarted = progresses.some((p) => p.status !== "not_started")

	// If the aggregated resources meet mastery, normalize to 100 for parent averaging
	const status: ProgressStatus =
		avgProgress >= PER_ITEM_MASTERY_THRESHOLD ? "completed" : anyStarted ? "in_progress" : "not_started"
	const normalizedProgress = status === "completed" ? 100 : avgProgress

	return {
		progress: normalizedProgress,
		status,
		results: progresses.flatMap((p) => p.results)
	}
}

function aggregateChildProgress(
	children: ProcessedComponent[]
): { progress: number; status: ProgressStatus; results: Array<Record<string, unknown>> } {
	if (children.length === 0) {
		return { progress: 0, status: "not_started", results: [] }
	}

	const avgProgress = children.reduce((sum, c) => sum + c.componentProgress.progress, 0) / children.length
	const anyStarted = children.some((c) => c.componentProgress.status !== "not_started")

	// If children averaged progress meets mastery, normalize to 100 for parent averaging
	const status: ProgressStatus =
		avgProgress >= PER_ITEM_MASTERY_THRESHOLD ? "completed" : anyStarted ? "in_progress" : "not_started"
	const normalizedProgress = status === "completed" ? 100 : avgProgress

	return {
		progress: normalizedProgress,
		status,
		results: children.flatMap((c) => c.componentProgress.results)
	}
}

// --- RESOURCE PROCESSING ---
function processResource(
	resource: Record<string, unknown>,
	componentId: string,
	resourceMap: Map<string, ResourceProgress>
): ProcessedResource {
	const resourceObj = resource.resource as Record<string, unknown> | undefined
	const resourceSourcedId = resourceObj?.sourcedId as string | undefined

	const compoundId = resourceSourcedId ? buildCompoundResourceId(componentId, resourceSourcedId) : undefined
	const progress = compoundId ? resourceMap.get(compoundId) : undefined

	return {
		sourcedId: resource.id as string,
		title: (resourceObj?.title as string) ?? undefined,
		sortOrder: (resource.sortOrder as string | null) ?? undefined,
		componentProgress:
			progress ?? {
				sourcedId: resource.id as string,
				progress: 0,
				status: "not_started",
				results: []
			},
		...resource
	}
}

// --- COMPONENT PROCESSING ---
function computeLeafProgress(
	componentId: string,
	resources: Array<Record<string, unknown>>,
	componentMap: Map<string, ComponentProgress>,
	resourceMap: Map<string, ResourceProgress>
): ComponentProgress {
	const directProgress = componentMap.get(componentId)
	if (directProgress) return directProgress

	const compoundIds = resources
		.map((r) => {
			const resourceObj = r.resource as Record<string, unknown> | undefined
			const resourceSourcedId = resourceObj?.sourcedId as string | undefined
			return resourceSourcedId ? buildCompoundResourceId(componentId, resourceSourcedId) : undefined
		})
		.filter((id): id is string => id !== undefined)

	const aggregated = aggregateResourceProgress(compoundIds, resourceMap)

	return {
		sourcedId: componentId,
		...aggregated
	}
}

function processLeafComponent(
	component: Record<string, unknown>,
	componentMap: Map<string, ComponentProgress>,
	resourceMap: Map<string, ResourceProgress>
): ProcessedComponent {
	const sourcedId = component.sourcedId as string
	const title = component.title as string
	const resources = (component.componentResources as Array<Record<string, unknown>> | null) ?? []

	const processedResources = resources.map((r) => processResource(r, sourcedId, resourceMap))

	const componentProgress = computeLeafProgress(sourcedId, resources, componentMap, resourceMap)

	return {
		sourcedId,
		title,
		sortOrder: (component.sortOrder as string | null) ?? undefined,
		componentProgress,
		componentResources: processedResources
	}
}

function processContainerComponent(
	component: Record<string, unknown>,
	componentMap: Map<string, ComponentProgress>,
	resourceMap: Map<string, ResourceProgress>
): ProcessedComponent {
	const sourcedId = component.sourcedId as string
	const title = component.title as string
	const subComponents = (component.subComponents as Array<Record<string, unknown>> | null) ?? []

	const sortedChildren = [...subComponents].sort((a, b) => {
		const aOrder = (a.sortOrder as string | null) ?? ""
		const bOrder = (b.sortOrder as string | null) ?? ""
		return aOrder.localeCompare(bOrder)
	})

	const processedChildren = sortedChildren.map((sub) => processComponent(sub, componentMap, resourceMap))

	const aggregated = aggregateChildProgress(processedChildren)

	return {
		sourcedId,
		title,
		sortOrder: (component.sortOrder as string | null) ?? undefined,
		componentProgress: {
			sourcedId,
			...aggregated
		},
		items: processedChildren
	}
}

function processComponent(
	component: Record<string, unknown>,
	componentMap: Map<string, ComponentProgress>,
	resourceMap: Map<string, ResourceProgress>
): ProcessedComponent {
	const componentResources = (component.componentResources as Array<Record<string, unknown>> | null) ?? []
	const subComponents = (component.subComponents as Array<Record<string, unknown>> | null) ?? []

	if (componentResources.length > 0) {
		return processLeafComponent(component, componentMap, resourceMap)
	}

	if (subComponents.length > 0) {
		return processContainerComponent(component, componentMap, resourceMap)
	}

	const directProgress = componentMap.get(component.sourcedId as string)

	return {
		sourcedId: component.sourcedId as string,
		title: component.title as string,
		sortOrder: (component.sortOrder as string | null) ?? undefined,
		componentProgress:
			directProgress ?? {
				sourcedId: component.sourcedId as string,
				progress: 0,
				status: "not_started",
				results: []
			}
	}
}

// --- MAIN MERGE ---
export function mergeLessonPlanWithProgress(
	lessonPlan: LessonPlanTreeResult,
	progress: CourseProgressResult
): MergedLessonPlan {
	const { componentMap, resourceMap } = buildProgressMaps(progress)

	const subComponents = lessonPlan.lessonPlan.subComponents ?? []
	const sortedComponents = [...subComponents].sort((a, b) => {
		const aOrder = a.sortOrder ?? ""
		const bOrder = b.sortOrder ?? ""
		return aOrder.localeCompare(bOrder)
	})

	const processedComponents = sortedComponents.map((component) =>
		processComponent(component, componentMap, resourceMap)
	)

	return {
		id: lessonPlan.lessonPlan.id,
		course: lessonPlan.lessonPlan.course,
		components: processedComponents
	}
}
