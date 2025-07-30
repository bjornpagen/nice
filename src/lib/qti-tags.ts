/**
 * This file provides a canonical list of valid QTI 3.0 tags used within our application.
 * It serves as a single source of truth for validation and for providing context
 * to AI models tasked with generating or correcting QTI XML.
 *
 * All tags are prefixed with `qti-` as per the standard, based on the
 * "Question & Test Interoperability (QTI) 3.0 Best Practices and Implementation Guide".
 */
export const VALID_QTI_TAGS: Readonly<string[]> = [
	// Core Assessment Structure
	"qti-assessment-item",
	"qti-assessment-item-ref",
	"qti-assessment-section",
	"qti-assessment-section-ref",
	"qti-assessment-stimulus",
	"qti-assessment-stimulus-ref",
	"qti-assessment-test",
	"qti-test-part",

	// Declarations & Variables
	"qti-context-declaration",
	"qti-correct-response",
	"qti-default-value",
	"qti-outcome-declaration",
	"qti-response-declaration",
	"qti-template-declaration",
	"qti-template-default",
	"qti-variable",

	// Body & Content Containers
	"qti-content-body",
	"qti-item-body",
	"qti-stimulus-body",

	// Interactions (General)
	"qti-associate-interaction",
	"qti-choice-interaction",
	"qti-extended-text-interaction",
	"qti-gap-match-interaction",
	"qti-hottext-interaction",
	"qti-inline-choice-interaction",
	"qti-match-interaction",
	"qti-order-interaction",
	"qti-slider-interaction",
	"qti-text-entry-interaction",
	"qti-upload-interaction",

	// Interactions (Graphical & Object-based)
	"qti-drawing-interaction",
	"qti-graphic-associate-interaction",
	"qti-graphic-gap-match-interaction",
	"qti-graphic-order-interaction",
	"qti-hotspot-interaction",
	"qti-media-interaction",
	"qti-position-object-interaction",
	"qti-select-point-interaction",

	// Interactions (Custom & Special Purpose)
	"qti-custom-interaction",
	"qti-end-attempt-interaction",
	"qti-portable-custom-interaction",

	// Interaction Components & Children
	"qti-associable-hotspot",
	"qti-gap",
	"qti-gap-img",
	"qti-gap-text",
	"qti-hotspot-choice",
	"qti-hottext",
	"qti-inline-choice",
	"qti-interaction-markup",
	"qti-interaction-module",
	"qti-interaction-modules",
	"qti-label",
	"qti-position-object-stage",
	"qti-prompt",
	"qti-simple-associable-choice",
	"qti-simple-choice",
	"qti-simple-match-set",

	// Feedback & Rubrics
	"qti-feedback-block",
	"qti-feedback-inline",
	"qti-modal-feedback",
	"qti-rubric-block",
	"qti-test-feedback",

	// Response & Outcome Processing (Logic & Rules)
	"qti-outcome-condition",
	"qti-outcome-else",
	"qti-outcome-else-if",
	"qti-outcome-if",
	"qti-outcome-processing",
	"qti-response-condition",
	"qti-response-else",
	"qti-response-else-if",
	"qti-response-if",
	"qti-response-processing",
	"qti-set-correct-response",
	"qti-set-outcome-value",

	// Processing Expressions & Operators
	"qti-and",
	"qti-area-map-entry",
	"qti-area-mapping",
	"qti-base-value",
	"qti-correct",
	"qti-custom-operator",
	"qti-delete",
	"qti-divide",
	"qti-equal",
	"qti-equal-rounded",
	"qti-field-value",
	"qti-gcd",
	"qti-gt",
	"qti-index",
	"qti-integer-divide",
	"qti-integer-modulus",
	"qti-integer-to-float",
	"qti-is-null",
	"qti-lookup-outcome-value",
	"qti-lt",
	"qti-map-entry",
	"qti-map-response",
	"qti-mapping",
	"qti-match",
	"qti-match-table",
	"qti-match-table-entry",
	"qti-math-constant",
	"qti-math-operator",
	"qti-max",
	"qti-member",
	"qti-min",
	"qti-multiple",
	"qti-not",
	"qti-or",
	"qti-ordered",
	"qti-product",
	"qti-random",
	"qti-random-integer",
	"qti-repeat",
	"qti-round-to",
	"qti-stats-operator",
	"qti-sum",
	"qti-test-variables",
	"qti-value",

	// Templating
	"qti-context-variable",
	"qti-printed-variable",
	"qti-set-template-value",
	"qti-template-block",
	"qti-template-condition",
	"qti-template-constraint",
	"qti-template-else",
	"qti-template-else-if",
	"qti-template-if",
	"qti-template-inline",
	"qti-template-processing",
	"qti-template-variable",

	// Test-level Sequencing & Control
	"qti-adaptive-selection",
	"qti-branch-rule",
	"qti-item-session-control",
	"qti-ordering",
	"qti-pre-condition",
	"qti-selection",

	// Accessibility & Supplemental Content (Catalogs)
	"qti-card",
	"qti-card-entry",
	"qti-catalog",
	"qti-catalog-info",
	"qti-file-href",
	"qti-html-content",

	// Companion Materials & Resources
	"qti-calculator",
	"qti-calculator-type",
	"qti-companion-materials-info",
	"qti-description",
	"qti-digital-material",
	"qti-increment-US",
	"qti-major-increment",
	"qti-minimum-length",
	"qti-minor-increment",
	"qti-physical-material",
	"qti-protractor",
	"qti-resource-icon",
	"qti-rule",
	"qti-rule-system-SI",
	"qti-stylesheet"
] as const

/**
 * A canonical list of all valid QTI 3.0 interaction tags that can contain a <qti-prompt>.
 * This is used by the validation pipeline to enforce correct prompt placement.
 */
export const QTI_INTERACTION_TAGS: Readonly<string[]> = [
	// Interactions (General)
	"qti-associate-interaction",
	"qti-choice-interaction",
	"qti-extended-text-interaction",
	"qti-gap-match-interaction",
	"qti-hottext-interaction",
	"qti-inline-choice-interaction",
	"qti-match-interaction",
	"qti-order-interaction",
	"qti-slider-interaction",
	"qti-text-entry-interaction",
	"qti-upload-interaction",
	// Interactions (Graphical & Object-based)
	"qti-drawing-interaction",
	"qti-graphic-associate-interaction",
	"qti-graphic-gap-match-interaction",
	"qti-graphic-order-interaction",
	"qti-hotspot-interaction",
	"qti-media-interaction",
	"qti-position-object-interaction",
	"qti-select-point-interaction",
	// Interactions (Custom & Special Purpose)
	"qti-custom-interaction",
	"qti-portable-custom-interaction"
] as const
