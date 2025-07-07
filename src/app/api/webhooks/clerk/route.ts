import { clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { headers } from "next/headers"
import { Webhook } from "svix"
import { env } from "@/env.js"

export async function POST(req: Request) {
	logger.info("clerk webhook received")

	// Get the headers
	const headerPayload = await headers()
	const svix_id = headerPayload.get("svix-id")
	const svix_timestamp = headerPayload.get("svix-timestamp")
	const svix_signature = headerPayload.get("svix-signature")

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		logger.error("missing svix headers", {
			svix_id: Boolean(svix_id),
			svix_timestamp: Boolean(svix_timestamp),
			svix_signature: Boolean(svix_signature)
		})
		return new Response("Error occurred -- no svix headers", {
			status: 400
		})
	}

	// Get the body
	const payload = await req.text()
	const body = Buffer.from(payload)

	// Create a new Svix instance with your secret.
	const wh = new Webhook(env.CLERK_WEBHOOK_SECRET)

	// Verify the payload with the headers
	const verifyResult = errors.trySync(() => {
		return wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature
		})
	})

	if (verifyResult.error) {
		logger.error("webhook verification failed", { error: verifyResult.error })
		return new Response("Error occurred -- verification failed", {
			status: 400
		})
	}

	const webhookData = verifyResult.data

	// Basic structure validation
	if (!webhookData || typeof webhookData !== "object" || !("type" in webhookData)) {
		logger.error("invalid webhook event structure")
		return new Response("Error occurred -- invalid event structure", {
			status: 400
		})
	}

	// Safe access to type property
	const eventType = "type" in webhookData ? webhookData.type : null
	if (typeof eventType !== "string") {
		logger.error("invalid event type", { eventType })
		return new Response("Error occurred -- invalid event type", {
			status: 400
		})
	}

	logger.debug("webhook verified successfully", { eventType })

	// Handle user.created events
	if (eventType === "user.created") {
		// Safe access to data property
		const eventData = "data" in webhookData ? webhookData.data : null

		if (!eventData || typeof eventData !== "object") {
			logger.error("invalid user.created event data")
			return new Response("Error occurred -- invalid user data", {
				status: 400
			})
		}

		// Safe access to user data properties
		const clerkId = "id" in eventData ? eventData.id : null
		const emailAddresses = "email_addresses" in eventData ? eventData.email_addresses : null
		const primaryEmailId = "primary_email_address_id" in eventData ? eventData.primary_email_address_id : null

		if (typeof clerkId !== "string") {
			logger.error("invalid clerk id in webhook", { clerkId })
			return new Response("Error occurred -- invalid clerk id", {
				status: 400
			})
		}

		logger.info("processing user created event", { userId: clerkId })

		// Find primary email
		if (!Array.isArray(emailAddresses)) {
			logger.error("no email addresses found for user", { clerkId })
			return new Response("Error occurred -- no email addresses", {
				status: 400
			})
		}

		const primaryEmail = emailAddresses.find(
			(email: unknown) => email && typeof email === "object" && "id" in email && email.id === primaryEmailId
		)

		if (!primaryEmail || typeof primaryEmail !== "object" || !("email_address" in primaryEmail)) {
			logger.error("no primary email found for user", { clerkId })
			return new Response("Error occurred -- no primary email", {
				status: 400
			})
		}

		// Safe access to email address
		const emailAddress = "email_address" in primaryEmail ? primaryEmail.email_address : null
		if (typeof emailAddress !== "string") {
			logger.error("invalid email address format", { clerkId })
			return new Response("Error occurred -- invalid email format", {
				status: 400
			})
		}

		// Extract nickname from email (part before @)
		const nickname = emailAddress.split("@")[0] || ""

		const metadata = {
			publicMetadata: {
				nickname: nickname,
				username: "",
				bio: ""
			}
		}

		logger.debug("setting initial clerk user metadata", { clerkId, nickname })

		// Set initial user metadata in Clerk
		const clerk = await clerkClient()
		const setResult = await errors.try(clerk.users.updateUserMetadata(clerkId, metadata))

		if (setResult.error) {
			logger.error("failed to set initial user metadata in clerk", {
				error: setResult.error,
				clerkId
			})
			return new Response("Error occurred -- clerk metadata update failed", {
				status: 500
			})
		}

		logger.info("user metadata initialized successfully", { clerkId, nickname })
	} else {
		logger.debug("ignoring webhook event", { eventType })
	}

	return new Response("", { status: 200 })
}
