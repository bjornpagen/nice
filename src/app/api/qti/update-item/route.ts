import { NextRequest, NextResponse } from "next/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import { z } from "zod"

const UpdateItemRequestSchema = z.object({
  identifier: z.string().min(1),
  xml: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional()
})

export async function PUT(request: NextRequest) {
  const bodyResult = await errors.try(request.json())
  if (bodyResult.error) {
    logger.error("qti update item: failed to parse request body", { error: bodyResult.error })
    return NextResponse.json({ error: "invalid request body" }, { status: 400 })
  }

  const validationResult = UpdateItemRequestSchema.safeParse(bodyResult.data)
  if (!validationResult.success) {
    logger.error("qti update item: invalid request data", { 
      error: validationResult.error,
      data: bodyResult.data
    })
    return NextResponse.json({ 
      error: "invalid request data",
      details: validationResult.error.issues
    }, { status: 400 })
  }

  const { identifier, xml, metadata } = validationResult.data

  logger.info("qti update item: updating assessment item", { identifier })

  const updateResult = await errors.try(qti.updateAssessmentItem({
    identifier,
    xml,
    metadata
  }))

  if (updateResult.error) {
    logger.error("qti update item: failed to update item", { 
      identifier,
      error: updateResult.error
    })
    return NextResponse.json({ 
      error: "failed to update item",
      message: updateResult.error.message
    }, { status: 500 })
  }

  logger.info("qti update item: successfully updated assessment item", { identifier })

  return NextResponse.json({ 
    success: true,
    item: updateResult.data
  })
}
