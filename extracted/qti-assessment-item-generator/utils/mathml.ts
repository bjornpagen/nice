// Minimal check: only verifies the string starts with '<' and ends with '>' (whitespace allowed around).
// Intentionally uses only basic regex features to maximize compatibility with external validators.
export const MATHML_INNER_PATTERN = /^\s*<.*>\s*$/
