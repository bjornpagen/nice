import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { createRemoteJWKSet, jwtVerify } from "jose"
import { z } from "zod"
import { env } from "@/env"
import { ErrNonceReplayed } from "@/lib/lti-errors"
import { redis } from "@/lib/redis"

const LtiTokenPayloadSchema = z.object({
	sub: z.string().min(1),
	email: z.string().email(),
	given_name: z.string(),
	family_name: z.string(),
	nonce: z.string().min(1),
	"https://purl.imsglobal.org/spec/lti/claim/version": z.literal("1.3.0"),
	"https://purl.imsglobal.org/spec/lti/claim/message_type": z.literal("LtiResourceLinkRequest"),
	"https://purl.imsglobal.org/spec/lti/claim/target_link_uri": z.string().url()
})
export type LtiTokenPayload = z.infer<typeof LtiTokenPayloadSchema>

const jwks = createRemoteJWKSet(new URL(env.LTI_JWKS_URL))

export async function verifyLtiToken(token: string): Promise<LtiTokenPayload> {
	logger.info("lti: verifying token with jose", { issuer: env.LTI_ISSUER, audience: env.LTI_AUDIENCE })

	const verificationResult = await errors.try(
		jwtVerify(token, jwks, {
			issuer: env.LTI_ISSUER,
			audience: env.LTI_AUDIENCE,
			algorithms: ["RS256"],
			clockTolerance: "5s"
		})
	)

	if (verificationResult.error) {
		logger.error("lti jwt verification failed", { error: verificationResult.error })
		throw errors.wrap(verificationResult.error, "lti jwt verification")
	}

	const payloadUnknown: unknown = verificationResult.data.payload
	const validationResult = LtiTokenPayloadSchema.safeParse(payloadUnknown)
	if (!validationResult.success) {
		logger.error("lti token payload validation failed", { error: validationResult.error })
		throw errors.wrap(validationResult.error, "lti token payload validation")
	}

	return validationResult.data
}

const NONCE_TTL_SECONDS = 60

export async function checkNonceReplay(nonce: string): Promise<void> {
	if (!redis) {
		logger.warn("redis not available, skipping nonce check")
		return
	}
	const key = `lti:nonce:${nonce}`
	const setResult = await errors.try(redis.set(key, "1", { NX: true, EX: NONCE_TTL_SECONDS }))
	if (setResult.error) {
		logger.error("redis error during nonce check", { error: setResult.error })
		throw errors.wrap(setResult.error, "nonce check")
	}
	if (setResult.data === null) {
		logger.warn("lti replay attack detected", { nonce })
		throw ErrNonceReplayed
	}
}
