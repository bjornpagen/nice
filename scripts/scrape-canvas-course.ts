import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { CanvasClient } from "@/lib/canvas-api"
import { promises as fs } from "node:fs"

// config constants
const CANVAS_BASE_URL = "https://uths.instructure.com"
const CANVAS_TOKEN = "15214~HKUmE3m6xHBAQ4MMPATVZvR3rBeaZ3J24MereDCnQeWr4VzaeGAckh6NYcEYX42k"
const COURSE_ID = "8834"
const OUTFILE = `${process.cwd()}/canvas-course-${COURSE_ID}.json`

type PageInfo = { hasNextPage: boolean; endCursor?: string | null }

async function paginateConnection<TNode>(
  fetchPage: (after: string | null) => Promise<{ nodes: TNode[]; pageInfo: PageInfo }>
): Promise<TNode[]> {
  let after: string | null = null
  const nodes: TNode[] = []
  for (;;) {
    const { nodes: pageNodes, pageInfo } = await fetchPage(after)
    if (pageNodes.length > 0) nodes.push(...pageNodes)
    if (!pageInfo.hasNextPage) return nodes
    after = pageInfo.endCursor ?? null
  }
}

async function main(): Promise<void> {
  logger.info("starting canvas course scrape", { courseId: COURSE_ID })
  const client = new CanvasClient({ baseUrl: CANVAS_BASE_URL, token: CANVAS_TOKEN })

  // helpers for introspection and type unwrapping
  const unwrapTypeName = (t: any): string | null => {
    // walks kind/ofType chain to base named type
    let cur = t
    for (let i = 0; i < 5 && cur; i++) {
      if (cur?.name) return cur.name
      cur = cur.ofType
    }
    return null
  }

  const getTypeFields = async (typeName: string): Promise<Set<string>> => {
    const q = `query T($name: String!) { __type(name: $name) { fields { name } } }`
    const res = await client.rawQuery("TypeFields", q, { name: typeName })
    const list: Array<{ name: string }> = ((res as any)?.data?.__type?.fields ?? [])
    return new Set(list.map((f) => f.name))
  }

  const getConnectionNodeType = async (connectionTypeName: string): Promise<string | null> => {
    const q = `query C($name: String!) { __type(name: $name) { fields { name type { kind name ofType { kind name ofType { kind name } } } } } }`
    const res = await client.rawQuery("ConnType", q, { name: connectionTypeName })
    const fields = ((res as any)?.data?.__type?.fields ?? []) as Array<{ name: string; type: any }>
    const nodesField = fields.find((f) => f.name === "nodes")
    if (!nodesField) return null
    const nodeTypeName = unwrapTypeName(nodesField.type)
    return nodeTypeName
  }

  // 1) introspect course fields
  const introspectQuery = `
    query Introspect {
      __type(name: "Course") {
        name
        fields { name type { kind name ofType { name kind ofType { name kind } } } }
      }
    }
  `
  const introspect = await errors.try(client.rawQuery("Introspect", introspectQuery))
  if (introspect.error) {
    logger.error("introspection failed", { error: introspect.error })
    throw errors.wrap(introspect.error, "introspection")
  }

  const courseType = (introspect.data as any)?.data?.__type
  if (!courseType) {
    logger.error("course type metadata missing")
    throw errors.new("course type metadata missing")
  }
  const fields: Array<{ name: string; type: any }> = courseType.fields ?? []
  const connectionFields = fields
    .filter((f) => typeof f?.name === "string" && f.name.endsWith("Connection"))
    .map((f) => f.name)

  logger.info("discovered course connection fields", { fields: connectionFields })

  const results: Record<string, unknown> = {}

  // 2) iterate connections: build node selection per-connection from type metadata
  for (const field of connectionFields) {
    logger.info("scraping connection", { field })
    const op = `Scrape_${field}`

    // find connection type name from course field
    const courseField = fields.find((f) => f.name === field)
    const connectionTypeName = courseField ? unwrapTypeName(courseField.type) : null
    if (!connectionTypeName) {
      logger.error("unable to resolve connection type", { field })
      throw errors.new("connection type resolution failed")
    }
    const nodeTypeName = await getConnectionNodeType(connectionTypeName)
    if (!nodeTypeName) {
      logger.error("unable to resolve node type", { connectionTypeName })
      throw errors.new("node type resolution failed")
    }
    const nodeFields = await getTypeFields(nodeTypeName)
    // pick safe fields present on node type, and include possible content fields when available
    const candidates = ["_id", "id", "name", "title", "body", "description", "message", "html", "text"]
    const selected = ["__typename", ...candidates.filter((c) => nodeFields.has(c))]
    const nodesSelection = selected.join(" ")

    const query = `
      query ${op}($courseId: ID!, $first: Int!, $after: String) {
        course(id: $courseId) {
          ${field}(first: $first, after: $after) {
            nodes { ${nodesSelection} }
            pageInfo { hasNextPage endCursor }
          }
        }
      }
    `
    const pageNodesResult = await errors.try(
      paginateConnection(async (after) => {
        const raw = await client.rawQuery(op, query, { courseId: COURSE_ID, first: 50, after })
        const data = (raw as any)?.data?.course?.[field]
        if (!data) {
          logger.warn("connection unavailable or null, skipping", { field })
          return { nodes: [], pageInfo: { hasNextPage: false } }
        }
        return { nodes: data.nodes ?? [], pageInfo: data.pageInfo ?? { hasNextPage: false } }
      })
    )
    if (pageNodesResult.error) {
      logger.warn("connection scrape failed, skipping", { field, error: pageNodesResult.error })
      continue
    }
    results[field] = pageNodesResult.data
  }

  // 3) augment with REST content: page bodies, assignments, discussions, quizzes
  logger.info("fetching page bodies via rest")
  const pageBodies: Record<string, { title: string; url: string; body: string }> = {}
  const pagesResult = await errors.try(client.listPages(COURSE_ID))
  if (pagesResult.error) {
    logger.warn("rest pages list failed, skipping", { error: pagesResult.error })
    results["pageBodiesError"] = String(pagesResult.error)
  } else {
    for (const p of pagesResult.data) {
      if (!p.url) {
        logger.warn("page missing url, skipping", { pageId: p._id })
        continue
      }
      const detailResult = await errors.try(client.getPageDetail(COURSE_ID, p.url))
      if (detailResult.error) {
        logger.warn("page detail failed, skipping", { url: p.url, error: detailResult.error })
        continue
      }
      const d = detailResult.data
      const safeBody = d.body ?? ""
      pageBodies[p.url] = { title: d.title, url: d.url, body: safeBody }
    }
    results["pageBodies"] = pageBodies
  }

  logger.info("fetching assignment details via rest")
  const assignments = (results["assignmentsConnection"] as any[]) ?? []
  const assignmentDetails: Record<string, any> = {}
  for (const a of assignments) {
    const id = a?._id
    if (!id) continue
    const detailResult = await errors.try(client.getAssignmentDetail(COURSE_ID, String(id)))
    if (detailResult.error) {
      logger.warn("assignment detail failed, skipping", { id, error: detailResult.error })
      continue
    }
    assignmentDetails[String(id)] = detailResult.data
  }
  results["assignmentDetails"] = assignmentDetails

  logger.info("fetching discussions via rest")
  const discussionViews: Record<string, any> = {}
  const topicsResult = await errors.try(client.listDiscussionTopics(COURSE_ID))
  if (topicsResult.error) {
    logger.warn("discussion topics list failed, skipping", { error: topicsResult.error })
    results["discussionViewsError"] = String(topicsResult.error)
  } else {
    for (const t of topicsResult.data) {
      const viewResult = await errors.try(client.getDiscussionTopicView(COURSE_ID, t.id))
      if (viewResult.error) {
        logger.warn("discussion view failed, skipping", { id: t.id, error: viewResult.error })
        continue
      }
      discussionViews[String(t.id)] = viewResult.data
    }
    results["discussionViews"] = discussionViews
  }

  logger.info("fetching classic quiz questions via rest")
  const quizzes = (results["quizzesConnection"] as any[]) ?? []
  const quizQuestions: Record<string, any> = {}
  for (const q of quizzes) {
    const id = q?._id
    if (!id) continue
    const qsResult = await errors.try(client.getClassicQuizQuestions(COURSE_ID, String(id)))
    if (qsResult.error) {
      logger.warn("quiz questions fetch failed, skipping", { id, error: qsResult.error })
      continue
    }
    quizQuestions[String(id)] = qsResult.data
  }
  results["quizQuestions"] = quizQuestions

  // 3b) add a summary for quick scan
  const summary = {
    counts: Object.fromEntries(
      Object.entries(results)
        .filter(([k, v]) => Array.isArray(v))
        .map(([k, v]) => [k, (v as unknown[]).length])
    ),
    pagesWithBodies: pageBodies ? Object.keys(pageBodies).length : 0,
    assignmentsDetailed: Object.keys(assignmentDetails).length,
    discussionsDetailed: discussionViews ? Object.keys(discussionViews).length : 0,
    quizzesDetailed: Object.keys(quizQuestions).length
  }
  results["summary"] = summary

  // 4) write to file
  const json = JSON.stringify({ courseId: COURSE_ID, scrapedAt: new Date().toISOString(), results }, null, 2)
  const writeResult = await errors.try(fs.writeFile(OUTFILE, json, "utf-8"))
  if (writeResult.error) {
    logger.error("failed to write output", { error: writeResult.error, OUTFILE })
    throw errors.wrap(writeResult.error, "file write")
  }
  logger.info("wrote course scrape", { OUTFILE })
}

const result = await errors.try(main())
if (result.error) {
  logger.error("operation failed", { error: result.error })
  process.exit(1)
}


