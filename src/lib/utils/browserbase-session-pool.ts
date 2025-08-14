import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { type Browser, chromium } from "playwright"
import { env } from "@/env"

interface PooledSession {
	sessionId: string
	wsUrl: string
	browser: Browser | null
	isInUse: boolean
	createdAt: Date
	lastUsed: Date
}

/**
 * Browserbase session pool manager to minimize session creation
 * Implements session reuse, keep-alive, and proper cleanup
 */
class BrowserbaseSessionPool {
	private sessions: Map<string, PooledSession> = new Map()
	private readonly maxSessions: number
	private readonly sessionTimeout: number
	private lastSessionCreateTime = 0
	private readonly minCreateInterval: number = 3000 // minimum 3 seconds between session creates (max 20/minute, under 25/minute limit)
	private rateLimitedUntil = 0

	constructor(maxSessions = 10, sessionTimeoutMinutes = 30) {
		this.maxSessions = maxSessions
		this.sessionTimeout = sessionTimeoutMinutes * 60 // convert to seconds for browserbase API
	}

	/**
	 * Creates a new Browserbase session with keep-alive enabled
	 * Includes rate limiting and backoff logic
	 */
	private async createSession(): Promise<PooledSession> {
		// Check if we're currently rate limited
		const now = Date.now()
		if (now < this.rateLimitedUntil) {
			const waitTime = this.rateLimitedUntil - now
			logger.warn("rate limited, waiting before creating session", { waitTimeMs: waitTime })
			await new Promise((resolve) => setTimeout(resolve, waitTime))
		}

		// Enforce minimum interval between session creates
		const timeSinceLastCreate = now - this.lastSessionCreateTime
		if (timeSinceLastCreate < this.minCreateInterval) {
			const waitTime = this.minCreateInterval - timeSinceLastCreate
			logger.debug("throttling session creation", { waitTimeMs: waitTime })
			await new Promise((resolve) => setTimeout(resolve, waitTime))
		}

		this.lastSessionCreateTime = Date.now()

		const sessionResult = await errors.try(
			fetch("https://api.browserbase.com/v1/sessions", {
				method: "POST",
				headers: {
					"x-bb-api-key": env.BROWSERBASE_API_KEY,
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					projectId: env.BROWSERBASE_PROJECT_ID,
					keepAlive: true, // Enable keep-alive to maintain sessions
					timeout: this.sessionTimeout
				})
			})
		)
		if (sessionResult.error) {
			logger.error("failed to create browserbase session", { error: sessionResult.error })
			throw errors.wrap(sessionResult.error, "failed to create browserbase session")
		}

		const response = sessionResult.data

		// Handle rate limiting
		if (response.status === 429) {
			const retryAfterHeader = response.headers.get("retry-after")
			const retryAfterMs = retryAfterHeader ? Number.parseInt(retryAfterHeader) * 1000 : 60000 // default 1 minute
			this.rateLimitedUntil = Date.now() + retryAfterMs

			logger.warn("browserbase rate limit hit", {
				retryAfterMs,
				rateLimitedUntil: new Date(this.rateLimitedUntil).toISOString()
			})

			throw errors.new(`browserbase rate limited, retry after ${retryAfterMs}ms`)
		}

		const sessionJsonResult = await errors.try(response.json())
		if (sessionJsonResult.error) {
			logger.error("failed to parse session response", { error: sessionJsonResult.error })
			throw errors.wrap(sessionJsonResult.error, "failed to parse session response")
		}

		const sessionData = sessionJsonResult.data
		logger.debug("browserbase session response", { sessionData })

		// Handle error responses (like rate limiting in JSON)
		if (sessionData.error || sessionData.statusCode) {
			if (sessionData.statusCode === 429) {
				// Extract wait time from error message if available
				const match = sessionData.message?.match(/try again in (\d+) seconds/)
				const retryAfterMs = match ? Number.parseInt(match[1]) * 1000 : 60000
				this.rateLimitedUntil = Date.now() + retryAfterMs

				logger.warn("browserbase rate limit in json response", {
					retryAfterMs,
					rateLimitedUntil: new Date(this.rateLimitedUntil).toISOString()
				})
			}
			logger.error("browserbase session error", { sessionData })
			throw errors.new(`browserbase session error: ${JSON.stringify(sessionData)}`)
		}

		// Browserbase API response structure check
		if (!sessionData.id) {
			logger.error("browserbase session response missing id field", { sessionData })
			throw errors.new(`browserbase session response missing id field: ${JSON.stringify(sessionData)}`)
		}

		const sessionId = sessionData.id
		const wsUrl = `wss://connect.browserbase.com?apiKey=${env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`

		const session: PooledSession = {
			sessionId,
			wsUrl,
			browser: null,
			isInUse: false,
			createdAt: new Date(),
			lastUsed: new Date()
		}

		logger.debug("created new browserbase session", {
			sessionId,
			poolSize: this.sessions.size + 1
		})

		return session
	}

	/**
	 * Gets an available session from the pool or creates a new one
	 */
	async acquireSession(): Promise<{ sessionId: string; browser: Browser }> {
		// Clean up expired sessions first
		await this.cleanupExpiredSessions()

		// Try to find an available session
		for (const [sessionId, session] of this.sessions) {
			if (!session.isInUse && session.browser) {
				session.isInUse = true
				session.lastUsed = new Date()

				logger.debug("reusing existing browserbase session", {
					sessionId,
					poolSize: this.sessions.size
				})

				return {
					sessionId,
					browser: session.browser
				}
			}
		}

		// No available sessions, create a new one if under limit and not rate limited
		if (this.sessions.size < this.maxSessions) {
			// Check if we're rate limited before trying to create
			const now = Date.now()
			if (now < this.rateLimitedUntil) {
				logger.info("pool full and rate limited, waiting for existing session", {
					poolSize: this.sessions.size,
					rateLimitedUntil: new Date(this.rateLimitedUntil).toISOString()
				})
				return this.waitForAvailableSession()
			}

			const newSession = await this.createSession()

			// Connect to the browser
			const browserResult = await errors.try(chromium.connectOverCDP(newSession.wsUrl))
			if (browserResult.error) {
				// Clean up the session if we can't connect
				this.sessions.delete(newSession.sessionId)
				logger.error("failed to connect to browser", { sessionId: newSession.sessionId, error: browserResult.error })
				throw errors.wrap(browserResult.error, "failed to connect to browser")
			}

			newSession.browser = browserResult.data
			newSession.isInUse = true
			this.sessions.set(newSession.sessionId, newSession)

			return {
				sessionId: newSession.sessionId,
				browser: newSession.browser
			}
		}

		// Pool is full, wait for an available session
		return this.waitForAvailableSession()
	}

	/**
	 * Releases a session back to the pool for reuse
	 */
	releaseSession(sessionId: string): void {
		const session = this.sessions.get(sessionId)
		if (session) {
			session.isInUse = false
			session.lastUsed = new Date()

			logger.debug("released browserbase session back to pool", {
				sessionId,
				availableSessions: Array.from(this.sessions.values()).filter((s) => !s.isInUse).length
			})
		}
	}

	/**
	 * Waits for a session to become available
	 * Uses longer timeout if we're rate limited
	 */
	private async waitForAvailableSession(): Promise<{ sessionId: string; browser: Browser }> {
		return new Promise((resolve, reject) => {
			const checkInterval = setInterval(async () => {
				const availableSession = Array.from(this.sessions.values()).find((s) => !s.isInUse && s.browser)

				if (availableSession?.browser) {
					clearInterval(checkInterval)
					availableSession.isInUse = true
					availableSession.lastUsed = new Date()

					resolve({
						sessionId: availableSession.sessionId,
						browser: availableSession.browser
					})
				}
			}, 1000) // Check every 1 second for higher responsiveness with 100 sessions

			// Use longer timeout if we're rate limited
			const now = Date.now()
			const baseTimeout = 60000 // 1 minute base timeout
			const rateLimitBuffer = Math.max(0, this.rateLimitedUntil - now) + 10000 // rate limit time + 10s buffer
			const totalTimeout = baseTimeout + rateLimitBuffer

			logger.debug("waiting for available session", {
				timeoutMs: totalTimeout,
				isRateLimited: now < this.rateLimitedUntil
			})

			setTimeout(() => {
				clearInterval(checkInterval)
				reject(errors.new(`timeout waiting for available browserbase session after ${totalTimeout}ms`))
			}, totalTimeout)
		})
	}

	/**
	 * Cleans up expired sessions
	 */
	private async cleanupExpiredSessions(): Promise<void> {
		const now = new Date()
		const sessionsToRemove: string[] = []

		for (const [sessionId, session] of this.sessions) {
			const age = now.getTime() - session.lastUsed.getTime()

			if (age > this.sessionTimeout * 1000) {
				// convert sessionTimeout from seconds to ms for comparison
				sessionsToRemove.push(sessionId)

				// Close browser if connected
				if (session.browser) {
					const closeResult = await errors.try(session.browser.close())
					if (closeResult.error) {
						logger.warn("failed to close expired browser session", {
							sessionId,
							error: closeResult.error
						})
					}
				}
			}
		}

		// Remove expired sessions
		for (const sessionId of sessionsToRemove) {
			this.sessions.delete(sessionId)
			logger.debug("removed expired browserbase session", {
				sessionId,
				poolSize: this.sessions.size
			})
		}
	}

	/**
	 * Closes all sessions and cleans up the pool
	 */
	async cleanup(): Promise<void> {
		logger.info("cleaning up browserbase session pool", {
			sessionCount: this.sessions.size
		})

		const closePromises = Array.from(this.sessions.values()).map(async (session) => {
			if (session.browser) {
				const closeResult = await errors.try(session.browser.close())
				if (closeResult.error) {
					logger.warn("failed to close browser during cleanup", {
						sessionId: session.sessionId,
						error: closeResult.error
					})
				}
			}
		})

		await Promise.allSettled(closePromises)
		this.sessions.clear()
	}

	/**
	 * Gets pool statistics including rate limiting status
	 */
	getStats() {
		const sessions = Array.from(this.sessions.values())
		const now = Date.now()
		return {
			totalSessions: sessions.length,
			inUseSessions: sessions.filter((s) => s.isInUse).length,
			availableSessions: sessions.filter((s) => !s.isInUse).length,
			maxSessions: this.maxSessions,
			isRateLimited: now < this.rateLimitedUntil,
			rateLimitedUntil: this.rateLimitedUntil > 0 ? new Date(this.rateLimitedUntil).toISOString() : null,
			timeSinceLastCreate: now - this.lastSessionCreateTime,
			minCreateInterval: this.minCreateInterval
		}
	}
}

// Global session pool instance
export const sessionPool = new BrowserbaseSessionPool(
	100, // max 100 concurrent sessions to match function concurrency
	30 // 30 minute timeout
)

// Cleanup on process exit
process.on("SIGINT", async () => {
	await sessionPool.cleanup()
	process.exit(0)
})

process.on("SIGTERM", async () => {
	await sessionPool.cleanup()
	process.exit(0)
})
