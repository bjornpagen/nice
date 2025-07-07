import * as logger from "@superbuilders/slog"
import { EventSchemas, type GetEvents, Inngest } from "inngest"
import { z } from "zod"

const events = {
	"nice/hello.world": {
		data: z.object({
			email: z.string().email()
		})
	},
	"nice/qti.migration.requested": {
		data: z.object({
			questionId: z.string().min(1)
		})
	},
	"nice/qti.migration.exercise.requested": {
		data: z.object({
			exerciseId: z.string().min(1)
		})
	}
}

export const inngest = new Inngest({
	id: "nice",
	schemas: new EventSchemas().fromZod(events),
	logger
})

export type Events = GetEvents<typeof inngest>
