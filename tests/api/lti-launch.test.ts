import { describe, expect, mock, test } from "bun:test"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { NextRequest } from "next/server"

// Ensure env is isolated from global module cache by mocking @/env before SUT import
mock.module("@/env", () => ({
	env: {
 		NODE_ENV: "test",
 		SKIP_ENV_VALIDATION: "true",
 		NEXT_PUBLIC_APP_DOMAIN: "https://nice.example.com",
 		LTI_ALLOWED_REDIRECT_HOSTS: "app.example.com",
 		LTI_ISSUER: "https://issuer.example.com",
 		LTI_JWKS_URL: "https://issuer.example.com/.well-known/jwks.json",
 		LTI_AUDIENCE: "nice-app",
 		TIMEBACK_CALIPER_SERVER_URL: "https://caliper.example.test",
 		TIMEBACK_TOKEN_URL: "https://auth.example.test/token",
 		TIMEBACK_CLIENT_ID: "test-client-id",
 		TIMEBACK_CLIENT_SECRET: "test-client-secret",
 		TIMEBACK_ONEROSTER_SERVER_URL: "https://oneroster.example.test",
 		TIMEBACK_QTI_SERVER_URL: "https://qti.example.test"
 	}
}))
// Do NOT set REDIS_URL so that redis remains undefined and nonce check is skipped

// --- MODULE MOCKS (before importing the SUT) ---

// Mock LTI verification utilities
const mockVerifyLtiToken = mock(async (_token: string) => {
	return {
		sub: "sub-123",
		email: "user@example.com",
		given_name: "Test",
		family_name: "User",
		nonce: "nonce-abc",
		"https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
		"https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
		"https://purl.imsglobal.org/spec/lti/claim/target_link_uri": "https://app.example.com/welcome"
	}
})
const mockCheckNonceReplay = mock(async (_nonce: string) => Promise.resolve())
mock.module("@/lib/lti", () => ({
	verifyLtiToken: mockVerifyLtiToken,
	checkNonceReplay: mockCheckNonceReplay
}))

// Mock Clerk server SDK
mock.module("@clerk/nextjs/server", () => ({
	clerkClient: () => ({
		users: {
			getUserList: async () => ({ data: [] }),
			createUser: async () => ({
				id: "clerk_user_1",
				publicMetadata: {},
				emailAddresses: [{ emailAddress: "user@example.com" }]
			}),
			updateUserMetadata: async () => ({})
		},
		signInTokens: {
			createSignInToken: async () => ({ token: "ticket_123" })
		}
	})
}))

// Mock OneRoster client used for enrichment
mock.module("@/lib/clients", () => ({
	oneroster: {
		getUsersByEmail: async (_email: string) => ({ sourcedId: "source_1" })
	}
}))

// --- IMPORT SUT (after mocks) ---
const { POST } = await import("@/app/api/lti/launch/route")
const { env } = await import("@/env")

describe("LTI Launch API Route", () => {
	test("returns 400 when id_token is missing", async () => {
		const emptyForm = new URLSearchParams({})
		const req = new NextRequest("http://localhost/api/lti/launch", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
			body: emptyForm
		})

		const res = await POST(req)

		expect(res.status).toBe(400)

		const body = await res.json()
		expect(body?.error).toBe("LTI launch failed")

		// verify jose was not called on missing token path
		expect(mockVerifyLtiToken).toHaveBeenCalledTimes(0)
	})

	test("happy path returns 302 redirect with Clerk ticket", async () => {
		const form = new URLSearchParams({ id_token: "dummy.jwt" })
		const req = new NextRequest("http://localhost/api/lti/launch", {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: form
		})

		const res = await POST(req)

		expect(res.status).toBe(302)
		const location = res.headers.get("location")
		expect(location).toBeTruthy()
		expect(location ?? "").toContain(env.NEXT_PUBLIC_APP_DOMAIN)
		expect(location ?? "").toContain("__clerk_ticket=ticket_123")
		expect(location ?? "").toContain("__clerk_redirect_url=")

		expect(mockVerifyLtiToken).toHaveBeenCalledTimes(1)
		expect(mockCheckNonceReplay).toHaveBeenCalledWith("nonce-abc")
	})
})
