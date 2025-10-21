import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

// Constants from course-builder/actions.ts and course.ts
const ORG_SOURCED_ID = "f251f08b-61de-4ffa-8ff3-3e56e1d75a60"
const ACADEMIC_SESSION_SOURCED_ID = "Academic_Year_2025-2026"

/**
 * Creates a OneRoster class for the course
 * Follows the exact same format as in course.ts
 */
export async function createClassForCourse(params: {
  courseSourcedId: string
  courseTitle: string
}): Promise<string> {
  // Use the same sourcedId as the course (matching course.ts pattern)
  const classSourcedId = params.courseSourcedId

  logger.info("creating class for course", {
    courseSourcedId: params.courseSourcedId,
    classSourcedId,
  })

  // Create class object matching the exact format from course.ts
  const classData = {
    sourcedId: classSourcedId,
    status: "active" as const,
    title: params.courseTitle, // Use the same title as the course (with Nice Academy prefix already added)
    classType: "scheduled" as const,
    course: {
      sourcedId: params.courseSourcedId,
      type: "course" as const,
    },
    school: {
      sourcedId: ORG_SOURCED_ID,
      type: "org" as const,
    },
    terms: [{
      sourcedId: ACADEMIC_SESSION_SOURCED_ID,
      type: "term" as const, // Note: "term" not "academicSession" as in course.ts
    }],
  }

  const createResult = await errors.try(oneroster.createClass(classData))
  if (createResult.error) {
    logger.error("failed to create class", {
      error: createResult.error,
      classSourcedId,
      courseSourcedId: params.courseSourcedId,
    })
    throw errors.wrap(createResult.error, "create class")
  }

  logger.info("class created successfully", {
    classSourcedId,
    courseSourcedId: params.courseSourcedId,
  })

  return classSourcedId
}

/**
 * Enrolls a student in a class
 * Follows the exact same format as in course-selector-content.tsx -> setUserEnrollmentsByCourseId
 */
export async function enrollStudentInClass(params: {
  studentUserId: string
  classSourcedId: string
}): Promise<void> {
  logger.info("enrolling student in class", {
    studentUserId: params.studentUserId,
    classSourcedId: params.classSourcedId,
  })

  // Create enrollment matching the exact format from setUserEnrollmentsByCourseId
  const enrollmentData = {
    status: "active" as const,
    role: "student" as const,
    user: {
      sourcedId: params.studentUserId,
      type: "user" as const,
    },
    class: {
      sourcedId: params.classSourcedId,
      type: "class" as const,
    },
    // Note: No primary field, no custom sourcedId - let OneRoster generate it
  }

  const enrollResult = await errors.try(oneroster.createEnrollment(enrollmentData))
  if (enrollResult.error) {
    logger.error("failed to create enrollment", {
      error: enrollResult.error,
      studentUserId: params.studentUserId,
      classSourcedId: params.classSourcedId,
    })
    throw errors.wrap(enrollResult.error, "create enrollment")
  }

  logger.info("student enrolled successfully", {
    studentUserId: params.studentUserId,
    classSourcedId: params.classSourcedId,
  })
}
