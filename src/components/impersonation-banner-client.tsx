"use client"

import * as React from "react"
import { useClerk } from "@clerk/nextjs"
import type { ImpersonationInfo } from "@/lib/auth/impersonation"

export function ImpersonationBannerClient({
    infoPromise
}: {
    infoPromise: Promise<ImpersonationInfo>
}) {
    const { signOut } = useClerk()
    const info = React.use(infoPromise)

    if (!info.isImpersonated) {
        return null
    }

    return (
        <div className="fixed inset-x-0 top-0 z-50 bg-amber-500 text-black">
            <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-2 text-sm">
                <div className="font-medium">
                    Impersonation active: user {info.actorSub} → {info.userId}
                </div>
                <div className="flex items-center gap-3">
                    <a
                        href="/login"
                        className="underline underline-offset-2 hover:opacity-90"
                    >
                        Switch user
                    </a>
                    <button
                        type="button"
                        onClick={() => void signOut()}
                        className="rounded bg-black/10 px-2 py-1 hover:bg-black/20"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    )
}


