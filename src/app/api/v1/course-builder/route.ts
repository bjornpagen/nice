import { NextResponse } from "next/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"
import { CourseBuilderApiInputSchema, CourseBuilderApiResponseSchema } from "@/lib/course-builder-api/schema"
import { runCourseBuilderWorkflow } from "@/lib/course-builder-api/orchestrator"

export const maxDuration = 600

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

  const runResult = await errors.try(runCourseBuilderWorkflow(validation.data))
  if (runResult.error) {
    logger.error("course builder api failed", { error: runResult.error })
    const message = String(
      runResult.error?.message || (runResult.error as any)?.cause?.message || "internal error"
    )
    const isClient = message.includes("no resources found for provided case ids") || message.includes("some case ids had no resources")
    const status = isClient ? 400 : 500
    return NextResponse.json({ status: "error", message }, { status })
  }

  const responseBody = { status: "success", message: "Course created and user enrolled successfully.", ...runResult.data }
  const responseValidation = CourseBuilderApiResponseSchema.safeParse(responseBody)
  if (!responseValidation.success) {
    logger.error("response validation failed", { error: responseValidation.error })
    return NextResponse.json({ status: "error", message: "internal error" }, { status: 500 })
  }
  return NextResponse.json(responseValidation.data)
}


