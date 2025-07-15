// Extract YouTube ID from URL
export function extractYouTubeId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
		/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
	]

	for (const pattern of patterns) {
		const match = url.match(pattern)
		if (match) {
			return match[1] ?? null
		}
	}

	return null
}

// Get metadata value safely
export function getMetadataValue(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
	if (!metadata || !(key in metadata)) return undefined
	const value = metadata[key]
	return typeof value === "string" ? value : undefined
}
