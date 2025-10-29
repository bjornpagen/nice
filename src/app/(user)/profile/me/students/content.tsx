"use client"

import * as React from "react"
import type { StudentRow } from "@/app/(user)/profile/me/students/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Content({ studentsPromise }: { studentsPromise: Promise<StudentRow[]> }) {
    const students = React.use(studentsPromise)
    const [query, setQuery] = React.useState("")
    const [page, setPage] = React.useState(1)
    const pageSize = 10

    const filtered = React.useMemo(() => {
        if (!query) return students
        const q = query.toLowerCase().trim()
        return students.filter((s) =>
            [s.name, s.email, s.sourceId ?? "", s.id].some((val) => val.toLowerCase().includes(q))
        )
    }, [students, query])

    // Reset to first page on filter change
    React.useEffect(() => {
        setPage(1)
    }, [query])

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Students</h1>
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search name, email, ID..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-72"
                    />
                </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[34%]">Name</TableHead>
                            <TableHead className="w-[34%]">Email</TableHead>
                            <TableHead className="w-[16%]">Source ID</TableHead>
                            <TableHead className="w-[16%] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((s, idx) => (
                            <TableRow key={s.id} className={idx % 2 === 0 ? "bg-gray-50" : undefined}>
                                <TableCell className="font-semibold">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            {typeof s.imageUrl === "string" && s.imageUrl !== "" && (
                                                <AvatarImage src={s.imageUrl} alt={s.name} />
                                            )}
                                            <AvatarFallback>
                                                {(() => {
                                                    const trimmed = s.name.trim()
                                                    if (trimmed.length === 0) return "?"
                                                    const first = trimmed[0]
                                                    return typeof first === "string" ? first.toUpperCase() : "?"
                                                })()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span>{s.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                                        {s.email}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    {s.sourceId ? (
                                        <span className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-xs font-medium">
                                            {s.sourceId}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">—</span>
                                    )}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button asChild variant="outline" size="sm">
                                        <a
                                            href={`https://dashboard.clerk.com/~/users/${s.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Open in Clerk
                                        </a>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                    Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + pageSize, filtered.length)} of {filtered.length}
                </div>
                <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}


