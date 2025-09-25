import { currentUser } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as React from "react"
import { connection } from "next/server"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"
import { finalizeArticleTimeSpentEvent } from "@/lib/actions/tracking"
import { fetchExercisePageData } from "@/lib/data/content"
import type { ExercisePageData } from "@/lib/types/page"
import { normalizeParams } from "@/lib/utils"
import { findEligiblePassiveResourcesForExercise } from "@/lib/xp/bank"
import { oneroster } from "@/lib/clients"
import { Content } from "@/app/(user)/[subject]/[course]/(practice)/[unit]/[lesson]/e/[exercise]/components/content"

// --- REMOVED: The local ExercisePageData type definition ---

// Removed: dynamic export; we mark the route dynamic by awaiting connection()

export default async function ExercisePage({
	params
}: {
	params: Promise<{ subject: string; course: string; unit: string; lesson: string; exercise: string }>
}) {
	// Ensure this route is treated as dynamic and has request context
	await connection()
	const normalizedParamsPromise = normalizeParams(params)
	const exercisePromise: Promise<ExercisePageData> = normalizedParamsPromise.then(fetchExercisePageData)

	// Resolve user sourcedId during render; avoid calling currentUser() later in a timer or background task
	const userSourcedIdPromise: Promise<string | undefined> = currentUser()
		.then((user) => {
			if (!user?.publicMetadata) {
				logger.warn("user has no public metadata for finalization")
				return undefined
			}
			const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (!metadataValidation.success) {
				logger.error("invalid user metadata for finalization", { error: metadataValidation.error })
				return undefined
			}
			const id = metadataValidation.data.sourceId
			if (typeof id !== "string" || id.length === 0) {
				logger.error("invalid user metadata for finalization: missing sourceId")
				return undefined
			}
			return id
		})

	// --- NEW: Proactive Finalization for ALL preceding articles in window ---
	const finalizeArticlesInWindow = async () => {
		const [exerciseData, normalizedParams, userSourcedId] = await Promise.all([
			exercisePromise,
			normalizedParamsPromise,
			userSourcedIdPromise
		])
		if (!userSourcedId) {
			return
		}

		// Use the exact banking window logic to identify passive resources
		const eligibleResult = await errors.try(
			findEligiblePassiveResourcesForExercise({
				exerciseResourceSourcedId: exerciseData.exercise.id,
				onerosterUserSourcedId: userSourcedId
			})
		);
		if (eligibleResult.error) {
			logger.error("failed to identify passive resources for finalization", { error: eligibleResult.error });
			return;
		}
		const eligible = eligibleResult.data;
		if (eligible.length === 0) {
			return;
		}

		// Fetch resource metadata to filter to Articles and get titles
		const ids = eligible.map((e) => e.sourcedId);
		const resourcesResult = await errors.try(
			oneroster.getAllResources({ filter: `sourcedId@'${ids.join(",")}' AND status='active'` })
		);
		if (resourcesResult.error) {
			logger.error("failed to fetch resources for finalization", { error: resourcesResult.error });
			return;
		}
		const articles = resourcesResult.data.filter((r) => r.metadata?.khanActivityType === "Article");

		// Finalize all articles in parallel
		const finalizePromises = articles.map((article) =>
			errors.try(
				finalizeArticleTimeSpentEvent(
					userSourcedId,
					article.sourcedId,
					article.title,
					{ subjectSlug: normalizedParams.subject, courseSlug: normalizedParams.course }
				)
			)
		);
		const finalizeResults = await Promise.all(finalizePromises);
		for (let i = 0; i < finalizeResults.length && i < articles.length; i++) {
			const res = finalizeResults[i];
			const art = articles[i];
			if (!res || !art) {
				continue;
			}
			if (res.error) {
				logger.error("failed to finalize article time spent", { error: res.error, articleId: art.sourcedId });
			}
		}
	}

	// Fire and forget the finalization - don't wait for it
	finalizeArticlesInWindow().catch((error) => {
		logger.error("exercise finalization worker failed", { error })
	})

	return (
		<React.Suspense>
			<Content exercisePromise={exercisePromise} />
		</React.Suspense>
	)
}
