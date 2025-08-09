"use client"

import { useUser } from "@clerk/nextjs"
import * as errors from "@superbuilders/errors"
import * as React from "react"
import { QTIRenderer } from "@/components/qti-renderer"
import { sendCaliperTimeSpentEvent } from "@/lib/actions/caliper"
import { trackArticleView } from "@/lib/actions/tracking"
import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
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

		let onerosterUserSourcedId: string | undefined
		let userEmail: string | undefined

		if (user) {
			const publicMetadataResult = errors.trySync(() => parseUserPublicMetadata(user.publicMetadata))
			if (publicMetadataResult.error) {
				// CRITICAL: User metadata is invalid. We must stop.
				// This indicates a severe data integrity issue or misconfiguration.
				// This prevents proceeding with potentially corrupted user context.
				throw errors.wrap(publicMetadataResult.error, "clerk user metadata validation")
			}
			onerosterUserSourcedId = publicMetadataResult.data.sourceId
			userEmail = user.primaryEmailAddress?.emailAddress
		}

		if (onerosterUserSourcedId && article.id) {
			// Fire-and-forget the existing OneRoster tracking action on component mount.
			void trackArticleView(onerosterUserSourcedId, article.id, {
				subjectSlug: params.subject,
				courseSlug: params.course
			})

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
				// CRITICAL: Subject is unmapped. This indicates a configuration or routing error.
				throw errors.new("article tracking: unmapped subject")
			}

			// Cleanup function to send time spent event when component unmounts
			return () => {
				if (startTimeRef.current && user && onerosterUserSourcedId && userEmail) {
					const endTime = new Date()
					const durationInSeconds = Math.floor((endTime.getTime() - startTimeRef.current.getTime()) / 1000)

					// Only send if user spent at least 1 second on the article
					if (durationInSeconds >= 1) {
						// Ensure actor is valid before sending.
						const actorForCleanup = {
							id: `https://api.alpha-1edtech.com/ims/oneroster/rostering/v1p2/users/${onerosterUserSourcedId}`,
							type: "TimebackUser" as const,
							email: userEmail
						}

						// Ensure context is valid before sending.
						const contextForCleanup = {
							id: `${process.env.NEXT_PUBLIC_APP_DOMAIN}/${params.subject}/${params.course}/${params.unit}/${params.lesson}/a/${params.article}`,
							type: "TimebackActivityContext" as const,
							subject: mappedSubject,
							app: { name: "Nice Academy" },
							course: { name: params.course },
							activity: {
								name: article.title,
								id: article.id
							},
							process: false
						}
						void sendCaliperTimeSpentEvent(actorForCleanup, contextForCleanup, durationInSeconds)
					}
				}
			}
		}
	}, [user, article.id, article.title, params.subject, params.course, params.unit, params.lesson, params.article])

	return (
		<div className="bg-white h-full flex flex-col">
			{/* Article Header */}
			<div className="bg-white p-6 border-b border-gray-200 flex-shrink-0">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-800 mb-4">{article.title}</h1>
				</div>
			</div>

			{/* Article Content - Render through QTI */}
			<div className="flex-1 overflow-y-auto">
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
