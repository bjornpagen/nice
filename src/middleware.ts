import type { User } from "@clerk/backend"
import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_SEGMENTS = new Set([
	"",
	"login",
	"sign-up",
	"demo",
	"test-redirect",
	"sso-callback",
	"a",
	"e",
	"v"
])

const PUBLIC_PREFIXES = ["/api", "/.well-known", "/_next"]

function shouldProtectPath(pathname: string): boolean {
	const normalizedPath = pathname === "" ? "/" : pathname
	if (normalizedPath === "/") {
		return false
	}
	const lowerPath = normalizedPath.toLowerCase()

	for (const prefix of PUBLIC_PREFIXES) {
		if (lowerPath.startsWith(prefix)) {
			return false
		}
	}

	const segments = lowerPath.split("/").filter(Boolean)
	const firstSegment = segments[0] ?? ""
	if (PUBLIC_SEGMENTS.has(firstSegment)) {
		return false
	}

	return true
}

function buildUnauthenticatedRedirectUrl(req: NextRequest): string {
	const loginUrl = new URL("/login", req.url)
	const path = req.nextUrl.pathname
	const search = req.nextUrl.search
	const hash = req.nextUrl.hash ?? ""
	const destination = `${path}${search}${hash}`
	const isSelfRedirect = path === "/login" || path === "/sign-up"
	if (!isSelfRedirect && destination !== "" && destination !== "/") {
		loginUrl.searchParams.set("redirect_url", destination)
	}
	return loginUrl.toString()
}

type GuardContext = {
	req: NextRequest
	userId: string | null
}

function redirectToProfile(req: NextRequest): Response {
	return NextResponse.redirect(new URL("/profile/me/courses", req.url))
}

async function loadClerkUser(userId: string): Promise<User | null> {
	const clientResult = await errors.try(clerkClient())
	if (clientResult.error) {
		logger.error("clerk client", { error: clientResult.error })
		return null
	}

	const userResult = await errors.try(clientResult.data.users.getUser(userId))
	if (userResult.error) {
		logger.error("user lookup", { error: userResult.error })
		return null
	}

	return userResult.data
}

async function guardCourseBuilderAccess({ req, userId }: GuardContext): Promise<Response | void> {
	if (!userId) {
		return redirectToProfile(req)
	}

	const user = await loadClerkUser(userId)
	if (!user) {
		return redirectToProfile(req)
	}

	const pm: any = user.publicMetadata || {}
	let rolesNormalized: string[] = []
	if (Array.isArray(pm.roles)) {
		rolesNormalized = pm.roles
			.map((r: any) => (typeof r === "string" ? r : (r?.role ?? r?.roleType ?? "")))
			.map((r: string) => r.toLowerCase())
			.filter((r: string) => r.length > 0)
	} else if (typeof pm.role === "string") {
		rolesNormalized = [pm.role.toLowerCase()]
	}
	const hasNonStudentRole = rolesNormalized.some((r) => r !== "student")
	const isOnlyStudent = rolesNormalized.length === 0 ? true : !hasNonStudentRole
	if (isOnlyStudent) {
		logger.warn("forbidden role for course-builder", { userId, roles: rolesNormalized })
		return redirectToProfile(req)
	}
}

async function guardSuperbuildersDomain({ req, userId }: GuardContext): Promise<Response | void> {
	if (!userId) {
		return redirectToProfile(req)
	}

	const user = await loadClerkUser(userId)
	if (!user) {
		return redirectToProfile(req)
	}

	const hasAllowedEmail = user.emailAddresses.some((addr) => addr.emailAddress.endsWith("@superbuilders.school"))
	if (!hasAllowedEmail) {
		logger.warn("forbidden email domain", { userId })
		return redirectToProfile(req)
	}
}

// Define which routes should be protected (require authentication)
const isProtectedRoute = createRouteMatcher((req) => shouldProtectPath(req.nextUrl.pathname))

// Route matcher for all debug routes
const isDebugRoute = createRouteMatcher(["/debug(.*)"])
// Route matcher for metrics route
const isMetricsRoute = createRouteMatcher(["/profile/me/metrics(.*)"])
// Route matcher for course builder admin page
const isCourseBuilderRoute = createRouteMatcher(["/course-builder(.*)"])

// Define which routes authenticated users shouldn't access
const isAuthRoute = createRouteMatcher([
	"/login(.*)", // Login pages
	"/sign-up(.*)" // Sign up pages (if you add them)
])

export default clerkMiddleware(async (auth, req) => {
	// Allow X-API-Key protected course-builder API to bypass Clerk middleware
	const pathname = req.nextUrl.pathname
	if (pathname.startsWith("/api/v1/course-builder")) {
		return
	}
	const { userId } = await auth()

	// If user is authenticated and trying to access auth routes (login/signup)
	if (userId && isAuthRoute(req)) {
		// Redirect to dashboard instead
		return NextResponse.redirect(new URL("/profile/me/courses", req.url))
	}

	// Protect routes that require authentication
	if (isProtectedRoute(req)) {
		if (!userId) {
			return NextResponse.redirect(buildUnauthenticatedRedirectUrl(req))
		}
		await auth.protect()
	}

	const routeGuards: Array<{
		matcher: ReturnType<typeof createRouteMatcher>
		guard: (context: GuardContext) => Promise<Response | void>
	}> = [
		{ matcher: isCourseBuilderRoute, guard: guardCourseBuilderAccess },
		{ matcher: isDebugRoute, guard: guardSuperbuildersDomain },
		{ matcher: isMetricsRoute, guard: guardCourseBuilderAccess }
	]

	for (const { matcher, guard } of routeGuards) {
		if (matcher(req)) {
			const maybeRedirect = await guard({ req, userId: userId ?? null })
			if (maybeRedirect) {
				return maybeRedirect
			}
		}
	}
})

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)"
	]
}
