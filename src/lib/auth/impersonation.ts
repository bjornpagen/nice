import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"

export type ImpersonationInfo = {
    userId: string | null
    actorSub: string | null
    isImpersonated: boolean
}

export async function getImpersonation(): Promise<ImpersonationInfo> {
    const { userId, actor } = await auth()
    return {
        userId: userId ?? null,
        actorSub: actor?.sub ?? null,
        isImpersonated: Boolean(actor)
    }
}

export async function assertNotImpersonatedFor(action: string): Promise<void> {
    const info = await getImpersonation()
    if (info.isImpersonated) {
        throw errors.new(`impersonation forbidden for action: ${action}`)
    }
}


