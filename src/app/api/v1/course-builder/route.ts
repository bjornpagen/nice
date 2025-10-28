import { NextResponse } from "next/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { CourseBuilderApiInputSchema, CourseBuilderEnqueueResponseSchema } from "@/lib/course-builder-api/schema"
import { randomUUID } from "node:crypto"
import { inngest } from "@/inngest/client"
import { COURSE_BUILDER_REQUESTED } from "@/inngest/events/course-builder"
import { createJob } from "@/lib/course-builder-api/jobs"

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key")
  if (!apiKey || apiKey !== env.NICE_API_KEY) {
    logger.warn("unauthorized course builder api access")
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 })
  }

  const bodyResult = await errors.try(request.json())
  if (bodyResult.error) {
    logger.error("invalid json body", { error: bodyResult.error })
    return NextResponse.json({ status: "error", message: "invalid json" }, { status: 400 })
  }
  const input = bodyResult.data

  const validation = CourseBuilderApiInputSchema.safeParse(input)
  if (!validation.success) {
    logger.error("request validation failed", { error: validation.error })
    return NextResponse.json({ status: "error", message: "invalid request" }, { status: 400 })
  }

  const jobId = randomUUID()
  const data = validation.data

  const createJobResult = await errors.try(
    createJob(jobId, {
      studentUserId: data.student_user_id,
      subject: data.subject,
      caseCount: data.case_ids.length
    })
  )
  if (createJobResult.error) {
    logger.error("failed to create job in redis", { jobId, error: createJobResult.error })
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }

  const sendEventResult = await errors.try(
    inngest.send({
      name: COURSE_BUILDER_REQUESTED,
      data: { jobId, input: data }
    })
  )
  if (sendEventResult.error) {
    logger.error("failed to send course builder event", { jobId, error: sendEventResult.error })
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }

  const responseBody = {
    status: "queued" as const,
    jobId,
    inputSummary: { studentUserId: data.student_user_id, subject: data.subject, caseCount: data.case_ids.length }
  }
  const responseValidation = CourseBuilderEnqueueResponseSchema.safeParse(responseBody)
  if (!responseValidation.success) {
    logger.error("enqueue response validation failed", { error: responseValidation.error })
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
  return NextResponse.json(responseValidation.data, { status: 202 })
}


