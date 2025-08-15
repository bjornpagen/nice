/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js"

/** @type {import("next").NextConfig} */
const config = {
	experimental: {
		cacheComponents: true,
		reactCompiler: true,
		useCache: true
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
			},
			{
				protocol: "https",
				hostname: "qfrdh3przruvxqbvw.public.blob.vercel-storage.com"
			},
			{
				protocol: "https",
				hostname: "**.public.blob.vercel-storage.com"
			}
		]
	}
}
export default config
