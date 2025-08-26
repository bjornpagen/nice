import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import { qti } from "@/lib/clients"
import { ErrQtiNotFound } from "@/lib/qti"
import { extractTitle, replaceRootAttributes } from "@/lib/xml-utils"

// A hardcoded, deterministic temporary identifier prefix to prevent collisions with production data.
const TEMP_IDENTIFIER_PREFIX = "ghetto_validation_tmp"

export type GhettoValidationResult = {
	success: boolean
	error?: unknown
}

/**
 * Validates a single QTI Assessment Item by performing a safe "upsert-then-delete"
 * operation against the QTI provider using a temporary identifier.
 *
 * @param xml The XML content of the assessment item.
 * @param originalIdentifier The intended final identifier of the item (e.g., `nice_xyz`).
 * @returns A promise resolving to a result object indicating success or failure.
 */
export async function ghettoValidateItem(xml: string, originalIdentifier: string): Promise<GhettoValidationResult> {
	const tempIdentifier = `${TEMP_IDENTIFIER_PREFIX}_${originalIdentifier}`
	const title = extractTitle(xml)
	if (!title || title.trim() === "") {
		return { success: false, error: errors.new("missing title in xml") }
	}
	const validationXml = replaceRootAttributes(xml, "qti-assessment-item", tempIdentifier, title)
	const updateResult = await errors.try(qti.updateAssessmentItem({ identifier: tempIdentifier, xml: validationXml }))
	if (updateResult.error) {
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(qti.createAssessmentItem({ xml: validationXml }))
			if (createResult.error) {
				return { success: false, error: createResult.error }
			}
		} else {
			return { success: false, error: updateResult.error }
		}
	}
	const deleteResult = await errors.try(qti.deleteAssessmentItem(tempIdentifier))
	if (deleteResult.error) {
		logger.warn("failed to clean up temp validation item", { identifier: tempIdentifier, error: deleteResult.error })
	}
	return { success: true }
}

/**
 * Validates a single QTI Assessment Test by performing a safe "upsert-then-delete"
 * operation against the QTI provider using a temporary identifier.
 *
 * @param xml The XML content of the assessment test.
 * @param originalIdentifier The intended final identifier of the test (e.g., `nice_xyz`).
 * @returns A promise resolving to a result object indicating success or failure.
 */
export async function ghettoValidateTest(xml: string, originalIdentifier: string): Promise<GhettoValidationResult> {
	const tempIdentifier = `${TEMP_IDENTIFIER_PREFIX}_${originalIdentifier}`
	const title = extractTitle(xml)
	if (!title || title.trim() === "") {
		return { success: false, error: errors.new("missing title in xml") }
	}
	const validationXml = replaceRootAttributes(xml, "qti-assessment-test", tempIdentifier, title)
	const updateResult = await errors.try(qti.updateAssessmentTest(tempIdentifier, validationXml))
	if (updateResult.error) {
		if (errors.is(updateResult.error, ErrQtiNotFound)) {
			const createResult = await errors.try(qti.createAssessmentTest(validationXml))
			if (createResult.error) {
				return { success: false, error: createResult.error }
			}
		} else {
			return { success: false, error: updateResult.error }
		}
	}
	const deleteResult = await errors.try(qti.deleteAssessmentTest(tempIdentifier))
	if (deleteResult.error) {
		logger.warn("failed to clean up temp validation test", { identifier: tempIdentifier, error: deleteResult.error })
	}
	return { success: true }
}
