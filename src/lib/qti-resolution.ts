import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { getAssessmentItems } from "@/lib/qti/redis/api"
import type { AssessmentTest, TestQuestionsResponse } from "@/lib/qti"

type ParsedAssessment = {
	testPartId: string
	sections: Array<{ id: string; itemIds: string[] }>
}

export function parseAssessmentTestXml(xml: string): ParsedAssessment {
	logger.debug("qti xml: parsing assessment test", { xmlLength: xml.length })

	// Extract test part identifier
	const testPartMatch = xml.match(/<qti-test-part[^>]*identifier="([^"]+)"/)
	if (!testPartMatch) {
		logger.error("qti xml: missing qti-test-part identifier", { xmlSample: xml.substring(0, 500) })
		throw errors.new("qti xml: missing test part")
	}
	const maybeTestPartId = testPartMatch[1]
	if (!maybeTestPartId) {
		logger.error("qti xml: test part missing identifier group", { xmlSample: xml.substring(0, 500) })
		throw errors.new("qti xml: missing test part id")
	}
	const testPartId = maybeTestPartId

	// Find all sections and their item refs
	const sectionRegex = /<qti-assessment-section[^>]*identifier="([^"]+)"[\s\S]*?<\/qti-assessment-section>/g
	const sections: Array<{ id: string; itemIds: string[] }> = []
	// eslint prefers avoiding assignment in conditionals; expand loop clearly
	// Collect matches first, then iterate
	const sectionMatches: RegExpExecArray[] = []
	while (true) {
		const m = sectionRegex.exec(xml)
		if (!m) break
		sectionMatches.push(m)
	}
	for (const m of sectionMatches) {
		const sectionId = m[1] ?? ""
		if (sectionId === "") {
			logger.error("qti xml: section without identifier")
			throw errors.new("qti xml: section id missing")
		}
		const sectionBlock = m[0] ?? ""
		if (sectionBlock === "") {
			logger.error("qti xml: empty section block", { sectionId })
			throw errors.new("qti xml: empty section block")
		}
		const itemRefRegex = /<qti-assessment-item-ref[^>]*identifier="([^"]+)"/g
		const itemIds: string[] = []
		const itemMatches: RegExpExecArray[] = []
		while (true) {
			const im = itemRefRegex.exec(sectionBlock)
			if (!im) break
			itemMatches.push(im)
		}
		for (const im of itemMatches) {
			const id = im[1]
			if (!id) {
				logger.error("qti xml: item ref without identifier", { sectionId })
				throw errors.new("qti xml: item ref id missing")
			}
			itemIds.push(id)
		}
		sections.push({ id: sectionId, itemIds })
	}

	if (sections.length === 0) {
		logger.error("qti xml: no sections found", { xmlSample: xml.substring(0, 500) })
		throw errors.new("qti xml: no sections")
	}

	const flatIds = sections.flatMap((s) => s.itemIds)
	if (flatIds.length === 0) {
		logger.error("qti xml: sections have no item refs", { sectionCount: sections.length })
		throw errors.new("qti xml: no item refs")
	}

	return { testPartId, sections }
}

export async function resolveAllQuestionsForTestFromXml(
	test: AssessmentTest
): Promise<TestQuestionsResponse["questions"]> {
	const parsed = parseAssessmentTestXml(test.rawXml)
	const allIds = Array.from(new Set(parsed.sections.flatMap((s) => s.itemIds)))

	logger.info("qti xml: resolving items for test", {
		testIdentifier: test.identifier,
		uniqueItemCount: allIds.length,
		sectionCount: parsed.sections.length
	})

	const itemsResult = await errors.try(getAssessmentItems(allIds))
	if (itemsResult.error) {
		logger.error("failed to fetch qti items for test", { error: itemsResult.error, testIdentifier: test.identifier })
		throw errors.wrap(itemsResult.error, "qti items fetch")
	}
	const items = itemsResult.data
	const itemById = new Map<string, (typeof items)[number]>(items.map((item) => [String(item.identifier), item]))

	// Build questions preserving section/testPart metadata
	const questions = parsed.sections.flatMap((section) => {
		return section.itemIds.map((id) => {
			const item = itemById.get(id)
			if (!item) {
				logger.error("qti item referenced in xml not found", { testIdentifier: test.identifier, itemId: id })
				throw errors.new("qti xml reference: item missing")
			}
			return {
				reference: {
					identifier: String(id),
					href: `/assessment-items/${id}`,
					testPart: parsed.testPartId,
					section: String(section.id)
				},
				question: item
			}
		})
	})

	logger.info("qti xml: resolved items for test", {
		testIdentifier: test.identifier,
		resolvedCount: questions.length
	})

	return questions
}
