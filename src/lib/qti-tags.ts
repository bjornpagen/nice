/**
 * This file provides a canonical list of valid QTI 3.0 tags used within our application.
 * It serves as a single source of truth for validation and for providing context
 * to AI models tasked with generating or correcting QTI XML.
 *
 * All tags are prefixed with `qti-` as per the standard.
 */
export const VALID_QTI_TAGS: Readonly<string[]> = [
	// Core assessment structure
	"qti-assessment-item",
	"qti-assessment-stimulus",
	"qti-assessment-test",
	"qti-test-part",
	"qti-assessment-section",
	"qti-assessment-item-ref",

	// Response and outcome declarations
	"qti-response-declaration",
	"qti-outcome-declaration",
	"qti-correct-response",
	"qti-value",
	"qti-default-value",
	"qti-mapping",
	"qti-map-entry",

	// Body elements
	"qti-item-body",
	"qti-stimulus-body",
	"qti-content-body",

	// Interactions
	"qti-choice-interaction",
	"qti-simple-choice",
	"qti-text-entry-interaction",
	"qti-extended-text-interaction",

	// Prompts and feedback
	"qti-prompt",
	"qti-feedback-inline",
	"qti-feedback-block",

	// Response processing
	"qti-response-processing",
	"qti-response-condition",
	"qti-response-if",
	"qti-response-else",

	// Conditional processing elements
	"qti-if",
	"qti-else",
	"qti-and",
	"qti-or",
	"qti-not",
	"qti-match",
	"qti-variable",
	"qti-correct",
	"qti-set-outcome-value",
	"qti-base-value"
] as const
