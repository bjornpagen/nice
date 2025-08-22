import { sql } from "drizzle-orm"
import { db } from "@/db"
import { 
  niceQuestions,
  niceExercises, 
  niceArticles,
  niceVideos,
  niceAssessments
} from "@/db/schemas/nice"

// get individual counts
const questionsCount = await db.select({ count: sql<number>`count(*)` }).from(niceQuestions)
const exercisesCount = await db.select({ count: sql<number>`count(*)` }).from(niceExercises)
const articlesCount = await db.select({ count: sql<number>`count(*)` }).from(niceArticles)
const videosCount = await db.select({ count: sql<number>`count(*)` }).from(niceVideos)
const assessmentsCount = await db.select({ count: sql<number>`count(*)` }).from(niceAssessments)
const assessmentsByType = await db.select({ 
  type: niceAssessments.type, 
  count: sql<number>`count(*)` 
}).from(niceAssessments).groupBy(niceAssessments.type)

const counts = {
  questions: Number(questionsCount[0]?.count || 0),
  exercises: Number(exercisesCount[0]?.count || 0),
  articles: Number(articlesCount[0]?.count || 0),
  videos: Number(videosCount[0]?.count || 0),
  assessments: Number(assessmentsCount[0]?.count || 0)
}

const total = counts.questions + counts.exercises + counts.articles + counts.videos + counts.assessments

console.log("content counts:", counts)
console.log("assessments by type:")
for (const assessment of assessmentsByType) {
  console.log(`  ${assessment.type}: ${Number(assessment.count)}`)
}
console.log("total content pieces:", total)
