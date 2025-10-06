#!/usr/bin/env bun
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

logger.setDefaultLogLevel(logger.INFO)

async function main(): Promise<void> {
	console.log("\n🔍 oneroster api diagnostic tool\n")

	// Test 1: Try to get a specific course from our frankenstein course
	console.log("test 1: fetching specific course (math-academy-6th-ccss-coverage)...")
	const courseId = "nice_x424b439c9356cd2f"
	const specificCourseResult = await errors.try(oneroster.getCourse(courseId))
	if (specificCourseResult.error) {
		console.log("❌ failed to fetch specific course")
		logger.error("get specific course failed", { courseId, error: specificCourseResult.error })
	} else {
		if (!specificCourseResult.data) {
			console.log("❌ course data is undefined")
		} else {
			console.log(`✅ successfully fetched course: ${specificCourseResult.data.title}`)
		}
	}

	// Test 2: Try to get a specific resource
	console.log("\ntest 2: fetching a resource (nice_1811)...")
	const resourceId = "nice_1811"
	const resourceResult = await errors.try(oneroster.getResource(resourceId))
	if (resourceResult.error) {
		console.log("❌ resource does not exist")
		logger.error("get resource failed", { resourceId, error: resourceResult.error })
	} else {
		if (!resourceResult.data) {
			console.log("❌ resource data is undefined")
		} else {
			console.log(`✅ resource exists: ${resourceResult.data.title}`)
		}
	}

	// Test 3: Check if a successfully uploaded component exists
	console.log("\ntest 3: checking if unit component exists...")
	const unitComponentId = "nice_xf29b804f4f0b91a5"
	const componentResult = await errors.try(oneroster.getCourseComponent(unitComponentId))
	if (componentResult.error) {
		console.log("❌ unit component does not exist")
		logger.error("get component failed", { componentId: unitComponentId, error: componentResult.error })
	} else {
		if (!componentResult.data) {
			console.log("❌ component data is undefined")
		} else {
			console.log(`✅ unit component exists: ${componentResult.data.title}`)
		}
	}

	// Test 4: Try to UPDATE a resource that already exists (non-destructive PUT test)
	console.log("\ntest 4: testing PUT on existing resource (nice_1811)...")
	console.log("   (this will re-upload the same data, safe to test)")

	if (resourceResult.error || !resourceResult.data) {
		console.log("⏭️  skipping PUT test - resource doesn't exist")
	} else {
		const existingResource = resourceResult.data
		const updateResult = await errors.try(oneroster.updateResource(resourceId, existingResource))
		if (updateResult.error) {
			console.log("❌ PUT request failed")
			logger.error("update resource failed", { resourceId, error: updateResult.error })
		} else {
			console.log("✅ PUT request succeeded")
		}
	}

	// Test 5: Try to CREATE a new test resource via POST
	console.log("\ntest 5: testing POST to create a new test resource...")
	console.log("   (creating a dummy resource for testing)")

	const testResource = {
		sourcedId: "nice_test_diagnostic_resource",
		status: "active" as const,
		title: "Diagnostic Test Resource",
		vendorResourceId: "nice-academy-diagnostic-test",
		vendorId: "superbuilders",
		applicationId: "nice",
		roles: ["primary"],
		importance: "primary" as const,
		metadata: {
			type: "interactive",
			toolProvider: "Nice Academy",
			khanActivityType: "Exercise",
			khanId: "test-diagnostic",
			khanSlug: "test-diagnostic",
			khanTitle: "Test Diagnostic",
			khanDescription: "Diagnostic test resource",
			xp: 1
		}
	}

	const createResult = await errors.try(oneroster.createResource(testResource))
	if (createResult.error) {
		console.log("❌ POST request failed")
		logger.error("create resource failed", { error: createResult.error })
	} else {
		console.log("✅ POST request succeeded")
		console.log("   (created resource: nice_test_diagnostic_resource)")
	}

	// Test 6: Try to POST the same resource again to see if it overwrites or errors
	console.log("\ntest 6: testing POST on same resource again (checking overwrite behavior)...")

	const createAgainResult = await errors.try(oneroster.createResource(testResource))
	if (createAgainResult.error) {
		console.log("❌ second POST failed (resource already exists)")
		logger.error("second create failed", { error: createAgainResult.error })
	} else {
		console.log("✅ second POST succeeded (api allows overwrite via POST)")
	}

	// Test 7: Verify the test resource was actually created
	console.log("\ntest 7: verifying test resource exists via GET...")
	const verifyResult = await errors.try(oneroster.getResource("nice_test_diagnostic_resource"))
	if (verifyResult.error) {
		console.log("❌ test resource does not exist (POST claimed success but didn't create)")
		logger.error("verify test resource failed", { error: verifyResult.error })
	} else {
		if (!verifyResult.data) {
			console.log("❌ resource data is undefined")
		} else {
			console.log(`✅ test resource exists: ${verifyResult.data.title}`)
		}
	}

	// Test 8: Test PUT on course (check if issue is resource-specific)
	console.log("\ntest 8: testing PUT on course (checking if issue is resource-specific)...")
	if (specificCourseResult.error || !specificCourseResult.data || !specificCourseResult.data.academicSession) {
		console.log("⏭️  skipping course PUT test - course doesn't exist or missing data")
	} else {
		// Convert GET response to PUT payload (add required 'type' fields, filter null metadata)
		const courseForUpdate = {
			...specificCourseResult.data,
			org: {
				sourcedId: specificCourseResult.data.org.sourcedId,
				type: "district" as const
			},
			academicSession: {
				sourcedId: specificCourseResult.data.academicSession.sourcedId,
				type: "term" as const
			},
			metadata: specificCourseResult.data.metadata || undefined
		}
		const courseUpdateResult = await errors.try(oneroster.updateCourse(courseId, courseForUpdate))
		if (courseUpdateResult.error) {
			console.log("❌ course PUT failed")
			logger.error("update course failed", { courseId, error: courseUpdateResult.error })
		} else {
			console.log("✅ course PUT succeeded (issue is resource-specific)")
		}
	}

	// Test 9: Test component resource GET to see if those uploaded
	console.log("\ntest 9: checking if component-resource uploaded...")
	const testComponentResourceId = "nice_x17f6e46f003d25f6_1811"
	const crResult = await errors.try(oneroster.getComponentResource(testComponentResourceId))
	if (crResult.error) {
		console.log("❌ component-resource does not exist")
		logger.error("get component-resource failed", { componentResourceId: testComponentResourceId, error: crResult.error })
	} else {
		if (!crResult.data) {
			console.log("❌ component-resource data is undefined")
		} else {
			console.log(`✅ component-resource exists: ${crResult.data.title}`)
		}
	}

	// Test 10: Create a dummy course to test DELETE
	console.log("\ntest 10: creating dummy course for delete test...")
	const dummyCourse = {
		sourcedId: "nice_test_diagnostic_course",
		status: "active" as const,
		title: "Diagnostic Test Course",
		subjects: ["Math"],
		grades: [],
		courseCode: "test-diagnostic-course",
		org: { sourcedId: "f251f08b-61de-4ffa-8ff3-3e56e1d75a60", type: "district" as const },
		academicSession: { sourcedId: "Academic_Year_2025-2026", type: "term" as const },
		metadata: {
			timebackVisible: "true",
			primaryApp: "nice_academy"
		}
	}

	const createCourseResult = await errors.try(oneroster.createCourse(dummyCourse))
	if (createCourseResult.error) {
		console.log("❌ failed to create dummy course")
		logger.error("create course failed", { error: createCourseResult.error })
	} else {
		console.log("✅ dummy course created")

		// Test 11: Verify it exists
		console.log("\ntest 11: verifying dummy course exists...")
		const verifyCourseResult = await errors.try(oneroster.getCourse("nice_test_diagnostic_course"))
		if (verifyCourseResult.error) {
			console.log("❌ dummy course doesn't exist (POST lied)")
			logger.error("verify course failed", { error: verifyCourseResult.error })
		} else {
			console.log(`✅ dummy course verified: ${verifyCourseResult.data?.title || "no title"}`)

			// Test 12: Try to DELETE the dummy course
			console.log("\ntest 12: deleting dummy course...")
			const deleteCourseResult = await errors.try(oneroster.deleteCourse("nice_test_diagnostic_course"))
			if (deleteCourseResult.error) {
				console.log("❌ DELETE failed")
				logger.error("delete course failed", { error: deleteCourseResult.error })
			} else {
				console.log("✅ DELETE succeeded")

				// Test 13: Verify it's soft-deleted
				console.log("\ntest 13: checking course status after delete...")
				const afterDeleteResult = await errors.try(oneroster.getCourse("nice_test_diagnostic_course"))
				if (afterDeleteResult.error) {
					console.log("⚠️  course not found after delete (might be hard delete)")
					logger.error("get course after delete failed", { error: afterDeleteResult.error })
				} else {
					const status = afterDeleteResult.data?.status
					if (status === "tobedeleted") {
						console.log("✅ soft delete confirmed (status = tobedeleted)")
					} else {
						console.log(`⚠️  unexpected status: ${status}`)
					}
				}
			}
		}
	}

	// Test 14: Delete the test resource and try to re-POST
	console.log("\ntest 14: deleting test resource (nice_test_diagnostic_resource)...")
	const deleteResourceResult = await errors.try(oneroster.deleteResource("nice_test_diagnostic_resource"))
	if (deleteResourceResult.error) {
		console.log("❌ DELETE resource failed")
		logger.error("delete resource failed", { error: deleteResourceResult.error })
	} else {
		console.log("✅ DELETE resource succeeded")

		// Test 15: Verify it's soft-deleted
		console.log("\ntest 15: checking resource status after delete...")
		const afterDeleteResourceResult = await errors.try(oneroster.getResource("nice_test_diagnostic_resource"))
		if (afterDeleteResourceResult.error) {
			console.log("⚠️  resource not found after delete")
			logger.error("get resource after delete failed", { error: afterDeleteResourceResult.error })
		} else {
			const status = afterDeleteResourceResult.data?.status
			if (status === "tobedeleted") {
				console.log("✅ resource soft-deleted (status = tobedeleted)")
			} else {
				console.log(`⚠️  unexpected status: ${status}`)
			}

			// Test 16: Try to POST the same resource again after soft-delete
			console.log("\ntest 16: attempting POST after soft-delete (same sourcedId)...")
			const rePostResult = await errors.try(oneroster.createResource(testResource))
			if (rePostResult.error) {
				console.log("❌ re-POST after delete failed")
				logger.error("re-post after delete failed", { error: rePostResult.error })
			} else {
				console.log("✅ re-POST succeeded (can recreate after soft-delete)")

				// Test 17: Verify it's active again
				console.log("\ntest 17: verifying re-POSTed resource is active...")
				const verifyRepostResult = await errors.try(oneroster.getResource("nice_test_diagnostic_resource"))
				if (verifyRepostResult.error) {
					console.log("❌ re-POSTed resource doesn't exist")
				} else {
					const newStatus = verifyRepostResult.data?.status
					if (newStatus === "active") {
						console.log("✅ re-POSTed resource is active")
					} else {
						console.log(`⚠️  unexpected status after re-POST: ${newStatus}`)
					}
				}
			}
		}
	}

	console.log("\n✨ diagnostic complete\n")
	console.log("summary:")
	console.log("  - GET operations: ✅ working")
	console.log("  - POST /courses: ✅ working")
	console.log("  - POST /resources (new): ✅ working")
	console.log("  - PUT /resources: ❌ broken (500 errors)")
	console.log("  - POST /resources (duplicate): ❌ broken (404 'already exists')")
	console.log("  - DELETE /courses: ✅ working (soft delete)")
	console.log("  - DELETE /resources: (check test 14-17)")
	console.log("  - re-POST after DELETE: (check test 16-17)")
	console.log("\nconclusion: resource UPDATE is broken, DELETE+POST workflow may be viable")
	console.log("")
}

const result = await errors.try(main())
if (result.error) {
	console.log("\n💥 diagnostic failed\n")
	logger.error("diagnostic script failed", { error: result.error })
	process.exit(1)
}
