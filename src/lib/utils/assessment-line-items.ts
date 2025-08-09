/**
 * Utility functions for converting between resource IDs and assessment line item IDs.
 *
 * This module handles the conversion logic in one place to ensure consistency
 * across the entire application when working with OneRoster assessment line items.
 */

/**
 * Converts a resource ID to its corresponding assessment line item ID.
 *
 * @param resourceId - The OneRoster resource sourcedId (e.g., "nice_xa3cbcc67cc56d4a1")
 * @returns The assessment line item sourcedId (e.g., "nice_xa3cbcc67cc56d4a1_ali")
 */
export function getAssessmentLineItemId(resourceId: string): string {
	return `${resourceId}_ali`
}

/**
 * Converts an assessment line item ID back to its original resource ID.
 *
 * @param lineItemId - The assessment line item sourcedId (e.g., "nice_xa3cbcc67cc56d4a1_ali")
 * @returns The original resource sourcedId (e.g., "nice_xa3cbcc67cc56d4a1")
 */
export function getResourceIdFromLineItem(lineItemId: string): string {
	return lineItemId.replace("_ali", "")
}

/**
 * Checks if a given ID is an assessment line item ID (ends with '_ali').
 *
 * @param id - The ID to check
 * @returns True if the ID appears to be an assessment line item ID
 */
export function isAssessmentLineItemId(id: string): boolean {
	return id.endsWith("_ali")
}

/**
 * Converts an array of resource IDs to their corresponding assessment line item IDs.
 *
 * @param resourceIds - Array of resource sourcedIds
 * @returns Array of assessment line item sourcedIds
 */
export function getAssessmentLineItemIds(resourceIds: string[]): string[] {
	return resourceIds.map(getAssessmentLineItemId)
}
