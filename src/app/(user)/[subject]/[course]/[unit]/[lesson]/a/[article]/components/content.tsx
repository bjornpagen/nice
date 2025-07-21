"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import Image from "next/image"
import * as React from "react"
import { QTIRenderer } from "@/components/qti-renderer"
import { Button } from "@/components/ui/button"
import { sendCaliperActivityCompletedEvent, sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { trackArticleView } from "@/lib/actions/tracking"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import type { ArticlePageData } from "@/lib/types/page"

export function Content({
	articlePromise,
	paramsPromise
}: {
	articlePromise: Promise<ArticlePageData>
	paramsPromise: Promise<{ subject: string; course: string; unit: string; lesson: string; article: string }>
}) {
	const article = React.use(articlePromise)
	const params = React.use(paramsPromise)
	const { user } = useUser()
	const startTimeRef = React.useRef<Date | null>(null)

	React.useEffect(() => {
		// Record the start time when component mounts
		startTimeRef.current = new Date()

		// Validate user metadata if user exists
		let onerosterUserSourcedId: string | undefined
		if (user?.publicMetadata) {
			const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (metadataValidation.success) {
				onerosterUserSourcedId = metadataValidation.data.sourceId
			}
		}

		if (onerosterUserSourcedId && article.id) {
			// Fire-and-forget the existing OneRoster tracking action on component mount.
			void trackArticleView(onerosterUserSourcedId, article.id)

			// Send Caliper event for article completion
			const userEmail = user?.primaryEmailAddress?.emailAddress
			if (!userEmail) {
				throw errors.new("article tracking: user email required for caliper event")
			}

			const actor = {
				id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${onerosterUserSourcedId}`,
				type: "TimebackUser" as const,
				email: userEmail
			}

			// Map subject string to the enum value
			const subjectMapping: Record<string, "Science" | "Math" | "Reading" | "Language" | "Social Studies" | "None"> = {
				science: "Science",
				math: "Math",
				reading: "Reading",
				language: "Language",
				"social-studies": "Social Studies"
			}
			const mappedSubject = subjectMapping[params.subject]
			if (!mappedSubject) {
				throw errors.new("article tracking: unmapped subject")
			}

			const context = {
				id: `https://alpharead.alpha.school/articles/${article.id}`,
				type: "TimebackActivityContext" as const,
				subject: mappedSubject,
				app: { name: "Nice Academy" },
				course: { name: params.course },
				activity: { name: article.title }
			}

			// For articles, we send a completion metric
			const metrics = [{ type: "xpEarned" as const, value: 1 }]

			void sendCaliperActivityCompletedEvent(actor, context, metrics)

			// Cleanup function to send time spent event when component unmounts
			return () => {
				if (startTimeRef.current && user) {
					const endTime = new Date()
					const durationInSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000)

					// Only send if user spent at least 1 second on the article
					if (durationInSeconds >= 1) {
						void sendCaliperTimeSpentEvent(actor, context, durationInSeconds)
					}
				}
			}
		}
	}, [user, article.id, article.title, params.subject, params.course])

	return (
		<div className="bg-white h-full flex flex-col">
			{/* Article Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-800 mb-4">{article.title}</h1>
					<div className="flex justify-center space-x-4">
						<Button
							variant="outline"
							className="text-green-600 border-green-600 hover:bg-green-50 text-sm cursor-not-allowed"
							disabled
						>
							<Image
								src="https://cdn.kastatic.org/images/google_classroom_color.png"
								alt=""
								className="w-4 h-4 mr-2"
								width={16}
								height={16}
							/>
							Google Classroom
						</Button>
						<Button
							variant="outline"
							className="text-purple-600 border-purple-600 hover:bg-purple-50 text-sm cursor-not-allowed"
							disabled
						>
							<span className="mr-2">📘</span>
							Microsoft Teams
						</Button>
					</div>
				</div>
			</div>

			{/* Article Content - Render through QTI */}
			<div className="flex-1 overflow-hidden">
				<QTIRenderer
					identifier={article.id}
					materialType="stimulus"
					height="100%"
					width="100%"
					className="w-full h-full"
				/>
			</div>
		</div>
	)
}
