import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import type { Question } from "@/lib/types/domain"

// random shuffle is removed; all ordering is deterministic

/**
 * Parses a QTI assessment test's XML to apply selection and ordering rules.
 * Honors qti-ordering (shuffle) and qti-selection (select count) per section.
 * Provides deterministic non-repetition across attempts when baseSeed+attempt are provided.
 */
export function applyQtiSelectionAndOrdering(
	assessmentTest: AssessmentTest,
	allQuestions: TestQuestionsResponse["questions"],
	options?: {
		baseSeed?: string
		attemptNumber?: number
		// For stateless cross-assessment de-duplication and selection diversity
		userSourceId?: string
		resourceSourcedId?: string
	}
): Question[] {
	const xml = assessmentTest.rawXml
	const allQuestionsMap = new Map(allQuestions.map((q) => [q.question.identifier, q]))

	logger.debug("applyQtiSelectionAndOrdering: starting processing", {
		testIdentifier: assessmentTest.identifier,
		totalQuestionsProvided: allQuestions.length,
		xmlLength: xml.length
	})

	logger.debug("applyQtiSelectionAndOrdering: XML sample", {
		testIdentifier: assessmentTest.identifier,
		xmlSample: xml.substring(0, 1000)
	})

	const sectionRegex = /<qti-assessment-section[^>]*>([\s\S]*?)<\/qti-assessment-section>/g
	const sections = [...xml.matchAll(sectionRegex)]

	logger.debug("applyQtiSelectionAndOrdering: found sections", {
		testIdentifier: assessmentTest.identifier,
		sectionCount: sections.length
	})

	if (sections.length === 0) {
		logger.debug("no qti sections found, returning all questions", { testIdentifier: assessmentTest.identifier })
		return allQuestions.map((q) => ({ id: q.question.identifier }))
	}

	const selectedQuestionIds: string[] = []

	function fnv1aHash(input: string): number {
		let hash = 0x811c9dc5
		for (let i = 0; i < input.length; i++) {
			hash ^= input.charCodeAt(i)
			hash = (hash >>> 0) * 0x01000193
		}
		return hash >>> 0
	}

	function deterministicallyOrder(values: string[], seed: string): string[] {
		return [...values]
			.map((v) => ({ v, h: fnv1aHash(`${seed}:${v}`) }))
			.sort((a, b) => (a.h === b.h ? (a.v < b.v ? -1 : 1) : a.h - b.h))
			.map((x) => x.v)
	}

	function gcd(a: number, b: number): number {
		let x = Math.abs(a)
		let y = Math.abs(b)
		while (y !== 0) {
			const t = y
			y = x % y
			x = t
		}
		return x
	}

	for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
		const sectionMatch = sections[sectionIndex]
		const sectionContent = sectionMatch?.[1] ?? ""

		const itemRefRegex = /<qti-assessment-item-ref[^>]*identifier="(?<identifier>[^"]+)"/g
		let itemRefs = [...sectionContent.matchAll(itemRefRegex)].map((match) => match.groups?.identifier ?? "")

		logger.debug("applyQtiSelectionAndOrdering: processing section", {
			testIdentifier: assessmentTest.identifier,
			sectionIndex,
			itemRefsFound: itemRefs.length,
			itemRefs: itemRefs.slice(0, 5)
		})

		const orderingMatch = sectionContent.match(/<qti-ordering[^>]*shuffle="true"/)
		if (orderingMatch) {
			logger.debug("applyQtiSelectionAndOrdering: shuffling enabled for section", {
				testIdentifier: assessmentTest.identifier,
				sectionIndex
			})
			const sectionIdMatch = sectionContent.match(/identifier="([^"]+)"/)
			if (!sectionIdMatch || !sectionIdMatch[1]) {
				logger.error("missing section identifier in qti section", {
					testIdentifier: assessmentTest.identifier,
					sectionIndex
				})

				throw errors.new("qti section missing identifier")
			}
			const sectionId = sectionIdMatch[1]
			const seedBase = options?.baseSeed ?? assessmentTest.identifier
			const seed = `${seedBase}:${assessmentTest.identifier}:${sectionId}`
			itemRefs = deterministicallyOrder(itemRefs, seed)
		}

		// Note: Do NOT reorder by partition here. Partition preference is applied
		// during selection to preserve author order when shuffle="false".

		const selectionMatch = sectionContent.match(/<qti-selection[^>]*select="(?<selectCount>\d+)"/)
		const selectCountStr = selectionMatch?.groups?.selectCount
		if (selectCountStr) {
			const selectCount = Number.parseInt(selectCountStr, 10)
			if (!Number.isNaN(selectCount)) {
				logger.debug("applyQtiSelectionAndOrdering: applying selection limit", {
					testIdentifier: assessmentTest.identifier,
					sectionIndex,
					selectCount,
					itemRefsBeforeSelection: itemRefs.length,
					itemRefsAfterSelection: Math.min(selectCount, itemRefs.length)
				})
				const n = itemRefs.length
				const k = Math.min(selectCount, n)
				const attemptIndex = options?.attemptNumber ?? 0
				if (n > 0 && k > 0) {
					// When an attempt number is provided, rotation windows must be disjoint until full coverage.
					// To guarantee this, disable per-user partitioning during rotation; otherwise duplicates can
					// occur across attempts before coverage.
					const userIdForPartition = options?.attemptNumber !== undefined ? undefined : options?.userSourceId
					const resourceId = options?.resourceSourcedId ?? assessmentTest.identifier
					const T = 3
					// Determine preferred starting bucket based on resource id
					const startBucket = userIdForPartition ? fnv1aHash(resourceId) % T : 0

					// Build candidate index sequence
					const sectionIdMatch = sectionContent.match(/identifier="([^"]+)"/)
					const sectionId = sectionIdMatch?.[1] ?? `${sectionIndex}`
					const seedBase = options?.baseSeed ?? assessmentTest.identifier
					let indices: number[] = []

					const orderingMatchLocal = sectionContent.match(/<qti-ordering[^>]*shuffle="true"/)
					if (orderingMatchLocal) {
						// Shuffle allowed: use stride sequence for better spread
						let step = 1
						if (n > 1) {
							step = 1 + (fnv1aHash(`${seedBase}:${assessmentTest.identifier}:${sectionId}:step`) % (n - 1))
							let guard = 0
							while (gcd(step, n) !== 1 && guard < n) {
								step = (step % (n - 1)) + 1
								guard++
							}
						}
						const perAssessmentOffset = fnv1aHash(`${resourceId}:offset`) % n
						const offset = (attemptIndex * k + perAssessmentOffset) % n
						indices = Array.from({ length: n }, (_, i) => (offset + i * step) % n)
						logger.debug("applyQtiSelectionAndOrdering: stride candidate sequence", {
							testIdentifier: assessmentTest.identifier,
							sectionIndex,
							n,
							k,
							step,
							offset
						})
					} else {
						// No shuffle: preserve author order modulo rotation
						const perAssessmentOffset = fnv1aHash(`${resourceId}:offset`) % n
						const offset = (attemptIndex * k + perAssessmentOffset) % n
						indices = Array.from({ length: n }, (_, i) => (offset + i) % n)
						logger.debug("applyQtiSelectionAndOrdering: sequential candidate sequence", {
							testIdentifier: assessmentTest.identifier,
							sectionIndex,
							n,
							k,
							offset
						})
					}

					// Partition preference: select items from preferred bucket first,
					// then spill over deterministically to remaining buckets.
					const selection: string[] = []
					if (userIdForPartition) {
						for (let pass = 0; pass < T && selection.length < k; pass++) {
							const bucket = (startBucket + pass) % T
							for (const idx of indices) {
								if (selection.length >= k) break
								const id = itemRefs[idx]
								if (id === undefined) continue
								const b = fnv1aHash(`${userIdForPartition}:${id}`) % T
								if (b === bucket) {
									selection.push(id)
								}
							}
						}
					} else {
						// No partition context: just take first k in candidate order
						for (const idx of indices) {
							if (selection.length >= k) break
							const id = itemRefs[idx]
							if (id !== undefined) selection.push(id)
						}
					}
					itemRefs = selection
				}
			} else {
				logger.warn("invalid non-numeric select attribute in QTI test", {
					testIdentifier: assessmentTest.identifier,
					selectAttribute: selectCountStr
				})
			}
		} else {
			logger.debug("applyQtiSelectionAndOrdering: no selection limit for section", {
				testIdentifier: assessmentTest.identifier,
				sectionIndex
			})
		}

		selectedQuestionIds.push(...itemRefs)
	}

	if (selectedQuestionIds.length === 0) {
		logger.error("CRITICAL: QTI parsing failed - no questions selected", {
			testIdentifier: assessmentTest.identifier,
			sectionCount: sections.length,
			xmlLength: xml.length,
			xmlSample: xml.substring(0, 500)
		})
		throw errors.new("QTI assessment parsing: no questions selected")
	}

	const finalQuestions: Question[] = []
	for (const id of selectedQuestionIds) {
		const q = allQuestionsMap.get(id)
		if (!q) {
			logger.error("qti references question that was not provided", {
				testIdentifier: assessmentTest.identifier,
				questionId: id
			})
			throw errors.new("qti question reference missing")
		}
		finalQuestions.push({ id: q.question.identifier })
	}

	logger.info("applied qti selection and ordering rules", {
		testIdentifier: assessmentTest.identifier,
		initialCount: allQuestions.length,
		finalCount: finalQuestions.length,
		selectedQuestionIds: selectedQuestionIds.length,
		sectionsProcessed: sections.length
	})

	return finalQuestions
}
