import { expect, test } from "bun:test"
import { generateMock } from '@anatine/zod-mock'
import { faker } from "@faker-js/faker"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generateFractionNumberLine, FractionNumberLinePropsSchema } from "@/lib/widgets/generators"

type FractionNumberLineInput = z.input<typeof FractionNumberLinePropsSchema>

const validateAndGenerate = (input: FractionNumberLineInput): string => {
  const parseResult = errors.trySync(() => FractionNumberLinePropsSchema.parse(input))
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
  
  return generateFractionNumberLine(parsed)
}

// ============================================================================
// NORMAL VARIATIONS (50 individual tests)
// ============================================================================

test("fraction-number-line - normal variation 1", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 2", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 2,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 3", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 3,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 4", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 4,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 5", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 5,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 6", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 6,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 7", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 7,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 8", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 8,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 9", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 9,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 10", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 10,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 11", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 11,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 12", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 12,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 13", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 13,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 14", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 14,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 15", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 15,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 16", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 16,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 17", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 17,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 18", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 18,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 19", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 19,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 20", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 20,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 21", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 21,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 22", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 22,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 23", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 23,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 24", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 24,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 25", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 25,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 26", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 26,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 27", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 27,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 28", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 28,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 29", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 29,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 30", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 30,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 31", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 31,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 32", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 32,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 33", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 33,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 34", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 34,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 35", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 35,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 36", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 36,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 37", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 37,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 38", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 38,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 39", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 39,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 40", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 40,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 41", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 41,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 42", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 42,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 43", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 43,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 44", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 44,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 45", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 45,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 46", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 46,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 47", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 47,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 48", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 48,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 49", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 49,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("fraction-number-line - normal variation 50", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 50,
    stringMap: {
      title: () => faker.lorem.words(faker.number.int({ min: 2, max: 6 })),
      xAxisLabel: () => faker.lorem.words(2),
      yAxisLabel: () => faker.lorem.words(2),
      barColor: () => faker.color.rgb({ format: 'hex' }),
      width: () => faker.number.int({ min: 300, max: 1000 }),
      height: () => faker.number.int({ min: 200, max: 600 }),
      min: () => faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
      max: () => faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
      tickInterval: () => faker.number.float({ min: 1, max: 50, fractionDigits: 1 }),
      value: () => faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
      count: () => faker.number.int({ min: 1, max: 100 }),
      frequency: () => faker.number.int({ min: 0, max: 50 })
    }
  })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

// ============================================================================
// EXTREME VARIATIONS (50 individual tests)
// ============================================================================

test("fraction-number-line - extreme variation 1", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1001,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 2", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1002,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 3", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1003,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 4", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1004,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 5", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1005,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 6", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1006,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 7", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1007,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 8", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1008,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 9", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1009,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 10", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1010,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 11", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1011,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 12", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1012,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 13", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1013,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 14", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1014,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 15", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1015,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 16", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1016,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 17", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1017,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 18", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1018,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 19", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1019,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 20", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1020,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 21", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1021,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 22", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1022,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 23", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1023,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 24", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1024,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 25", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1025,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 26", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1026,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 27", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1027,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 28", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1028,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 29", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1029,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 30", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1030,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 31", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1031,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 32", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1032,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 33", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1033,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 34", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1034,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 35", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1035,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 36", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1036,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 37", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1037,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 38", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1038,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 39", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1039,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 40", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1040,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 41", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1041,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 42", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1042,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 43", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1043,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 44", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1044,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 45", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1045,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 46", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1046,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 47", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1047,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 48", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1048,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 49", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1049,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("fraction-number-line - extreme variation 50", () => {
  const mockData = generateMock(FractionNumberLinePropsSchema, { 
    seed: 1050,
    stringMap: {
      title: () => faker.helpers.arrayElement([
        "", // Empty title
        faker.lorem.paragraphs(3), // Very long title
        faker.helpers.arrayElement(['🚀🎉💯', 'αβγδε', '中文测试', '!@#$%^&*()']) // Special chars
      ]),
      width: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      height: () => faker.helpers.arrayElement([
        faker.number.int({ min: 1, max: 10 }), // Very small
        faker.number.int({ min: 10000, max: 50000 }) // Very large
      ]),
      min: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      max: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ]),
      value: () => faker.helpers.arrayElement([
        faker.number.float({ min: 0.001, max: 0.1, fractionDigits: 4 }), // Very small
        faker.number.float({ min: 1000000, max: 9999999, fractionDigits: 2 }), // Very large
        faker.number.float({ min: -1000, max: -1, fractionDigits: 2 }), // Negative
        0 // Zero
      ])
    }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})
