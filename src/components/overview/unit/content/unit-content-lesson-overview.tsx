import * as logger from "@superbuilders/slog"
import type { UnitContentData } from "./unit-content"

export function UnitContentLessonOverview({
	lesson
}: {
	lesson: Pick<UnitContentData["lessons"][number], "slug" | "path" | "title">
}) {
	logger.debug("initializing unit content lesson overview", { lesson })

	return (
		<div id="unit-content-lesson-overview">
			<div id="unit-content-lesson-overview-header">
				<h1>Unit Content Lesson Overview</h1>
			</div>
		</div>
	)
}
