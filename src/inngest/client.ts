import * as logger from "@superbuilders/slog"
import { EventSchemas, type GetEvents, Inngest } from "inngest"
import { z } from "zod"

const events = {
	"nice/hello.world": {
		data: z.object({
			email: z.string().email()
		})
	},
	"nice/qti.assessment-item.migration.requested": {
		data: z.object({
			questionId: z.string().min(1)
		})
	},
	"nice/qti.assessment-stimulus.migration.requested": {
		data: z.object({
			articleId: z.string().min(1)
		})
	},
	"nice/course.oneroster.generate": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	"nice/course.assessment-items.generate": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	"nice/course.assessment-stimuli.generate": {
		data: z.object({
			courseId: z.string().min(1)
		})
	}
}

export const inngest = new Inngest({
	id: "nice",
	schemas: new EventSchemas().fromZod(events),
	logger
})

export type Events = GetEvents<typeof inngest>
