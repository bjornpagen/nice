## LTI 1.3 Launch Implementation (Nice Academy)

This document describes the implemented LTI 1.3 launch flow in Nice Academy, references the relevant source files, and maps the behavior against the TimeBack onboarding guide. An empty section is provided for environment variables you will supply.

### Scope

- Endpoint: `POST /api/lti/launch`
- Files covered:
  - `src/lib/lti.ts`
  - `src/lib/lti-errors.ts`
  - `src/app/api/lti/launch/route.ts`

---

## Endpoint Overview

- **Method**: POST
- **Content-Type**: `application/x-www-form-urlencoded`
- **Input**: `id_token` (OIDC ID token, JWT) in the URL-encoded body
- **Behavior**:
  - Verifies the JWT with issuer, audience and remote JWKS
  - Validates required LTI and identity claims
  - Enforces nonce replay protection (Redis-backed)
  - Finds or provisions a user in Clerk by verified email
  - Optionally enriches the user with OneRoster `sourceId`
  - Creates a short-lived Clerk sign-in ticket
  - Validates and passes through the `target_link_uri` via a safe allowlist redirect
  - Responds with 302 redirect to `NEXT_PUBLIC_APP_DOMAIN` with `__clerk_ticket` and `__clerk_redirect_url`

---

## File-by-File Reference

### `src/lib/lti.ts`

- **Schema validation**: Zod schema enforces presence and format of critical claims:
  - `sub`, `email`, `given_name`, `family_name`, `nonce`
  - LTI claims: `https://purl.imsglobal.org/spec/lti/claim/version` = `1.3.0`
  - `https://purl.imsglobal.org/spec/lti/claim/message_type` = `LtiResourceLinkRequest`
  - `https://purl.imsglobal.org/spec/lti/claim/target_link_uri` (URL)
- **Token verification**: Uses `jose` with `createRemoteJWKSet(new URL(env.LTI_JWKS_URL))` and `jwtVerify`:
  - Verifies `issuer` = `env.LTI_ISSUER`, `audience` = `env.LTI_AUDIENCE`, `algorithms` = `RS256`
  - `clockTolerance` = `5s`
- **Nonce replay protection**: `checkNonceReplay(nonce)`
  - Writes `NX` key `lti:nonce:${nonce}` in Redis with `EX=60` seconds
  - If the key exists, throws `ErrNonceReplayed`
  - When Redis is not available, logs a warning and skips checking (see “Security notes”)
- **Error handling and logging**: Consistently uses `errors.try`/`errors.trySync` and `logger`.

Key excerpts:

```ts
export async function verifyLtiToken(token: string): Promise<LtiTokenPayload> {
  const verificationResult = await errors.try(
    jwtVerify(token, jwks, {
      issuer: env.LTI_ISSUER,
      audience: env.LTI_AUDIENCE,
      algorithms: ["RS256"],
      clockTolerance: "5s"
    })
  )
  if (verificationResult.error) {
    throw errors.wrap(verificationResult.error, "lti jwt verification")
  }

  const validation = LtiTokenPayloadSchema.safeParse(verificationResult.data.payload)
  if (!validation.success) {
    throw errors.wrap(validation.error, "lti token payload validation")
  }
  return validation.data
}

export async function checkNonceReplay(nonce: string): Promise<void> {
  const setResult = await errors.try(redis.set(`lti:nonce:${nonce}`, "1", { NX: true, EX: 60 }))
  if (setResult.error) {
    throw errors.wrap(setResult.error, "nonce check")
  }
  if (setResult.data === null) {
    throw ErrNonceReplayed
  }
}
```

### `src/lib/lti-errors.ts`

Defines custom error constants for type-safe handling and clear intent:

- **launch**: `ErrLtiLaunchFailed`
- **verification**: `ErrTokenVerificationFailed`
- **input**: `ErrMissingToken`, `ErrMissingTokenClaims`, `ErrMissingTargetLinkUri`, `ErrInvalidRedirectUri`
- **nonce**: `ErrNonceReplayed`
- **clerk**: `ErrClerkUserCreationFailed`, `ErrClerkMetadataUpdateFailed`

Usage of these errors enables structured `errors.is` checks where needed and consistent logging with `logger`.

### `src/app/api/lti/launch/route.ts`

- **Redirect URL validation**: `validateRedirectUrl(url)`
  - Parses URL, enforces `https:` and checks hostname is in `env.LTI_ALLOWED_REDIRECT_HOSTS` allowlist
  - Throws `ErrInvalidRedirectUri` when not allowed
- **User provisioning**: `findOrProvisionClerkUser(payload)`
  - Looks up Clerk user by verified email (`users.getUserList`)
  - If not found, creates a new Clerk user with basic `publicMetadata` (nickname from email local part)
- **OneRoster enrichment**: `enrichWithOneRoster(clerkUser)`
  - Looks up OneRoster user by email
  - If found and `publicMetadata.sourceId` differs, updates Clerk metadata with `sourceId`
- **Launch handler**: `export async function POST(req)`
  - Reads `formData` and extracts `id_token`
  - Verifies token (issuer/audience/JWKS), validates claims, and checks nonce replay
  - Ensures required identity claim: `email`
  - Finds/provisions Clerk user, performs OneRoster enrichment
  - Creates Clerk sign-in ticket (`expiresInSeconds: 60`)
  - Validates `target_link_uri` and constructs final redirect URL:
    - Redirect to `env.NEXT_PUBLIC_APP_DOMAIN`
    - Query params: `__clerk_ticket`, `__clerk_redirect_url`
  - On error: returns `400` JSON response `{ error, details }` and logs the wrapped error

Key excerpts:

```ts
const signInTokenResult = await errors.try(
  (await clerkClient()).signInTokens.createSignInToken({ userId: clerkUser.id, expiresInSeconds: 60 })
)
if (signInTokenResult.error) {
  throw errors.wrap(signInTokenResult.error, "clerk sign-in token creation")
}

const targetUri = payload["https://purl.imsglobal.org/spec/lti/claim/target_link_uri"]
const safeRedirectUrl = validateRedirectUrl(targetUri)

const finalUrl = new URL(env.NEXT_PUBLIC_APP_DOMAIN)
finalUrl.searchParams.set("__clerk_ticket", signInTokenResult.data.token)
finalUrl.searchParams.set("__clerk_redirect_url", safeRedirectUrl)

return NextResponse.redirect(finalUrl, { status: 302 })
```

---

## Mapping to TimeBack Onboarding Guide

- **1) Validate OIDC token**: Implemented
  - RS256 verification with issuer/audience and JWKS; claim validation with Zod; nonce replay enforcement.
- **2) Provision account if missing**: Implemented
  - Lookup by verified email; creates Clerk user and seeds basic profile metadata when absent.
- **3) Log the user in**: Implemented
  - Issues a short-lived Clerk sign-in ticket and redirects to the app domain where Clerk sets auth cookies.
- **4) Redirect to `target_link_uri`**: Implemented via safe allowlist pass-through
  - `target_link_uri` is validated against `LTI_ALLOWED_REDIRECT_HOSTS` and passed as `__clerk_redirect_url`.

Additional protections:

- **Nonce replay protection**: Mandatory with Redis in production
- **HTTPS-only target URIs**: Enforced
- **Short-lived sign-in ticket**: 60 seconds TTL

Notes:

- The onboarding guide references returning the user to the target URL after authentication. We achieve this by redirecting to the app domain first to finalize Clerk auth, then continuing to the requested target via `__clerk_redirect_url`.

---

## Environment Variables (to fill in)

Fill these with your deployment-specific values:

| Name | Value |
| :-- | :-- |
| `LTI_ISSUER` | https://nice.academy |
| `LTI_JWKS_URL` | https://jherbpzmm0.execute-api.us-east-1.amazonaws.com/api/.well-known/jwks.json |
| `LTI_AUDIENCE` | nice-academy |
| `LTI_ALLOWED_REDIRECT_HOSTS` | https://timeback.com |



---

## Test Coverage

- `tests/api/lti-launch.test.ts`
  - Missing token → `400` JSON error
  - Happy path → `302` redirect with `__clerk_ticket` and `__clerk_redirect_url`
  - Planned improvement: when the request `Accept` header prefers `text/html`, serve a minimal HTML error page (currently returns JSON).

---

## Security and Operational Notes

- **Redis requirement**: In production, `REDIS_URL` must be configured to enforce nonce replay protection. Skipping nonce checks is acceptable only in local development.
- **Allowlist redirects**: Keep `LTI_ALLOWED_REDIRECT_HOSTS` minimal (only trusted hosts such as `nice.academy`).
- **Clock skew**: `clockTolerance: "5s"` helps with minor platform clock drift while preserving strictness.
- **No default fallbacks**: Authentication and verification failures are logged and cause an immediate failure response.
- **Short-lived tokens**: Clerk sign-in ticket TTL is intentionally low (60s) to reduce replay risk.

---

## Known Gaps / Next Enhancements

- **HTML error response**: Add content negotiation in the launch route to return a simple HTML error page when `Accept` indicates `text/html`.
- **Strict nonce policy**: Consider failing the launch if Redis is unavailable, except in explicit local development modes.
- **Zod `safeParse` everywhere**: Replace any remaining `parse` usages with `safeParse` inside the LTI flow for consistency with our error-handling rules.

---

## Onboarding Snapshot (for reference)

- **App Name**: Nice Academy
- **Description**: Nice Academy is a comprehensive learning platform designed to provide a structured and personalized educational experience through a library of courses, units, and lessons. The application focuses on mastery-based learning, allowing users to track their progress through interactive exercises, quizzes, and tests, while earning XP and maintaining weekly streaks to stay motivated.
- **Domains**: `https://nice.academy`
- **LTI launch URL**: `https://nice.academy/api/lti/launch`
- **LTI audience**: `nice-academy`
- **Logo URL**: `https://nice.academy/timeback/icon.png`
- **Preview Image URL**: `https://nice.academy/timeback/cover.png`
- **Subjects**: Science
- **Grade Range**: 6, 7, 8, 9
- **App Type**: Learning
- **Languages**: English


