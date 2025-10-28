import { NextResponse } from "next/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { getJob } from "@/lib/course-builder-api/jobs"
import { CourseBuilderJobStatusResponseSchema } from "@/lib/course-builder-api/schema"
import { env } from "@/env"

export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const apiKey = request.headers.get("x-api-key")
  if (!apiKey || apiKey !== env.NICE_API_KEY) {
    logger.warn("unauthorized course builder job status access")
    return NextResponse.json({ status: "error", message: "Unauthorized" }, { status: 401 })
  }

  const { jobId } = await context.params
  if (!jobId) {
    logger.warn("job status missing jobId")
    return NextResponse.json({ status: "error", message: "job id required" }, { status: 400 })
  }

  const jobResult = await errors.try(getJob(jobId))
  if (jobResult.error) {
    logger.error("job status: redis get failed", { jobId, error: jobResult.error })
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
  const job = jobResult.data
  if (!job) {
    return NextResponse.json({ status: "error", message: "job not found or expired" }, { status: 404 })
  }

  let responseBody: unknown
  if (job.status === "queued") {
    responseBody = { status: "queued", jobId: job.id }
  } else if (job.status === "running") {
    responseBody = { status: "running", jobId: job.id, step: job.step, updatedAt: job.updatedAt }
  } else if (job.status === "completed") {
    responseBody = { status: "completed", jobId: job.id, result: job.result }
  } else {
    responseBody = { status: "failed", jobId: job.id, error: job.error }
  }

  const validation = CourseBuilderJobStatusResponseSchema.safeParse(responseBody)
  if (!validation.success) {
    logger.error("job status response validation failed", { jobId, error: validation.error })
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
  return NextResponse.json(validation.data, { status: 200 })
}


