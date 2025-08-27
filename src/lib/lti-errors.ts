import * as errors from "@superbuilders/errors"

// Custom error constants for type-safe error checking in the LTI launch flow.
export const ErrLtiLaunchFailed = errors.new("lti launch failed")
export const ErrTokenVerificationFailed = errors.new("lti token verification failed")
export const ErrMissingToken = errors.new("id_token is required")
export const ErrMissingTokenClaims = errors.new("token missing required claims")
export const ErrClerkUserCreationFailed = errors.new("clerk user creation failed")
export const ErrClerkMetadataUpdateFailed = errors.new("clerk metadata update failed")
export const ErrMissingTargetLinkUri = errors.new("target_link_uri is required")
export const ErrInvalidRedirectUri = errors.new("redirect URI is not allowed")
export const ErrNonceReplayed = errors.new("nonce has already been used")
