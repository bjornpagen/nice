import * as logger from "@superbuilders/slog"
import type { Lesson } from "@/components/overview/types"

export function UnitContentLessonOverview({ lesson }: { lesson: Omit<Lesson, "resources"> }) {
	logger.debug("initializing unit content lesson overview", { lesson })

	return (
		<div id="unit-content-lesson-overview">
			<div id="unit-content-lesson-overview-header">
				<h1>Unit Content Lesson Overview</h1>
			</div>
		</div>
	)
}
