import * as logger from "@superbuilders/slog"
import { Resend } from "resend"
import { eq, and } from "drizzle-orm"
import { inngest } from "@/inngest/client"
import { env } from "@/env"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { render } from "@react-email/components"
import { ProgressionNotificationEmail } from "@/emails/progression-notification"

const resend = new Resend(env.RESEND_API_KEY)

export const sendProgressionNotification = inngest.createFunction(
    { id: "send-progression-notification" },
    { event: "app/course.progression.completed" },
    async ({ event, step }) => {
        const { data } = event

        // Step 1: Get active subscribers for course progression events
        const subscribers = await step.run("get-subscribers", async () => {
            const results = await db
                .select()
                .from(schema.niceNotificationSubscribers)
                .where(
                    and(
                        eq(schema.niceNotificationSubscribers.eventType, "course.progression"),
                        eq(schema.niceNotificationSubscribers.active, 1)
                    )
                )
            return results
        })

        if (subscribers.length === 0) {
            logger.info("no subscribers for progression notifications")
            return { sent: 0 }
        }

        // Step 2: Render the email template
        const emailHtml = await step.run("render-email", async () => {
            return await render(
                ProgressionNotificationEmail({
                    studentName: data.studentName,
                    studentEmail: data.studentEmail,
                    fromCourse: data.fromCourseTitle,
                    toCourse: data.toCourseTitle || "Completed",
                    isSupplementary: data.isTerminal,
                    pipelinePosition: data.pipelinePosition,
                    totalCourses: data.totalCourses,
                    timestamp: new Date(data.timestamp)
                })
            )
        })

        // Step 3: Send emails to all subscribers
        const results = await step.run("send-emails", async () => {
            const sendResults: Array<{ email: string; success: boolean; error?: string }> = []

            for (const subscriber of subscribers) {
                try {
                    const subject = data.isTerminal && !data.toCourseId
                        ? `Student Progression Report: ${data.studentName} completed ${data.fromCourseTitle}`
                        : `Student Progression Report: ${data.studentName} moved from ${data.fromCourseTitle} to ${data.toCourseTitle}`

                    await resend.emails.send({
                        from: "Nice Academy <noreply@nice.academy>",
                        to: subscriber.email,
                        subject,
                        html: emailHtml
                    })

                    sendResults.push({ email: subscriber.email, success: true })
                    logger.info("progression notification email sent", {
                        to: subscriber.email,
                        student: data.studentName
                    })
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : "Unknown error"
                    sendResults.push({ email: subscriber.email, success: false, error: errorMessage })
                    logger.error("failed to send progression notification email", {
                        to: subscriber.email,
                        error: errorMessage
                    })
                }
            }

            return sendResults
        })

        const successCount = results.filter((r) => r.success).length
        logger.info("progression notification complete", {
            total: subscribers.length,
            sent: successCount,
            failed: subscribers.length - successCount
        })

        return { sent: successCount, total: subscribers.length, results }
    }
)
