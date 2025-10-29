import * as React from "react"
import { ImpersonationBannerClient } from "@/components/impersonation-banner-client"
import { getImpersonation } from "@/lib/auth/impersonation"

export function ImpersonationBanner() {
    const infoPromise = getImpersonation()
    return (
        <React.Suspense fallback={null}>
            <ImpersonationBannerClient infoPromise={infoPromise} />
        </React.Suspense>
    )
}


