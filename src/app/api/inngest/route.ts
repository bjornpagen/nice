import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { helloWorld } from "@/inngest/functions/hello"
import { migratePerseusToQti } from "@/inngest/functions/migrate-perseus-to-qti"
import { qtiMigrationBackfill } from "@/inngest/functions/qti-migration-backfill"

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [helloWorld, migratePerseusToQti, qtiMigrationBackfill]
})
