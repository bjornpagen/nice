// Minimal types for practice sidebar components
// These types are used by the V1 practice pages to render the sidebar

export interface LessonResource {
	id: string
	componentResourceSourcedId: string
	slug: string
	path: string
	title: string
	type: "Article" | "Exercise" | "Video"
	data: unknown
}

export interface CourseLessonMaterial {
	id: string
	slug: string
	path: string
	title: string
	type: "Lesson"
	sortOrder?: number
	resources: LessonResource[]
	meta?: {
		unit: {
			path: string
			title: string
			index: number
		}
	}
}

export interface CourseUnitMaterial {
	id: string
	componentResourceSourcedId: string
	slug: string
	path: string
	title: string
	type: "Quiz" | "UnitTest"
	data: unknown
	sortOrder?: number
	meta?: {
		unit: {
			path: string
			title: string
			index: number
		}
	}
}

export interface CourseResourceMaterial {
	id: string
	componentResourceSourcedId: string
	slug: string
	path: string
	title: string
	type: "CourseChallenge"
	data: unknown
	meta?: {
		course: {
			path: string
			title: string
			index: number
		}
	}
}

export type CourseMaterial = CourseLessonMaterial | CourseUnitMaterial | CourseResourceMaterial

export interface Unit {
	id: string
	slug: string
	path: string
	type: "Unit"
	title: string
	description: string
	lessons: Array<{
		id: string
		slug: string
		path: string
		type: "Lesson"
		title: string
		sortOrder?: number
		resources: LessonResource[]
	}>
	resources: Array<{
		id: string
		componentResourceSourcedId: string
		slug: string
		path: string
		title: string
		type: "Quiz" | "UnitTest"
		data: unknown
		sortOrder?: number
	}>
}

export interface Course {
	id: string
	slug: string
	path: string
	type: "Course"
	title: string
	description: string
	units: Unit[]
	resources: Array<{
		id: string
		componentResourceSourcedId: string
		slug: string
		path: string
		title: string
		type: "CourseChallenge"
		data: unknown
	}>
}

// Helper function to get flattened course materials
export function getCourseMaterials(course: Course): CourseMaterial[] {
	const materials: CourseMaterial[] = []

	// Process each unit
	for (const [unitIndex, unit] of course.units.entries()) {
		// Combine lessons and unit resources
		const allUnitItems: Array<CourseLessonMaterial | CourseUnitMaterial> = []

		// Add lessons with metadata
		for (const lesson of unit.lessons) {
			allUnitItems.push({
				...lesson,
				meta: {
					unit: {
						path: unit.path,
						title: unit.title,
						index: unitIndex
					}
				}
			})
		}

		// Add unit resources (quizzes, tests) with metadata
		for (const resource of unit.resources) {
			const unitMaterial: CourseUnitMaterial = {
				...resource,
				componentResourceSourcedId: resource.componentResourceSourcedId,
				meta: {
					unit: {
						path: unit.path,
						title: unit.title,
						index: unitIndex
					}
				}
			}
			allUnitItems.push(unitMaterial)
		}

		// Sort by sortOrder if available
		const sortedItems = allUnitItems.sort((a, b) => {
			const orderA = a.sortOrder ?? 999999
			const orderB = b.sortOrder ?? 999999
			return orderA - orderB
		})

		materials.push(...sortedItems)
	}

	// Add course-level resources (challenges) with metadata
	for (const [index, resource] of course.resources.entries()) {
		const courseMaterial: CourseResourceMaterial = {
			...resource,
			componentResourceSourcedId: resource.componentResourceSourcedId,
			meta: {
				course: {
					path: course.path,
					title: course.title,
					index: index
				}
			}
		}
		materials.push(courseMaterial)
	}

	return materials
}
