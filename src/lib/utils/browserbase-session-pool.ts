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

	constructor(maxSessions = 10, sessionTimeoutMinutes = 30) {
		this.maxSessions = maxSessions
		this.sessionTimeout = sessionTimeoutMinutes * 60 * 1000 // convert to ms
	}

	/**
	 * Creates a new Browserbase session with keep-alive enabled
	 */
	private async createSession(): Promise<PooledSession> {
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
			throw errors.wrap(sessionResult.error, "failed to create browserbase session")
		}

		const sessionJsonResult = await errors.try(sessionResult.data.json())
		if (sessionJsonResult.error) {
			throw errors.wrap(sessionJsonResult.error, "failed to parse session response")
		}

		const { id: sessionId } = sessionJsonResult.data
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

		// No available sessions, create a new one if under limit
		if (this.sessions.size < this.maxSessions) {
			const newSession = await this.createSession()

			// Connect to the browser
			const browserResult = await errors.try(chromium.connectOverCDP(newSession.wsUrl))
			if (browserResult.error) {
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
			}, 1000) // Check every second

			// Timeout after 30 seconds
			setTimeout(() => {
				clearInterval(checkInterval)
				reject(errors.new("timeout waiting for available browserbase session"))
			}, 30000)
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

			if (age > this.sessionTimeout) {
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
	 * Gets pool statistics
	 */
	getStats() {
		const sessions = Array.from(this.sessions.values())
		return {
			totalSessions: sessions.length,
			inUseSessions: sessions.filter((s) => s.isInUse).length,
			availableSessions: sessions.filter((s) => !s.isInUse).length,
			maxSessions: this.maxSessions
		}
	}
}

// Global session pool instance
export const sessionPool = new BrowserbaseSessionPool(
	10, // max 10 concurrent sessions (adjust based on your plan)
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
