#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import * as clack from "@clack/prompts"
import { eq, like, sql } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"

async function main(): Promise<void> {
	clack.intro("cleanup frankenstein courses")

	// Find all frankenstein courses (slug pattern: math-academy-*-ccss-coverage)
	const coursesResult = await errors.try(
		db
			.select({
				id: schema.niceCourses.id,
				slug: schema.niceCourses.slug,
				title: schema.niceCourses.title,
				path: schema.niceCourses.path
			})
			.from(schema.niceCourses)
			.where(like(schema.niceCourses.slug, "math-academy-%-ccss-coverage"))
	)

	if (coursesResult.error) {
		logger.error("failed to query courses", { error: coursesResult.error })
		throw errors.wrap(coursesResult.error, "query courses")
	}

	if (coursesResult.data.length === 0) {
		clack.outro("no frankenstein courses found")
		process.exit(0)
	}

	clack.log.info(`found ${coursesResult.data.length} frankenstein courses`)

	// Show details for each course
	for (const course of coursesResult.data) {
		const unitsResult = await errors.try(
			db.select({ count: sql<number>`count(*)` }).from(schema.niceUnits).where(eq(schema.niceUnits.courseId, course.id))
		)
		const unitCount = unitsResult.error ? 0 : Number(unitsResult.data[0]?.count || 0)

		const lessonsResult = await errors.try(
			db
				.select({ count: sql<number>`count(*)` })
				.from(schema.niceLessons)
				.innerJoin(schema.niceUnits, eq(schema.niceLessons.unitId, schema.niceUnits.id))
				.where(eq(schema.niceUnits.courseId, course.id))
		)
		const lessonCount = lessonsResult.error ? 0 : Number(lessonsResult.data[0]?.count || 0)

		console.log(`\n📚 ${course.title}`)
		console.log(`   id: ${course.id}`)
		console.log(`   slug: ${course.slug}`)
		console.log(`   units: ${unitCount}`)
		console.log(`   lessons: ${lessonCount}`)

		const shouldDelete = await clack.confirm({
			message: `delete this course? (cascades: units, lessons, lesson_contents)`
		})

		if (clack.isCancel(shouldDelete)) {
			clack.cancel("operation cancelled")
			process.exit(0)
		}

		if (shouldDelete) {
			const deleteResult = await errors.try(db.delete(schema.niceCourses).where(eq(schema.niceCourses.id, course.id)))
			if (deleteResult.error) {
				logger.error("failed to delete course", { courseId: course.id, error: deleteResult.error })
				clack.log.error(`failed to delete course: ${course.slug}`)
			} else {
				clack.log.success(`deleted course: ${course.slug}`)
			}
		} else {
			clack.log.info(`skipped: ${course.slug}`)
		}
	}

	// Find custom videos (paths starting with /math/math-academy-*-ccss-coverage/)
	console.log("\n")
	clack.log.info("searching for custom videos in frankenstein courses...")

	const customVideosResult = await errors.try(
		db
			.select({
				id: schema.niceVideos.id,
				title: schema.niceVideos.title,
				slug: schema.niceVideos.slug,
				path: schema.niceVideos.path,
				youtubeId: schema.niceVideos.youtubeId
			})
			.from(schema.niceVideos)
			.where(like(schema.niceVideos.path, "/math/math-academy-%-ccss-coverage/%"))
	)

	if (customVideosResult.error) {
		logger.error("failed to query custom videos", { error: customVideosResult.error })
		throw errors.wrap(customVideosResult.error, "query custom videos")
	}

	if (customVideosResult.data.length === 0) {
		clack.outro("cleanup complete - no custom videos found")
		process.exit(0)
	}

	clack.log.info(`found ${customVideosResult.data.length} custom videos`)

	for (const video of customVideosResult.data) {
		console.log(`\n🎥 ${video.title}`)
		console.log(`   id: ${video.id}`)
		console.log(`   youtubeId: ${video.youtubeId}`)
		console.log(`   path: ${video.path}`)

		const shouldDeleteVideo = await clack.confirm({
			message: `delete this custom video?`
		})

		if (clack.isCancel(shouldDeleteVideo)) {
			clack.cancel("operation cancelled")
			process.exit(0)
		}

		if (shouldDeleteVideo) {
			const deleteVideoResult = await errors.try(db.delete(schema.niceVideos).where(eq(schema.niceVideos.id, video.id)))
			if (deleteVideoResult.error) {
				logger.error("failed to delete video", { videoId: video.id, error: deleteVideoResult.error })
				clack.log.error(`failed to delete video: ${video.slug}`)
			} else {
				clack.log.success(`deleted video: ${video.slug}`)
			}
		} else {
			clack.log.info(`skipped: ${video.slug}`)
		}
	}

	clack.outro("cleanup complete")
	process.exit(0)
}

const result = await errors.try(main())
if (result.error) {
	clack.log.error("cleanup script failed")
	logger.error("cleanup script failed", { error: result.error })
	process.exit(1)
}
