import { clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

export async function updateUserMetadata(userId: string, metadata: unknown) {
	const validation = ClerkUserPublicMetadataSchema.safeParse(metadata)
	if (!validation.success) {
		throw errors.wrap(validation.error, "clerk metadata validation")
	}
	const clerk = await clerkClient()
	await clerk.users.updateUserMetadata(userId, {
		publicMetadata: validation.data
	})
}
