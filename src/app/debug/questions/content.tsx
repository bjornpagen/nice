"use client"

import * as errors from "@superbuilders/errors"
import { Check } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import type { QuestionDebugData } from "@/app/debug/questions/actions"
import { upsertQuestionAnalysis, validateQuestionXml } from "@/app/debug/questions/server-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

interface ContentProps {
	questionsPromise: Promise<QuestionDebugData[]>
}

export function Content({ questionsPromise }: ContentProps) {
	const [currentIndex, setCurrentIndex] = React.useState(0)
	const [dialogOpen, setDialogOpen] = React.useState(false)
	const [analysisNotes, setAnalysisNotes] = React.useState("")
	const [severity, setSeverity] = React.useState<"major" | "minor" | "patch">("minor")
	const [localQuestions, setLocalQuestions] = React.useState<QuestionDebugData[] | undefined>(undefined)
	const [isSubmitting, setIsSubmitting] = React.useState(false)
	const [isValidating, setIsValidating] = React.useState(false)
	const [widgetFilter, setWidgetFilter] = React.useState<"all" | "with" | "without">("all")

	// iframe reload counters
	const [ampReload, setAmpReload] = React.useState(0)
	const [perseusReload, setPerseusReload] = React.useState(0)

	// resolve questions on client using React.use to enable streaming
	const resolvedQuestions = React.use(questionsPromise)
	React.useEffect(() => {
		setLocalQuestions(resolvedQuestions)
	}, [resolvedQuestions])

	// helper functions to check widget status
	const hasWidgets = (question: QuestionDebugData): boolean => {
		if (!question.structuredJson) return false

		// type-safe way to check if it's an object with widgets property
		if (typeof question.structuredJson !== "object" || question.structuredJson === null) return false

		// check if structuredJson has widgets property
		if (!("widgets" in question.structuredJson)) return false

		// safely access widgets property
		const widgets = question.structuredJson.widgets
		return typeof widgets === "object" && widgets !== null && Object.keys(widgets).length > 0
	}

	const hasEmptyWidgets = (question: QuestionDebugData): boolean => {
		if (!question.structuredJson) return true

		// type-safe way to check if it's an object with widgets property
		if (typeof question.structuredJson !== "object" || question.structuredJson === null) return true

		// check if structuredJson has widgets property
		if (!("widgets" in question.structuredJson)) return true

		// safely access widgets property
		const widgets = question.structuredJson.widgets
		return typeof widgets === "object" && widgets !== null && Object.keys(widgets).length === 0
	}

	// filter questions based on widget filter
	const filteredQuestions = (() => {
		if (!localQuestions) return []
		if (widgetFilter === "all") return localQuestions
		if (widgetFilter === "with") return localQuestions.filter(hasWidgets)
		if (widgetFilter === "without") return localQuestions.filter(hasEmptyWidgets)
		return localQuestions
	})()

	// adjust currentIndex when filtering changes
	React.useEffect(() => {
		if (filteredQuestions.length > 0 && currentIndex >= filteredQuestions.length) {
			setCurrentIndex(0)
		}
	}, [filteredQuestions.length, currentIndex])

	// full data present; no lazy details

	// keyboard navigation for TAB/SHIFT+TAB
	React.useEffect(() => {
		if (!filteredQuestions) return
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Tab") {
				event.preventDefault()
				if (event.shiftKey) {
					const newIndex = Math.max(0, currentIndex - 1)
					setCurrentIndex(newIndex)
					if (newIndex !== currentIndex) {
						toast.info(`moved to question ${formatIndex(newIndex)}`)
					}
				} else {
					const newIndex = Math.min((filteredQuestions?.length ?? 1) - 1, currentIndex + 1)
					setCurrentIndex(newIndex)
					if (newIndex !== currentIndex) {
						toast.info(`moved to question ${formatIndex(newIndex)}`)
					}
				}
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [currentIndex, filteredQuestions])

	const goToPrevious = () => {
		const newIndex = Math.max(0, currentIndex - 1)
		setCurrentIndex(newIndex)
		if (newIndex !== currentIndex) {
			toast.info(`moved to question ${formatIndex(newIndex)}`)
		}
	}

	const goToNext = () => {
		const total = filteredQuestions ? filteredQuestions.length : 0
		if (total === 0) {
			return
		}
		const newIndex = Math.min(total - 1, currentIndex + 1)
		setCurrentIndex(newIndex)
		if (newIndex !== currentIndex) {
			toast.info(`moved to question ${formatIndex(newIndex)}`)
		}
	}

	if (!localQuestions) {
		return <div>loading questions...</div>
	}

	if (filteredQuestions.length === 0) {
		let message = "no questions with xml found"
		if (widgetFilter === "with") {
			message = "no questions with widgets found"
		}
		if (widgetFilter === "without") {
			message = "no questions without widgets found"
		}
		return <div>{message}</div>
	}

	const currentQuestion = filteredQuestions[currentIndex]
	if (!currentQuestion) {
		return <div>question not found</div>
	}

	// no details map when full data is present

	const formatIndex = (index: number) => `[${String(index).padStart(4, "0")}]`

	const copyToClipboard = async (text: string) => {
		await navigator.clipboard.writeText(text)
		toast.success("copied to clipboard")
	}

	const truncateText = (text: string, maxLength = 100) => {
		return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
	}

	const handleSubmitAnalysis = async () => {
		setIsSubmitting(true)

		const notesToSave = analysisNotes.trim() || ""
		const severityToSave = notesToSave === "" ? null : severity

		await upsertQuestionAnalysis(currentQuestion.id, notesToSave === "" ? null : notesToSave, severityToSave)

		// update local state
		setLocalQuestions((prev) =>
			(prev ?? []).map((q) =>
				q.id === currentQuestion.id
					? {
							...q,
							analysisNotes: notesToSave,
							severity: severityToSave
						}
					: q
			)
		)

		setDialogOpen(false)
		setAnalysisNotes("")
		setSeverity("minor")
		setIsSubmitting(false)

		if (notesToSave === "") {
			toast.success("question marked as successful")
		} else {
			toast.success("analysis notes saved")
		}
	}

	const handleMarkSuccessful = async () => {
		toast.info("marking question as successful...")
		const result = await errors.try(upsertQuestionAnalysis(currentQuestion.id, "", null))
		if (result.error) {
			toast.error("failed to mark as successful")
			return
		}

		// update local state - empty string means successful, null severity
		setLocalQuestions((prev) =>
			(prev ?? []).map((q) =>
				q.id === currentQuestion.id
					? {
							...q,
							analysisNotes: "",
							severity: null
						}
					: q
			)
		)

		toast.success("question marked as successful")
	}

	const handleValidateXml = async () => {
		if (!currentQuestion.xml) {
			toast.error("no xml to validate")
			return
		}

		setIsValidating(true)
		toast.info("validating xml...")

		const result = await errors.try(validateQuestionXml(currentQuestion.xml))

		setIsValidating(false)

		if (result.error) {
			toast.error("validation request failed")
			return
		}

		const validation = result.data
		if (validation.success) {
			toast.success("xml validation passed ✓")
		} else {
			const errorCount = validation.validationErrors.length
			toast.error(`xml validation failed (${errorCount} errors)`)
		}
	}

	const getSeverityColor = (severity: "major" | "minor" | "patch" | null) => {
		switch (severity) {
			case "major":
				return "#ffeaea" // light red
			case "minor":
				return "#fff3e0" // light orange
			case "patch":
				return "#fffacd" // light yellow
			default:
				return "transparent"
		}
	}

	const getQuestionBackgroundColor = (question: QuestionDebugData) => {
		// successful (empty notes) = green
		if (question.analysisNotes === "") return "#e8f5e8"

		// has severity = severity color
		if (question.severity) return getSeverityColor(question.severity)

		// no analysis yet = transparent
		if (question.analysisNotes === null) return "transparent"

		// has notes but no severity = default light orange (minor)
		return getSeverityColor("minor")
	}

	return (
		<div style={{ display: "flex", height: "100vh" }}>
			{/* Left sidebar with question list */}
			<div style={{ width: "300px", borderRight: "1px solid #ccc", display: "flex", flexDirection: "column" }}>
				{/* Sticky filter header */}
				<div
					style={{
						padding: "10px",
						borderBottom: "1px solid #eee",
						backgroundColor: "#f8f9fa",
						position: "sticky",
						top: 0,
						zIndex: 10
					}}
				>
					<h3 style={{ margin: "0 0 10px 0" }}>
						questions with xml ({localQuestions.length})
						{widgetFilter !== "all" && ` → filtered: ${filteredQuestions.length}`}
					</h3>
					<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
						<Label style={{ fontSize: "12px", fontWeight: "bold", color: "#666" }}>widget filter:</Label>
						<RadioGroup
							value={widgetFilter}
							onValueChange={(value: "all" | "with" | "without") => setWidgetFilter(value)}
							style={{ display: "flex", gap: "12px" }}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
								<RadioGroupItem value="all" />
								<Label style={{ fontSize: "13px", cursor: "pointer" }}>all</Label>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
								<RadioGroupItem value="with" />
								<Label style={{ fontSize: "13px", cursor: "pointer" }}>with widgets</Label>
							</div>
							<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
								<RadioGroupItem value="without" />
								<Label style={{ fontSize: "13px", cursor: "pointer" }}>without widgets</Label>
							</div>
						</RadioGroup>
					</div>
				</div>

				{/* Scrollable question list */}
				<div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
					<ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
						{filteredQuestions.map((question, index) => {
							const isSelected = index === currentIndex
							const color = getQuestionBackgroundColor(question)
							const ringColor = color === "transparent" ? "#ffffff" : color
							return (
								<li
									key={question.id}
									style={{
										padding: "8px",
										backgroundColor: isSelected ? "#e0e0e0" : color,
										cursor: "pointer",
										borderBottom: "1px solid #eee",
										borderRadius: "8px",
										position: isSelected ? "relative" : undefined,
										zIndex: isSelected ? 1 : undefined,
										boxShadow: isSelected ? `0 0 0 6px ${ringColor}, 0 6px 14px rgba(0,0,0,0.12)` : undefined,
										transform: isSelected ? "translateY(-1px)" : undefined,
										transition: "box-shadow 120ms ease, transform 120ms ease"
									}}
									onClick={() => setCurrentIndex(index)}
								>
									<strong style={{ fontFamily: "monospace" }}>[{String(index).padStart(4, "0")}]</strong> {question.id}
								</li>
							)
						})}
					</ul>
				</div>
			</div>

			{/* Main content area */}
			<div style={{ flex: 1, padding: "20px" }}>
				{/* Top section with data and navigation */}
				<div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
						<h2>
							question {currentIndex + 1} of {filteredQuestions.length}
							{widgetFilter === "with" && (
								<span style={{ fontSize: "14px", color: "#666", fontWeight: "normal" }}> (with widgets)</span>
							)}
							{widgetFilter === "without" && (
								<span style={{ fontSize: "14px", color: "#666", fontWeight: "normal" }}> (without widgets)</span>
							)}
						</h2>
						<div style={{ display: "flex", gap: "0" }}>
							<Button
								variant="default"
								onClick={handleMarkSuccessful}
								style={{
									borderTopRightRadius: 0,
									borderBottomRightRadius: 0
								}}
								className="hover:cursor-pointer"
							>
								<Check size={16} />
							</Button>
							<Dialog
								open={dialogOpen}
								onOpenChange={(open) => {
									setDialogOpen(open)
									if (open) {
										// prefill textarea and severity with previous values
										const previousNotes = currentQuestion.analysisNotes ?? ""
										setAnalysisNotes(previousNotes)
										if (previousNotes === "") {
											// if previously marked successful, default severity to minor
											setSeverity("minor")
										} else {
											const prevSeverity = currentQuestion.severity ?? "minor"
											setSeverity(prevSeverity)
										}
									}
								}}
							>
								<DialogTrigger asChild>
									<Button
										variant="outline"
										style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, borderLeft: "none" }}
									>
										add analysis note
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>analysis notes for {currentQuestion.id}</DialogTitle>
									</DialogHeader>
									<div style={{ padding: "20px 0" }}>
										{currentQuestion.analysisNotes !== null && (
											<div
												style={{
													fontSize: "14px",
													color: "#666",
													marginBottom: "10px",
													padding: "8px",
													backgroundColor: "#f5f5f5",
													borderRadius: "4px",
													fontStyle: "italic"
												}}
											>
												Previous notes: {currentQuestion.analysisNotes || "(marked as successful)"}
												<br />
												Previous severity:{" "}
												{currentQuestion.severity
													? `${currentQuestion.severity.charAt(0).toUpperCase()}${currentQuestion.severity.slice(1)}`
													: "(none)"}
											</div>
										)}
										<div style={{ marginBottom: "15px" }}>
											<Label style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px", display: "block" }}>
												Issue Severity
											</Label>
											<RadioGroup
												value={severity}
												onValueChange={(value: "major" | "minor" | "patch") => setSeverity(value)}
												style={{ display: "flex", gap: "20px" }}
											>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "6px",
														padding: "6px 12px",
														borderRadius: "4px",
														backgroundColor: getSeverityColor("major")
													}}
												>
													<RadioGroupItem value="major" />
													<Label>Major</Label>
												</div>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "6px",
														padding: "6px 12px",
														borderRadius: "4px",
														backgroundColor: getSeverityColor("minor")
													}}
												>
													<RadioGroupItem value="minor" />
													<Label>Minor</Label>
												</div>
												<div
													style={{
														display: "flex",
														alignItems: "center",
														gap: "6px",
														padding: "6px 12px",
														borderRadius: "4px",
														backgroundColor: getSeverityColor("patch")
													}}
												>
													<RadioGroupItem value="patch" />
													<Label>Patch</Label>
												</div>
											</RadioGroup>
										</div>
										<Textarea
											placeholder="enter analysis notes (leave empty to mark as successful)"
											value={analysisNotes}
											onChange={(e) => setAnalysisNotes(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
													e.preventDefault()
													handleSubmitAnalysis()
												}
											}}
											rows={6}
										/>
									</div>
									<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
										<Button variant="ghost" onClick={() => setDialogOpen(false)}>
											cancel
										</Button>
										<Button onClick={handleSubmitAnalysis} disabled={isSubmitting}>
											{isSubmitting ? "submitting..." : "submit"}
										</Button>
									</div>
								</DialogContent>
							</Dialog>
							<Button
								variant="secondary"
								onClick={handleValidateXml}
								disabled={isValidating || !currentQuestion.xml}
								className="hover:cursor-pointer"
								style={{ marginLeft: "10px" }}
							>
								{isValidating ? "validating..." : "validate xml"}
							</Button>
							<Button
								variant="ghost"
								onClick={goToPrevious}
								disabled={currentIndex === 0}
								className="hover:cursor-pointer"
								style={{ marginLeft: "10px" }}
							>
								previous
							</Button>
							<Button
								variant="ghost"
								onClick={goToNext}
								disabled={currentIndex === filteredQuestions.length - 1}
								className="hover:cursor-pointer"
							>
								next
							</Button>
						</div>
					</div>

					{/* Data fields with copy buttons */}
					<div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<Button
								variant="ghost"
								onClick={() => copyToClipboard(currentQuestion.id)}
								className="hover:cursor-pointer"
							>
								copy
							</Button>
							<strong>id:</strong>
							<span style={{ fontFamily: "monospace" }}>{currentQuestion.id}</span>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<Button
								variant="ghost"
								onClick={() => copyToClipboard(currentQuestion.xml)}
								className="hover:cursor-pointer"
							>
								copy
							</Button>
							<strong>xml:</strong>
							<span style={{ fontFamily: "monospace" }}>{truncateText(currentQuestion.xml, 200)}</span>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<Button
								variant="ghost"
								onClick={() => copyToClipboard(JSON.stringify(currentQuestion.parsedData, null, 2))}
								className="hover:cursor-pointer"
							>
								copy
							</Button>
							<strong>parsed_data:</strong>
							<span style={{ fontFamily: "monospace" }}>
								{truncateText(JSON.stringify(currentQuestion.parsedData), 200)}
							</span>
						</div>

						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<Button
								variant="ghost"
								onClick={() =>
									copyToClipboard(
										currentQuestion.structuredJson ? JSON.stringify(currentQuestion.structuredJson, null, 2) : "null"
									)
								}
								className="hover:cursor-pointer"
							>
								copy
							</Button>
							<strong>structured_json:</strong>
							<span style={{ fontFamily: "monospace" }}>
								{currentQuestion.structuredJson ? (
									truncateText(JSON.stringify(currentQuestion.structuredJson), 200)
								) : (
									<em style={{ color: "#999" }}>null</em>
								)}
							</span>
						</div>
					</div>
				</div>

				{/* Iframes controls + side by side */}
				<div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "8px" }}>
					<Button
						variant="secondary"
						onClick={() => {
							setAmpReload((n) => n + 1)
							toast.info("reloading amp-up iframe")
						}}
						className="hover:cursor-pointer"
					>
						reload amp-up
					</Button>
					<Button
						variant="secondary"
						onClick={() => {
							setPerseusReload((n) => n + 1)
							toast.info("reloading perseus iframe")
						}}
						className="hover:cursor-pointer"
					>
						reload perseus
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							setAmpReload((n) => n + 1)
							setPerseusReload((n) => n + 1)
							toast.info("reloading both iframes")
						}}
						className="hover:cursor-pointer"
					>
						reload both
					</Button>
				</div>

				<div style={{ display: "flex", gap: "20px" }}>
					{/* AMP-UP iframe */}
					<div style={{ flex: 1 }}>
						<h3>amp-up testrunner sandbox</h3>
						<iframe
							src={`https://www.amp-up.io/testrunner/sandbox/?r=${ampReload}`}
							style={{ width: "100%", height: "70vh", border: "1px solid #ccc" }}
							title="AMP-UP Testrunner Sandbox"
						/>
					</div>

					{/* Perseus iframe */}
					<div style={{ flex: 1 }}>
						<div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
							<h3>perseus item renderer</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={() =>
									window.open(
										"https://khan.github.io/perseus/?path=/story/renderers-server-item-renderer--interactive",
										"_blank"
									)
								}
							>
								open in new tab
							</Button>
						</div>
						<iframe
							src={`https://khan.github.io/perseus/?path=/story/renderers-server-item-renderer--interactive&r=${perseusReload}`}
							style={{ width: "100%", height: "70vh", border: "1px solid #ccc" }}
							title="Perseus Item Renderer"
							onLoad={() => toast.info("perseus iframe loaded")}
							onError={() => toast.error("perseus iframe failed to load")}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
