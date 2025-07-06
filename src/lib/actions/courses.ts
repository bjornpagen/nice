"use server"

import { auth } from "@clerk/nextjs/server"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"

export async function saveUserCourses(courseIds: string[]) {
	const authResult = await errors.try(auth())
	if (authResult.error) {
		logger.error("authentication failed", { error: authResult.error })
		throw errors.wrap(authResult.error, "authentication")
	}

	const { userId } = authResult.data
	if (!userId) {
		throw errors.new("user not authenticated")
	}

	logger.info("saving user courses", { userId, courseIds, count: courseIds.length })

	// Start a transaction to ensure both operations succeed or fail together
	const transactionResult = await errors.try(
		db.transaction(async (tx) => {
			// First, delete all existing courses for this user
			const deleteResult = await errors.try(
				tx.delete(schema.niceUsersCourses).where(eq(schema.niceUsersCourses.clerkId, userId))
			)

			if (deleteResult.error) {
				logger.error("failed to delete existing user courses", { error: deleteResult.error, userId })
				throw errors.wrap(deleteResult.error, "course deletion")
			}

			// If no courses selected, we're done (user removed all courses)
			if (courseIds.length === 0) {
				logger.info("user removed all courses", { userId })
				return { success: true, count: 0 }
			}

			// Prepare the data for insertion
			const userCoursesToInsert = courseIds.map((courseId) => ({
				clerkId: userId,
				courseId
			}))

			// Insert the new set of courses
			const insertResult = await errors.try(tx.insert(schema.niceUsersCourses).values(userCoursesToInsert))

			if (insertResult.error) {
				logger.error("failed to insert user courses", { error: insertResult.error, userId, courseIds })
				throw errors.wrap(insertResult.error, "course insertion")
			}

			return { success: true, count: courseIds.length }
		})
	)

	if (transactionResult.error) {
		logger.error("transaction failed", { error: transactionResult.error, userId })
		throw errors.wrap(transactionResult.error, "course update transaction")
	}

	logger.info("successfully updated user courses", { userId, courseIds, count: courseIds.length })

	return transactionResult.data
}
