import type { ClerkClient, User } from "@clerk/backend"
import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// Define which routes should be protected (require authentication)
const isProtectedRoute = createRouteMatcher([
	"/profile(.*)", // Protect all profile routes
	"/debug(.*)", // Protect all debug routes
	"/((?!api|login|sign-up|debug|demo|test-redirect|sso-callback|a|e|v).*)" // Protect all subject routes (exclude public routes)
])

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
		return Response.redirect(new URL("/profile/me/courses", req.url))
	}

	// Protect routes that require authentication
	if (isProtectedRoute(req)) {
		await auth.protect()
	}

	// Gate course-builder to non-student roles only
	if (isCourseBuilderRoute(req)) {
		if (!userId) {
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const clientResult = await errors.try<ClerkClient>(clerkClient())
		if (clientResult.error) {
			logger.error("clerk client", { error: clientResult.error })
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const client = clientResult.data
		const userResult = await errors.try<User>(client.users.getUser(userId))
		if (userResult.error) {
			logger.error("user lookup", { error: userResult.error })
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const user = userResult.data
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
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}
	}

	// Enforce domain restriction for all debug routes
	if (isDebugRoute(req)) {
		if (!userId) {
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const clientResult = await errors.try<ClerkClient>(clerkClient())
		if (clientResult.error) {
			logger.error("clerk client", { error: clientResult.error })
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const client = clientResult.data
		const userResult = await errors.try<User>(client.users.getUser(userId))
		if (userResult.error) {
			logger.error("user lookup", { error: userResult.error })
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const user = userResult.data
		const hasAllowedEmail = user.emailAddresses.some((addr) => addr.emailAddress.endsWith("@superbuilders.school"))
		if (!hasAllowedEmail) {
			logger.warn("forbidden email domain", { userId })
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}
	}

	// Enforce domain restriction for metrics route
	if (isMetricsRoute(req)) {
		if (!userId) {
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const clientResult = await errors.try<ClerkClient>(clerkClient())
		if (clientResult.error) {
			logger.error("clerk client", { error: clientResult.error })
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const client = clientResult.data
		const userResult = await errors.try<User>(client.users.getUser(userId))
		if (userResult.error) {
			logger.error("user lookup", { error: userResult.error })
			return Response.redirect(new URL("/profile/me/courses", req.url))
		}

		const user = userResult.data
		const hasAllowedEmail = user.emailAddresses.some((addr) => addr.emailAddress.endsWith("@superbuilders.school"))
		if (!hasAllowedEmail) {
			logger.warn("forbidden email domain", { userId })
			return Response.redirect(new URL("/profile/me/courses", req.url))
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
