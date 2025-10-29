import { connection } from "next/server"
import * as React from "react"
import { Content } from "@/app/(user)/profile/me/students/content"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
import { clerkClient } from "@clerk/nextjs/server"
import { Skeleton } from "@/components/ui/skeleton"

export type StudentRow = {
    id: string
    name: string
    email: string
    sourceId?: string
    rolesCount: number
}

export default async function StudentsPage() {
    // Ensure dynamic rendering like metrics page
    await connection()

    const studentsPromise: Promise<StudentRow[]> = (async () => {
        const clerk = await clerkClient()
        const list = await clerk.users.getUserList({ limit: 100 })
        return list.data
            .map((u) => {
                const pm = parseUserPublicMetadata(u.publicMetadata)
                const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim()
                const primaryEmail = u.emailAddresses[0]?.emailAddress ?? ""
                return {
                    id: u.id,
                    name: name.length > 0 ? name : (u.username || primaryEmail || u.id),
                    email: primaryEmail,
                    sourceId: pm.sourceId,
                    rolesCount: pm.roles.length
                }
            })
            // Show students first if role info exists
            .sort((a, b) => b.rolesCount - a.rolesCount)
    })()

    return (
        <React.Suspense
            fallback={
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-4">
                        <Skeleton className="h-8 w-56" />
                    </div>
                    <div className="rounded-lg border border-gray-200 p-5 bg-white">
                        <Skeleton className="h-5 w-72 mb-4" />
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-4 w-64" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            }
        >
            <Content studentsPromise={studentsPromise} />
        </React.Suspense>
    )
}


