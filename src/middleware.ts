import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Define which routes should be protected (require authentication)
const isProtectedRoute = createRouteMatcher([
	"/profile(.*)" // Protect all profile routes
])

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
})

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)"
	]
}
