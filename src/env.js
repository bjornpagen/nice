import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

if (!process.env.NEXT_RUNTIME && typeof window === "undefined") {
	const { loadEnvConfig } = require("@next/env")
	const projectDir = process.cwd()
	loadEnvConfig(projectDir)
}

// if (process.env.NODE_ENV === "development" && typeof window === "undefined") {
// 	logger.setDefaultLogLevel(logger.DEBUG)
// }

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		DATABASE_URL: z.string().url(),
		NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
		RAPIDAPI_YT_API_KEY: z.string().min(1),
		RAPIDAPI_YT_API_HOST: z.string().min(1),
		CLERK_SECRET_KEY: z.string().min(1),
		CLERK_WEBHOOK_SECRET: z.string().min(1),
		TIMEBACK_CLIENT_ID: z.string().min(1),
		TIMEBACK_CLIENT_SECRET: z.string().min(1),
		TIMEBACK_TOKEN_URL: z.string().min(1),
		TIMEBACK_QTI_SERVER_URL: z.string().min(1),
		GEMINI_API_KEY: z.string().min(1),
		OPENAI_API_KEY: z.string().min(1),
		TIMEBACK_ONEROSTER_SERVER_URL: z.string().min(1)
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
		NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().optional(),
		NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: z.string().optional(),
		NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: z.string().optional()
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		DATABASE_URL: process.env.DATABASE_URL,
		NODE_ENV: process.env.NODE_ENV,
		RAPIDAPI_YT_API_KEY: process.env.RAPIDAPI_YT_API_KEY,
		RAPIDAPI_YT_API_HOST: process.env.RAPIDAPI_YT_API_HOST,
		NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
		NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
		NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL,
		NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL,
		CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
		CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
		TIMEBACK_CLIENT_ID: process.env.TIMEBACK_CLIENT_ID,
		TIMEBACK_CLIENT_SECRET: process.env.TIMEBACK_CLIENT_SECRET,
		TIMEBACK_TOKEN_URL: process.env.TIMEBACK_TOKEN_URL,
		TIMEBACK_QTI_SERVER_URL: process.env.TIMEBACK_QTI_SERVER_URL,
		GEMINI_API_KEY: process.env.GEMINI_API_KEY,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		TIMEBACK_ONEROSTER_SERVER_URL: process.env.TIMEBACK_ONEROSTER_SERVER_URL
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true
})
