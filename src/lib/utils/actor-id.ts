import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"

/**
 * Extracts a bare OneRoster user sourcedId from either a bare id or a full URI.
 * Examples:
 *  - "abc123" -> "abc123"
 *  - "https://.../ims/oneroster/rostering/v1p2/users/abc123" -> "abc123"
 */
export function extractUserSourcedId(input: string): string {
	if (input.startsWith("http")) {
		const idx = input.lastIndexOf("/users/")
		if (idx === -1) {
			const err = errors.new("invalid actor uri: missing /users/")
			logger.error("invalid actor uri", { input, error: err })
			throw err
		}
		const id = input.slice(idx + "/users/".length)
		if (!id) {
			const err = errors.new("invalid actor uri: empty user id")
			logger.error("invalid actor uri", { input, error: err })
			throw err
		}
		return id
	}
	return input
}

/**
 * Constructs a full OneRoster actorId URI from a user's sourcedId or a full URI.
 * Input may be a bare sourcedId or a full OneRoster user URI; output is always a full URI.
 */
export function constructActorId(userOrUri: string): string {
	if (userOrUri.startsWith("http")) return userOrUri
	const base = env.TIMEBACK_ONEROSTER_SERVER_URL
	return `${base}/ims/oneroster/rostering/v1p2/users/${userOrUri}`
}
