/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js"

/** @type {import("next").NextConfig} */
const config = {
	experimental: {
		dynamicIO: true,
		// Define custom cache profiles for our application's needs
		cacheLife: {
			// For structural data that changes only on content ingestion
			curriculum: {
				stale: 60 * 60 * 24, // 1 day
				revalidate: 60 * 60, // 1 hour
				expire: 60 * 60 * 24 * 7 // 1 week
			}
		}
	},
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn.kastatic.org"
			},
			{
				protocol: "https",
				hostname: "tools.applemediaservices.com"
			},
			{
				protocol: "https",
				hostname: "ext.same-assets.com"
			}
		]
	}
}
export default config
