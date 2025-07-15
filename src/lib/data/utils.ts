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
