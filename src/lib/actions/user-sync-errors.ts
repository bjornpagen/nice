import * as errors from "@superbuilders/errors"

// Custom error constants for type-safe error checking
export const ErrUserNotAuthenticated = errors.new("user not authenticated")
export const ErrUserEmailRequired = errors.new("user email required for sync")
export const ErrInvalidEmailFormat = errors.new("invalid email format")
export const ErrUserNotProvisionedInOneRoster = errors.new("user not provisioned in oneroster")
export const ErrOneRosterQueryFailed = errors.new("failed to query OneRoster")
export const ErrClerkMetadataUpdateFailed = errors.new("failed to update user metadata")
export const ErrInputValidationFailed = errors.new("input validation failed")
