import * as errors from "@superbuilders/errors"
import { z } from "zod"

/**
 * Schema for Clerk user public metadata.
 * This schema MUST be used whenever accessing user.publicMetadata to ensure type safety.
 * No optional chaining or fallbacks allowed - data must be validated.
 */
export const ClerkUserPublicMetadataSchema = z.object({
	nickname: z.string(),
	username: z.string(),
	bio: z.string(),
	streak: z.object({
		count: z.number(),
		lastActivityDate: z.string().datetime().nullable()
	}),
	// sourceId is used for OneRoster integration
	sourceId: z.string().optional()
})

export type ClerkUserPublicMetadata = z.infer<typeof ClerkUserPublicMetadataSchema>

/**
 * Parse user public metadata with explicit validation.
 * Throws if metadata is invalid - no silent failures allowed.
 */
export function parseUserPublicMetadata(metadata: unknown): ClerkUserPublicMetadata {
	const result = ClerkUserPublicMetadataSchema.safeParse(metadata)
	if (!result.success) {
		throw errors.wrap(result.error, "invalid user metadata")
	}
	return result.data
}
