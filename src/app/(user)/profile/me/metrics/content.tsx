"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  const [showStudentsOnly, setShowStudentsOnly] = React.useState(false)

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
                <p className="text-sm text-gray-500">{c.activeEnrollments} active enrollments</p>
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
          {loading && <div className="text-sm text-gray-600">Loading…</div>}
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
                <label className="ml-auto inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showStudentsOnly}
                    onChange={(e) => setShowStudentsOnly(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span>Show students only</span>
                </label>
              </div>
              <div className="max-h-[70vh] overflow-auto">
                <Table className="table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-64 sticky top-0 bg-white z-10">Email</TableHead>
                      <TableHead className="w-48 sticky top-0 bg-white z-10">School</TableHead>
                      <TableHead className="w-24 sticky top-0 bg-white z-10">Student-only</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(showStudentsOnly ? data.users.filter((u) => u.isStudentOnly) : data.users).map((u) => (
                      <TableRow key={u.userId}>
                        <TableCell className="whitespace-normal break-words text-xs">{u.email || "—"}</TableCell>
                        <TableCell className="whitespace-normal break-words text-xs">{u.schoolId || "—"}</TableCell>
                        <TableCell className="text-xs">{u.isStudentOnly ? "Yes" : "No"}</TableCell>
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


