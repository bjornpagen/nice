import { clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
// import type { User as ClerkUser } from "@clerk/backend"
import { env } from "@/env"
import { oneroster } from "@/lib/clients"
import { checkNonceReplay, type LtiTokenPayload, verifyLtiToken } from "@/lib/lti"
import { ErrInvalidRedirectUri, ErrMissingToken, ErrMissingTokenClaims } from "@/lib/lti-errors"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

function validateRedirectUrl(url: string): string {
	const allowedHosts = new Set(env.LTI_ALLOWED_REDIRECT_HOSTS.split(",").map((h) => h.trim()))
	const parsedUrlResult = errors.trySync(() => new URL(url))
	if (
		parsedUrlResult.error ||
		parsedUrlResult.data.protocol !== "https:" ||
		!allowedHosts.has(parsedUrlResult.data.hostname)
	) {
		logger.warn("lti redirect blocked", { target: url, allowed: Array.from(allowedHosts) })
		throw ErrInvalidRedirectUri
	}
	return url
}

const EmailAddressSchema = z.object({ emailAddress: z.string() })
const MinimalClerkUserSchema = z.object({
	id: z.string(),
	publicMetadata: z.unknown(),
	emailAddresses: z.array(EmailAddressSchema)
})
const UsersListResponseSchema = z.object({ data: z.array(MinimalClerkUserSchema) })
type MinimalClerkUser = z.infer<typeof MinimalClerkUserSchema>

async function findOrProvisionClerkUser(payload: LtiTokenPayload): Promise<MinimalClerkUser> {
	const clerk = await clerkClient()

	// Match by verified email only
	const byEmailResult = await errors.try(clerk.users.getUserList({ emailAddress: [payload.email], limit: 1 }))
	if (byEmailResult.error) {
		logger.error("clerk user lookup by email failed", { error: byEmailResult.error })
		throw errors.wrap(byEmailResult.error, "clerk user lookup by email")
	}
	const byEmailParsed = UsersListResponseSchema.safeParse(byEmailResult.data)
	const byEmailUsers = byEmailParsed.success ? byEmailParsed.data.data : []
	if (byEmailUsers[0]) {
		const existingUser = byEmailUsers[0]
		logger.info("lti: existing clerk user matched by email", { clerkId: existingUser.id })
		return existingUser
	}

	// Create new user
	logger.info("lti: creating new clerk user", { email: payload.email })
	const emailLocalPart = payload.email.split("@")[0]
	if (!emailLocalPart) {
		logger.error("invalid email local part for nickname derivation", { email: payload.email })
		throw errors.new("invalid email local part")
	}
	const createResult = await errors.try(
		(await clerkClient()).users.createUser({
			emailAddress: [payload.email],
			firstName: payload.given_name,
			lastName: payload.family_name,
			publicMetadata: {
				nickname: emailLocalPart,
				username: "",
				bio: "",
				roles: [],
				streak: { count: 0, lastActivityDate: null }
			}
		})
	)
	if (createResult.error) {
		logger.error("clerk user creation failed", { error: createResult.error })
		throw errors.wrap(createResult.error, "clerk user creation")
	}
	return createResult.data
}

async function enrichWithOneRoster(clerkUser: MinimalClerkUser): Promise<void> {
	const email = clerkUser.emailAddresses?.[0]?.emailAddress
	if (!email) return

	const result = await errors.try(oneroster.getUsersByEmail(email))
	if (result.error || !result.data) {
		logger.warn("oneroster enrichment failed", { clerkId: clerkUser.id, error: result.error })
		return
	}
	const onerosterUser = result.data
	const currentMetadata = ClerkUserPublicMetadataSchema.parse(clerkUser.publicMetadata)
	if (currentMetadata.sourceId !== onerosterUser.sourcedId) {
		const updateResult = await errors.try(
			(await clerkClient()).users.updateUserMetadata(clerkUser.id, {
				publicMetadata: { ...currentMetadata, sourceId: onerosterUser.sourcedId }
			})
		)
		if (updateResult.error) {
			logger.error("clerk metadata update for oneroster sourceId failed", {
				clerkId: clerkUser.id,
				error: updateResult.error
			})
		}
	}
}

export async function POST(req: NextRequest) {
	const result = await errors.try(
		(async (): Promise<NextResponse> => {
			const formData = await req.formData()
			const idToken = formData.get("id_token")
			if (typeof idToken !== "string") {
				logger.error("lti launch missing id_token")
				throw ErrMissingToken
			}

			const payload = await verifyLtiToken(idToken)
			await checkNonceReplay(payload.nonce)

			const { email: userEmail } = payload
			if (!userEmail) {
				logger.error("lti token missing required email claim", { hasEmail: Boolean(userEmail) })
				throw ErrMissingTokenClaims
			}

			const clerkUser = await findOrProvisionClerkUser(payload)
			await enrichWithOneRoster(clerkUser)

			const signInTokenResult = await errors.try(
				(await clerkClient()).signInTokens.createSignInToken({ userId: clerkUser.id, expiresInSeconds: 60 })
			)
			if (signInTokenResult.error) {
				logger.error("clerk sign-in token creation failed", { clerkId: clerkUser.id, error: signInTokenResult.error })
				throw errors.wrap(signInTokenResult.error, "clerk sign-in token creation")
			}

			const targetUri = payload["https://purl.imsglobal.org/spec/lti/claim/target_link_uri"]
			const safeRedirectUrl = validateRedirectUrl(targetUri)

			// Canonicalize the redirect host to match NEXT_PUBLIC_APP_DOMAIN to avoid
			// cross-host cookie issues (e.g., www vs apex) which can cause spinner loops
			const canonicalHost = new URL(env.NEXT_PUBLIC_APP_DOMAIN).hostname
			const redirectUrlObj = new URL(safeRedirectUrl)
			if (redirectUrlObj.hostname !== canonicalHost || redirectUrlObj.protocol !== "https:") {
				logger.info("lti: rewriting redirect host to canonical", {
					from: redirectUrlObj.hostname,
					to: canonicalHost
				})
				redirectUrlObj.hostname = canonicalHost
				redirectUrlObj.protocol = "https:"
			}
			// If target is root, land on a stable, post-login page to avoid container spinners
			if (redirectUrlObj.pathname === "/" || redirectUrlObj.pathname === "") {
				logger.info("lti: rewriting redirect path to stable landing", {
					from: redirectUrlObj.pathname,
					to: "/profile/me/courses"
				})
				redirectUrlObj.pathname = "/profile/me/courses"
			}
			const normalizedRedirectUrl = redirectUrlObj.toString()

			const finalUrl = new URL(env.NEXT_PUBLIC_APP_DOMAIN)
			finalUrl.pathname = "/sso-callback"
			finalUrl.searchParams.set("__clerk_ticket", signInTokenResult.data.token)
			finalUrl.searchParams.set("__clerk_redirect_url", normalizedRedirectUrl)
			logger.info("lti: redirecting", { location: finalUrl.toString() })
			return NextResponse.redirect(finalUrl, { status: 302 })
		})()
	)

	if (result.error) {
		const wrappedError = errors.wrap(result.error, "lti launch failed")
		logger.error("lti launch process failed", { error: wrappedError })
		return NextResponse.json({ error: "LTI launch failed", details: wrappedError.message }, { status: 400 })
	}

	return result.data
}
