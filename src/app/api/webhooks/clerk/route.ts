import { randomUUID } from "node:crypto"
import { clerkClient } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { headers } from "next/headers"
import { Webhook } from "svix"
import { z } from "zod"
import { env } from "@/env.js"
import { oneroster } from "@/lib/clients"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

// NEW: Define Zod schemas for the incoming Clerk webhook payload.
// This ensures strict validation of external data sources.
const WebhookEventDataSchema = z.object({
	id: z.string().nonempty(),
	email_addresses: z.array(
		z.object({
			id: z.string().nonempty(),
			email_address: z.string().email().nonempty()
		})
	),
	primary_email_address_id: z.string().nonempty(),
	external_accounts: z.array(z.object({ provider: z.string().nonempty() })).default([]),
	first_name: z
		.string()
		.nullable()
		.transform((val) => val ?? ""), // Handle null from Clerk, transform to empty string
	last_name: z
		.string()
		.nullable()
		.transform((val) => val ?? "") // Handle null from Clerk, transform to empty string
})

const WebhookEventSchema = z.object({
	type: z.literal("user.created"),
	data: WebhookEventDataSchema
})

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
	// CRITICAL: Validate the entire webhook event structure using Zod.
	const eventValidation = WebhookEventSchema.safeParse(webhookData)
	if (!eventValidation.success) {
		logger.error("CRITICAL: Invalid webhook event structure", {
			webhookData,
			error: eventValidation.error
		})
		// Fail loudly if the incoming data doesn't match our strict schema.
		return new Response("Error occurred -- invalid webhook event structure", { status: 400 })
	}

	const event = eventValidation.data
	const {
		id: clerkId,
		email_addresses,
		primary_email_address_id,
		external_accounts,
		first_name,
		last_name
	} = event.data

	logger.info("processing user created event", { userId: clerkId })

	const primaryEmail = email_addresses.find((email) => email.id === primary_email_address_id)

	if (!primaryEmail) {
		logger.error("CRITICAL: No primary email found for user", { clerkId })
		// This is a critical data integrity error. We cannot create a user without a primary email.
		return new Response("Error occurred -- no primary email", { status: 400 })
	}

	const emailAddress = primaryEmail.email_address

	const emailParts = emailAddress.split("@")
	if (emailParts.length !== 2 || emailParts[0] === undefined) {
		logger.error("CRITICAL: Invalid email format for nickname extraction", {
			clerkId,
			emailAddress,
			emailPartsLength: emailParts.length
		})
		// This is a critical error. We need a valid email to proceed.
		return new Response("Error occurred -- invalid email format for nickname", { status: 400 })
	}
	const nickname = emailParts[0]

	// Use the Zod schema for ClerkUserPublicMetadata to ensure correctness.
	// Defaults will be applied by the schema for empty strings/numbers/dates if not provided by Zod schema default.
	const publicMetadataPayload = ClerkUserPublicMetadataSchema.parse({
		nickname: nickname,
		username: "",
		bio: "",
		streak: { count: 0, lastActivityDate: null }, // Initialize with defaults as per schema
		sourceId: undefined // Initially undefined
	})

	const isTimebackUser = external_accounts.some((account) => account.provider === "oauth_custom_timeback")

	if (isTimebackUser) {
		logger.info("user identified as timeback sso user, attempting to fetch sourceid", {
			userId: clerkId,
			emailAddress
		})

		const onerosterUserResult = await errors.try(oneroster.getUsersByEmail(emailAddress))
		if (onerosterUserResult.error) {
			logger.warn("failed to get user from oneroster, proceeding without sourceid", {
				userId: clerkId,
				error: onerosterUserResult.error
			})
		} else if (onerosterUserResult.data) {
			publicMetadataPayload.sourceId = onerosterUserResult.data.sourcedId
			logger.info("successfully fetched sourceid from oneroster", {
				userId: clerkId,
				sourceId: onerosterUserResult.data.sourcedId
			})
		} else {
			logger.info("user not found in oneroster, creating a new one", { userId: clerkId, emailAddress })
			const newSourcedId = randomUUID()

			// CRITICAL: Ensure we have valid names. No fallbacks like `firstName || nickname`.
			// If `first_name` is an empty string, it means it's genuinely missing from Clerk.
			if (first_name === "") {
				logger.error("CRITICAL: Cannot create OneRoster user without first name", {
					userId: clerkId
				})
				// This is a critical failure. We must stop here.
				return new Response("Error occurred -- missing first name for OneRoster user", { status: 400 })
			}

			const givenName = first_name

			// CRITICAL: Ensure family name. No fallbacks like `lastName || familyNameFromEmail`.
			// `last_name` is guaranteed to be a string (possibly empty) by the Zod schema.
			if (last_name === "") {
				logger.error("CRITICAL: Cannot create OneRoster user without last name", {
					userId: clerkId
				})
				// This is a critical failure. We must stop here.
				return new Response("Error occurred -- missing last name for OneRoster user", { status: 400 })
			}

			const familyName = last_name

			const newUserPayload = {
				sourcedId: newSourcedId,
				status: "active" as const,
				enabledUser: true,
				givenName: givenName,
				familyName: familyName,
				email: emailAddress,
				roles: [
					{
						roleType: "primary" as const,
						role: "student" as const,
						org: {
							sourcedId: "nice-academy"
						}
					}
				]
			}

			const createUserResult = await errors.try(oneroster.createUser(newUserPayload))
			if (createUserResult.error) {
				logger.warn("failed to create new user in oneroster, proceeding without sourceid", {
					userId: clerkId,
					error: createUserResult.error
				})
			} else {
				publicMetadataPayload.sourceId = newSourcedId
				logger.info("successfully created new user in oneroster and assigned sourceid", {
					userId: clerkId,
					sourceId: newSourcedId
				})
			}
		}
	}

	const clerk = await clerkClient()

	const userCheckResult = await errors.try(clerk.users.getUser(clerkId))
	if (userCheckResult.error) {
		logger.warn("user not found in clerk, likely deleted - skipping metadata update", {
			clerkId,
			error: userCheckResult.error
		})
		return new Response("", { status: 200 })
	}

	const setResult = await errors.try(clerk.users.updateUserMetadata(clerkId, { publicMetadata: publicMetadataPayload }))

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

	return new Response("", { status: 200 })
}
