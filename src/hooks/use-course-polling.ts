"use client"

import { useUser } from "@clerk/nextjs"
import * as React from "react"
import * as logger from "@superbuilders/slog"
import * as errors from "@superbuilders/errors"
import { ClerkUserPublicMetadataSchema } from "@/lib/metadata/clerk"

interface UseCoursePolllingOptions<T> {
	interval?: number // milliseconds, default 5 minutes
	onUpdate?: (data: T) => void // callback with fresh data when courses updated
	onError?: (error: Error) => void // callback when polling fails
	enabled?: boolean // whether polling is active
	pollFn?: () => Promise<T> // server action or async function to call
}

export function useCoursePolling<T = void>(options: UseCoursePolllingOptions<T> = {}) {
	const { interval = 5 * 60 * 1000, onUpdate, onError, enabled = true, pollFn } = options
	const { user, isLoaded } = useUser()

	React.useEffect(() => {
		if (!enabled || !isLoaded || !user) return

		const pollCourses = async () => {
			const metadataValidation = ClerkUserPublicMetadataSchema.safeParse(user.publicMetadata)
			if (!metadataValidation.success || !metadataValidation.data.sourceId) {
				logger.debug("skipping course poll: no sourceId", { userId: user.id })
				return
			}

			// Skip polling for non-students (teachers, admins, etc.)
			// Course progression is only relevant for students
			const roles = metadataValidation.data.roles
			const rolesNormalized = roles
				.map((r) => (r.role ?? r.roleType ?? "").toLowerCase())
				.filter((r) => r.length > 0)
			const hasNonStudentRole = rolesNormalized.some((r) => r !== "student")
			if (hasNonStudentRole) {
				logger.debug("skipping course poll: non-student user", { userId: user.id, roles: rolesNormalized })
				return
			}

		// reload user metadata from clerk first
		const reloadResult = await errors.try(user.reload())
		if (reloadResult.error) {
			logger.error("failed to reload user metadata", { error: reloadResult.error, userId: user.id })
			onError?.(reloadResult.error)
			return
		}

		// call the server action if provided
		if (pollFn) {
			const pollResult = await errors.try(pollFn())
			if (pollResult.error) {
				logger.error("course poll failed", { error: pollResult.error, userId: user.id })
				onError?.(pollResult.error)
				return
			}

			logger.debug("polled user courses", { userId: user.id })
			onUpdate?.(pollResult.data)
		} else {
			logger.debug("reloaded user metadata", { userId: user.id })
			onUpdate?.(undefined as T)
		}
		}

		// initial check
		void pollCourses()

		// set up interval
		const intervalId = setInterval(() => {
			void pollCourses()
		}, interval)

		return () => clearInterval(intervalId)
	}, [enabled, isLoaded, user, interval, onUpdate, onError, pollFn])
}

