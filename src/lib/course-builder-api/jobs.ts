import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { z } from "zod"
import { redis } from "@/lib/redis"

const JOB_KEY_PREFIX = "course_builder:job:"
const JOB_TTL_SECONDS = 48 * 60 * 60 // 48 hours

export const JobStatusSchema = z.enum(["queued", "running", "completed", "failed"])
export const JobStepSchema = z.enum([
  "fetch_user",
  "fetch_resources",
  "fetch_stimuli_and_assessments",
  "fetch_case_details",
  "generate_ai_plan",
  "build_payload",
  "create_course",
  "create_components",
  "create_resources",
  "link_resources",
  "create_alis",
  "copy_qti",
  "create_class",
  "enroll_student"
])

export const JobDocumentSchema = z.object({
  id: z.string(),
  status: JobStatusSchema,
  step: JobStepSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  inputSummary: z.object({
    subject: z.string(),
    caseCount: z.number(),
    studentUserId: z.string()
  }),
  result: z
    .object({
      courseSourcedId: z.string(),
      classSourcedId: z.string()
    })
    .nullable(),
  error: z
    .object({
      message: z.string()
    })
    .nullable()
})
export type JobDocument = z.infer<typeof JobDocumentSchema>

function getJobKey(jobId: string): string {
  return `${JOB_KEY_PREFIX}${jobId}`
}

export async function createJob(
  jobId: string,
  inputSummary: { studentUserId: string; subject: string; caseCount: number }
): Promise<void> {
  const now = new Date().toISOString()
  const job: JobDocument = {
    id: jobId,
    status: "queued",
    step: null,
    createdAt: now,
    updatedAt: now,
    inputSummary,
    result: null,
    error: null
  }

  const key = getJobKey(jobId)
  const setResult = await errors.try(redis.set(key, JSON.stringify(job), { EX: JOB_TTL_SECONDS }))
  if (setResult.error) {
    logger.error("job create: redis set failed", { key, error: setResult.error })
    throw errors.wrap(setResult.error, "redis set job create")
  }
}

export async function getJob(jobId: string): Promise<JobDocument | null> {
  const key = getJobKey(jobId)
  const getResult = await errors.try(redis.get(key))
  if (getResult.error) {
    logger.error("job get: redis get failed", { key, error: getResult.error })
    throw errors.wrap(getResult.error, "redis get job")
  }

  const value = getResult.data
  if (!value) return null

  const parseResult = errors.trySync(() => JSON.parse(value))
  if (parseResult.error) {
    logger.error("job get: parse failed", { key, error: parseResult.error })
    throw errors.wrap(parseResult.error, "job parse")
  }

  const validation = JobDocumentSchema.safeParse(parseResult.data)
  if (!validation.success) {
    logger.error("job get: invalid job document", { key, error: validation.error })
    throw errors.wrap(validation.error, "invalid job document in redis")
  }
  return validation.data
}

async function updateJob(jobId: string, updates: Partial<Omit<JobDocument, "id" | "createdAt">>): Promise<void> {
  const existing = await getJob(jobId)
  if (!existing) {
    logger.error("job update: job not found", { jobId })
    throw errors.new("job not found for update")
  }
  const merged: JobDocument = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  }
  const key = getJobKey(jobId)
  const setResult = await errors.try(redis.set(key, JSON.stringify(merged), { EX: JOB_TTL_SECONDS }))
  if (setResult.error) {
    logger.error("job update: redis set failed", { key, error: setResult.error })
    throw errors.wrap(setResult.error, "redis set job update")
  }
}

export async function updateJobProgress(jobId: string, step: z.infer<typeof JobStepSchema>): Promise<void> {
  await updateJob(jobId, { status: "running", step })
}

export async function updateJobError(jobId: string, message: string): Promise<void> {
  await updateJob(jobId, { status: "failed", error: { message } })
}

export async function updateJobResult(jobId: string, result: { courseSourcedId: string; classSourcedId: string }): Promise<void> {
  await updateJob(jobId, { status: "completed", result })
}


