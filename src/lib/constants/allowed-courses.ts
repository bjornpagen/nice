// Central list of allowed course IDs for production UI exposure
// These match the science courses dispatched in orchestrate-hardcoded-science-item-migration

export const ALLOWED_COURSE_IDS: string[] = [
	"x0c5bb03129646fd6", // ms-biology
	"x1baed5db7c1bb50b", // ms-physics
	"x87d03b443efbea0a", // middle-school-earth-and-space-science
	"x230b3ff252126bb6", // hs-bio
	"xc370bc422b7f75fc" // ms-chemistry
]

export function isCourseAllowed(courseId: string): boolean {
	return ALLOWED_COURSE_IDS.includes(courseId)
}
