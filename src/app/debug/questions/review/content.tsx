"use client"

import Image from "next/image"
import * as React from "react"
import type { QuestionRenderReviewRow } from "@/app/debug/questions/review/actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ContentProps {
	reviewsPromise: Promise<QuestionRenderReviewRow[]>
}

type Severity = "major" | "minor" | "patch" | null

function severityLabel(severity: Severity | "all"): string {
	if (severity === "major") return "Major"
	if (severity === "minor") return "Minor"
	if (severity === "patch") return "Patch"
	if (severity === null) return "Unassigned"
	return "All"
}

function severityColor(severity: Severity): string {
	if (severity === "major") return "#fee2e2" // red-100
	if (severity === "minor") return "#ffedd5" // orange-100
	if (severity === "patch") return "#fef9c3" // yellow-100
	return "#f3f4f6" // gray-100
}

function Screenshot({ src, alt }: { src: string; alt: string }) {
	const [open, setOpen] = React.useState(false)
	const [zoomed, setZoomed] = React.useState(false)

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				style={{ cursor: "zoom-in", padding: 0, border: 0, background: "none" }}
			>
				<Image
					src={src}
					alt={alt}
					width={1400}
					height={900}
					style={{
						width: "100%",
						height: "auto",
						maxHeight: 360,
						objectFit: "contain",
						border: "1px solid #e5e7eb",
						borderRadius: 8,
						background: "#fafafa"
					}}
				/>
			</button>
			<Dialog
				open={open}
				onOpenChange={(o) => {
					setOpen(o)
					if (!o) setZoomed(false)
				}}
			>
				<DialogContent style={{ padding: 0, maxWidth: "95vw", maxHeight: "95vh" }}>
					<div
						style={{
							background: "#000",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: "100%",
							height: "80vh",
							overflow: "auto"
						}}
					>
						<Image
							src={src}
							alt={alt}
							width={2400}
							height={1600}
							onClick={() => setZoomed((z) => !z)}
							style={{
								cursor: zoomed ? "zoom-out" : "zoom-in",
								maxWidth: "100%",
								height: "auto",
								transform: zoomed ? "scale(1.8)" : "scale(1)",
								transformOrigin: "center center",
								transition: "transform 150ms ease"
							}}
						/>
					</div>
				</DialogContent>
			</Dialog>
		</>
	)
}

function SeveritySection({ severity, items }: { severity: Severity; items: QuestionRenderReviewRow[] }) {
	return (
		<Card style={{ backgroundColor: "white", borderColor: "#e5e7eb" }}>
			<CardHeader style={{ backgroundColor: severityColor(severity), borderBottom: "1px solid #e5e7eb" }}>
				<CardTitle style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<Badge variant="secondary">{severityLabel(severity)}</Badge>
					<span style={{ color: "#6b7280", fontWeight: 500 }}>count: {items.length}</span>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>
					{items.map((row) => (
						<div key={row.questionId} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 14 }}>
							<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
								<strong
									style={{
										fontFamily:
											"ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
									}}
								>
									{row.questionId}
								</strong>
								<span style={{ color: "#6b7280", fontSize: 12 }}>{row.reviewedAt}</span>
							</div>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
									gap: 12,
									alignItems: "start"
								}}
							>
								<div>
									<Screenshot src={row.productionScreenshotUrl} alt="production screenshot" />
								</div>
								<div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, background: "#fafafa" }}>
									<div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>analysis notes</div>
									<div style={{ fontSize: 14, color: "#111827", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
										{row.analysisNotes}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

export function Content({ reviewsPromise }: ContentProps) {
	const reviews = React.use(reviewsPromise)

	// subject filter state and counts
	type Subject = "science" | "math" | "history" | null
	const [subjectFilter, setSubjectFilter] = React.useState<Subject | "all">("all")

	const subjectCounts = reviews.reduce(
		(acc, r) => {
			if (r.subject === "science") acc.science++
			else if (r.subject === "math") acc.math++
			else if (r.subject === "history") acc.history++
			else acc.unassigned++
			return acc
		},
		{ science: 0, math: 0, history: 0, unassigned: 0 }
	)

	// apply subject filter first
	let filteredBySubject: QuestionRenderReviewRow[]
	if (subjectFilter === "all") filteredBySubject = reviews
	else if (subjectFilter === null) filteredBySubject = reviews.filter((r) => r.subject === null)
	else filteredBySubject = reviews.filter((r) => r.subject === subjectFilter)

	// group by severity after subject filtering
	type GroupMap = {
		major: QuestionRenderReviewRow[]
		minor: QuestionRenderReviewRow[]
		patch: QuestionRenderReviewRow[]
		unassigned: QuestionRenderReviewRow[]
	}
	const groups: GroupMap = { major: [], minor: [], patch: [], unassigned: [] }
	for (const row of filteredBySubject) {
		if (row.severity === "major") groups.major.push(row)
		else if (row.severity === "minor") groups.minor.push(row)
		else if (row.severity === "patch") groups.patch.push(row)
		else groups.unassigned.push(row)
	}

	const [severityFilter, setSeverityFilter] = React.useState<Severity | "all">("all")

	return (
		<div style={{ padding: 16 }}>
			<div style={{ marginBottom: 12 }}>
				<h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.2 }}>question render reviews</h1>
				<p style={{ color: "#6b7280", marginTop: 4 }}>grouped by severity, newest first</p>
			</div>
			<div style={{ marginBottom: 12 }}>
				<Tabs
					value={subjectFilter ?? "unassigned"}
					onValueChange={(value) => {
						let mapped: Subject | "all" = "all"
						switch (value) {
							case "all":
								mapped = "all"
								break
							case "science":
								mapped = "science"
								break
							case "math":
								mapped = "math"
								break
							case "history":
								mapped = "history"
								break
							case "unassigned":
								mapped = null
								break
							default:
								mapped = "all"
						}
						setSubjectFilter(mapped)
					}}
				>
					<TabsList>
						<TabsTrigger value="all">All subjects</TabsTrigger>
						<TabsTrigger value="science">Science ({subjectCounts.science})</TabsTrigger>
						<TabsTrigger value="math">Math ({subjectCounts.math})</TabsTrigger>
						<TabsTrigger value="history">History ({subjectCounts.history})</TabsTrigger>
						<TabsTrigger value="unassigned">Unassigned ({subjectCounts.unassigned})</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			<div style={{ marginBottom: 12 }}>
				<Tabs
					value={severityFilter ?? "unassigned"}
					onValueChange={(value) => {
						let mapped: Severity | "all" = "all"
						switch (value) {
							case "all":
								mapped = "all"
								break
							case "major":
								mapped = "major"
								break
							case "minor":
								mapped = "minor"
								break
							case "patch":
								mapped = "patch"
								break
							case "unassigned":
								mapped = null
								break
							default:
								mapped = "all"
						}
						setSeverityFilter(mapped)
					}}
				>
					<TabsList>
						<TabsTrigger value="all">All</TabsTrigger>
						<TabsTrigger value="major">Major ({groups.major.length})</TabsTrigger>
						<TabsTrigger value="minor">Minor ({groups.minor.length})</TabsTrigger>
						<TabsTrigger value="patch">Patch ({groups.patch.length})</TabsTrigger>
						<TabsTrigger value="unassigned">Unassigned ({groups.unassigned.length})</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>
			<ScrollArea style={{ height: "calc(100vh - 180px)" }}>
				<div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
					{severityFilter === "all" && (
						<>
							<SeveritySection severity="major" items={groups.major} />
							<SeveritySection severity="minor" items={groups.minor} />
							<SeveritySection severity="patch" items={groups.patch} />
							<SeveritySection severity={null} items={groups.unassigned} />
						</>
					)}
					{severityFilter !== "all" && severityFilter !== null && (
						<SeveritySection severity={severityFilter} items={groups[severityFilter]} />
					)}
					{severityFilter === null && <SeveritySection severity={null} items={groups.unassigned} />}
				</div>
			</ScrollArea>
		</div>
	)
}
