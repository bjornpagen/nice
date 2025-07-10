import { env } from "@/env"
import { OneRosterApiClient } from "./oneroster"
import { QtiApiClient } from "./qti"

/**
 * A singleton instance of the OneRosterApiClient.
 * This client is configured once with environment variables and should be used
 * for all OneRoster API interactions to ensure consistent configuration and
 * efficient token management.
 */
export const oneroster = new OneRosterApiClient({
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
export const qti = new QtiApiClient({
	serverUrl: env.TIMEBACK_QTI_SERVER_URL,
	tokenUrl: env.TIMEBACK_TOKEN_URL,
	clientId: env.TIMEBACK_CLIENT_ID,
	clientSecret: env.TIMEBACK_CLIENT_SECRET
})
