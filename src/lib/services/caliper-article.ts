import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { redis } from "@/lib/redis"
import { buildCaliperPayloadForContentWithEmail } from "@/lib/caliper/payload"
import { sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import type { CaliperArticleReadState } from "@/lib/article-cache"
import {
    getCaliperFinalizationLockKey as getArticleFinalizationLockKey,
    getCaliperArticleReadState,
    setCaliperArticleReadState
} from "@/lib/article-cache"
import { getAllCoursesBySlug } from "@/lib/oneroster/redis/api"
// Pull writer from server actions to avoid duplication; safe because it doesn't call auth()
import { upsertNiceTimeSpentToOneRoster as writeTimeToOneRoster } from "@/lib/caliper/writer"

const ARTICLE_ACCUMULATION_CADENCE_SECONDS = 5
const ARTICLE_MAX_GROWTH_FACTOR_VS_WALLTIME = 1.5

export async function accumulateArticleReadTimeService(
    userSourcedId: string,
    onerosterArticleResourceSourcedId: string,
    sessionDeltaSeconds: number
) {
    if (sessionDeltaSeconds <= 0 || !Number.isFinite(sessionDeltaSeconds)) {
        logger.warn("caliper accumulate article: invalid session delta", { sessionDeltaSeconds })
        return
    }

    const now = new Date()
    const existingState = await getCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId)
    let currentState: CaliperArticleReadState
    if (existingState) {
        currentState = existingState
    } else {
        currentState = {
            cumulativeReadTimeSeconds: 0,
            reportedReadTimeSeconds: 0,
            canonicalDurationSeconds: null,
            lastServerSyncAt: null,
            finalizedAt: null
        }
    }

    if (currentState.finalizedAt !== null) {
        logger.debug("article already finalized, skipping accumulate", { articleId: onerosterArticleResourceSourcedId })
        return
    }

    let effectiveDelta = sessionDeltaSeconds
    if (currentState.lastServerSyncAt !== null) {
        const sinceMs = now.getTime() - new Date(currentState.lastServerSyncAt).getTime()
        const allowed = (sinceMs / 1000) * ARTICLE_MAX_GROWTH_FACTOR_VS_WALLTIME
        const leeway = ARTICLE_ACCUMULATION_CADENCE_SECONDS / 2
        const guardAllowed = Math.max(allowed, leeway)

        if (effectiveDelta > guardAllowed) {
            logger.warn("caliper accumulate article: delta clamped by wall-time guard", {
                sessionDeltaSeconds,
                allowed,
                effectiveDelta: guardAllowed
            })
            effectiveDelta = Math.max(0, guardAllowed)
        }
    }

    const newCumulative = currentState.cumulativeReadTimeSeconds + effectiveDelta
    const newState: CaliperArticleReadState = {
        ...currentState,
        cumulativeReadTimeSeconds: newCumulative,
        lastServerSyncAt: now.toISOString()
    }

    logger.debug("article accumulate: success", {
        articleId: onerosterArticleResourceSourcedId,
        delta: effectiveDelta,
        cumulative: newCumulative
    })
    await setCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId, newState)
}

export async function finalizeArticlePartialTimeSpentService(
    userSourcedId: string,
    onerosterArticleResourceSourcedId: string,
    articleTitle: string,
    courseInfo: { subjectSlug: string; courseSlug: string },
    userEmail: string
): Promise<void> {
    const state = await getCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId)
    if (!state) {
        logger.debug("article partial finalize: no state found", { articleId: onerosterArticleResourceSourcedId })
        return
    }
    if (state.finalizedAt !== null) {
        logger.debug("article partial finalize: already finalized", { articleId: onerosterArticleResourceSourcedId })
        return
    }

    const deltaToReport = Math.max(0, state.cumulativeReadTimeSeconds - state.reportedReadTimeSeconds)
    if (deltaToReport <= 0) {
        return
    }

    const { actor, context } = await buildCaliperPayloadForContentWithEmail(
        userSourcedId,
        userEmail,
        onerosterArticleResourceSourcedId,
        articleTitle,
        courseInfo
    )

    logger.info("article partial finalize: sending delta", {
        articleId: onerosterArticleResourceSourcedId,
        user: userSourcedId,
        delta: Math.floor(deltaToReport)
    })

    const sendResult = await errors.try(sendCaliperTimeSpentEvent(actor, context, Math.floor(deltaToReport)))
    if (sendResult.error) {
        logger.error("caliper partial finalize article: failed to send event", { error: sendResult.error })
        throw errors.wrap(sendResult.error, "caliper partial timespent article")
    }

    const newState: CaliperArticleReadState = {
        ...state,
        reportedReadTimeSeconds: state.reportedReadTimeSeconds + deltaToReport,
        lastServerSyncAt: new Date().toISOString()
    }
    await setCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId, newState)

    const courseSourcedId = await resolveCourseSourcedIdLocal(courseInfo.courseSlug)
    if (courseSourcedId) {
        logger.info("writing article time spent to oneroster", {
            userSourcedId,
            resourceSourcedId: onerosterArticleResourceSourcedId,
            courseSourcedId,
            finalSeconds: newState.cumulativeReadTimeSeconds
        })
        await writeTimeToOneRoster({
            kind: "article",
            userSourcedId,
            resourceSourcedId: onerosterArticleResourceSourcedId,
            courseSourcedId,
            finalSeconds: newState.cumulativeReadTimeSeconds
        })
    } else {
        logger.warn("skipping oneroster time spent write: course not found", {
            courseSlug: courseInfo.courseSlug,
            userSourcedId,
            resourceSourcedId: onerosterArticleResourceSourcedId
        })
    }
}

export async function finalizeArticleTimeSpentEventService(
    userSourcedId: string,
    onerosterArticleResourceSourcedId: string,
    articleTitle: string,
    courseInfo: { subjectSlug: string; courseSlug: string },
    userEmail: string
) {
    if (!redis) {
        logger.error("caliper finalize article: redis unavailable")
        throw errors.new("persistence service unavailable")
    }
    const lockKey = getArticleFinalizationLockKey(userSourcedId, onerosterArticleResourceSourcedId)
    const lockSetResult = await errors.try(redis.set(lockKey, "1", { EX: 30, NX: true }))
    if (lockSetResult.error) {
        logger.error("caliper finalize article: set lock failed", { error: lockSetResult.error })
        throw errors.wrap(lockSetResult.error, "caliper finalize article lock")
    }
    if (!lockSetResult.data) {
        logger.debug("caliper finalize article: lock not acquired, another process is finalizing", {
            articleId: onerosterArticleResourceSourcedId,
            user: userSourcedId
        })
        return
    }

    let lockReleased = false
    const releaseLock = async () => {
        if (!lockReleased && redis) {
            const delResult = await errors.try(redis.del(lockKey))
            if (delResult.error) {
                logger.error("caliper finalize article: del lock failed", { error: delResult.error })
            }
            lockReleased = true
        }
    }

    const stateResult = await errors.try(
        getCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId)
    )
    if (stateResult.error) {
        await releaseLock()
        logger.error("caliper finalize article: get state failed", { error: stateResult.error })
        throw errors.wrap(stateResult.error, "caliper finalize article state")
    }
    const state = stateResult.data
    if (!state) {
        logger.debug("article finalize: no state found", { articleId: onerosterArticleResourceSourcedId })
        await releaseLock()
        return
    }
    if (state.finalizedAt !== null) {
        logger.debug("article finalize: already finalized", { articleId: onerosterArticleResourceSourcedId })
        await releaseLock()
        return
    }

    const deltaToReport = Math.max(0, state.cumulativeReadTimeSeconds - state.reportedReadTimeSeconds)

    if (deltaToReport > 0) {
        const payloadResult = await errors.try(
            buildCaliperPayloadForContentWithEmail(
                userSourcedId,
                userEmail,
                onerosterArticleResourceSourcedId,
                articleTitle,
                courseInfo
            )
        )
        if (payloadResult.error) {
            await releaseLock()
            logger.error("caliper finalize article: build payload failed", { error: payloadResult.error })
            throw errors.wrap(payloadResult.error, "caliper payload build")
        }
        const { actor, context } = payloadResult.data

        logger.info("article finalize: sending timespent", {
            delta: Math.floor(deltaToReport),
            articleId: onerosterArticleResourceSourcedId,
            lock: "acquired"
        })

        const sendResult = await errors.try(sendCaliperTimeSpentEvent(actor, context, Math.floor(deltaToReport)))
        if (sendResult.error) {
            await releaseLock()
            logger.error("caliper finalize article: failed to send event", { error: sendResult.error })
            throw errors.wrap(sendResult.error, "caliper timespent send article")
        }
    }

    const finalState: CaliperArticleReadState = {
        ...state,
        reportedReadTimeSeconds: state.cumulativeReadTimeSeconds,
        finalizedAt: new Date().toISOString()
    }
    const setStateResult = await errors.try(
        setCaliperArticleReadState(userSourcedId, onerosterArticleResourceSourcedId, finalState)
    )
    if (setStateResult.error) {
        await releaseLock()
        logger.error("caliper finalize article: set state failed", { error: setStateResult.error })
        throw errors.wrap(setStateResult.error, "caliper finalize article state set")
    }

    await releaseLock()

    const courseSourcedId = await resolveCourseSourcedIdLocal(courseInfo.courseSlug)
    if (courseSourcedId) {
        logger.info("writing article time spent to oneroster", {
            userSourcedId,
            resourceSourcedId: onerosterArticleResourceSourcedId,
            courseSourcedId,
            finalSeconds: finalState.cumulativeReadTimeSeconds
        })
        await writeTimeToOneRoster({
            kind: "article",
            userSourcedId,
            resourceSourcedId: onerosterArticleResourceSourcedId,
            courseSourcedId,
            finalSeconds: finalState.cumulativeReadTimeSeconds
        })
    } else {
        logger.warn("skipping oneroster time spent write: course not found", {
            courseSlug: courseInfo.courseSlug,
            userSourcedId,
            resourceSourcedId: onerosterArticleResourceSourcedId
        })
    }
}

async function resolveCourseSourcedIdLocal(courseSlug: string): Promise<string | null> {
    const courseResult = await errors.try(getAllCoursesBySlug(courseSlug))
    if (courseResult.error) {
        logger.error("failed to resolve course sourced id", {
            courseSlug,
            error: courseResult.error
        })
        return null
    }
    if (!courseResult.data[0]) {
        logger.warn("course not found for sourced id resolution", { courseSlug })
        return null
    }
    return courseResult.data[0].sourcedId
}
