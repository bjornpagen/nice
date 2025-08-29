import { expect, test } from "bun:test"
import { generateWidgetMockData } from "@/lib/mock-data-generator"
import { faker } from "@faker-js/faker"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { generateBarChart, BarChartPropsSchema } from "@/lib/widgets/generators"

type BarChartInput = z.input<typeof BarChartPropsSchema>

const validateAndGenerate = (input: BarChartInput): string => {
  const parseResult = errors.trySync(() => BarChartPropsSchema.parse(input))
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
  
  return generateBarChart(parsed)
}

// ============================================================================
// NORMAL VARIATIONS (50 individual tests)
// ============================================================================

test("bar-chart - normal variation 1", () => {
  // Set faker seed for reproducible tests
  faker.seed(1)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 2", () => {
  // Set faker seed for reproducible tests
  faker.seed(2)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 3", () => {
  // Set faker seed for reproducible tests
  faker.seed(3)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 4", () => {
  // Set faker seed for reproducible tests
  faker.seed(4)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 5", () => {
  // Set faker seed for reproducible tests
  faker.seed(5)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 6", () => {
  // Set faker seed for reproducible tests
  faker.seed(6)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 7", () => {
  // Set faker seed for reproducible tests
  faker.seed(7)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 8", () => {
  // Set faker seed for reproducible tests
  faker.seed(8)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 9", () => {
  // Set faker seed for reproducible tests
  faker.seed(9)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 10", () => {
  // Set faker seed for reproducible tests
  faker.seed(10)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 11", () => {
  // Set faker seed for reproducible tests
  faker.seed(11)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 12", () => {
  // Set faker seed for reproducible tests
  faker.seed(12)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 13", () => {
  // Set faker seed for reproducible tests
  faker.seed(13)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 14", () => {
  // Set faker seed for reproducible tests
  faker.seed(14)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 15", () => {
  // Set faker seed for reproducible tests
  faker.seed(15)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 16", () => {
  // Set faker seed for reproducible tests
  faker.seed(16)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 17", () => {
  // Set faker seed for reproducible tests
  faker.seed(17)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 18", () => {
  // Set faker seed for reproducible tests
  faker.seed(18)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 19", () => {
  // Set faker seed for reproducible tests
  faker.seed(19)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 20", () => {
  // Set faker seed for reproducible tests
  faker.seed(20)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 21", () => {
  // Set faker seed for reproducible tests
  faker.seed(21)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 22", () => {
  // Set faker seed for reproducible tests
  faker.seed(22)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 23", () => {
  // Set faker seed for reproducible tests
  faker.seed(23)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 24", () => {
  // Set faker seed for reproducible tests
  faker.seed(24)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 25", () => {
  // Set faker seed for reproducible tests
  faker.seed(25)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 26", () => {
  // Set faker seed for reproducible tests
  faker.seed(26)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 27", () => {
  // Set faker seed for reproducible tests
  faker.seed(27)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 28", () => {
  // Set faker seed for reproducible tests
  faker.seed(28)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 29", () => {
  // Set faker seed for reproducible tests
  faker.seed(29)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 30", () => {
  // Set faker seed for reproducible tests
  faker.seed(30)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 31", () => {
  // Set faker seed for reproducible tests
  faker.seed(31)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 32", () => {
  // Set faker seed for reproducible tests
  faker.seed(32)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 33", () => {
  // Set faker seed for reproducible tests
  faker.seed(33)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 34", () => {
  // Set faker seed for reproducible tests
  faker.seed(34)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 35", () => {
  // Set faker seed for reproducible tests
  faker.seed(35)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 36", () => {
  // Set faker seed for reproducible tests
  faker.seed(36)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 37", () => {
  // Set faker seed for reproducible tests
  faker.seed(37)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 38", () => {
  // Set faker seed for reproducible tests
  faker.seed(38)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 39", () => {
  // Set faker seed for reproducible tests
  faker.seed(39)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 40", () => {
  // Set faker seed for reproducible tests
  faker.seed(40)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 41", () => {
  // Set faker seed for reproducible tests
  faker.seed(41)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 42", () => {
  // Set faker seed for reproducible tests
  faker.seed(42)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 43", () => {
  // Set faker seed for reproducible tests
  faker.seed(43)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 44", () => {
  // Set faker seed for reproducible tests
  faker.seed(44)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 45", () => {
  // Set faker seed for reproducible tests
  faker.seed(45)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 46", () => {
  // Set faker seed for reproducible tests
  faker.seed(46)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 47", () => {
  // Set faker seed for reproducible tests
  faker.seed(47)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 48", () => {
  // Set faker seed for reproducible tests
  faker.seed(48)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 49", () => {
  // Set faker seed for reproducible tests
  faker.seed(49)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

test("bar-chart - normal variation 50", () => {
  // Set faker seed for reproducible tests
  faker.seed(50)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})

// ============================================================================
// EXTREME VARIATIONS (50 individual tests)
// ============================================================================

test("bar-chart - extreme variation 1", () => {
  // Set faker seed for reproducible tests
  faker.seed(1001)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 2", () => {
  // Set faker seed for reproducible tests
  faker.seed(1002)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 3", () => {
  // Set faker seed for reproducible tests
  faker.seed(1003)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 4", () => {
  // Set faker seed for reproducible tests
  faker.seed(1004)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 5", () => {
  // Set faker seed for reproducible tests
  faker.seed(1005)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 6", () => {
  // Set faker seed for reproducible tests
  faker.seed(1006)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 7", () => {
  // Set faker seed for reproducible tests
  faker.seed(1007)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 8", () => {
  // Set faker seed for reproducible tests
  faker.seed(1008)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 9", () => {
  // Set faker seed for reproducible tests
  faker.seed(1009)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 10", () => {
  // Set faker seed for reproducible tests
  faker.seed(1010)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 11", () => {
  // Set faker seed for reproducible tests
  faker.seed(1011)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 12", () => {
  // Set faker seed for reproducible tests
  faker.seed(1012)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 13", () => {
  // Set faker seed for reproducible tests
  faker.seed(1013)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 14", () => {
  // Set faker seed for reproducible tests
  faker.seed(1014)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 15", () => {
  // Set faker seed for reproducible tests
  faker.seed(1015)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 16", () => {
  // Set faker seed for reproducible tests
  faker.seed(1016)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 17", () => {
  // Set faker seed for reproducible tests
  faker.seed(1017)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 18", () => {
  // Set faker seed for reproducible tests
  faker.seed(1018)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 19", () => {
  // Set faker seed for reproducible tests
  faker.seed(1019)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 20", () => {
  // Set faker seed for reproducible tests
  faker.seed(1020)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 21", () => {
  // Set faker seed for reproducible tests
  faker.seed(1021)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 22", () => {
  // Set faker seed for reproducible tests
  faker.seed(1022)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 23", () => {
  // Set faker seed for reproducible tests
  faker.seed(1023)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 24", () => {
  // Set faker seed for reproducible tests
  faker.seed(1024)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 25", () => {
  // Set faker seed for reproducible tests
  faker.seed(1025)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 26", () => {
  // Set faker seed for reproducible tests
  faker.seed(1026)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 27", () => {
  // Set faker seed for reproducible tests
  faker.seed(1027)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 28", () => {
  // Set faker seed for reproducible tests
  faker.seed(1028)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 29", () => {
  // Set faker seed for reproducible tests
  faker.seed(1029)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 30", () => {
  // Set faker seed for reproducible tests
  faker.seed(1030)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 31", () => {
  // Set faker seed for reproducible tests
  faker.seed(1031)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 32", () => {
  // Set faker seed for reproducible tests
  faker.seed(1032)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 33", () => {
  // Set faker seed for reproducible tests
  faker.seed(1033)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 34", () => {
  // Set faker seed for reproducible tests
  faker.seed(1034)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 35", () => {
  // Set faker seed for reproducible tests
  faker.seed(1035)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 36", () => {
  // Set faker seed for reproducible tests
  faker.seed(1036)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 37", () => {
  // Set faker seed for reproducible tests
  faker.seed(1037)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 38", () => {
  // Set faker seed for reproducible tests
  faker.seed(1038)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 39", () => {
  // Set faker seed for reproducible tests
  faker.seed(1039)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 40", () => {
  // Set faker seed for reproducible tests
  faker.seed(1040)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 41", () => {
  // Set faker seed for reproducible tests
  faker.seed(1041)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 42", () => {
  // Set faker seed for reproducible tests
  faker.seed(1042)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 43", () => {
  // Set faker seed for reproducible tests
  faker.seed(1043)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 44", () => {
  // Set faker seed for reproducible tests
  faker.seed(1044)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 45", () => {
  // Set faker seed for reproducible tests
  faker.seed(1045)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 46", () => {
  // Set faker seed for reproducible tests
  faker.seed(1046)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 47", () => {
  // Set faker seed for reproducible tests
  faker.seed(1047)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 48", () => {
  // Set faker seed for reproducible tests
  faker.seed(1048)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 49", () => {
  // Set faker seed for reproducible tests
  faker.seed(1049)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})

test("bar-chart - extreme variation 50", () => {
  // Set faker seed for reproducible tests
  faker.seed(1050)
  
  const mockData = generateWidgetMockData(BarChartPropsSchema, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
  })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})
