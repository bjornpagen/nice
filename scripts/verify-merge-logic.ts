#!/usr/bin/env bun
/**
 * Verification script to ensure the merge logic works exactly as intended
 * This validates that CC content is preferred and TX supplements gaps
 */

import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { db } from "@/db"
import { 
  niceExercises as exercises,
  niceVideos as videos,
  niceCourses as courses,
  niceUnits as units,
  niceLessons as lessons,
  niceLessonContents as lessonContents
} from "@/db/schemas/nice"
import { eq, like, or, and, inArray } from "drizzle-orm"

interface MergeVerification {
  slug: string
  inCC: boolean
  inTX: boolean
  ccLessonPath?: string
  txLessonPath?: string
  ccUnitPath?: string
  txUnitPath?: string
  selectedSource: "CC" | "TX" | "MISSING"
  mergeDecision: string
}

async function verifyMergeLogic(contentSlugs: string[]): Promise<MergeVerification[]> {
  logger.info("verifying merge logic for content", { count: contentSlugs.length })
  
  const results: MergeVerification[] = []
  
  // Check each slug in both courses
  for (const slug of contentSlugs) {
    // Check exercises
    const ccExercise = await db.select({
      lessonPath: lessons.path,
      unitPath: units.path
    })
    .from(exercises)
    .innerJoin(lessonContents, eq(lessonContents.contentId, exercises.id))
    .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
    .innerJoin(units, eq(units.id, lessons.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(exercises.slug, slug),
        like(courses.path, "%/cc-eighth-grade-math%")
      )
    )
    .limit(1)
    
    const txExercise = await db.select({
      lessonPath: lessons.path,
      unitPath: units.path
    })
    .from(exercises)
    .innerJoin(lessonContents, eq(lessonContents.contentId, exercises.id))
    .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
    .innerJoin(units, eq(units.id, lessons.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(exercises.slug, slug),
        like(courses.path, "%/grade-8-math-tx%")
      )
    )
    .limit(1)
    
    // Check videos
    const ccVideo = await db.select({
      lessonPath: lessons.path,
      unitPath: units.path
    })
    .from(videos)
    .innerJoin(lessonContents, eq(lessonContents.contentId, videos.id))
    .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
    .innerJoin(units, eq(units.id, lessons.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(videos.slug, slug),
        like(courses.path, "%/cc-eighth-grade-math%")
      )
    )
    .limit(1)
    
    const txVideo = await db.select({
      lessonPath: lessons.path,
      unitPath: units.path
    })
    .from(videos)
    .innerJoin(lessonContents, eq(lessonContents.contentId, videos.id))
    .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
    .innerJoin(units, eq(units.id, lessons.unitId))
    .innerJoin(courses, eq(courses.id, units.courseId))
    .where(
      and(
        eq(videos.slug, slug),
        like(courses.path, "%/grade-8-math-tx%")
      )
    )
    .limit(1)
    
    // Determine presence in each course
    const inCC = ccExercise.length > 0 || ccVideo.length > 0
    const inTX = txExercise.length > 0 || txVideo.length > 0
    
    // Apply merge logic
    let selectedSource: "CC" | "TX" | "MISSING" = "MISSING"
    let mergeDecision = ""
    
    if (inCC && inTX) {
      selectedSource = "CC"
      mergeDecision = "Content exists in both courses - selecting CC version"
    } else if (inCC) {
      selectedSource = "CC"
      mergeDecision = "Content only in CC course"
    } else if (inTX) {
      selectedSource = "TX"
      mergeDecision = "Content only in TX course - using as supplement"
    } else {
      selectedSource = "MISSING"
      mergeDecision = "Content not found in either course"
    }
    
    results.push({
      slug,
      inCC,
      inTX,
      ccLessonPath: ccExercise[0]?.lessonPath || ccVideo[0]?.lessonPath,
      txLessonPath: txExercise[0]?.lessonPath || txVideo[0]?.lessonPath,
      ccUnitPath: ccExercise[0]?.unitPath || ccVideo[0]?.unitPath,
      txUnitPath: txExercise[0]?.unitPath || txVideo[0]?.unitPath,
      selectedSource,
      mergeDecision
    })
  }
  
  return results
}

async function main() {
  // Test with specific known cases
  const testSlugs = [
    // Should be CC only
    "writing-fractions-as-repeating-decimals",
    "pythagorean_theorem_1",
    
    // Should be TX only  
    "algebraic-rules-for-transformations",
    "simple-and-compound-interest",
    
    // Should prefer CC if in both
    "cylinder-volume-formula",
    "representing-dilations-algebraically-k-greater-than-1"
  ]
  
  const verificationResult = await errors.try(verifyMergeLogic(testSlugs))
  if (verificationResult.error) {
    logger.error("verification failed", { error: verificationResult.error })
    process.exit(1)
  }
  
  // Analyze results
  console.log("\n=== MERGE LOGIC VERIFICATION ===\n")
  
  for (const result of verificationResult.data) {
    console.log(`Slug: ${result.slug}`)
    console.log(`  In CC: ${result.inCC} ${result.ccLessonPath ? `(${result.ccLessonPath})` : ""}`)
    console.log(`  In TX: ${result.inTX} ${result.txLessonPath ? `(${result.txLessonPath})` : ""}`)
    console.log(`  Selected: ${result.selectedSource}`)
    console.log(`  Decision: ${result.mergeDecision}`)
    console.log("")
  }
  
  // Summary statistics
  const ccCount = verificationResult.data.filter(r => r.selectedSource === "CC").length
  const txCount = verificationResult.data.filter(r => r.selectedSource === "TX").length
  const missingCount = verificationResult.data.filter(r => r.selectedSource === "MISSING").length
  
  console.log("=== SUMMARY ===")
  console.log(`CC selected: ${ccCount}`)
  console.log(`TX selected: ${txCount}`)
  console.log(`Missing: ${missingCount}`)
  
  // Verify merge rules
  const violations: string[] = []
  for (const result of verificationResult.data) {
    if (result.inCC && result.inTX && result.selectedSource !== "CC") {
      violations.push(`VIOLATION: ${result.slug} exists in both but didn't select CC`)
    }
    if (!result.inCC && result.inTX && result.selectedSource !== "TX") {
      violations.push(`VIOLATION: ${result.slug} only in TX but wasn't selected`)
    }
  }
  
  if (violations.length > 0) {
    console.log("\n⚠️  MERGE LOGIC VIOLATIONS DETECTED:")
    violations.forEach(v => console.log(`  - ${v}`))
  } else {
    console.log("\n✅ All merge rules verified successfully!")
  }
}

const result = await errors.try(main())
if (result.error) {
  logger.error("script failed", { error: result.error })
  process.exit(1)
}
