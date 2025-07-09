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
	},
	"qti/course.payload.generate": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	// Add new events for the OneRoster ingestion workflow
	"oneroster/course.ingest.requested": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	"oneroster/resources.ingest": {
		data: z.object({
			// Define a schema for the resource objects based on the OpenAPI spec
			resources: z.array(
				z.object({
					sourcedId: z.string(),
					status: z.string(),
					title: z.string(),
					format: z.string(), // ✅ ADDED: This field is required by the API
					vendorResourceId: z.string(),
					vendorId: z.string().nullable(),
					applicationId: z.string().nullable(),
					roles: z.array(z.string()).optional(),
					importance: z.string().optional(),
					metadata: z.record(z.any()).optional()
				})
			)
		})
	},
	"oneroster/course.ingest": {
		data: z.object({
			// Define a schema for the course object
			course: z.object({
				sourcedId: z.string(),
				status: z.string(),
				title: z.string(),
				courseCode: z.string().optional().nullable(),
				org: z.object({
					sourcedId: z.string(),
					type: z.enum(["course", "academicSession", "org", "courseComponent", "resource", "schoolYear"])
				}),
				academicSession: z.object({
					sourcedId: z.string(),
					type: z.enum(["course", "academicSession", "org", "courseComponent", "resource", "schoolYear"])
				}),
				subjects: z.array(z.string()).optional().nullable(),
				metadata: z.record(z.any()).optional()
			})
		})
	},
	"oneroster/course-components.ingest": {
		data: z.object({
			// Define a schema for course components
			components: z.array(
				z.object({
					sourcedId: z.string(),
					status: z.string(),
					title: z.string(),
					course: z.object({
						sourcedId: z.string(),
						type: z.enum(["course", "academicSession", "org", "courseComponent", "resource"])
					}),
					parent: z
						.object({
							sourcedId: z.string(),
							type: z.enum(["course", "academicSession", "org", "courseComponent", "resource"])
						})
						.optional()
						.nullable(),
					sortOrder: z.number(),
					metadata: z.record(z.any()).optional()
				})
			)
		})
	},
	"oneroster/component-resources.ingest": {
		data: z.object({
			// Define a schema for component resources
			componentResources: z.array(
				z.object({
					sourcedId: z.string(),
					status: z.string(),
					title: z.string(),
					courseComponent: z.object({
						sourcedId: z.string(),
						type: z.enum(["course", "academicSession", "org", "courseComponent", "resource"])
					}),
					resource: z.object({
						sourcedId: z.string(),
						type: z.enum(["course", "academicSession", "org", "courseComponent", "resource"])
					}),
					sortOrder: z.number()
				})
			)
		})
	},
	// ADDED: New event for ingesting a single class
	"oneroster/class.ingest": {
		data: z.object({
			class: z.object({
				sourcedId: z.string(),
				title: z.string(),
				classType: z.enum(["homeroom", "scheduled"]),
				course: z.object({
					sourcedId: z.string(),
					type: z.enum([
						"course",
						"academicSession",
						"org",
						"courseComponent",
						"resource",
						"class",
						"user",
						"term",
						"schoolYear"
					])
				}),
				// The API spec uses 'org' for the school reference in the POST body
				school: z
					.object({
						sourcedId: z.string(),
						type: z.enum([
							"course",
							"academicSession",
							"org",
							"courseComponent",
							"resource",
							"class",
							"user",
							"term",
							"schoolYear"
						])
					})
					.optional(), // Make optional as it's passed as 'org'
				org: z
					.object({
						sourcedId: z.string(),
						type: z.enum([
							"course",
							"academicSession",
							"org",
							"courseComponent",
							"resource",
							"class",
							"user",
							"term",
							"schoolYear"
						])
					})
					.optional(), // 'org' is used for the school
				terms: z.array(
					z.object({
						sourcedId: z.string(),
						type: z.enum([
							"course",
							"academicSession",
							"org",
							"courseComponent",
							"resource",
							"class",
							"user",
							"term",
							"schoolYear"
						])
					})
				)
			})
		})
	}
}

export const inngest = new Inngest({
	id: "nice",
	schemas: new EventSchemas().fromZod(events),
	logger
})

export type Events = GetEvents<typeof inngest>
