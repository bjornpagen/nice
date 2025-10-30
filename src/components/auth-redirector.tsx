"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"

export function AuthRedirector() {
    const { isLoaded, userId } = useAuth()
    const pathname = usePathname()
    const router = useRouter()

    React.useEffect(() => {
        if (!isLoaded) return
        // If signed out anywhere except the login page, push to login
        if (!userId && pathname !== "/login") {
            const next = typeof pathname === "string" && pathname.length > 0 ? pathname : "/"
            const url = `/login?redirect_url=${encodeURIComponent(next)}`
            router.replace(url)
        }
    }, [isLoaded, userId, pathname, router])

    return null
}


