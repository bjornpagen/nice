#!/usr/bin/env bun
/**
 * Script to analyze Khan Academy content coverage for grades 4-8
 * Compares exercises and videos from CSV against database
 * Groups content by lessons
 * 
 * Usage: bun run scripts/analyze-khan-coverage.ts --4
 *        bun run scripts/analyze-khan-coverage.ts --5
 *        bun run scripts/analyze-khan-coverage.ts --6
 *        bun run scripts/analyze-khan-coverage.ts --7
 *        bun run scripts/analyze-khan-coverage.ts --8
 */

import { parse } from "csv-parse/sync"
import { eq, like, or, and, inArray } from "drizzle-orm"
import fs from "fs"
import path from "path"
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

// Grade configuration
interface GradeConfig {
  grade: number
  gradeOrdinal: string  // "4th", "5th", etc
  csvFile: string
  reportFile: string
  ccCoursePath: string
  txCoursePath: string
  exerciseColumnName: string  // "Khan Academy Exercise Name" or "Khan Academy Lesson Name"
  ixlColumnName: string
  courseId: string
  courseTitle: string
}

const GRADE_CONFIGS: Record<string, GradeConfig> = {
  "4": {
    grade: 4,
    gradeOrdinal: "4th",
    csvFile: "grade4-math-academy-ccss-coverage-plan.csv",
    reportFile: "khan-coverage-report-4th.md",
    ccCoursePath: "%/cc-fourth-grade-math%",
    txCoursePath: "%/grade-4-math-tx%",
    exerciseColumnName: "Khan Academy Lesson Name",
    ixlColumnName: "Corresponding IXL Lesson from G4 Skill Plan",
    courseId: "unified-4th-grade",
    courseTitle: "4th Grade Math (Combined CC & TX)"
  },
  "5": {
    grade: 5,
    gradeOrdinal: "5th",
    csvFile: "grade5-math-academy-ccss-coverage-plan.csv",
    reportFile: "khan-coverage-report-5th.md",
    ccCoursePath: "%/cc-fifth-grade-math%",
    txCoursePath: "%/grade-5-math-tx%",
    exerciseColumnName: "Khan Academy Lesson Name",
    ixlColumnName: "Corresponding IXL Lesson from G5 Skill Plan",
    courseId: "unified-5th-grade",
    courseTitle: "5th Grade Math (Combined CC & TX)"
  },
  "6": {
    grade: 6,
    gradeOrdinal: "6th",
    csvFile: "grade6-math-academy-ccss-coverage-plan.csv",
    reportFile: "khan-coverage-report-6th.md",
    ccCoursePath: "%/cc-sixth-grade-math%",
    txCoursePath: "%/grade-6-math-tx%",
    exerciseColumnName: "Khan Academy Lesson Name",
    ixlColumnName: "Corresponding IXL Lesson from G6 Skill Plan",
    courseId: "unified-6th-grade",
    courseTitle: "6th Grade Math (Combined CC & TX)"
  },
  "7": {
    grade: 7,
    gradeOrdinal: "7th",
    csvFile: "grade7-math-academy-ccss-coverage-plan.csv",
    reportFile: "khan-coverage-report-7th.md",
    ccCoursePath: "%/cc-seventh-grade-math%",
    txCoursePath: "%/grade-7-math-tx%",
    exerciseColumnName: "Khan Academy Exercise Name",
    ixlColumnName: "Corresponding IXL Lesson from G7 Skill Plan",
    courseId: "unified-7th-grade",
    courseTitle: "7th Grade Math (Combined CC & TX)"
  },
  "8": {
    grade: 8,
    gradeOrdinal: "8th",
    csvFile: "grade8-math-academy-ccss-coverage-plan.csv",
    reportFile: "khan-coverage-report-8th.md",
    ccCoursePath: "%/cc-eighth-grade-math%",
    txCoursePath: "%/grade-8-math-tx%",
    exerciseColumnName: "Khan Academy Exercise Name",
    ixlColumnName: "Corresponding IXL Lesson from G8 Skill Plan",
    courseId: "unified-8th-grade",
    courseTitle: "8th Grade Math (Combined CC & TX)"
  }
}

interface CSVRow {
  Standard: string
  [key: string]: string  // Allow dynamic column names
}

interface ContentItem {
  slug: string
  url: string
  title: string
  standard: string
  csvIndex?: number
  source?: string // CC or TX
  id?: string // Database ID
}

interface ContentWithCourse {
  slug: string
  title: string
  id: string // Content ID
  courseId: string
  courseTitle: string
  coursePath: string
}

interface CourseContent {
  ccContent: Map<string, ContentWithCourse>
  txContent: Map<string, ContentWithCourse>
}

interface LessonGrouping {
  lessonId: string
  lessonTitle: string
  lessonPath: string
  unitTitle: string
  courseTitle: string
  coursePath: string
  content: ContentItem[] // All content in CSV order
  csvOrder: number // To maintain CSV order
}

interface UnitGrouping {
  unitId: string
  unitTitle: string
  unitPath: string
  lessons: LessonGrouping[]
  csvOrder: number // To maintain CSV order
}

interface CourseGrouping {
  courseId: string
  courseTitle: string
  coursePath: string
  units: UnitGrouping[]
  csvOrder: number // To maintain CSV order
}

interface AnalysisResult {
  exercisesInCSV: ContentItem[]
  videosInCSV: ContentItem[]
  exercisesInDB: Set<string>
  videosInDB: Set<string>
  missingExercises: ContentItem[]
  missingVideos: ContentItem[]
  foundExercises: ContentItem[]
  foundVideos: ContentItem[]
  exerciseCourseContent: CourseContent
  videoCourseContent: CourseContent
  lessonGroupings: LessonGrouping[]
  courseGroupings: CourseGrouping[]
}

function extractSlugFromUrl(url: string, type: "exercise" | "video", skipYouTube: boolean = false): string | null {
  if (!url || url === "") return null
  
  // Handle YouTube links if needed (for 6th grade)
  if (skipYouTube && (url.includes("youtu.be") || url.includes("youtube.com"))) {
    logger.debug("skipping YouTube link", { url })
    return null
  }
  
  const marker = type === "exercise" ? "/e/" : "/v/"
  const parts = url.split(marker)
  if (parts.length < 2) return null
  
  // Get everything after the marker
  const slugPart = parts[1]
  if (!slugPart) return null
  // Remove any query parameters or hash
  const slug = slugPart.split(/[?#]/)[0]
  
  return slug || null
}

function parseVideoLinks(videoLink: string, skipYouTube: boolean = false): string[] {
  // Handle multiple video links (some cells have numbered links)
  const links: string[] = []
  
  // Skip YouTube links if needed (for 6th grade)
  if (skipYouTube && (videoLink.includes("youtu.be") || videoLink.includes("youtube.com"))) {
    return []
  }
  
  // Split by newlines first (in case multiple URLs are on different lines)
  const lines = videoLink.split("\n")
  
  for (const line of lines) {
    // Extract URLs from numbered format like "1 - https://..." or just plain URLs
    const urlMatch = line.match(/https?:\/\/[^\s]+/)
    if (urlMatch && (!skipYouTube || !urlMatch[0].includes("youtu"))) {
      links.push(urlMatch[0])
    }
  }
  
  return links
}

// For 5th grade, also handle multiple exercise URLs
function parseMultipleUrls(cellContent: string): string[] {
  // Handle cells with multiple URLs (separated by newlines or just multiple URLs in text)
  const urls: string[] = []
  
  // Split by newlines first
  const lines = cellContent.split(/[\n\r]+/)
  
  for (const line of lines) {
    // Extract all URLs from the line
    const urlMatches = line.matchAll(/https?:\/\/[^\s]+/g)
    for (const match of urlMatches) {
      urls.push(match[0])
    }
  }
  
  return urls
}

async function fetchLessonGroupings(contentItems: ContentItem[], config: GradeConfig): Promise<{
  lessonGroupings: Map<string, LessonGrouping>,
  courseGroupings: CourseGrouping[]
}> {
  logger.info("fetching lesson groupings for content")
  
  // Get all unique slugs
  const allSlugs = contentItems.map(item => item.slug)
  const uniqueSlugs = [...new Set(allSlugs)]
  
  // Fetch lesson information for exercises
  const exerciseSlugs = contentItems.filter(item => item.url.includes("/e/")).map(item => item.slug)
  const videoSlugs = contentItems.filter(item => item.url.includes("/v/")).map(item => item.slug)
  
  // Query for exercises with their lesson information
  const exerciseLessons = exerciseSlugs.length > 0 ? await db.select({
    contentId: exercises.id,
    contentSlug: exercises.slug,
    contentTitle: exercises.title,
    lessonId: lessons.id,
    lessonTitle: lessons.title,
    lessonPath: lessons.path,
    unitId: units.id,
    unitTitle: units.title,
    unitPath: units.path,
    courseId: courses.id,
    courseTitle: courses.title,
    coursePath: courses.path
  })
  .from(exercises)
  .innerJoin(lessonContents, eq(lessonContents.contentId, exercises.id))
  .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
  .innerJoin(units, eq(units.id, lessons.unitId))
  .innerJoin(courses, eq(courses.id, units.courseId))
  .where(
    and(
      inArray(exercises.slug, exerciseSlugs),
      or(
        like(courses.path, config.ccCoursePath),
        like(courses.path, config.txCoursePath)
      )
    )
  ) : []
  
  // Query for videos with their lesson information
  const videoLessons = videoSlugs.length > 0 ? await db.select({
    contentId: videos.id,
    contentSlug: videos.slug,
    contentTitle: videos.title,
    lessonId: lessons.id,
    lessonTitle: lessons.title,
    lessonPath: lessons.path,
    unitId: units.id,
    unitTitle: units.title,
    unitPath: units.path,
    courseId: courses.id,
    courseTitle: courses.title,
    coursePath: courses.path
  })
  .from(videos)
  .innerJoin(lessonContents, eq(lessonContents.contentId, videos.id))
  .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
  .innerJoin(units, eq(units.id, lessons.unitId))
  .innerJoin(courses, eq(courses.id, units.courseId))
  .where(
    and(
      inArray(videos.slug, videoSlugs),
      or(
        like(courses.path, config.ccCoursePath),
        like(courses.path, config.txCoursePath)
      )
    )
  ) : []
  
  // Create a map of content slug to lesson info, storing all matching entries
  const contentToLessons = new Map<string, any[]>()
  
  for (const row of exerciseLessons) {
    if (!contentToLessons.has(row.contentSlug)) {
      contentToLessons.set(row.contentSlug, [])
    }
    contentToLessons.get(row.contentSlug)!.push(row)
  }
  
  for (const row of videoLessons) {
    if (!contentToLessons.has(row.contentSlug)) {
      contentToLessons.set(row.contentSlug, [])
    }
    contentToLessons.get(row.contentSlug)!.push(row)
  }
  
  // Group content by lesson (merged across courses)
  const lessonGroups = new Map<string, LessonGrouping>()
  
  for (const item of contentItems) {
    const lessonInfos = contentToLessons.get(item.slug) || []
    if (lessonInfos.length > 0) {
      // Prefer CC over TX for lesson placement
      const ccPathPattern = config.ccCoursePath.replace("%", "")
      const lessonInfo = lessonInfos.find(l => l.coursePath.includes(ccPathPattern)) || lessonInfos[0]
      
      // Key by lesson path only (not course) to merge across courses
      const lessonKey = lessonInfo.lessonPath
      
      if (!lessonGroups.has(lessonKey)) {
        lessonGroups.set(lessonKey, {
          lessonId: lessonInfo.lessonId,
          lessonTitle: lessonInfo.lessonTitle,
          lessonPath: lessonInfo.lessonPath,
          unitTitle: lessonInfo.unitTitle,
          courseTitle: lessonInfo.courseTitle,
          coursePath: lessonInfo.coursePath,
          content: [],
          csvOrder: item.csvIndex || 0
        })
      }
      
      const group = lessonGroups.get(lessonKey)!
      // Update csvOrder to be the minimum index (to maintain first appearance order)
      group.csvOrder = Math.min(group.csvOrder, item.csvIndex || 999999)
      
      // Add the content item (source should already be set)
      group.content.push(item)
    }
  }
  
  // Now organize lessons into units (merged across courses)
  const unitMap = new Map<string, UnitGrouping>()
  
  for (const [lessonKey, lesson] of lessonGroups) {
    const firstContentSlug = lesson.content[0]?.slug
    if (!firstContentSlug) continue
    const lessonInfos = contentToLessons.get(firstContentSlug) || []
    if (lessonInfos.length === 0) continue
    
    // Use the preferred lesson info (CC over TX)
    const ccPathPattern = config.ccCoursePath.replace("%", "")
    const lessonInfo = lessonInfos.find(l => l.coursePath.includes(ccPathPattern)) || lessonInfos[0]
    
    // Key by unit path only (not course) to merge across courses
    const unitKey = lessonInfo.unitPath
    
    // Create unit if it doesn't exist
    if (!unitMap.has(unitKey)) {
      unitMap.set(unitKey, {
        unitId: lessonInfo.unitId,
        unitTitle: lessonInfo.unitTitle,
        unitPath: lessonInfo.unitPath,
        lessons: [],
        csvOrder: lesson.csvOrder
      })
    }
    
    const unit = unitMap.get(unitKey)!
    unit.csvOrder = Math.min(unit.csvOrder, lesson.csvOrder)
    
    // Add lesson to unit
    unit.lessons.push(lesson)
  }
  
  // Create a single unified course
  const unifiedCourse: CourseGrouping = {
    courseId: config.courseId,
    courseTitle: config.courseTitle,
    coursePath: "unified",
    units: Array.from(unitMap.values()),
    csvOrder: 0
  }
  
  // Sort everything by CSV order
  unifiedCourse.units.sort((a, b) => a.csvOrder - b.csvOrder)
  for (const unit of unifiedCourse.units) {
    unit.lessons.sort((a, b) => a.csvOrder - b.csvOrder)
  }
  
  logger.info("created unified lesson groupings", { 
    totalLessons: lessonGroups.size,
    totalUnits: unifiedCourse.units.length,
    totalContent: contentItems.length
  })
  
  return { lessonGroupings: lessonGroups, courseGroupings: [unifiedCourse] }
}

async function fetchContentFromDB(config: GradeConfig): Promise<{ 
  exerciseSlugs: Set<string>, 
  videoSlugs: Set<string>,
  exerciseCourseContent: CourseContent,
  videoCourseContent: CourseContent
}> {
  logger.info("fetching content from database")
  
  // Fetch CC course exercises
  const ccExercises = await db.select({
    exerciseSlug: exercises.slug,
    exerciseTitle: exercises.title,
    exercisePath: exercises.path,
    exerciseId: exercises.id,
    courseId: courses.id,
    courseTitle: courses.title,
    coursePath: courses.path
  })
  .from(exercises)
  .innerJoin(lessonContents, eq(lessonContents.contentId, exercises.id))
  .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
  .innerJoin(units, eq(units.id, lessons.unitId))
  .innerJoin(courses, eq(courses.id, units.courseId))
  .where(like(courses.path, config.ccCoursePath))
  
  // Fetch TX course exercises
  const txExercises = await db.select({
    exerciseSlug: exercises.slug,
    exerciseTitle: exercises.title,
    exercisePath: exercises.path,
    exerciseId: exercises.id,
    courseId: courses.id,
    courseTitle: courses.title,
    coursePath: courses.path
  })
  .from(exercises)
  .innerJoin(lessonContents, eq(lessonContents.contentId, exercises.id))
  .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
  .innerJoin(units, eq(units.id, lessons.unitId))
  .innerJoin(courses, eq(courses.id, units.courseId))
  .where(like(courses.path, config.txCoursePath))
  
  // Fetch CC course videos
  const ccVideos = await db.select({
    videoSlug: videos.slug,
    videoTitle: videos.title,
    videoPath: videos.path,
    videoId: videos.id,
    courseId: courses.id,
    courseTitle: courses.title,
    coursePath: courses.path
  })
  .from(videos)
  .innerJoin(lessonContents, eq(lessonContents.contentId, videos.id))
  .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
  .innerJoin(units, eq(units.id, lessons.unitId))
  .innerJoin(courses, eq(courses.id, units.courseId))
  .where(like(courses.path, config.ccCoursePath))
  
  // Fetch TX course videos
  const txVideos = await db.select({
    videoSlug: videos.slug,
    videoTitle: videos.title,
    videoPath: videos.path,
    videoId: videos.id,
    courseId: courses.id,
    courseTitle: courses.title,
    coursePath: courses.path
  })
  .from(videos)
  .innerJoin(lessonContents, eq(lessonContents.contentId, videos.id))
  .innerJoin(lessons, eq(lessons.id, lessonContents.lessonId))
  .innerJoin(units, eq(units.id, lessons.unitId))
  .innerJoin(courses, eq(courses.id, units.courseId))
  .where(like(courses.path, config.txCoursePath))
  
  logger.info("fetched content by course", {
    ccExerciseCount: ccExercises.length,
    txExerciseCount: txExercises.length,
    ccVideoCount: ccVideos.length,
    txVideoCount: txVideos.length
  })
  
  // Build maps for CC content
  const ccExerciseMap = new Map<string, ContentWithCourse>()
  for (const row of ccExercises) {
    if (!ccExerciseMap.has(row.exerciseSlug)) {
      ccExerciseMap.set(row.exerciseSlug, {
        slug: row.exerciseSlug,
        title: row.exerciseTitle,
        id: row.exerciseId,
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        coursePath: row.coursePath
      })
    }
  }
  
  const ccVideoMap = new Map<string, ContentWithCourse>()
  for (const row of ccVideos) {
    if (!ccVideoMap.has(row.videoSlug)) {
      ccVideoMap.set(row.videoSlug, {
        slug: row.videoSlug,
        title: row.videoTitle,
        id: row.videoId,
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        coursePath: row.coursePath
      })
    }
  }
  
  // Build maps for TX content
  const txExerciseMap = new Map<string, ContentWithCourse>()
  for (const row of txExercises) {
    if (!txExerciseMap.has(row.exerciseSlug)) {
      txExerciseMap.set(row.exerciseSlug, {
        slug: row.exerciseSlug,
        title: row.exerciseTitle,
        id: row.exerciseId,
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        coursePath: row.coursePath
      })
    }
  }
  
  const txVideoMap = new Map<string, ContentWithCourse>()
  for (const row of txVideos) {
    if (!txVideoMap.has(row.videoSlug)) {
      txVideoMap.set(row.videoSlug, {
        slug: row.videoSlug,
        title: row.videoTitle,
        id: row.videoId,
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        coursePath: row.coursePath
      })
    }
  }
  
  // Also fetch ALL exercises and videos for completeness check
  const [allDbExercises, allDbVideos] = await Promise.all([
    db.select({ slug: exercises.slug }).from(exercises),
    db.select({ slug: videos.slug }).from(videos)
  ])
  
  logger.info("content summary", {
    uniqueCCExercises: ccExerciseMap.size,
    uniqueTXExercises: txExerciseMap.size,
    uniqueCCVideos: ccVideoMap.size,
    uniqueTXVideos: txVideoMap.size,
    totalExercisesInDB: allDbExercises.length,
    totalVideosInDB: allDbVideos.length
  })
  
  // Create sets for quick lookup
  const exerciseSlugs = new Set(allDbExercises.map(e => e.slug))
  const videoSlugs = new Set(allDbVideos.map(v => v.slug))
  
  return { 
    exerciseSlugs, 
    videoSlugs, 
    exerciseCourseContent: {
      ccContent: ccExerciseMap,
      txContent: txExerciseMap
    },
    videoCourseContent: {
      ccContent: ccVideoMap,
      txContent: txVideoMap
    }
  }
}

async function analyzeCSV(csvPath: string, config: GradeConfig): Promise<AnalysisResult> {
  logger.info("reading CSV file", { path: csvPath })
  
  const fileContentResult = await errors.try(fs.promises.readFile(csvPath, "utf-8"))
  if (fileContentResult.error) {
    logger.error("failed to read CSV file", { error: fileContentResult.error })
    throw errors.wrap(fileContentResult.error, "csv file read")
  }
  
  const parseResult = errors.trySync(() => 
    parse(fileContentResult.data, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CSVRow[]
  )
  if (parseResult.error) {
    logger.error("failed to parse CSV", { error: parseResult.error })
    throw errors.wrap(parseResult.error, "csv parse")
  }
  
  const rows = parseResult.data
  logger.info("parsed CSV rows", { rowCount: rows.length })
  
  // Extract exercises and videos from CSV with their order
  const exercisesInCSV: ContentItem[] = []
  const videosInCSV: ContentItem[] = []
  let csvIndex = 0
  
  // Check if this is 6th grade (needs YouTube filtering)
  const skipYouTube = config.grade === 6
  
  // Check if this is 4th or 5th grade (supports multiple URLs per cell)
  const supportsMultipleUrls = config.grade === 4 || config.grade === 5
  
  for (const row of rows) {
    const rowStartIndex = csvIndex
    
    // Process video(s) first for each row - handle multiple videos per row
    if (row["Video Link"]) {
      const videoLinks = supportsMultipleUrls 
        ? parseMultipleUrls(row["Video Link"])
        : parseVideoLinks(row["Video Link"], skipYouTube)
      
      for (const videoUrl of videoLinks) {
        const videoSlug = extractSlugFromUrl(videoUrl, "video", skipYouTube)
        if (videoSlug) {
          videosInCSV.push({
            slug: videoSlug,
            url: videoUrl,
            title: row[config.exerciseColumnName] || "", // Use dynamic column name
            standard: row.Standard,
            csvIndex: csvIndex++
          })
        }
      }
    }
    
    // Process exercise(s) after video(s)
    if (row["Exercise Link"]) {
      const exerciseUrls = supportsMultipleUrls 
        ? parseMultipleUrls(row["Exercise Link"])
        : [row["Exercise Link"]]
      
      for (const exerciseUrl of exerciseUrls) {
        const exerciseSlug = extractSlugFromUrl(exerciseUrl, "exercise", skipYouTube)
        if (exerciseSlug) {
          exercisesInCSV.push({
            slug: exerciseSlug,
            url: exerciseUrl,
            title: row[config.exerciseColumnName] || "", // Use dynamic column name
            standard: row.Standard,
            csvIndex: csvIndex++
          })
        }
      }
    }
  }
  
  logger.info("extracted content from CSV", {
    exerciseCount: exercisesInCSV.length,
    videoCount: videosInCSV.length
  })
  
  // Get unique slugs
  const uniqueExerciseSlugs = [...new Set(exercisesInCSV.map(e => e.slug))]
  const uniqueVideoSlugs = [...new Set(videosInCSV.map(v => v.slug))]
  
  logger.info("unique content slugs", {
    uniqueExerciseCount: uniqueExerciseSlugs.length,
    uniqueVideoCount: uniqueVideoSlugs.length
  })
  
  // Fetch content from database
  const { 
    exerciseSlugs: dbExerciseSlugs, 
    videoSlugs: dbVideoSlugs,
    exerciseCourseContent,
    videoCourseContent
  } = await fetchContentFromDB(config)
  
  // Analyze what's missing
  const missingExercises = exercisesInCSV.filter(e => !dbExerciseSlugs.has(e.slug))
  const missingVideos = videosInCSV.filter(v => !dbVideoSlugs.has(v.slug))
  
  // Add source info to found exercises and videos, using titles from database
  const foundExercises = exercisesInCSV.filter(e => dbExerciseSlugs.has(e.slug)).map(e => {
    const inCC = exerciseCourseContent.ccContent.has(e.slug)
    const source = inCC ? "CC" : "TX"
    const contentInfo = inCC ? exerciseCourseContent.ccContent.get(e.slug) : exerciseCourseContent.txContent.get(e.slug)
    return { 
      ...e, 
      source, 
      id: contentInfo?.id,
      title: contentInfo?.title || e.title // Use database title if available, otherwise fallback to CSV
    }
  })
  
  const foundVideos = videosInCSV.filter(v => dbVideoSlugs.has(v.slug)).map(v => {
    const inCC = videoCourseContent.ccContent.has(v.slug)
    const source = inCC ? "CC" : "TX"
    const contentInfo = inCC ? videoCourseContent.ccContent.get(v.slug) : videoCourseContent.txContent.get(v.slug)
    return { 
      ...v, 
      source, 
      id: contentInfo?.id,
      title: contentInfo?.title || v.title // Use database title if available, otherwise fallback to CSV
    }
  })
  
  // Get lesson groupings for all found content
  const allFoundContent = [...foundExercises, ...foundVideos]
  const { lessonGroupings: lessonGroupingsMap, courseGroupings } = await fetchLessonGroupings(allFoundContent, config)
  const lessonGroupings = Array.from(lessonGroupingsMap.values())
    .sort((a, b) => a.csvOrder - b.csvOrder) // Sort by CSV order
  
  return {
    exercisesInCSV,
    videosInCSV,
    exercisesInDB: dbExerciseSlugs,
    videosInDB: dbVideoSlugs,
    missingExercises,
    missingVideos,
    foundExercises,
    foundVideos,
    exerciseCourseContent,
    videoCourseContent,
    lessonGroupings,
    courseGroupings
  }
}

function generateReport(result: AnalysisResult, config: GradeConfig): string {
  const report: string[] = []
  
  report.push(`# Khan Academy ${config.gradeOrdinal} Grade Math Coverage Analysis`)
  report.push("")
  report.push("## Summary")
  report.push(`- Total exercises in CSV: ${result.exercisesInCSV.length}`)
  report.push(`- Total videos in CSV: ${result.videosInCSV.length}`)
  report.push(`- Exercises found in DB: ${result.foundExercises.length}`)
  report.push(`- Videos found in DB: ${result.foundVideos.length}`)
  report.push(`- Missing exercises: ${result.missingExercises.length}`)
  report.push(`- Missing videos: ${result.missingVideos.length}`)
  report.push("")
  
  // Coverage percentages
  const exerciseCoverage = result.exercisesInCSV.length > 0 
    ? ((result.foundExercises.length / result.exercisesInCSV.length) * 100).toFixed(1)
    : "0"
  const videoCoverage = result.videosInCSV.length > 0
    ? ((result.foundVideos.length / result.videosInCSV.length) * 100).toFixed(1)
    : "0"
  
  report.push("## Coverage Percentages")
  report.push(`- Exercise coverage: ${exerciseCoverage}%`)
  report.push(`- Video coverage: ${videoCoverage}%`)
  report.push("")
  
  // Group missing content by standard
  const missingByStandard = new Map<string, { exercises: ContentItem[], videos: ContentItem[] }>()
  
  for (const exercise of result.missingExercises) {
    if (!missingByStandard.has(exercise.standard)) {
      missingByStandard.set(exercise.standard, { exercises: [], videos: [] })
    }
    missingByStandard.get(exercise.standard)!.exercises.push(exercise)
  }
  
  for (const video of result.missingVideos) {
    if (!missingByStandard.has(video.standard)) {
      missingByStandard.set(video.standard, { exercises: [], videos: [] })
    }
    missingByStandard.get(video.standard)!.videos.push(video)
  }
  
  // Report missing content by standard
  report.push("## Missing Content by Standard")
  report.push("")
  
  const sortedStandards = Array.from(missingByStandard.keys()).sort()
  
  for (const standard of sortedStandards) {
    const content = missingByStandard.get(standard)!
    if (content.exercises.length === 0 && content.videos.length === 0) continue
    
    report.push(`### ${standard}`)
    report.push("")
    
    if (content.exercises.length > 0) {
      report.push("**Missing Exercises:**")
      for (const exercise of content.exercises) {
        report.push(`- ${exercise.title} (slug: ${exercise.slug})`)
        report.push(`  URL: ${exercise.url}`)
      }
      report.push("")
    }
    
    if (content.videos.length > 0) {
      report.push("**Missing Videos:**")
      for (const video of content.videos) {
        report.push(`- Video slug: ${video.slug}`)
        report.push(`  URL: ${video.url}`)
      }
      report.push("")
    }
  }
  
  // Process found content to categorize by course
  report.push("## Content Source Analysis")
  report.push("")
  
  // Categorize exercises
  const ccOnlyExercises: string[] = []
  const txOnlyExercises: string[] = []
  const bothCoursesExercises: string[] = []
  
  const uniqueFoundExercises = [...new Set(result.foundExercises.map(e => e.slug))]
  for (const slug of uniqueFoundExercises) {
    const inCC = result.exerciseCourseContent.ccContent.has(slug)
    const inTX = result.exerciseCourseContent.txContent.has(slug)
    
    if (inCC && inTX) {
      bothCoursesExercises.push(slug)
    } else if (inCC) {
      ccOnlyExercises.push(slug)
    } else if (inTX) {
      txOnlyExercises.push(slug)
    }
  }
  
  // Categorize videos
  const ccOnlyVideos: string[] = []
  const txOnlyVideos: string[] = []
  const bothCoursesVideos: string[] = []
  
  const uniqueFoundVideos = [...new Set(result.foundVideos.map(v => v.slug))]
  for (const slug of uniqueFoundVideos) {
    const inCC = result.videoCourseContent.ccContent.has(slug)
    const inTX = result.videoCourseContent.txContent.has(slug)
    
    if (inCC && inTX) {
      bothCoursesVideos.push(slug)
    } else if (inCC) {
      ccOnlyVideos.push(slug)
    } else if (inTX) {
      txOnlyVideos.push(slug)
    }
  }
  
  // Calculate totals for new course structure
  const totalFromCC = ccOnlyExercises.length + bothCoursesExercises.length + 
                      ccOnlyVideos.length + bothCoursesVideos.length
  const needFromTX = txOnlyExercises.length + txOnlyVideos.length
  
  report.push("### Course Content Summary")
  report.push(`- Content from CC course: ${totalFromCC} items`)
  report.push(`- Additional content needed from TX course: ${needFromTX} items`)
  report.push(`- Total content items: ${totalFromCC + needFromTX}`)
  report.push("")
  
  // Add unified course tree section
  report.push("## Unified Course Structure")
  report.push("*Content organized by Unit → Lesson hierarchy, combining CC and TX sources, maintaining CSV order*")
  report.push("")
  
  // Should only have one unified course
  const unifiedCourse = result.courseGroupings[0]
  if (unifiedCourse) {
    for (const unit of unifiedCourse.units) {
      report.push(`## Unit: ${unit.unitTitle}`)
      report.push("")
      
      for (const lesson of unit.lessons) {
        report.push(`### ${lesson.lessonTitle}`)
        report.push(`Path: ${lesson.lessonPath}`)
        report.push("")
        
        // Display all content in CSV order
        if (lesson.content.length > 0) {
          report.push("**Content (in CSV order):**")
          const sortedContent = [...lesson.content].sort((a, b) => (a.csvIndex || 0) - (b.csvIndex || 0))
          for (const item of sortedContent) {
            const type = item.url.includes("/v/") ? "Video" : "Exercise"
            const source = item.source || "Unknown"
            report.push(`- [${type}] ${item.title} (${source})`)
            report.push(`  - ID: ${item.id || "N/A"}`)
            report.push(`  - Slug: ${item.slug}`)
            report.push(`  - Standard: ${item.standard}`)
          }
          report.push("")
        }
      }
    }
  }
  
  // List content from CC course (including shared content)
  const ccExercises = [...ccOnlyExercises, ...bothCoursesExercises].sort()
  const ccVideos = [...ccOnlyVideos, ...bothCoursesVideos].sort()
  
  report.push(`## Content from ${config.gradeOrdinal} Grade Math (Common Core)`)
  report.push(`_${config.ccCoursePath.replace("%", "")}_`)
  report.push("")
  
  if (ccExercises.length > 0) {
    report.push(`### Exercises (${ccExercises.length})`)
    for (const slug of ccExercises) {
      report.push(`- ${slug}`)
    }
    report.push("")
  }
  
  if (ccVideos.length > 0) {
    report.push(`### Videos (${ccVideos.length})`)
    for (const slug of ccVideos) {
      report.push(`- ${slug}`)
    }
    report.push("")
  }
  
  // List content that's only in TX (not in CC)
  if (txOnlyExercises.length > 0 || txOnlyVideos.length > 0) {
    report.push(`## Additional Content from ${config.gradeOrdinal} Grade Math (TX TEKS)`)
    report.push(`_${config.txCoursePath.replace("%", "")}_`)
    report.push("*These items are not available in the CC course and must be taken from TX course*")
    report.push("")
    
    if (txOnlyExercises.length > 0) {
      report.push(`### Exercises (${txOnlyExercises.length})`)
      for (const slug of txOnlyExercises.sort()) {
        report.push(`- ${slug}`)
      }
      report.push("")
    }
    
    if (txOnlyVideos.length > 0) {
      report.push(`### Videos (${txOnlyVideos.length})`)
      for (const slug of txOnlyVideos.sort()) {
        report.push(`- ${slug}`)
      }
      report.push("")
    }
  }
  
  // Show content in both courses (informational)
  if (bothCoursesExercises.length > 0 || bothCoursesVideos.length > 0) {
    report.push("## Content Available in Both Courses")
    report.push("*These items exist in both CC and TX courses. They will be taken from CC course.*")
    report.push("")
    
    if (bothCoursesExercises.length > 0) {
      report.push(`### Exercises (${bothCoursesExercises.length})`)
      for (const slug of bothCoursesExercises.sort()) {
        report.push(`- ${slug}`)
      }
      report.push("")
    }
    
    if (bothCoursesVideos.length > 0) {
      report.push(`### Videos (${bothCoursesVideos.length})`)
      for (const slug of bothCoursesVideos.sort()) {
        report.push(`- ${slug}`)
      }
      report.push("")
    }
  }
  
  // Note about YouTube videos for 6th grade
  if (config.grade === 6) {
    const hasYouTubeLinks = result.exercisesInCSV.some(e => e.url.includes("youtu")) || 
                           result.videosInCSV.some(v => v.url.includes("youtu"))
    if (hasYouTubeLinks) {
      report.push("")
      report.push("⚠️ Note: Some CSV entries contain YouTube links which were skipped")
    }
  }
  
  return report.join("\n")
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  
  // Look for grade flag
  let gradeConfig: GradeConfig | null = null
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const gradeStr = arg.substring(2)
      if (GRADE_CONFIGS[gradeStr]) {
        gradeConfig = GRADE_CONFIGS[gradeStr]
        break
      }
    }
  }
  
  if (!gradeConfig) {
    console.error("Error: Please specify a grade with --4, --5, --6, --7, or --8")
    console.error("")
    console.error("Usage:")
    console.error("  bun run scripts/analyze-khan-coverage.ts --4")
    console.error("  bun run scripts/analyze-khan-coverage.ts --5")
    console.error("  bun run scripts/analyze-khan-coverage.ts --6")
    console.error("  bun run scripts/analyze-khan-coverage.ts --7")
    console.error("  bun run scripts/analyze-khan-coverage.ts --8")
    process.exit(1)
  }
  
  const csvPath = path.join(process.cwd(), "docs", gradeConfig.csvFile)
  
  logger.info("starting Khan Academy coverage analysis", { 
    grade: gradeConfig.grade,
    gradeOrdinal: gradeConfig.gradeOrdinal 
  })
  
  const analysisResult = await errors.try(analyzeCSV(csvPath, gradeConfig))
  if (analysisResult.error) {
    logger.error("analysis failed", { error: analysisResult.error })
    process.exit(1)
  }
  
  const report = generateReport(analysisResult.data, gradeConfig)
  
  // Write report to file
  const reportPath = path.join(process.cwd(), "docs", gradeConfig.reportFile)
  const writeResult = await errors.try(fs.promises.writeFile(reportPath, report))
  if (writeResult.error) {
    logger.error("failed to write report", { error: writeResult.error })
    throw errors.wrap(writeResult.error, "report write")
  }
  
  logger.info("analysis complete", {
    reportPath,
    missingExercises: analysisResult.data.missingExercises.length,
    missingVideos: analysisResult.data.missingVideos.length,
    lessonGroups: analysisResult.data.lessonGroupings.length,
    courses: analysisResult.data.courseGroupings.length,
    units: analysisResult.data.courseGroupings.reduce((acc, c) => acc + c.units.length, 0)
  })
  
  // Calculate course distribution
  const { exerciseCourseContent, videoCourseContent, foundExercises, foundVideos } = analysisResult.data
  
  let ccExerciseCount = 0
  let txOnlyExerciseCount = 0
  let ccVideoCount = 0
  let txOnlyVideoCount = 0
  
  const uniqueFoundExercises = [...new Set(foundExercises.map(e => e.slug))]
  for (const slug of uniqueFoundExercises) {
    if (exerciseCourseContent.ccContent.has(slug)) {
      ccExerciseCount++
    } else if (exerciseCourseContent.txContent.has(slug)) {
      txOnlyExerciseCount++
    }
  }
  
  const uniqueFoundVideos = [...new Set(foundVideos.map(v => v.slug))]
  for (const slug of uniqueFoundVideos) {
    if (videoCourseContent.ccContent.has(slug)) {
      ccVideoCount++
    } else if (videoCourseContent.txContent.has(slug)) {
      txOnlyVideoCount++
    }
  }
  
  // Output summary to console
  console.log(`\n=== ${gradeConfig.gradeOrdinal.toUpperCase()} GRADE COVERAGE SUMMARY ===`)
  console.log(`Total in CSV: ${analysisResult.data.exercisesInCSV.length} exercises, ${analysisResult.data.videosInCSV.length} videos`)
  console.log(`Found in DB: ${analysisResult.data.foundExercises.length} exercises, ${analysisResult.data.foundVideos.length} videos`)
  console.log(`\n=== COURSE DISTRIBUTION ===`)
  console.log(`From CC course: ${ccExerciseCount} exercises, ${ccVideoCount} videos`)
  console.log(`Additional from TX course: ${txOnlyExerciseCount} exercises, ${txOnlyVideoCount} videos`)
  console.log(`\n=== COURSE TREE ORGANIZATION ===`)
  const totalUnits = analysisResult.data.courseGroupings.reduce((acc, c) => acc + c.units.length, 0)
  console.log(`Content organized into:`)
  console.log(`  - ${analysisResult.data.courseGroupings.length} courses`)
  console.log(`  - ${totalUnits} units`)
  console.log(`  - ${analysisResult.data.lessonGroupings.length} lessons`)
  console.log(`\nMissing completely: ${analysisResult.data.missingExercises.length} exercises, ${analysisResult.data.missingVideos.length} videos`)
  console.log(`\nFull report written to: ${reportPath}`)
  
  // Note about YouTube videos for 6th grade
  if (gradeConfig.grade === 6) {
    const hasYouTubeLinks = analysisResult.data.exercisesInCSV.some(e => e.url.includes("youtu"))
    if (hasYouTubeLinks) {
      console.log("\n⚠️ Note: Some CSV entries contain YouTube links which were skipped")
    }
  }
}

const result = await errors.try(main())
if (result.error) {
  logger.error("script failed", { error: result.error })
  process.exit(1)
}
