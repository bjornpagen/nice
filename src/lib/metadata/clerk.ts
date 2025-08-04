import * as errors from "@superbuilders/errors"
import { z } from "zod"

/**
 * Schema for Clerk user public metadata.
 * This schema MUST be used whenever accessing user.publicMetadata to ensure type safety.
 * No optional chaining or fallbacks allowed - data must be validated.
 */
export const ClerkUserPublicMetadataSchema = z
	.union([
		z.object({
			nickname: z.string().default(""),
			username: z.string().default(""),
			bio: z.string().default(""),
			streak: z
				.object({
					count: z.number().default(0),
					lastActivityDate: z.string().datetime().nullable()
				})
				.default({ count: 0, lastActivityDate: null }),
			// sourceId is used for OneRoster integration
			sourceId: z.string().optional()
		}),
		z.undefined(),
		z.null()
	])
	.transform((val) => {
		// If undefined or null, return default values
		if (val === undefined || val === null) {
			return {
				nickname: "",
				username: "",
				bio: "",
				streak: { count: 0, lastActivityDate: null },
				sourceId: undefined
			}
		}
		return val
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
