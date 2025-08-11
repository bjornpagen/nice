import * as logger from "@superbuilders/slog"
import { EventSchemas, type GetEvents, Inngest } from "inngest"
import { z } from "zod"
import { ResourceMetadataSchema } from "@/lib/metadata/oneroster"
import { WidgetCollectionNameSchema } from "@/lib/widget-collections" // MODIFIED: Import the central Zod enum schema

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
			questionId: z.string().min(1),
			// MODIFIED: Make widgetCollection mandatory and use the imported schema
			widgetCollection: WidgetCollectionNameSchema
		})
	},
	// REMOVED: "qti/item.migrate.focused" event is removed as it's merged.
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

	// ✅ ADD: New event for paraphrasing a single stimulus
	"qti/stimulus.paraphrase": {
		data: z.object({
			articleId: z.string().min(1)
		})
	},
	// ADD: New event for generating 'n' differentiated versions of a single assessment item.
	"qti/item.differentiate": {
		data: z.object({
			questionId: z.string().min(1),
			n: z.number().int().positive().describe("The number of differentiated questions to generate.")
		})
	},
	// QTI Ingestion Events
	"qti/course.payload.generate": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	// ✅ ADDED: New event for undifferentiated course ingestion from DB (pass-through)
	"qti/course.ingest.undifferentiated": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	// ✅ RENAMED: This event now accurately reflects its purpose of generating QTI JSON.
	"qti/course.generate": {
		data: z.object({
			courseId: z.string().min(1)
		})
	},
	// ✅ ADDED: New event for batch course processing with differentiated content
	"qti/batch.ingest": {
		data: z.object({}) // No additional data needed - uses hardcoded course list
	},
	// ✅ RENAMED: This event now accurately reflects its purpose of generating differentiated content.
	"qti/course.generate.differentiated": {
		data: z.object({
			courseId: z.string().min(1),
			n: z.number().int().positive().describe("The number of differentiated variations to generate per question.")
		})
	},
	// ❌ REMOVED: This event is now obsolete.
	// "qti/course.differentiated-ingest": {
	// 	data: z.object({
	// 		courseId: z.string().min(1)
	// 	})
	// },
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
	// ✅ ADDED: New, more specific event for clearing only assessment item data.
	"qti/database.clear-assessment-item-data": {
		data: z.object({})
	},
	// ✅ ADD: New event to trigger the validation of all question XML
	"qti/questions.validate-all": {
		data: z.object({})
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
	"oneroster/course.generate": {
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
	// ❌ REMOVED: This event is now obsolete and replaced by the two events below.
	// "migration/hardcoded.perseus-to-qti": {
	// 	data: z.object({}) // No data needed
	// },

	// ❌ REMOVED: Obsolete generic hardcoded events
	// "migration/hardcoded.items.perseus-to-qti": {
	// 	data: z.object({})
	// },
	// "migration/hardcoded.stimuli.perseus-to-qti": {
	// 	data: z.object({})
	// },
	// "migration/hardcoded.oneroster.ingest": {
	// 	data: z.object({})
	// },
	// "migration/hardcoded.qti.upload": {
	// 	data: z.object({})
	// },
	// "migration/hardcoded.qti.generate-undifferentiated": {
	// 	data: z.object({})
	// },

	// ✅ ADDED: Explicitly namespaced events for the MATH course pipeline
	"migration/hardcoded.math.items.perseus-to-qti": {
		data: z.object({})
	},
	"migration/hardcoded.math.stimuli.perseus-to-qti": {
		data: z.object({})
	},
	"migration/hardcoded.math.oneroster.ingest": {
		data: z.object({})
	},
	// ❌ REMOVED: Obsolete undifferentiated math generation event
	// "migration/hardcoded.math.qti.generate-undifferentiated": {
	// 	data: z.object({})
	// },
	"migration/hardcoded.math.qti.upload": {
		data: z.object({})
	},

	// ✅ ADDED: New, explicitly namespaced events for the SCIENCE course pipeline
	"migration/hardcoded.science.items.perseus-to-qti": {
		data: z.object({})
	},
	"migration/hardcoded.science.stimuli.perseus-to-qti": {
		data: z.object({})
	},
	"migration/hardcoded.science.oneroster.ingest": {
		data: z.object({})
	},
	"migration/hardcoded.science.qti.generate-undifferentiated": {
		data: z.object({})
	},
	"migration/hardcoded.science.qti.upload": {
		data: z.object({})
	},

	// ✅ RENAMED: Split monolithic generation into two granular, namespaced events
	"migration/hardcoded.math.differentiated-items.generate": {
		data: z.object({})
	},
	// ✅ MODIFIED: Event name is now singular and takes a single question ID for atomic AI generation.
	"qti/question.differentiate-and-save": {
		data: z.object({
			questionId: z.string().min(1),
			n: z.number().int().positive(),
			courseSlug: z.string().min(1)
		})
	},
	// ✅ ADD: New event to signal that all differentiation jobs for a set of courses have been dispatched
	// and the assembly process can begin
	"qti/assembly.items.ready": {
		data: z.object({
			courseSlugs: z.array(z.string().min(1))
		})
	},
	"migration/hardcoded.math.stimuli.generate": {
		data: z.object({})
	}
}

export const inngest = new Inngest({
	id: "nice",
	schemas: new EventSchemas().fromZod(events),
	logger
})

export type Events = GetEvents<typeof inngest>
