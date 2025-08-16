// Utilities for thinning axis/category labels to avoid overlap

/**
 * Compute equally spaced indices over a total count.
 */
export function computeEquallySpacedIndices(totalCount: number, maxCount: number): number[] {
  if (totalCount <= 0) return []
  if (maxCount <= 1) return [0]
  if (totalCount <= maxCount) return Array.from({ length: totalCount }, (_, i) => i)
  const step = (totalCount - 1) / (maxCount - 1)
  const indices: number[] = []
  for (let k = 0; k < maxCount; k++) {
    const raw = Math.round(k * step)
    const idx = Math.max(0, Math.min(totalCount - 1, raw))
    indices.push(idx)
  }
  // De-duplicate while preserving order
  return Array.from(new Set(indices))
}

/**
 * Compute a set of label indices to render given total slots, a set of candidates
 * (e.g., non-empty labels), available width and minimum pixel spacing.
 * Uses equal-interval ideal positions, mapped to nearest available candidates.
 */
export function computeLabelSelection(
  totalCount: number,
  candidates: number[],
  chartWidthPx: number,
  minLabelSpacingPx: number
): Set<number> {
  const maxLabels = Math.max(1, Math.floor(chartWidthPx / Math.max(1, minLabelSpacingPx)))
  const ideal = computeEquallySpacedIndices(totalCount, maxLabels)
  if (candidates.length === 0) {
    return new Set<number>(ideal)
  }
  // Map each ideal index to the nearest available candidate to favor equal spacing
  const remaining = new Set<number>(candidates)
  const chosen: number[] = []
  for (const idx of ideal) {
    let best: number | null = null
    let bestDist = Infinity
    for (const c of remaining) {
      const d = Math.abs(c - idx)
      if (d < bestDist) {
        bestDist = d
        best = c
      }
      if (bestDist === 0) break
    }
    if (best !== null) {
      chosen.push(best)
      remaining.delete(best)
    }
  }
  // Fill if needed
  if (chosen.length < Math.min(maxLabels, candidates.length)) {
    for (const c of remaining) {
      chosen.push(c)
      if (chosen.length >= Math.min(maxLabels, candidates.length)) break
    }
  }
  return new Set<number>(chosen)
}


