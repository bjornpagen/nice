import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { CanvasClient } from "@/lib/canvas-api"

// set your canvas details here for local testing
const CANVAS_BASE_URL = "https://uths.instructure.com"
const CANVAS_TOKEN = "15214~HKUmE3m6xHBAQ4MMPATVZvR3rBeaZ3J24MereDCnQeWr4VzaeGAckh6NYcEYX42k" // profile settings → new access token
const CANVAS_TEST_COURSE_ID = "8834"

async function main(): Promise<void> {
  logger.info("starting canvas graphql smoke test")

  // bearer token auth
  const client = new CanvasClient({ baseUrl: CANVAS_BASE_URL, token: CANVAS_TOKEN })
  const courseId = CANVAS_TEST_COURSE_ID

  // 1) minimal introspection to confirm graphql is reachable
  logger.info("introspecting graphql schema")
  const introspectResult = await errors.try(client.introspect())
  if (introspectResult.error) {
    logger.error("introspection failed", { error: introspectResult.error })
    throw errors.wrap(introspectResult.error, "graphql introspection")
  }
  const schemaInfo = introspectResult.data
  logger.info("introspection summary", {
    queryType: schemaInfo.queryTypeName,
    mutationType: schemaInfo.mutationTypeName,
    subscriptionType: schemaInfo.subscriptionTypeName,
    typeCount: schemaInfo.types.length
  })

  // 2) fetch course lists with pagination
  logger.info("listing assignments/pages/quizzes", { courseId })

  const assignmentsResult = await errors.try(client.listCourseAssignments(courseId))
  if (assignmentsResult.error) {
    logger.error("listCourseAssignments failed", { error: assignmentsResult.error })
    throw errors.wrap(assignmentsResult.error, "list assignments")
  }
  const pagesResult = await errors.try(client.listCoursePages(courseId))
  if (pagesResult.error) {
    logger.error("listCoursePages failed", { error: pagesResult.error })
    // fail fast: do not continue to quizzes if pages failed
    throw errors.wrap(pagesResult.error, "list pages")
  }
  const quizzesResult = await errors.try(client.listCourseQuizzes(courseId))
  if (quizzesResult.error) {
    logger.error("listCourseQuizzes failed", { error: quizzesResult.error })
    throw errors.wrap(quizzesResult.error, "list quizzes")
  }

  logger.info("list results", {
    assignmentsCount: assignmentsResult.data.length,
    pagesCount: pagesResult.data.length,
    quizzesCount: quizzesResult.data.length
  })

  // 3) probe node & legacyNode if we can
  if (assignmentsResult.data.length > 0) {
    const firstAssignmentId = assignmentsResult.data[0]?._id
    if (!firstAssignmentId) {
      logger.warn("no assignment id found")
      return
    }

    // construct relay global id for Assignment via base64("Assignment-<legacyId>")
    const globalId = Buffer.from(`Assignment-${firstAssignmentId}`).toString("base64")
  const nodeResult = await errors.try(client.getNode(globalId))
  if (nodeResult.error) {
    logger.error("getNode failed", { error: nodeResult.error, globalId })
    throw errors.wrap(nodeResult.error, "get node")
  }
  logger.info("getNode ok", { typename: nodeResult.data?.__typename })

  const legacyNodeResult = await errors.try(client.getLegacyNode(firstAssignmentId, "ASSIGNMENT"))
  if (legacyNodeResult.error) {
    logger.error("getLegacyNode failed", { error: legacyNodeResult.error, _id: firstAssignmentId })
    throw errors.wrap(legacyNodeResult.error, "get legacy node")
  }
  logger.info("getLegacyNode ok", { typename: legacyNodeResult.data?.__typename })
  }

  logger.info("canvas graphql smoke test completed")
}

const result = await errors.try(main())
if (result.error) {
  logger.error("operation failed", { error: result.error })
  process.exit(1)
}


