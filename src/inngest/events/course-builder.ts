import type { CourseBuilderApiInput } from "@/lib/course-builder-api/schema"

export const COURSE_BUILDER_REQUESTED = "app/course_builder.requested"

export type CourseBuilderRequestedEvent = {
  name: typeof COURSE_BUILDER_REQUESTED
  data: {
    jobId: string
    input: CourseBuilderApiInput
  }
}


