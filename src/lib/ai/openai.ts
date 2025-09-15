import OpenAI from "openai"
import { env } from "@/env"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// Environment validation is performed once at the module level.
// If the key is missing, the application will fail to start, preventing runtime errors.
if (!env.OPENAI_API_KEY) {
	logger.error("missing required environment variable", { key: "OPENAI_API_KEY" })
	throw errors.new("missing required environment variable: OPENAI_API_KEY")
}

export const openai = new OpenAI({
	apiKey: env.OPENAI_API_KEY
})