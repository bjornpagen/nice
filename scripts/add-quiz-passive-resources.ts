/**
 * INC-322: Add nice_passiveResources metadata to Quiz 2 in Middle School Physics
 *
 * This script updates Quiz 2 (nice_x26836eafab5a20c2) to include passive resources
 * that should be banked when the quiz is completed:
 * - Human Eye video: nice_xfc42b42c0d31223c
 * - Activity article: nice_xbe5545e5ec99ff9d
 *
 * Usage: bun run scripts/add-quiz-passive-resources.ts [--dry-run]
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"
import { getResource } from "@/lib/oneroster/redis/api"

const QUIZ_2_ID = "nice_x26836eafab5a20c2"
const PASSIVE_RESOURCES = [
    "nice_xfc42b42c0d31223c", // Human Eye video
    "nice_xbe5545e5ec99ff9d"  // Activity: How can light interactions be used to create art?
]

async function main() {
    const isDryRun = process.argv.includes("--dry-run")

    logger.info("fetching quiz 2 resource", { resourceId: QUIZ_2_ID })

    // 1. Fetch current resource
    const resourceResult = await errors.try(getResource(QUIZ_2_ID))
    if (resourceResult.error) {
        logger.error("failed to fetch quiz 2", { error: resourceResult.error })
        process.exit(1)
    }

    const resource = resourceResult.data
    if (!resource) {
        logger.error("quiz 2 not found", { resourceId: QUIZ_2_ID })
        process.exit(1)
    }

    logger.info("found quiz 2", {
        title: resource.title,
        currentMetadata: resource.metadata
    })

    // 2. Check if already has passive resources
    const existingPassive = resource.metadata?.nice_passiveResources
    if (existingPassive && Array.isArray(existingPassive) && existingPassive.length > 0) {
        logger.warn("quiz 2 already has nice_passiveResources", {
            existing: existingPassive
        })
        console.log("\nQuiz 2 already has passive resources configured:")
        console.log(JSON.stringify(existingPassive, null, 2))
        process.exit(0)
    }

    // 3. Build updated resource payload
    const updatedMetadata = {
        ...resource.metadata,
        nice_passiveResources: PASSIVE_RESOURCES
    }

    const updatePayload = {
        sourcedId: resource.sourcedId,
        status: resource.status as "active" | "tobedeleted",
        title: resource.title,
        vendorResourceId: resource.vendorResourceId,
        vendorId: resource.vendorId,
        applicationId: resource.applicationId,
        roles: resource.roles,
        importance: resource.importance as "primary" | "secondary",
        metadata: updatedMetadata
    }

    console.log("\nUpdate payload:")
    console.log(JSON.stringify({
        ...updatePayload,
        metadata: {
            ...updatedMetadata,
            nice_passiveResources: PASSIVE_RESOURCES
        }
    }, null, 2))

    if (isDryRun) {
        logger.info("dry run - skipping actual update")
        console.log("\n[DRY RUN] Would update Quiz 2 with passive resources:")
        console.log(JSON.stringify(PASSIVE_RESOURCES, null, 2))
        process.exit(0)
    }

    // 4. Update resource
    logger.info("updating quiz 2 with passive resources", {
        resourceId: QUIZ_2_ID,
        passiveResources: PASSIVE_RESOURCES
    })

    const updateResult = await errors.try(
        oneroster.updateResource(QUIZ_2_ID, updatePayload)
    )

    if (updateResult.error) {
        logger.error("failed to update quiz 2", { error: updateResult.error })
        process.exit(1)
    }

    logger.info("successfully updated quiz 2 with passive resources", {
        resourceId: QUIZ_2_ID,
        passiveResources: PASSIVE_RESOURCES
    })

    console.log("\n✓ Quiz 2 updated successfully!")
    console.log("Passive resources added:")
    for (const id of PASSIVE_RESOURCES) {
        console.log(`  - ${id}`)
    }
}

main().catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
})
