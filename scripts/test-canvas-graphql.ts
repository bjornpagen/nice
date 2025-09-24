import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { CanvasClient } from "@/lib/canvas-api"

// set your canvas details here for local testing
const CANVAS_BASE_URL = "https://uths.instructure.com"
const CANVAS_SESSION_COOKIE = "log_session_id=ee28a6c2e0f45ae2c1ac03f43e628e0d; canvas_session=1ZBVwPbzShRfRBz1BNv-uQ+ivTk0p3yO8hRfhT_zp6lLg94eTvFndcl-Qn_jfS1BkuVf1_KKoSR08V_wfQF8Il49KE_cckXPFuxsjh2SaWir44hD7rvAhy5MA9d43VpNeyDXl_-mHyzKLn3zEy_vbJ7IKD6jvsDdzh8w05lmcV_6hkbxDqunGq9Xm1L6zcOQyWND8rH4ZtBc1R1LlOzoJzOkuv3mxzb-SoCugrR2htMNR_BybXyt85_5naTV5YnESWoBNVtlOYp7F54BiBeuLM1MyAKQscyskevYEd-nvYaozuKLRBlQODDLMbLz-PwN8W1RNF6iXYPmNx-48g8RROhT5YOEbrzUChbUze4HU9OmpFSBq7ljtndu3A6ixzHAW2BLeABBc7ZDqYlIbBYUdF2M_FBtJqhOudgNNAq9iO8Gg.7RkPmH6cQyUC-y2e9YJncJrxaQ0.aNRVqg; _csrf_token=NzGkFo%2FnlUy1YBrylSTy6CPYO%2FEtCU4fiO784NEvMupYQux14JXPOeRXd6WmcLSgbbIKl2lGfXDvubi4lWBAgA%3D%3D" // full cookie string including csrf_token
const CANVAS_CSRF_TOKEN = "_csrf_token=NzGkFo%2FnlUy1YBrylSTy6CPYO%2FEtCU4fiO784NEvMupYQux14JXPOeRXd6WmcLSgbbIKl2lGfXDvubi4lWBAgA%3D%3D" // csrf token value
const CANVAS_TEST_COURSE_ID = "12345" // legacy numeric id as string

async function main(): Promise<void> {
  logger.info("starting canvas graphql smoke test")

  const client = new CanvasClient({ baseUrl: CANVAS_BASE_URL, cookie: CANVAS_SESSION_COOKIE, csrfToken: CANVAS_CSRF_TOKEN })
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
      logger.warn("getNode failed (non-fatal)", { error: nodeResult.error, globalId })
    } else {
      logger.info("getNode ok", { typename: nodeResult.data?.__typename })
    }

    const legacyNodeResult = await errors.try(client.getLegacyNode(firstAssignmentId, "ASSIGNMENT"))
    if (legacyNodeResult.error) {
      logger.warn("getLegacyNode failed (non-fatal)", { error: legacyNodeResult.error })
    } else {
      logger.info("getLegacyNode ok", { typename: legacyNodeResult.data?.__typename })
    }
  }

  logger.info("canvas graphql smoke test completed")
}

const result = await errors.try(main())
if (result.error) {
  logger.error("operation failed", { error: result.error })
  process.exit(1)
}


