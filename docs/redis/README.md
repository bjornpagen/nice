### Redis connection crashes in production: root cause analysis and remediation plan

#### Summary
We observe frequent Redis-related crashes in production with errors like "Socket already opened" and unhandled rejections during module initialization, causing process exits and restarts. This document explains the root cause, shows the relevant code, outlines the impact (including how it can exacerbate banked XP intermittency), and proposes a safe, incremental fix plan.

#### High-signal symptoms in logs
- "failed to connect to redis" with cause "Socket already opened"
- "Unhandled Rejection: Error: redis connection failed" during module load
- Immediate process termination: "Node.js process exited with exit status: 128"
- Repeated reconnect attempts during bursts/cold starts

#### Why this happens
1) Multiple connect() calls in the same runtime
- Our module memoizes the Redis client instance in a global, but the connection promise is only memoized in development.
- In production, parallel module evaluations (common in serverless/edge bursts) race: each import sees a client but no shared connection promise, so each calls client.connect() → additional connect triggers "Socket already opened".

2) Throwing during module initialization
- We call client.connect() at import time and throw if it fails. Errors thrown during module evaluation become unhandled rejections; Node/Vercel crashes the process. New instances repeat the same race.

#### Relevant code (current)
```12:57:src/lib/redis.ts
let redis: ReturnType<typeof createClient> | undefined
let connectionPromise: Promise<void> | undefined

if (!globalThis.redisClient && env.REDIS_URL) {
  globalThis.redisClient = createClient({ url: env.REDIS_URL, ...REDIS_CONFIG })
}
redis = globalThis.redisClient
connectionPromise = globalThis.redisConnectionPromise

if (redis && !connectionPromise) {
  redis.on("error", (err) => logger.error("redis client error", { error: err }))
  redis.on("connect", () => logger.info("redis client connected"))
  redis.on("ready", () => logger.info("redis client ready"))

  const createRedisConnection = async (client: ReturnType<typeof createClient>) => {
    const connectResult = await errors.try(client.connect())
    if (connectResult.error) {
      logger.error("failed to connect to redis", { error: connectResult.error })
      // CRITICAL: Throw an error if connection fails. The app cannot function without Redis.
      throw errors.wrap(connectResult.error, "redis connection failed")
    }
  }
  connectionPromise = createRedisConnection(redis)

  if (env.NODE_ENV === "development") {
    globalThis.redisConnectionPromise = connectionPromise
  }
}
```

Key issues in this snippet:
- Only development stores `globalThis.redisConnectionPromise`. In production, each import path will see `!connectionPromise` and reconnect.
- The code throws during module init (`throw errors.wrap(...)`). No consumer is awaiting the promise at import time; this becomes an unhandled rejection.

#### Impact on product behavior
- Frequent process restarts (noise, latency spikes).
- During outage windows, cache invalidation can be skipped. For time-sensitive flows (e.g., banked XP), this increases the chance of computing with stale caliper caches, leading to missed bank unlocks that are hard to reproduce later.

#### Proposed remediation (safe, incremental)
1) Memoize the connection promise in production as well
- Always set `globalThis.redisConnectionPromise = connectionPromise` (not only in development). This coalesces parallel imports to a single connect.

2) Guard connect by state
- If `redis.isOpen` or `redis.isReady`, do NOT call `connect()` again.

3) Do not throw during module initialization
- Replace the throw with: log the error, and leave `redis.isReady === false`. Our cache module already degrades gracefully when Redis is not available (returns to callback path). This avoids process crashes.

4) Optional: lazy connection
- Defer `connect()` until the first operation that needs Redis. This removes module-eval-time failure modes, but is not required if (1)-(3) are applied.

#### Example changes (illustrative)
Note: This is a proposal sketch; apply with care and run `bun typecheck`.

```start:stop:src/lib/redis.ts
// Pseudocode-level edits (do not apply blindly):

// After creating the client:
redis = globalThis.redisClient
connectionPromise = globalThis.redisConnectionPromise

if (redis && !connectionPromise) {
  if (!(redis.isOpen || redis.isReady)) {
    const createRedisConnection = async (client: ReturnType<typeof createClient>) => {
      const connectResult = await errors.try(client.connect())
      if (connectResult.error) {
        logger.error("failed to connect to redis", { error: connectResult.error })
        // Do not throw during module init; let callers degrade.
        return
      }
    }
    connectionPromise = createRedisConnection(redis)
  } else {
    logger.info("redis already connected or ready; skipping connect")
    connectionPromise = Promise.resolve()
  }
  // Memoize in all environments
  globalThis.redisConnectionPromise = connectionPromise
}
```

#### Verification plan
- Add temporary logs for:
  - when `connect()` is invoked, and by which worker/request
  - `redis.isOpen`/`redis.isReady` states
  - whether `globalThis.redisConnectionPromise` is reused across imports
- Deploy to preview; observe that concurrent cold starts result in a single `connect()` and no "Socket already opened".
- In production, grep for absence of:
  - "Unhandled Rejection: Error: redis connection failed"
  - "failed to connect to redis" with cause "Socket already opened"

#### Rollout and safety
- Change is backward-compatible; when Redis is unavailable, callers already handle the no-cache path (see `redisCache` warnings and direct callback execution). Eliminating module-init throws reduces process churn without hiding errors (we continue logging).

#### Appendices

Appendix A — Cache behavior when Redis is unavailable
```48:75:src/lib/cache.ts
const getResult = await errors.try(redis.get(key))
if (getResult.error) {
  logger.error("failed to get value from redis", { key, error: getResult.error })
  // Fallback: execute the callback directly if Redis fails
  return executeCallback()
}
...
if (!redis || !redis.isReady) {
  logger.warn("redis not available, executing callback without caching", { keyParts })
  return callback()
}
```

Appendix B — Banked XP intermittency link
While Redis crashes don’t directly compute banked XP, they can cause cache invalidation to be skipped during submission windows. This increases the chance of computing with a stale caliper cache shortly afterwards, which manifests as missing bank unlocks. Fixing the Redis connection churn reduces this vector.

#### Next steps
- Implement the above guards and memoization.
- Re-deploy and monitor logs for 24–48 hours.
- If residual issues remain, consider lazy-connecting and adding a thin connection manager that serializes `connect()` calls by key.


