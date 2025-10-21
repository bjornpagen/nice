import { z } from "zod"

export const SUBJECT_OPTIONS = [
  "Math",
  "Science",
  "English Language Arts",
  "Social Studies",
  "Computing",
  "General"
] as const

export const CourseBuilderApiInputSchema = z.object({
  case_ids: z.array(z.string().min(1)).min(1),
  student_user_id: z.string().min(1),
  subject: z.enum(SUBJECT_OPTIONS)
})

export type CourseBuilderApiInput = z.infer<typeof CourseBuilderApiInputSchema>
export type Subject = (typeof SUBJECT_OPTIONS)[number]

// API response schemas
export const CourseBuilderApiSuccessSchema = z.object({
  status: z.literal("success"),
  message: z.string().min(1),
  courseSourcedId: z.string().min(1),
  classSourcedId: z.string().min(1),
})

export const CourseBuilderApiErrorSchema = z.object({
  status: z.literal("error"),
  message: z.string().min(1)
})

export const CourseBuilderApiResponseSchema = z.union([
  CourseBuilderApiSuccessSchema,
  CourseBuilderApiErrorSchema
])

export type CourseBuilderApiSuccess = z.infer<typeof CourseBuilderApiSuccessSchema>
export type CourseBuilderApiError = z.infer<typeof CourseBuilderApiErrorSchema>
export type CourseBuilderApiResponse = z.infer<typeof CourseBuilderApiResponseSchema>

// AI structured output (expected input to buildCoursePayloadAction)
export const ActivityTypeSchema = z.enum(["Article", "Video", "Exercise"])
export type ActivityType = z.infer<typeof ActivityTypeSchema>

export const AiLessonResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: ActivityTypeSchema,
  xp: z.number(),
  caseIds: z.array(z.string().min(1)).optional().default([])
})

export const AiLessonSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  resources: z.array(AiLessonResourceSchema).min(1)
})

export const AiUnitSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z
    .string()
    .refine((v) => (typeof v === "string" ? v.split(/[.!?]+\s*/).filter(Boolean).length <= 3 : true), {
      message: "unit description must be 3 sentences or fewer"
    })
    .optional()
    .default(""),
  lessons: z.array(AiLessonSchema).min(1)
})

export const AiGenerateCourseInputSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().optional().default(""),
    subject: z.enum(SUBJECT_OPTIONS),
    grades: z.array(z.string().min(1)).min(1),
    units: z.array(AiUnitSchema).min(1)
  })
  .superRefine((data, ctx) => {
    // Enforce unique unit titles (case-insensitive, trimmed)
    const normalize = (s: string) => s.trim().toLowerCase()
    const seenUnitTitles = new Map<string, number>()
    const seenResourceIds = new Set<string>() // global across entire course
    data.units.forEach((unit, unitIndex) => {
      const key = normalize(unit.title)
      if (seenUnitTitles.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "duplicate unit name",
          path: ["units", unitIndex, "title"]
        })
      } else {
        seenUnitTitles.set(key, unitIndex)
      }
      // Enforce unique lesson titles within this unit (case-insensitive, trimmed)
      const seenLessonTitles = new Map<string, number>()
      unit.lessons.forEach((lesson, lessonIndex) => {
        const lkey = normalize(lesson.title)
        if (seenLessonTitles.has(lkey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "duplicate lesson name in unit",
            path: ["units", unitIndex, "lessons", lessonIndex, "title"]
          })
        } else {
          seenLessonTitles.set(lkey, lessonIndex)
        }

        // Enforce global uniqueness of resource IDs across the entire course
        const seenTitleType = new Set<string>() // per-lesson title/type uniqueness
        lesson.resources.forEach((res, resIndex) => {
          const id = res.id.trim()
          if (seenResourceIds.has(id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "duplicate resource id in course",
              path: ["units", unitIndex, "lessons", lessonIndex, "resources", resIndex, "id"]
            })
          } else {
            seenResourceIds.add(id)
          }

          // Enforce unique (type,title) within a lesson to block same-named duplicates
          const titleKey = `${res.type}|${normalize(res.title)}`
          if (seenTitleType.has(titleKey)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "duplicate resource title for type in lesson",
              path: ["units", unitIndex, "lessons", lessonIndex, "resources", resIndex, "title"]
            })
          } else {
            seenTitleType.add(titleKey)
          }
        })
      })
    })
  })

export type AiLessonResource = z.infer<typeof AiLessonResourceSchema>
export type AiLesson = z.infer<typeof AiLessonSchema>
export type AiUnit = z.infer<typeof AiUnitSchema>
export type AiGenerateCourseInput = z.infer<typeof AiGenerateCourseInputSchema>


