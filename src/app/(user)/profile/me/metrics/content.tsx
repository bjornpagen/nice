"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { CourseMetrics } from "@/lib/data/metrics"

type Props = {
  metricsPromise: Promise<CourseMetrics[]>
}

export function Content({ metricsPromise }: Props) {
  const metrics = React.use(metricsPromise)

  const [preset, setPreset] = React.useState<string>("month")
  const [query, setQuery] = React.useState("")
  const [sort, setSort] = React.useState<"time" | "xp" | "enrollments">("time")

  const filtered = metrics.filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "time") return b.timeActiveSeconds - a.timeActiveSeconds
    if (sort === "xp") return b.xpTotal - a.xpTotal
    return b.activeEnrollments - a.activeEnrollments
  })

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Metrics</h1>
        <div className="flex items-center gap-3">
          <Input
            placeholder="Search courses"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56"
          />
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(v) => {
              if (v === "time" || v === "xp" || v === "enrollments") {
                setSort(v)
              }
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time">Time spent</SelectItem>
              <SelectItem value="xp">XP earned</SelectItem>
              <SelectItem value="enrollments">Enrollments</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Export CSV</Button>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sorted.map((c) => (
          <div key={c.courseId} className="rounded-lg border border-gray-200 p-5 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{c.title}</h2>
                <p className="text-sm text-gray-500">{c.activeEnrollments} active enrollments</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Users (all courses)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <Th>Email</Th>
                <Th>Course</Th>
                <Th>XP</Th>
                <Th>Time</Th>
                <Th>Last Activity</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.flatMap((c) =>
                c.users.map((u) => (
                  <tr key={`${c.courseId}:${u.userId}`} className="hover:bg-gray-50">
                    <Td>{u.email || u.userId}</Td>
                    <Td>{c.title}</Td>
                    <Td>{u.xp.toLocaleString()}</Td>
                    <Td>{formatDuration(u.timeActiveSeconds)}</Td>
                    <Td>{u.lastActivityIso ? new Date(u.lastActivityIso).toLocaleString() : "—"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}


function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-5 py-2 font-medium">{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-5 py-3 text-gray-800">{children}</td>
}


function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}


