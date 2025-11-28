import { randomUUID } from "node:crypto"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { CALIPER_SUBJECT_MAPPING, isSubjectSlug } from "@/lib/constants/subjects"
import { extractResourceIdFromCompoundId, normalizeCaliperId } from "@/lib/caliper/utils"
import { constructActorId } from "@/lib/utils/actor-id"

export async function buildCaliperPayloadForContentWithEmail(
    onerosterUserSourcedId: string,
    userEmail: string,
    onerosterResourceSourcedId: string,
    title: string,
    courseInfo: { subjectSlug: string; courseSlug: string }
) {
    if (!isSubjectSlug(courseInfo.subjectSlug)) {
        logger.error("caliper payload: invalid subject slug", { subjectSlug: courseInfo.subjectSlug })
        throw errors.new("invalid subject slug")
    }

    const normalizedResourceId = extractResourceIdFromCompoundId(onerosterResourceSourcedId)
    const activityId = normalizeCaliperId(normalizedResourceId)

    // Generate a unique event ID for this Caliper event to ensure uniqueness per time spent report
    const caliperEventId = `urn:uuid:${randomUUID()}`

    const actor = {
        id: constructActorId(onerosterUserSourcedId),
        type: "TimebackUser" as const,
        email: userEmail
    }
    const context = {
        id: caliperEventId,
        type: "TimebackActivityContext" as const,
        subject: CALIPER_SUBJECT_MAPPING[courseInfo.subjectSlug],
        app: { name: "Nice Academy" },
        course: { name: courseInfo.courseSlug },
        activity: { name: title, id: activityId }
    }

    return { actor, context }
}


