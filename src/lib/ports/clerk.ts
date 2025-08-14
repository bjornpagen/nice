import { clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

export async function updateUserMetadata(userId: string, metadata: unknown) {
	const validation = ClerkUserPublicMetadataSchema.safeParse(metadata)
	if (!validation.success) {
		logger.error("clerk metadata validation failed", { error: validation.error, userId, metadata })
		throw errors.wrap(validation.error, "clerk metadata validation")
	}
	const clerk = await clerkClient()
	await clerk.users.updateUserMetadata(userId, {
		publicMetadata: validation.data
	})
}
