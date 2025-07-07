import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { helloWorld } from "@/inngest/functions/hello"
import { migrateAllQuestionsForExercise } from "@/inngest/functions/migrate-all-questions-for-exercise"
import { migratePerseusToQti } from "@/inngest/functions/migrate-perseus-to-qti"

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [helloWorld, migrateAllQuestionsForExercise, migratePerseusToQti]
})
