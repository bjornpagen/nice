import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"

/**
 * Schema for OneRoster user roles stored in Clerk metadata.
 * Matches the structure from OneRoster UserRoleSchema.
 */
const ClerkUserRoleSchema = z.object({
	roleType: z.string(),
	role: z.string(),
	org: z.object({
		sourcedId: z.string(),
		type: z.string().optional()
	}),
	userProfile: z.string().optional(),
	beginDate: z.string().nullable().optional(),
	endDate: z.string().nullable().optional()
})

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
					lastActivityDate: z.preprocess((val) => (val === undefined ? null : val), z.string().datetime().nullable())
				})
				.default({ count: 0, lastActivityDate: null }),
			// sourceId is used for OneRoster integration
			sourceId: z.string().optional(),
			// roles array from OneRoster
			roles: z.array(ClerkUserRoleSchema).default([])
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
				sourceId: undefined,
				roles: []
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
		logger.error("invalid user metadata", { error: result.error })
		throw errors.wrap(result.error, "invalid user metadata")
	}
	return result.data
}
