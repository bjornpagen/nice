"use client"

import { useUser } from "@clerk/nextjs"
import * as React from "react"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { syncAndCacheUserEnrollments } from "@/lib/actions/user-sync"

const BASE_POLLING_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const MAX_BACKOFF_DELAY_MS = 30 * 60 * 1000 // 30 minutes
const JITTER_MS = 15 * 1000 // 15 seconds

export function useEnrollmentPoller() {
    const { isSignedIn, isLoaded } = useUser()
    const [failureCount, setFailureCount] = React.useState(0)

    React.useEffect(() => {
        if (!isLoaded || !isSignedIn) {
            return
        }

        let timeoutId: NodeJS.Timeout

        const poll = async () => {
            const result = await errors.try(syncAndCacheUserEnrollments())
            if (result.error) {
                logger.error("enrollment poll failed", { error: result.error, attempt: failureCount + 1 })
                setFailureCount((prev) => prev + 1)
            } else {
                setFailureCount(0)
            }

            const backoff = failureCount > 0 ? Math.min(MAX_BACKOFF_DELAY_MS, BASE_POLLING_INTERVAL_MS * 2 ** (failureCount - 1)) : 0
            const jitter = Math.random() * JITTER_MS
            const nextPollIn = BASE_POLLING_INTERVAL_MS + backoff + jitter

            timeoutId = setTimeout(poll, nextPollIn)
        }

        // initial slight random delay to desynchronize clients
        const initialDelay = Math.random() * JITTER_MS
        timeoutId = setTimeout(() => {
            void poll()
        }, initialDelay)

        return () => clearTimeout(timeoutId)
    }, [isSignedIn, isLoaded, failureCount])
}


