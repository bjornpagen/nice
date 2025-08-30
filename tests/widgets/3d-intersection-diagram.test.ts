import { expect, test } from "bun:test"
import { generateMock } from '@anatine/zod-mock'
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generateThreeDIntersectionDiagram, ThreeDIntersectionDiagramPropsSchema } from "@/lib/widgets/generators"

type ThreeDIntersectionDiagramInput = z.input<typeof ThreeDIntersectionDiagramPropsSchema>

const validateAndGenerate = (input: ThreeDIntersectionDiagramInput): string => {
  const parseResult = errors.trySync(() => ThreeDIntersectionDiagramPropsSchema.parse(input))
  if (parseResult.error) {
    logger.error("input validation", { error: parseResult.error })
    throw errors.wrap(parseResult.error, "input validation")
  }
  const parsed = parseResult.data
  
  // Check for unbounded values that would cause rendering issues
  const checkUnboundedValues = (obj: any, path: string = ""): void => {
    if (typeof obj === 'number') {
      if (obj > 10000 || obj < -10000) {
        throw new Error(`Unbounded value detected at ${path}: ${obj}. Widget schemas should have reasonable constraints.`)
      }
      if (!isFinite(obj)) {
        throw new Error(`Non-finite value detected at ${path}: ${obj}. Widget schemas should prevent infinite values.`)
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        checkUnboundedValues(item, `${path}[${index}]`)
      })
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        checkUnboundedValues(value, `${path}.${key}`)
      })
    }
  }
  
  checkUnboundedValues(parsed, "input")
  
  return generateThreeDIntersectionDiagram(parsed)
}

// ============================================================================
// NORMAL VARIATIONS (10 individual tests)
// ============================================================================

test("3d-intersection-diagram - normal variation 1", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 1 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 2", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 2 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 3", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 3 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 4", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 4 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 5", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 5 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 6", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 6 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 7", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 7 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 8", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 8 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 9", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 9 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("3d-intersection-diagram - normal variation 10", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 10 })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

// ============================================================================
// EXTREME VARIATIONS (5 individual tests)
// ============================================================================

test("3d-intersection-diagram - extreme variation 1", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 1001 })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("3d-intersection-diagram - extreme variation 2", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 1002 })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("3d-intersection-diagram - extreme variation 3", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 1003 })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("3d-intersection-diagram - extreme variation 4", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 1004 })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("3d-intersection-diagram - extreme variation 5", () => {
  const mockData = generateMock(ThreeDIntersectionDiagramPropsSchema, { seed: 1005 })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})
