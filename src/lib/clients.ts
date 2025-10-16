import { env } from "@/env"
import * as caliperInternal from "@/lib/caliper"
import * as onerosterInternal from "@/lib/oneroster"
import * as caseInternal from "@/lib/case"
import * as powerpathInternal from "@/lib/powerpath"
import * as qtiInternal from "@/lib/qti"

/**
 * A singleton instance of the CaliperApiClient.
 * This client is configured once with environment variables and should be used
 * for all Caliper API interactions to ensure consistent configuration and
 * efficient token management.
 */
export const caliper = new caliperInternal.CaliperApiClient({
	serverUrl: env.TIMEBACK_CALIPER_SERVER_URL,
	tokenUrl: env.TIMEBACK_TOKEN_URL,
	clientId: env.TIMEBACK_CLIENT_ID,
	clientSecret: env.TIMEBACK_CLIENT_SECRET
})

/**
 * A singleton instance of the OneRosterApiClient.
 * This client is configured once with environment variables and should be used
 * for all OneRoster API interactions to ensure consistent configuration and
 * efficient token management.
 */
export const oneroster = new onerosterInternal.Client({
	serverUrl: env.TIMEBACK_ONEROSTER_SERVER_URL,
	tokenUrl: env.TIMEBACK_TOKEN_URL,
	clientId: env.TIMEBACK_CLIENT_ID,
	clientSecret: env.TIMEBACK_CLIENT_SECRET
})

/**
 * A singleton instance of the CASE Api Client.
 * Configured identically to the OneRoster client using the same env variables.
 */
export const caseApi = new caseInternal.Client({
    serverUrl: env.TIMEBACK_ONEROSTER_SERVER_URL,
    tokenUrl: env.TIMEBACK_TOKEN_URL,
    clientId: env.TIMEBACK_CLIENT_ID,
    clientSecret: env.TIMEBACK_CLIENT_SECRET
})

/**
 * A singleton instance of the PowerPath Api Client.
 * Mirrors OneRoster configuration using the same environment variables.
 */
export const powerpath = new powerpathInternal.Client({
	serverUrl: env.TIMEBACK_ONEROSTER_SERVER_URL,
	tokenUrl: env.TIMEBACK_TOKEN_URL,
	clientId: env.TIMEBACK_CLIENT_ID,
	clientSecret: env.TIMEBACK_CLIENT_SECRET
})

/**
 * A singleton instance of the QtiApiClient.
 * This client is configured once with environment variables and should be used
 * for all QTI API interactions to ensure consistent configuration and
 * efficient token management.
 */
export const qti = new qtiInternal.Client({
	serverUrl: env.TIMEBACK_QTI_SERVER_URL,
	tokenUrl: env.TIMEBACK_TOKEN_URL,
	clientId: env.TIMEBACK_CLIENT_ID,
	clientSecret: env.TIMEBACK_CLIENT_SECRET
})
