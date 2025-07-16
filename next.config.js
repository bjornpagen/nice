/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js"

/** @type {import("next").NextConfig} */
const config = {
	// experimental: {
	// 	dynamicIO: true,
	// 	reactCompiler: true,
	// 	useCache: true
	// },
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
