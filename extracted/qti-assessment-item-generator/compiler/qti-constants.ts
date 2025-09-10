/**
 * QTI-related constants and patterns
 * This file contains constants that are shared across the QTI generation modules.
 * It's kept separate to avoid circular dependencies.
 */

// Safe identifier pattern: strictly alphanumeric and underscores, starting with letter or underscore
// This pattern is used throughout QTI to validate identifiers for responses, choices, etc.
export const SAFE_IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
