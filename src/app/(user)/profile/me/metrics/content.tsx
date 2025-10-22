"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { CourseEnrollmentData } from "@/lib/actions/metrics"
import { getCourseEnrollments } from "@/lib/actions/metrics"
import type { CourseMetrics } from "@/lib/data/metrics"

type Props = {
  metricsPromise: Promise<CourseMetrics[]>
}

export function Content({ metricsPromise }: Props) {
  const metrics = React.use(metricsPromise)

  const sorted = metrics

  const [open, setOpen] = React.useState(false)
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | undefined>(undefined)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>(undefined)
  const [data, setData] = React.useState<CourseEnrollmentData | undefined>(undefined)
  // Removed toggle; always students-only now

  const [studentsOnlyCounts, setStudentsOnlyCounts] = React.useState<Record<string, number>>({})

  React.useEffect(() => {
    let cancelled = false
    async function run() {
      const entries = await Promise.all(
        sorted.map(async (c) => {
          const res = await getCourseEnrollments(c.courseId)
          return [c.courseId, res.totals.totalStudentsOnly] as const
        })
      )
      if (!cancelled) setStudentsOnlyCounts(Object.fromEntries(entries))
    }
    run()
    return () => {
      cancelled = true
    }
  }, [sorted])

  async function openModal(courseId: string) {
    setSelectedCourseId(courseId)
    setOpen(true)
    setLoading(true)
    setError(undefined)
    setData(undefined)
    const result = await getCourseEnrollments(courseId)
    setData(result)
    setLoading(false)
  }

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Metrics</h1>
        <div />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sorted.map((c) => (
          <button
            key={c.courseId}
            onClick={() => openModal(c.courseId)}
            className="text-left rounded-lg border border-gray-200 p-5 bg-white hover:border-blue-300 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{c.title}</h2>
                <div className="text-sm text-gray-500">
                  {studentsOnlyCounts[c.courseId] === undefined ? (
                    <Skeleton className="h-4 w-24 inline-block align-middle" />
                  ) : (
                    <span>{studentsOnlyCounts[c.courseId]} students</span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </section>

      {/* Users table removed per requirements */}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>
              {(() => {
                const course = sorted.find((c) => c.courseId === selectedCourseId)
                return course ? `Enrollments • ${course.title}` : "Enrollments"
              })()}
            </DialogTitle>
          </DialogHeader>
          {loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-6">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            </div>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          {data && (
            <div className="space-y-4">
              <div className="flex items-center gap-6 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Total enrolled:</span> {data.totals.totalEnrolled}
                </div>
                <div>
                  <span className="font-medium">Students only:</span> {data.totals.totalStudentsOnly}
                </div>
              </div>
              <div className="max-h-[70vh] overflow-auto">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48 sticky top-0 bg-white z-10">Name</TableHead>
                      <TableHead className="w-64 sticky top-0 bg-white z-10">Email</TableHead>
                      <TableHead className="w-64 sticky top-0 bg-white z-10">School(s)</TableHead>
                      <TableHead className="w-28 sticky top-0 bg-white z-10">XP</TableHead>
                      <TableHead className="w-28 sticky top-0 bg-white z-10">Percent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...data.users]
                      .sort((a, b) => {
                        if (b.earnedXP !== a.earnedXP) return b.earnedXP - a.earnedXP
                        return b.percentComplete - a.percentComplete
                      })
                      .map((u, i) => (
                        <TableRow key={u.userId} className={i % 2 === 1 ? "bg-gray-50" : undefined}>
                          <TableCell className="whitespace-normal break-words text-xs font-semibold">{u.displayName || "—"}</TableCell>
                          <TableCell className="whitespace-normal break-words text-xs">
                            {u.email ? (
                              <Badge className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 font-normal">{u.email}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-xs">{u.schoolNames.length > 0 ? u.schoolNames.join(", ") : "—"}</TableCell>
                          <TableCell className="text-xs">
                            <Badge className="bg-yellow-100 text-yellow-900 border border-yellow-200">✨ {u.earnedXP} XP</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge className="bg-blue-100 text-blue-900 border border-blue-200">{u.percentComplete}%</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}


// auxiliary components removed with users table


