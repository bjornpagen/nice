import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { NextResponse } from "next/server"
import { env } from "@/env"
import { Client } from "@/lib/qti"

export async function POST(req: Request) {
  const parseResult = await errors.try(req.json())
  if (parseResult.error) {
    logger.error("debug qti api: invalid json", { error: parseResult.error })
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }
  const body = parseResult.data
  const identifier = typeof body?.identifier === "string" ? body.identifier : undefined
  const responseIdentifier = typeof body?.responseIdentifier === "string" ? body.responseIdentifier : undefined
  const value = body?.value
  if (!identifier || !responseIdentifier) {
    logger.error("debug qti api: missing fields", { identifier, responseIdentifier })
    return NextResponse.json({ error: "missing fields" }, { status: 400 })
  }

  const qti = new Client({
    serverUrl: env.TIMEBACK_QTI_SERVER_URL,
    tokenUrl: env.TIMEBACK_TOKEN_URL,
    clientId: env.TIMEBACK_CLIENT_ID,
    clientSecret: env.TIMEBACK_CLIENT_SECRET
  })

  const result = await errors.try(qti.processResponse(identifier, { responseIdentifier, value }))
  if (result.error) {
    logger.error("debug qti api: process response failed", { error: result.error, identifier, responseIdentifier })
    return NextResponse.json({ error: "process failed" }, { status: 500 })
  }

  return NextResponse.json(result.data)
}


