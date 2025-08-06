import { foreignKey, index, integer, jsonb, pgSchema, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"

/**
 * This file defines the entire database schema for the "nice" project,
 * consolidating all tables for content.
 *
 * It follows a fully normalized relational model:
 * 1.  Normalized Content: Each piece of content (video, exercise, article) has a single,
 *     canonical record in its own table for data integrity and direct routing.
 * 2.  Explicit Ordering: All hierarchical content (units, lessons, assessments) includes
 *     an `ordering` column to maintain pedagogical sequence.
 * 3.  Junction Tables: The `lesson_contents` table manages the ordered, polymorphic
 *     relationship between lessons and their children (videos, articles, exercises).
 *
 * This approach provides strong data integrity, type safety, and enables
 * performant, batch-oriented queries for rendering complex pages.
 */
const schema = pgSchema("nice")
export { schema as niceSchema }

// --- Enums ---

const assessmentTypeEnum = schema.enum("assessment_type_enum", ["Quiz", "UnitTest", "CourseChallenge"])
export { assessmentTypeEnum as niceAssessmentTypeEnum }

const assessmentParentTypeEnum = schema.enum("assessment_parent_type_enum", ["Unit", "Course"])
export { assessmentParentTypeEnum as niceAssessmentParentTypeEnum }

const lessonContentTypeEnum = schema.enum("lesson_content_type_enum", ["Video", "Article", "Exercise"])
export { lessonContentTypeEnum as niceLessonContentTypeEnum }

// --- JSONB Type Definitions ---

// --- Content Tables ---

const subjects = schema.table(
	"subjects",
	{
		slug: text("slug").primaryKey(),
		title: text("title").notNull()
	},
	(table) => [uniqueIndex("subjects_slug_idx").on(table.slug)]
)
export { subjects as niceSubjects }

const courses = schema.table(
	"courses",
	{
		id: text("id").primaryKey(),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		description: text("description").notNull().default(""),
		path: text("path").notNull().unique()
	},
	(table) => [
		index("courses_path_idx").on(table.path),
		index("courses_title_idx").on(table.title),
		uniqueIndex("courses_slug_idx").on(table.slug)
	]
)
export { courses as niceCourses }

const units = schema.table(
	"units",
	{
		id: text("id").primaryKey(),
		courseId: text("course_id").notNull(),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		description: text("description").notNull().default(""),
		path: text("path").notNull().unique(),
		ordering: integer("ordering").notNull()
	},
	(table) => [
		index("units_course_id_idx").on(table.courseId),
		index("units_path_idx").on(table.path),
		index("units_title_idx").on(table.title),
		uniqueIndex("unit_slug_per_course_idx").on(table.courseId, table.slug),
		foreignKey({ name: "units_course_fk", columns: [table.courseId], foreignColumns: [courses.id] }).onDelete("cascade")
	]
)
export { units as niceUnits }

const lessons = schema.table(
	"lessons",
	{
		id: text("id").primaryKey(),
		unitId: text("unit_id").notNull(),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		description: text("description").notNull().default(""),
		path: text("path").notNull().unique(),
		ordering: integer("ordering").notNull()
	},
	(table) => [
		index("lessons_unit_id_idx").on(table.unitId),
		index("lessons_path_idx").on(table.path),
		index("lessons_title_idx").on(table.title),
		uniqueIndex("lesson_slug_per_unit_idx").on(table.unitId, table.slug),
		foreignKey({ name: "lessons_unit_fk", columns: [table.unitId], foreignColumns: [units.id] }).onDelete("cascade")
	]
)
export { lessons as niceLessons }

const lessonContents = schema.table(
	"lesson_contents",
	{
		lessonId: text("lesson_id").notNull(),
		contentId: text("content_id").notNull(),
		contentType: lessonContentTypeEnum("content_type").notNull(),
		ordering: integer("ordering").notNull()
	},
	(table) => [
		primaryKey({ name: "lesson_contents_pk", columns: [table.lessonId, table.contentId] }),
		index("lc_lesson_id_idx").on(table.lessonId),
		foreignKey({
			name: "lc_lesson_fk",
			columns: [table.lessonId],
			foreignColumns: [lessons.id]
		}).onDelete("cascade")
	]
)
export { lessonContents as niceLessonContents }

const videos = schema.table(
	"videos",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		slug: text("slug").notNull(),
		path: text("path").notNull().unique(),
		youtubeId: text("youtube_id").notNull(),
		duration: integer("duration").notNull(),
		description: text("description").notNull().default("")
	},
	(table) => [index("videos_path_idx").on(table.path), index("videos_title_idx").on(table.title)]
)
export { videos as niceVideos }

const articles = schema.table(
	"articles",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		slug: text("slug").notNull(),
		path: text("path").notNull().unique(),
		perseusContent: jsonb("perseus_content").notNull(),
		xml: text("xml")
	},
	(table) => [index("articles_path_idx").on(table.path), index("articles_title_idx").on(table.title)]
)
export { articles as niceArticles }

const exercises = schema.table(
	"exercises",
	{
		id: text("id").primaryKey(),
		title: text("title").notNull(),
		slug: text("slug").notNull(),
		path: text("path").notNull().unique(),
		description: text("description").notNull().default("")
	},
	(table) => [index("exercises_path_idx").on(table.path), index("exercises_title_idx").on(table.title)]
)
export { exercises as niceExercises }

const questions = schema.table(
	"questions",
	{
		id: text("id").primaryKey(),
		exerciseId: text("exercise_id").notNull(),
		sha: text("sha").notNull().default(""),
		parsedData: jsonb("parsed_data").notNull(),
		xml: text("xml")
	},
	(table) => [
		index("questions_exercise_id_idx").on(table.exerciseId),
		foreignKey({
			name: "questions_exercise_fk",
			columns: [table.exerciseId],
			foreignColumns: [exercises.id]
		}).onDelete("cascade")
	]
)
export { questions as niceQuestions }

const assessments = schema.table(
	"assessments",
	{
		id: text("id").primaryKey(),
		type: assessmentTypeEnum("type").notNull(),
		parentId: text("parent_id").notNull(),
		parentType: assessmentParentTypeEnum("parent_type").notNull(),
		title: text("title").notNull(),
		slug: text("slug").notNull(),
		path: text("path").notNull().unique(),
		ordering: integer("ordering").notNull(),
		description: text("description").notNull().default("")
	},
	(table) => [
		index("assessments_path_idx").on(table.path),
		index("assessments_parent_type_idx").on(table.parentId, table.type)
	]
)
export { assessments as niceAssessments }

const assessmentExercises = schema.table(
	"assessment_exercises",
	{
		assessmentId: text("assessment_id").notNull(),
		exerciseId: text("exercise_id").notNull()
	},
	(table) => [
		primaryKey({ columns: [table.assessmentId, table.exerciseId] }),
		index("ae_assessment_id_idx").on(table.assessmentId),
		index("ae_exercise_id_idx").on(table.exerciseId),
		foreignKey({
			name: "ae_assessment_fk",
			columns: [table.assessmentId],
			foreignColumns: [assessments.id]
		}).onDelete("cascade"),
		foreignKey({
			name: "ae_exercise_fk",
			columns: [table.exerciseId],
			foreignColumns: [exercises.id]
		}).onDelete("cascade")
	]
)
export { assessmentExercises as niceAssessmentExercises }

const questionsAnalysis = schema.table(
	"questions_analysis",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		questionId: text("question_id").notNull().unique(),
		analysisNotes: text("analysis_notes")
	},
	(table) => [
		uniqueIndex("questions_analysis_question_id_idx").on(table.questionId),
		foreignKey({
			name: "questions_analysis_question_fk",
			columns: [table.questionId],
			foreignColumns: [questions.id]
		}).onDelete("cascade")
	]
)
export { questionsAnalysis as niceQuestionsAnalysis }
