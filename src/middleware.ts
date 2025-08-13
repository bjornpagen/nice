import type { ClerkClient, User } from "@clerk/backend"
import { clerkClient, clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

// Define which routes should be protected (require authentication)
const isProtectedRoute = createRouteMatcher([
	"/profile(.*)", // Protect all profile routes
	"/debug/questions(.*)", // Protect debug questions specifically
	"/((?!api|login|sign-up|debug|demo|test-redirect|sso-callback|a|e|v).*)" // Protect all subject routes (exclude public routes)
])

// Route matcher for debug questions
const isDebugQuestionsRoute = createRouteMatcher(["/debug/questions(.*)"])

// Define which routes authenticated users shouldn't access
const isAuthRoute = createRouteMatcher([
	"/login(.*)", // Login pages
	"/sign-up(.*)" // Sign up pages (if you add them)
])

export default clerkMiddleware(async (auth, req) => {
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

	// Enforce domain restriction for debug questions
	if (isDebugQuestionsRoute(req)) {
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
