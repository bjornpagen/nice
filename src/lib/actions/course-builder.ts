"use server"

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"

export type CourseBuilderResult = {
  success: boolean
  message: string
  courseSourcedId?: string
  classSourcedId?: string
}

export async function generateSupplementaryCourse(
  studentUserId: string,
  caseIds: string[],
  subject: "Math" | "Science" | "English Language Arts" | "Social Studies" | "Computing" | "General" = "Science"
): Promise<CourseBuilderResult> {
  logger.info("generating supplementary course", {
    studentUserId,
    caseIds,
    subject,
    caseIdCount: caseIds.length
  })

  if (!env.NICE_API_KEY) {
    logger.error("API key not configured")
    return {
      success: false,
      message: "API key is not configured"
    }
  }

  const requestBody = {
    case_ids: caseIds,
    student_user_id: studentUserId,
    subject
  }

  const response = await errors.try(
    fetch(`${env.NEXT_PUBLIC_APP_DOMAIN}/api/v1/course-builder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.NICE_API_KEY
      },
      body: JSON.stringify(requestBody)
    })
  )

  if (response.error) {
    logger.error("failed to call course builder API", { error: response.error })
    return {
      success: false,
      message: "Failed to connect to course builder service"
    }
  }

  const jsonResult = await errors.try(response.data.json())
  if (jsonResult.error) {
    logger.error("failed to parse course builder response", { error: jsonResult.error })
    return {
      success: false,
      message: "Invalid response from course builder service"
    }
  }

  const data = jsonResult.data
  
  if (!response.data.ok) {
    logger.error("course builder API returned error", {
      status: response.data.status,
      message: data.message
    })
    return {
      success: false,
      message: data.message || "Course generation failed"
    }
  }

  logger.info("supplementary course created successfully", {
    courseSourcedId: data.courseSourcedId,
    classSourcedId: data.classSourcedId
  })

  return {
    success: true,
    message: data.message || "Course created and student enrolled successfully",
    courseSourcedId: data.courseSourcedId,
    classSourcedId: data.classSourcedId
  }
}
