import { createHash } from "node:crypto"
import * as errors from "@superbuilders/errors"

export type KBucketingQuestion = {
	/** Stable unique identifier for the question (e.g., khan id) */
	id: string
	/** Problem type label from source data used for grouping */
	problemType: string
}

export type KBucketingResult = {
	/**
	 * Array of buckets, each bucket being a non-empty array of questions.
	 * The number of buckets is min(kTarget, questions.length).
	 */
	buckets: KBucketingQuestion[][]
	/** Actual number of buckets produced */
	bucketCount: number
}

/**
 * Build K deterministic buckets of questions, prioritizing problem-type diversity.
 *
 * Determinism is derived from the provided seed.
 *
 * Behavior:
 * - Groups questions by `problemType` and deterministically sorts both problem types and their items by hashing
 *   with the given seed.
 * - Produces exactly `min(kTarget, questions.length)` non-empty buckets.
 * - Interleaves questions from different problem types in a round-robin before dealing into K buckets to balance variety.
 * - If `questions.length === 0` or `kTarget <= 0`, throws an error.
 *
 * This function never logs; callers (e.g., Inngest functions) should log before invoking or when catching errors.
 */
export function buildDeterministicKBuckets(
	seed: string,
	questions: ReadonlyArray<KBucketingQuestion>,
	kTarget: number
): KBucketingResult {
	if (kTarget <= 0) {
		throw errors.new("k-bucketing: invalid target")
	}
	const total = questions.length
	if (total === 0) {
		throw errors.new("k-bucketing: no questions")
	}

	const k = Math.min(kTarget, total)

	// Group by problem type
	const byProblemType = new Map<string, KBucketingQuestion[]>()
	for (const q of questions) {
		if (!byProblemType.has(q.problemType)) {
			byProblemType.set(q.problemType, [])
		}
		const list = byProblemType.get(q.problemType)
		if (list) {
			list.push(q)
		} else {
			byProblemType.set(q.problemType, [q])
		}
	}

	// Deterministic order of problem types based on seed
	const ptOrder = Array.from(byProblemType.keys()).sort((a, b) => {
		const ha = createHash("sha256").update(`${seed}:pt:${a}`).digest("hex")
		const hb = createHash("sha256").update(`${seed}:pt:${b}`).digest("hex")
		if (ha < hb) return -1
		if (ha > hb) return 1
		return 0
	})

	// Deterministic order of items within each problem type
	const ptToItems = new Map<string, KBucketingQuestion[]>(
		ptOrder.map((pt) => {
			const items = (byProblemType.get(pt) || []).slice().sort((x, y) => {
				const hx = createHash("sha256").update(`${seed}:pt:${pt}:q:${x.id}`).digest("hex")
				const hy = createHash("sha256").update(`${seed}:pt:${pt}:q:${y.id}`).digest("hex")
				if (hx < hy) return -1
				if (hx > hy) return 1
				return 0
			})
			return [pt, items] as const
		})
	)

	// Interleave across problem types to maximize diversity
	const merged: KBucketingQuestion[] = []
	let progressed = true
	while (progressed) {
		progressed = false
		for (const pt of ptOrder) {
			const arr = ptToItems.get(pt) || []
			const next = arr.shift()
			if (next) {
				merged.push(next)
				progressed = true
			}
		}
	}

	// Deal into K buckets round-robin
	const buckets: KBucketingQuestion[][] = Array.from({ length: k }, () => [])
	for (let i = 0; i < merged.length; i++) {
		const targetIndex = i % k
		const bucket = buckets[targetIndex]
		const item = merged[i]
		if (bucket && item) {
			bucket.push(item)
		}
	}

	// Robustness: ensure all buckets are non-empty
	for (let i = 0; i < buckets.length; i++) {
		const b = buckets[i]
		if (!b || b.length === 0) {
			throw errors.new("k-bucketing: empty bucket produced")
		}
	}

	return { buckets, bucketCount: buckets.length }
}
