import { z } from "zod"

// Article accumulate (heartbeat) request schema
export const AccumulateRequestSchema = z.object({
    onerosterUserSourcedId: z.string().min(1),
    onerosterArticleResourceSourcedId: z.string().min(1),
    sessionDeltaSeconds: z.number().nonnegative()
})

export type AccumulateRequest = z.input<typeof AccumulateRequestSchema>

// Article partial-finalize request schema
export const PartialFinalizeRequestSchema = z.object({
    onerosterUserSourcedId: z.string().min(1),
    onerosterArticleResourceSourcedId: z.string().min(1),
    articleTitle: z.string().min(1),
    courseInfo: z.object({
        subjectSlug: z.string().min(1),
        courseSlug: z.string().min(1)
    })
})

export type PartialFinalizeRequest = z.input<typeof PartialFinalizeRequestSchema>


