import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { env } from "@/env"

/**
 * Converts a plain OneRoster resource ID to a fully-qualified Caliper-compliant URI.
 * If the ID is already a URI, it is returned unchanged.
 * @param resourceId The plain OneRoster resource ID (e.g., "nice_x3f3b1dd39647cb48").
 * @returns The fully-qualified URI for the resource.
 */
export function normalizeCaliperId(resourceId: string): string {
	if (resourceId.startsWith("http")) {
		return resourceId // Already a URI
	}
	// No fallbacks: environment must provide a base URL
	const onerosterBaseUrl = env.TIMEBACK_ONEROSTER_SERVER_URL
	if (!onerosterBaseUrl) {
		logger.error("missing required environment variable", { name: "TIMEBACK_ONEROSTER_SERVER_URL" })
		throw errors.new("missing configuration")
	}
	const uri = `${onerosterBaseUrl}/ims/oneroster/rostering/v1p2/resources/${resourceId}`
	logger.debug("converted plain resource ID to OneRoster URI", {
		originalId: resourceId,
		convertedUri: uri
	})
	return uri
}

/**
 * Extracts the base resource ID from a compound componentResource ID.
 * Assessment results are saved under the resource ID, not the componentResource ID.
 * Example: "nice_unitId_resourceId" -> "nice_resourceId"
 * @param compoundId The compound ID to parse.
 * @returns The extracted resource ID.
 */
export function extractResourceIdFromCompoundId(compoundId: string): string {
	const idParts = compoundId.split("_")
	if (idParts.length === 3 && idParts[0] === "nice") {
		const resourceId = `${idParts[0]}_${idParts[2]}`
		logger.debug("extracted resource id from compound id", {
			originalId: compoundId,
			extractedResourceId: resourceId
		})
		return resourceId
	}
	return compoundId // Not a compound ID, return as is
}
