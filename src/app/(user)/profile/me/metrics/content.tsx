"use client"

import * as React from "react"
import { AlertTriangle, User, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { CourseEnrollmentData, StrugglingStudent, StrugglingStudentsData } from "@/lib/actions/metrics"
import { getCourseEnrollments } from "@/lib/actions/metrics"
import type { CourseMetrics } from "@/lib/data/metrics"
import { generateSupplementaryCourse } from "@/lib/actions/course-builder"

type Props = {
  metricsPromise: Promise<CourseMetrics[]>
  strugglingPromise: Promise<StrugglingStudentsData>
}

export function Content({ metricsPromise, strugglingPromise }: Props) {
  const metrics = React.use(metricsPromise)
  const strugglingData = React.use(strugglingPromise)
  const strugglingStudents = strugglingData.students

  const sorted = metrics

  // Course enrollment modal state
  const [open, setOpen] = React.useState(false)
  const [selectedCourseId, setSelectedCourseId] = React.useState<string | undefined>(undefined)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | undefined>(undefined)
  const [data, setData] = React.useState<CourseEnrollmentData | undefined>(undefined)

  // Struggling student modal state
  const [strugglingOpen, setStrugglingOpen] = React.useState(false)
  const [selectedStudent, setSelectedStudent] = React.useState<StrugglingStudent | undefined>(undefined)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [generatingCourse, setGeneratingCourse] = React.useState(false)
  const [courseGenResult, setCourseGenResult] = React.useState<{ success: boolean; message: string } | undefined>(undefined)
  const studentsPerPage = 12

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

  function openStrugglingModal(student: StrugglingStudent) {
    setSelectedStudent(student)
    setStrugglingOpen(true)
    setCourseGenResult(undefined)
  }

  async function handleGenerateCourse() {
    if (!selectedStudent) return

    // Extract unique CASE IDs from struggling exercises
    const caseIds = selectedStudent.strugglingExercises
      .flatMap(e => Array.isArray(e.caseIds) ? e.caseIds : [])
      .filter((id): id is string => typeof id === "string" && id.length > 0)

    // Remove duplicates
    const uniqueCaseIds = Array.from(new Set(caseIds))

    if (uniqueCaseIds.length === 0) {
      setCourseGenResult({
        success: false,
        message: "No CASE IDs found for the struggling exercises. Unable to generate course."
      })
      return
    }

    setGeneratingCourse(true)
    setCourseGenResult(undefined)

    try {
      const result = await generateSupplementaryCourse(
        selectedStudent.userId,
        uniqueCaseIds,
        "Science"
      )

      setCourseGenResult({
        success: result.success,
        message: result.message
      })

      if (result.success) {
        // Optionally close modal after success
        setTimeout(() => {
          setStrugglingOpen(false)
          setCourseGenResult(undefined)
        }, 3000)
      }
    } catch (error) {
      setCourseGenResult({
        success: false,
        message: "An unexpected error occurred while generating the course."
      })
    } finally {
      setGeneratingCourse(false)
    }
  }

  return (
    <main className="space-y-8">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Metrics</h1>
        <div />
      </header>

      {/* Course Enrollments Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-700">Course Enrollments</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {sorted.map((c) => (
            <button
              key={c.courseId}
              onClick={() => openModal(c.courseId)}
              className="text-left rounded-lg border border-gray-200 p-5 bg-white hover:border-blue-300 hover:shadow-sm transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{c.title}</h3>
                  <div className="text-sm text-gray-500">
                    <span>{c.activeEnrollments} students</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Struggling Students Section */}
      {strugglingStudents.length > 0 && (() => {
        const totalPages = Math.ceil(strugglingStudents.length / studentsPerPage)
        const startIndex = (currentPage - 1) * studentsPerPage
        const endIndex = startIndex + studentsPerPage
        const currentStudents = strugglingStudents.slice(startIndex, endIndex)

        return (
          <section className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-700">Struggling Students</h2>
                <Badge variant="secondary" className="ml-2">
                  {strugglingStudents.length} students
                </Badge>
              </div>
              <div className="text-xs text-gray-500">
                Last updated: {new Date(strugglingData.lastUpdated).toLocaleString()} •
                Next update: {new Date(strugglingData.nextUpdate).toLocaleString()}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {currentStudents.map((student) => (
                <button
                  key={student.userId}
                  onClick={() => openStrugglingModal(student)}
                  className="text-left rounded-lg border border-orange-200 p-5 bg-orange-50 hover:border-orange-300 hover:shadow-sm transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-orange-600" />
                        <h3 className="font-semibold text-gray-900 truncate">
                          {student.displayName || student.email?.split("@")[0] || "Unknown Student"}
                        </h3>
                      </div>
                      {student.email && (
                        <p className="text-xs text-gray-600 truncate mb-2">{student.email}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                          {student.strugglingExercises.length} struggling exercise{student.strugglingExercises.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={page === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-10"
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
            <div className="text-center text-sm text-gray-500">
              Showing {startIndex + 1}-{Math.min(endIndex, strugglingStudents.length)} of {strugglingStudents.length} students
            </div>
          </section>
        )
      })()}

      {/* Course Enrollment Modal */}
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
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-40 sticky top-0 bg-white z-10">Name</TableHead>
                      <TableHead className="w-56 sticky top-0 bg-white z-10">Email</TableHead>
                      <TableHead className="w-48 sticky top-0 bg-white z-10">School(s)</TableHead>
                      <TableHead className="w-24 sticky top-0 bg-white z-10">XP</TableHead>
                      <TableHead className="w-20 sticky top-0 bg-white z-10">Progress</TableHead>
                      <TableHead className="w-24 sticky top-0 bg-white z-10">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...data.users]
                      .sort((a, b) => {
                        // Sort unenrolled to bottom
                        if (a.isUnenrolled !== b.isUnenrolled) return a.isUnenrolled ? 1 : -1
                        if (b.earnedXP !== a.earnedXP) return b.earnedXP - a.earnedXP
                        return b.percentComplete - a.percentComplete
                      })
                      .map((u, i) => (
                        <TableRow key={u.userId} className={u.isUnenrolled ? "bg-red-50/30" : i % 2 === 1 ? "bg-gray-50" : undefined}>
                          <TableCell className="whitespace-normal break-words text-xs font-semibold">{u.displayName || "—"}</TableCell>
                          <TableCell className="whitespace-normal break-words text-xs">
                            {u.email ? (
                              <Badge className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 font-normal text-[11px]">{u.email}</Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-xs">{u.schoolNames.length > 0 ? u.schoolNames.join(", ") : "—"}</TableCell>
                          <TableCell className="text-xs">
                            <Badge className="bg-yellow-100 text-yellow-900 border border-yellow-200">✨ {u.earnedXP}</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge className="bg-blue-100 text-blue-900 border border-blue-200">{u.percentComplete}%</Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {u.isUnenrolled ? (
                              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-[10px] px-1.5 py-0">
                                Unenrolled
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px] px-1.5 py-0">
                                Active
                              </Badge>
                            )}
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

      {/* Struggling Student Details Modal */}
      <Dialog open={strugglingOpen} onOpenChange={(open) => {
        setStrugglingOpen(open)
        if (!open) {
          setCourseGenResult(undefined)
        }
      }}>
        <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Struggling Exercises • {selectedStudent?.displayName || selectedStudent?.email || "Student"}
              </div>
              <Button
                onClick={handleGenerateCourse}
                disabled={generatingCourse}
                size="sm"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {generatingCourse ? "Generating..." : "Generate Supplementary Course"}
              </Button>
            </DialogTitle>
            {selectedStudent?.email && (
              <div className="space-y-3">
                <Badge className="rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 font-normal text-sm">
                  {selectedStudent.email}
                </Badge>
                {selectedStudent.courseProgress && selectedStudent.courseProgress.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.courseProgress.map((course) => (
                      <Badge
                        key={course.courseId}
                        variant="outline"
                        className="text-xs"
                      >
                        <span className="font-medium">{course.courseTitle}</span>
                        <span className="ml-2 text-muted-foreground">{course.percentComplete}%</span>
                      </Badge>
                    ))}
                  </div>
                )}
                {courseGenResult && (
                  <div className={`p-3 rounded-lg ${courseGenResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    <p className="text-sm">{courseGenResult.message}</p>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {selectedStudent && (
              <div className="space-y-4">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">Total struggling exercises:</span> {selectedStudent.strugglingExercises.length}
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exercise</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Attempts</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Accuracy</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStudent.strugglingExercises.map((exercise) => (
                        <TableRow key={exercise.exerciseId}>
                          <TableCell className="font-medium">
                            <p className="text-sm break-words">{exercise.exerciseTitle || exercise.exerciseId}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={exercise.attemptsToMaster >= 6 ? "destructive" : "secondary"}>
                              {exercise.attemptsToMaster}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              {exercise.masteryAccuracy}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-xs text-gray-600 whitespace-nowrap">
                            {exercise.firstAttemptAt ? new Date(exercise.firstAttemptAt).toISOString().split('T')[0] : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}