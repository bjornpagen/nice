import * as errors from "@superbuilders/errors"
import { and, inArray, isNull, or } from "drizzle-orm"
import { db } from "@/db"
import * as schema from "@/db/schemas"
import { type Events, inngest } from "@/inngest/client"

// Hardcoded list of exercise slugs to migrate. Grade sections are preserved as comments.
export const HARDCODED_EXERCISE_SLUGS: string[] = [
	// 4th grade
	"adding_fractions_0.5",
	"axis_of_symmetry",
	"classify-triangles-by-both-sides-and-angles",
	"converting-larger-units-to-smaller-units--ounces-and-pounds-",
	"converting_decimals_to_fractions_1",
	"converting_fractions_to_decimals_0.5",
	"create-division-equations-with-area-models",
	"division-using-place-value-understanding",
	"equivalent-fractions-with-denominators-of-10-and-100",
	"estimating-length--inches--feet--yards--and-miles-",
	"estimating-mass--ounces-and-pounds-",
	"estimating-volume--cups--pints--quarts--and-gallons-",
	"identifying-triangles-by-angles",
	"interpreting-line-plots-with-fraction-addition-and-subtraction",
	"measuring-and-converting-money-word-problems",
	"measuring-time-word-problems",
	"metric-conversions-word-problems",
	"multi-digit-division-with-visual-models",
	"multiply-3--and-4-digits-by-1-digit-with-distributive-property",
	"multiplying-by-4-digit-numbers-with-visual-models",
	"patterns-with-shapes",
	"recognizing-triangles",
	"telling-time-word-problems-",
	"time-differences--over-the-hour-",
	"write-fraction-addition-problems-with-common-denominators--denominators-of-10-and-100-",

	// 5th grade
	"converting-measurements-word-problems",
	"coordinate-plane-word-problems--quadrant-1---basic-",
	"decompose-figures-to-find-volume",
	"decompose-figures-to-find-volume--unit-cubes-",
	"distance-between-points-in-first-quadrant-of-coordinate-plane",
	"understanding-decomposing-figures-to-find-volume",
	"understanding-fractions-as-division--word-problems",

	// // 6th grade
	// "balancing-a-check-register",
	// "checking-accounts",
	// "classify-rational-numbers",
	// "credit-report-and-credit-history",
	// "identify-situations-one-step-inequalities",
	// "let-s-compare-salaries",
	// "model-expressions",
	// "paying-for-college",
	// "using-debit-or-credit",

	// // 7th grade
	// "building-a-budget-exercise",
	// "compare-discounts",
	// "comparing-distribution",
	// "emergency-fund",
	// "estimate-center-using-dot-plots",
	// "find-net-worth",
	// "sales-tax",
	// "simple-and-compound-interest",

	// // 8th grade
	// "algebraic-rules-for-transformations",
	// "cylinder-volume-formula",
	// "represent-dilations-algebraically",
	// "similar-triangles-and-slope",
	// "simple-and-compound-interest"
]

export const orchestrateHardcodedExerciseSlugsItemMigration = inngest.createFunction(
	{
		id: "orchestrate-hardcoded-exercise-slugs-item-migration",
		name: "Orchestrate Hardcoded Exercise Slugs Perseus to QTI Item Migration"
	},
	{ event: "migration/hardcoded.exercise-slugs.items.perseus-to-qti" },
	async ({ logger }) => {
		logger.info("dispatching item migrations for hardcoded exercise slugs", {
			slugCount: HARDCODED_EXERCISE_SLUGS.length
		})

		// 1) Resolve exercise IDs from slugs
		const exercisesResult = await errors.try(
			db
				.select({ id: schema.niceExercises.id, slug: schema.niceExercises.slug })
				.from(schema.niceExercises)
				.where(inArray(schema.niceExercises.slug, HARDCODED_EXERCISE_SLUGS))
		)
		if (exercisesResult.error) {
			logger.error("db query for exercises by slug failed", { error: exercisesResult.error })
			throw errors.wrap(exercisesResult.error, "db query for exercises by slug")
		}

		const foundExerciseIds = exercisesResult.data.map((e) => e.id)
		const foundSlugs = new Set(exercisesResult.data.map((e) => e.slug))
		const missingSlugs = HARDCODED_EXERCISE_SLUGS.filter((s) => !foundSlugs.has(s))

		if (missingSlugs.length > 0) {
			logger.warn?.("some exercise slugs not found", { count: missingSlugs.length, slugs: missingSlugs })
		}

		if (foundExerciseIds.length === 0) {
			logger.info("no exercises found for provided slugs, skipping migration dispatch")
			return { status: "complete", slugCount: HARDCODED_EXERCISE_SLUGS.length, exercisesFound: 0, itemsDispatched: 0 }
		}

		// 2) Fetch questions for those exercises that still need migration
		const questionsResult = await errors.try(
			db
				.select({ id: schema.niceQuestions.id })
				.from(schema.niceQuestions)
				.where(
					and(
						inArray(schema.niceQuestions.exerciseId, foundExerciseIds),
						or(isNull(schema.niceQuestions.xml), isNull(schema.niceQuestions.structuredJson))
					)
				)
		)
		if (questionsResult.error) {
			logger.error("db query for questions by exercise ids failed", { error: questionsResult.error })
			throw errors.wrap(questionsResult.error, "db query for questions by exercises")
		}

		const questionIds = questionsResult.data.map((q) => q.id)
		if (questionIds.length === 0) {
			logger.info("no questions need migration for provided exercises", { exerciseCount: foundExerciseIds.length })
			return {
				status: "complete",
				slugCount: HARDCODED_EXERCISE_SLUGS.length,
				exercisesFound: foundExerciseIds.length,
				itemsDispatched: 0
			}
		}

		// 3) Build and send per-question item migration events in batches
		const itemEvents: Events["qti/item.migrate"][] = questionIds.map((questionId) => ({
			name: "qti/item.migrate",
			data: {
				questionId,
				widgetCollection: "math-core" // Math-focused collection across listed grades
			}
		}))

		const BATCH_SIZE = 500
		for (let i = 0; i < itemEvents.length; i += BATCH_SIZE) {
			const batch = itemEvents.slice(i, i + BATCH_SIZE)
			const sendResult = await errors.try(inngest.send(batch))
			if (sendResult.error) {
				logger.error("failed to send item migration event batch", { error: sendResult.error })
				throw errors.wrap(sendResult.error, "inngest batch send")
			}
			logger.debug("sent item migration event batch", { batchNumber: i / BATCH_SIZE + 1, size: batch.length })
		}

		logger.info("successfully dispatched item migrations for exercise slugs", {
			itemsDispatched: itemEvents.length,
			exercisesFound: foundExerciseIds.length
		})

		return {
			status: "complete",
			slugCount: HARDCODED_EXERCISE_SLUGS.length,
			exercisesFound: foundExerciseIds.length,
			itemsDispatched: itemEvents.length
		}
	}
)


