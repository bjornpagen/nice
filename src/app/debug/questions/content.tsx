"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { QuestionDebugData } from "./actions"
import { upsertQuestionAnalysis } from "./server-actions"

interface ContentProps {
	questions: QuestionDebugData[]
}

export function Content({ questions }: ContentProps) {
	const [currentIndex, setCurrentIndex] = React.useState(0)
	const [dialogOpen, setDialogOpen] = React.useState(false)
	const [analysisNotes, setAnalysisNotes] = React.useState("")
	const [localQuestions, setLocalQuestions] = React.useState(questions)

	if (localQuestions.length === 0) {
		return <div>no questions with xml found</div>
	}

	const currentQuestion = localQuestions[currentIndex]
	if (!currentQuestion) {
		return <div>question not found</div>
	}

	const goToPrevious = () => {
		setCurrentIndex((prev) => Math.max(0, prev - 1))
	}

	const goToNext = () => {
		setCurrentIndex((prev) => Math.min(localQuestions.length - 1, prev + 1))
	}

	const copyToClipboard = async (text: string) => {
		await navigator.clipboard.writeText(text)
	}

	const truncateText = (text: string, maxLength = 100) => {
		return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
	}

	const handleSubmitAnalysis = async () => {
		const notesToSave = analysisNotes.trim() || ""
		await upsertQuestionAnalysis(currentQuestion.id, notesToSave === "" ? null : notesToSave)

		// update local state
		setLocalQuestions((prev) =>
			prev.map((q) => (q.id === currentQuestion.id ? { ...q, analysisNotes: notesToSave } : q))
		)

		setDialogOpen(false)
		setAnalysisNotes("")
	}

	const getQuestionBackgroundColor = (question: QuestionDebugData) => {
		if (question.analysisNotes === null) return "transparent"
		return question.analysisNotes === "" ? "#e8f5e8" : "#ffeaea"
	}

	return (
		<div style={{ display: "flex", height: "100vh" }}>
			{/* Left sidebar with question list */}
			<div style={{ width: "300px", borderRight: "1px solid #ccc", overflowY: "auto", padding: "10px" }}>
				<h3>questions with xml ({localQuestions.length})</h3>
				<ul style={{ listStyle: "none", padding: 0 }}>
					{localQuestions.map((question, index) => (
						<li
							key={question.id}
							style={{
								padding: "8px",
								backgroundColor: index === currentIndex ? "#e0e0e0" : getQuestionBackgroundColor(question),
								cursor: "pointer",
								borderBottom: "1px solid #eee"
							}}
							onClick={() => setCurrentIndex(index)}
						>
							{question.id}
						</li>
					))}
				</ul>
			</div>

			{/* Main content area */}
			<div style={{ flex: 1, padding: "20px" }}>
				{/* Top section with data and navigation */}
				<div style={{ marginBottom: "20px", padding: "15px", border: "1px solid #ddd" }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
						<h2>
							question {currentIndex + 1} of {localQuestions.length}
						</h2>
						<div style={{ display: "flex", gap: "10px" }}>
							<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
								<DialogTrigger asChild>
									<Button variant="outline">add analysis note</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>analysis notes for {currentQuestion.id}</DialogTitle>
									</DialogHeader>
									<div style={{ padding: "20px 0" }}>
										<Textarea
											placeholder="enter analysis notes (leave empty to mark as successful)"
											value={analysisNotes}
											onChange={(e) => setAnalysisNotes(e.target.value)}
											rows={6}
										/>
									</div>
									<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
										<Button variant="ghost" onClick={() => setDialogOpen(false)}>
											cancel
										</Button>
										<Button onClick={handleSubmitAnalysis}>submit</Button>
									</div>
								</DialogContent>
							</Dialog>
							<Button
								variant="ghost"
								onClick={goToPrevious}
								disabled={currentIndex === 0}
								className="hover:cursor-pointer"
							>
								previous
							</Button>
							<Button
								variant="ghost"
								onClick={goToNext}
								disabled={currentIndex === localQuestions.length - 1}
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
					</div>
				</div>

				{/* Iframes side by side */}
				<div style={{ display: "flex", gap: "20px" }}>
					{/* AMP-UP iframe */}
					<div style={{ flex: 1 }}>
						<h3>amp-up testrunner sandbox</h3>
						<iframe
							src="https://www.amp-up.io/testrunner/sandbox/"
							style={{ width: "100%", height: "70vh", border: "1px solid #ccc" }}
							title="AMP-UP Testrunner Sandbox"
						/>
					</div>

					{/* Perseus iframe */}
					<div style={{ flex: 1 }}>
						<h3>perseus item renderer</h3>
						<iframe
							src="https://khan.github.io/perseus/?path=/story/renderers-server-item-renderer--interactive"
							style={{ width: "100%", height: "70vh", border: "1px solid #ccc" }}
							title="Perseus Item Renderer"
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
