import { auth, currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"

type ClerkUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>

/**
 * Ensures a Clerk user is present; otherwise triggers Clerk's sign-in redirect.
 */
export async function requireUser(): Promise<ClerkUser> {
	const user = await currentUser()
	if (user) {
		return user
	}

	const authResult = await auth()
	authResult.redirectToSignIn()
	throw errors.new("redirectToSignIn returned unexpectedly")
}
