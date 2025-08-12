import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"
import type { Question } from "@/lib/types/domain"

function shuffleArray<T>(array: T[]): T[] {
	const shuffled = [...array]
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		const elementI = shuffled[i]
		const elementJ = shuffled[j]
		if (elementI !== undefined && elementJ !== undefined) {
			shuffled[i] = elementJ
			shuffled[j] = elementI
		}
	}
	return shuffled
}

/**
 * Parses a QTI assessment test's XML to apply selection and ordering rules.
 * Honors qti-ordering (shuffle) and qti-selection (select count) per section.
 * Provides deterministic non-repetition across attempts when baseSeed+attempt are provided.
 */
export function applyQtiSelectionAndOrdering(
	assessmentTest: AssessmentTest,
	allQuestions: TestQuestionsResponse["questions"],
	options?: { baseSeed?: string; attemptNumber?: number }
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
			if (options?.baseSeed) {
				const seed = `${options.baseSeed}:${assessmentTest.identifier}:${sectionId}`
				itemRefs = deterministicallyOrder(itemRefs, seed)
			} else {
				itemRefs = shuffleArray(itemRefs)
			}
		}

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
				if (options?.baseSeed !== undefined && options?.attemptNumber !== undefined && itemRefs.length > 0) {
					const n = itemRefs.length
					const k = Math.min(selectCount, n)
					const attemptIndex = options.attemptNumber >= 0 ? options.attemptNumber : 0
					const offset = (attemptIndex * k) % n
					const window: string[] = []
					for (let i = 0; i < k; i++) {
						const idx = (offset + i) % n
						const ref = itemRefs[idx]
						if (ref !== undefined) {
							window.push(ref)
						}
					}
					itemRefs = window
				} else {
					itemRefs = itemRefs.slice(0, selectCount)
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
