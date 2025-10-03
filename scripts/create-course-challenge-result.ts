import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { oneroster } from "@/lib/clients"

async function main() {
	const studentSourcedId = "f60046c1-44ab-4c00-8328-8a7a3bd0d401"
	const resourceSourcedId = "nice_x0c5bb03129646fd6"
	const lineItemSourcedId = "nice_x0c5bb03129646fd6_ali"
	const resultSourcedId = `nice_${studentSourcedId}_${lineItemSourcedId}`

	logger.info("creating course challenge result", { studentSourcedId, resourceSourcedId, resultSourcedId })

	const resultPayload = {
		result: {
			assessmentLineItem: { sourcedId: lineItemSourcedId, type: "assessmentLineItem" as const },
			student: { sourcedId: studentSourcedId, type: "user" as const },
			scoreStatus: "fully graded" as const,
			scoreDate: new Date().toISOString(),
			score: 100,
			comment: "10/10 correct on first attempt",
			metadata: {
				xp: 15,
				attempt: 1,
				accuracy: 100,
				lessonType: "coursechallenge",
				multiplier: 1.25,
				completedAt: new Date().toISOString(),
				masteredUnits: 10,
				totalQuestions: 10,
				courseSourcedId: "nice_x0c5bb03129646fd6",
				correctQuestions: 10
			}
		}
	}

	const createResult = await errors.try(oneroster.putResult(resultSourcedId, resultPayload))
	if (createResult.error) {
		logger.error("failed to create course challenge result", { error: createResult.error })
		throw errors.wrap(createResult.error, "result creation")
	}

	logger.info("course challenge result created successfully", { resultSourcedId, score: 100 })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("script failed", { error: result.error })
	process.exit(1)
}

