import * as logger from "@superbuilders/slog"
import { EventSchemas, type GetEvents, Inngest } from "inngest"
import { z } from "zod"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"

// Helper schema for the XML-based item input
const CreateItemInputSchema = z.object({
	xml: z.string().min(1),
	metadata: z.record(z.string(), z.any()).optional()
})

// Specific GUID Reference Schemas for type safety
const CourseRefSchema = z.object({ sourcedId: z.string(), type: z.literal("course") })
const ComponentRefSchema = z.object({ sourcedId: z.string(), type: z.literal("courseComponent") })
const ResourceRefSchema = z.object({ sourcedId: z.string(), type: z.literal("resource") })
const OrgRefSchema = z.object({ sourcedId: z.string(), type: z.literal("org") })
const AcademicSessionRefSchema = z.object({ sourcedId: z.string(), type: z.literal("term") })

const events = {
	"nice/hello.world": {
		data: z.object({
			email: z.string().email()
		})
	},
	// QTI Migration Events
	"qti/item.migrate": {
		data: z.object({
			questionId: z.string().min(1)
		})
	},
	"qti/stimulus.migrate": {
		data: z.object({
			articleId: z.string().min(1)
		})
	},
	"qti/course.generate-all-xml": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	"qti/course.migrate-all-items": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	"qti/course.migrate-all-stimuli": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	// ✅ ADD: New event for differentiating a single question
	"qti/question.differentiate": {
		data: z.object({
			questionId: z.string().min(1),
			numberOfVariations: z.number().int().positive()
		})
	},
	// ✅ ADD: New event for paraphrasing a single stimulus
	"qti/stimulus.paraphrase": {
		data: z.object({
			articleId: z.string().min(1)
		})
	},
	// QTI Ingestion Events
	"qti/course.payload.generate": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	"qti/course.ingest": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	// ✅ ADDED: New event to trigger the upload of all generated QTI files.
	"qti/course.upload": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	// ✅ ADDED: New event to clear XML data for a course.
	"qti/course.clear-xml": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	"qti/assessment-items.ingest": {
		data: z.object({
			items: z.array(CreateItemInputSchema)
		})
	},
	"qti/assessment-stimuli.ingest": {
		// ✅ REFACTORED: Changed schema to expect an array of objects with only an 'xml' key.
		data: z.object({
			stimuli: z.array(CreateItemInputSchema)
		})
	},
	"qti/assessment-tests.ingest": {
		data: z.object({
			tests: z.array(z.string())
		})
	},
	// OneRoster Events
	"oneroster/course.payload.generate": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	"oneroster/course.ingest": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	// ✅ ADDED: New event to trigger the upload of generated OneRoster files.
	"oneroster/course.upload": {
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
					format: z.string().optional(), // ✅ CORRECTED: Made optional to match payload reality
					vendorResourceId: z.string(),
					vendorId: z.string().nullable(),
					applicationId: z.string().nullable(),
					roles: z.array(z.string()).optional(),
					importance: z.string().optional(),
					metadata: ResourceMetadataSchema.optional()
				})
			)
		})
	},
	"oneroster/course.upsert": {
		data: z.object({
			// Define a schema for the course object
			course: z.object({
				sourcedId: z.string(),
				status: z.string(),
				title: z.string(),
				courseCode: z.string().optional().nullable(),
				org: OrgRefSchema,
				academicSession: AcademicSessionRefSchema,
				subjects: z.array(z.string()).optional().nullable(),
				metadata: z.record(z.string(), z.any()).optional()
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
					course: CourseRefSchema,
					parent: ComponentRefSchema.optional().nullable(),
					sortOrder: z.number(),
					metadata: z.record(z.string(), z.any()).optional()
				})
			)
		})
	},
	"oneroster/component-resources.ingest": {
		data: z.object({
			componentResources: z.array(
				z.object({
					sourcedId: z.string(),
					status: z.string(),
					title: z.string(),
					courseComponent: ComponentRefSchema,
					resource: ResourceRefSchema,
					sortOrder: z.number()
				})
			)
		})
	},
	"oneroster/line-items.create": {
		data: z.object({
			componentResources: z.array(
				z.object({
					sourcedId: z.string(),
					title: z.string(),
					resource: ResourceRefSchema
					// Other fields from the full componentResource payload are available but not strictly needed by the target function.
				})
			)
		})
	},
	"oneroster/assessment-line-items.ingest": {
		data: z.object({
			assessmentLineItems: z.array(
				z.object({
					sourcedId: z.string(),
					title: z.string(),
					status: z.literal("active"),
					category: z.object({
						sourcedId: z.string(),
						type: z.literal("category")
					}),
					parentAssessmentLineItem: z
						.object({
							sourcedId: z.string(),
							type: z.literal("assessmentLineItem")
						})
						.optional(),
					componentResource: z
						.object({
							sourcedId: z.string(),
							type: z.literal("componentResource")
						})
						.optional(),
					metadata: z.record(z.string(), z.any()).optional()
				})
			)
		})
	},
	"oneroster/class.ingest": {
		data: z.object({
			class: z.object({
				sourcedId: z.string(),
				status: z.string(),
				title: z.string(),
				classType: z.enum(["homeroom", "scheduled"]),
				course: CourseRefSchema,
				// The API spec uses 'org' for the school reference in the POST body
				school: OrgRefSchema.optional(), // Make optional as it's passed as 'org'
				org: OrgRefSchema.optional(), // 'org' is used for the school
				terms: z.array(AcademicSessionRefSchema)
			})
		})
	},
	"migration/hardcoded.start": {
		data: z.object({}) // No data needed to trigger
	}
}

export const inngest = new Inngest({
	id: "nice",
	schemas: new EventSchemas().fromZod(events),
	logger
})

export type Events = GetEvents<typeof inngest>
