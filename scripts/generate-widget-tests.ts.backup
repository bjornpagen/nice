#!/usr/bin/env bun
import { parseArgs } from "node:util"
import * as fs from "node:fs"
import * as path from "node:path"
import { generateMock } from '@anatine/zod-mock'
import { faker } from "@faker-js/faker"

const { values: flags, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    all: { type: 'boolean', short: 'a' },
    overwrite: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
})

if (flags.help) {
  console.log(`
Usage: bun run scripts/generate-widget-tests.ts [options] [widget-names...]

Options:
  -a, --all        Generate tests for all widgets missing test files
  --overwrite      Overwrite existing test files
  -h, --help       Show this help message

Examples:
  bun run scripts/generate-widget-tests.ts bar-chart venn-diagram
  bun run scripts/generate-widget-tests.ts --all
  bun run scripts/generate-widget-tests.ts bar-chart --overwrite
  bun run scripts/generate-widget-tests.ts --all --overwrite
`)
  process.exit(0)
}

// Track created files for cleanup on error
const createdFiles = new Set<string>()

function cleanup() {
  for (const file of createdFiles) {
    try {
      fs.unlinkSync(file)
      console.log(`Cleaned up: ${file}`)
    } catch (error) {
      console.error(`Failed to cleanup ${file}:`, error)
    }
  }
}

process.on('SIGINT', cleanup)
process.on('uncaughtException', cleanup)

function getAllWidgetGenerators(): string[] {
  const generatorsDir = path.join(process.cwd(), 'src/lib/widgets/generators')
  const files = fs.readdirSync(generatorsDir)
  return files
    .filter(file => file.endsWith('.ts') && file !== 'index.ts')
    .map(file => file.replace('.ts', ''))
}

function getExistingTestFiles(): string[] {
  const testsDir = path.join(process.cwd(), 'tests/widgets')
  if (!fs.existsSync(testsDir)) return []
  
  const files = fs.readdirSync(testsDir)
  return files
    .filter(file => file.endsWith('.test.ts'))
    .map(file => file.replace('.test.ts', ''))
}

function getAllMissingWidgets(): string[] {
  const allWidgets = getAllWidgetGenerators()
  const existingTests = getExistingTestFiles()
  return allWidgets.filter(widget => !existingTests.includes(widget))
}

function testFileExists(widgetName: string): boolean {
  const testPath = path.join(process.cwd(), 'tests/widgets', `${widgetName}.test.ts`)
  return fs.existsSync(testPath)
}

function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')
}

function generateTestFile(widgetName: string): void {
  const testPath = path.join(process.cwd(), 'tests/widgets', `${widgetName}.test.ts`)
  const kebabName = toKebabCase(widgetName)
  
  console.log(`Generating tests for ${widgetName}...`)
  
  // Generate the test file content
  const testContent = generateTestContent(widgetName, kebabName)
  
  // Write the file
  fs.writeFileSync(testPath, testContent)
  createdFiles.add(testPath)
  
  console.log(`Created: ${testPath}`)
}

function generateTestContent(widgetName: string, kebabName: string): string {
  // Convert kebab-case to PascalCase (e.g., "bar-chart" -> "BarChart")
  const pascalName = widgetName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
  const schemaName = `${pascalName}PropsSchema`
  const generatorName = `generate${pascalName}`
  const inputType = `${pascalName}Input`
  
  const imports = `import { expect, test } from "bun:test"
import { generateMock } from '@anatine/zod-mock'
import { faker } from "@faker-js/faker"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { ${generatorName}, ${schemaName} } from "@/lib/widgets/generators"

type ${inputType} = z.input<typeof ${schemaName}>`

  const helperFunction = `
const validateAndGenerate = (input: ${inputType}): string => {
  const parseResult = errors.trySync(() => ${schemaName}.parse(input))
  if (parseResult.error) {
    logger.error("input validation", { error: parseResult.error })
    throw errors.wrap(parseResult.error, "input validation")
  }
  const parsed = parseResult.data
  
  // Check for unbounded values that would cause rendering issues
  const checkUnboundedValues = (obj: any, path: string = ""): void => {
    if (typeof obj === 'number') {
      if (obj > 10000 || obj < -10000) {
        throw new Error(\`Unbounded value detected at \${path}: \${obj}. Widget schemas should have reasonable constraints.\`)
      }
      if (!isFinite(obj)) {
        throw new Error(\`Non-finite value detected at \${path}: \${obj}. Widget schemas should prevent infinite values.\`)
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        checkUnboundedValues(item, \`\${path}[\${index}]\`)
      })
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        checkUnboundedValues(value, \`\${path}.\${key}\`)
      })
    }
  }
  
  checkUnboundedValues(parsed, "input")
  
  return ${generatorName}(parsed)
}`

  // Generate 50 normal test cases with reasonable values
  const normalTests = Array.from({ length: 50 }, (_, i) => {
    const seed = i + 1
    return `
test("${kebabName} - normal variation ${i + 1}", () => {
  const mockData = generateMock(${schemaName}, { 
    seed: ${seed},
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
})`
  }).join('\n')

  // Generate 50 extreme test cases with extreme values
  const extremeTests = Array.from({ length: 50 }, (_, i) => {
    const seed = i + 1001
    return `
test("${kebabName} - extreme variation ${i + 1}", () => {
  const mockData = generateMock(${schemaName}, { 
    seed: ${seed},
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
})`
  }).join('\n')

  return `${imports}
${helperFunction}

// ============================================================================
// NORMAL VARIATIONS (50 individual tests)
// ============================================================================
${normalTests}

// ============================================================================
// EXTREME VARIATIONS (50 individual tests)
// ============================================================================
${extremeTests}
`
}

// Main execution
async function main() {
  try {
    const targetWidgets = flags.all ? getAllMissingWidgets() : positionals
    const shouldOverwrite = flags.overwrite

    if (targetWidgets.length === 0) {
      console.error('Error: No widgets specified. Use --all or provide widget names.')
      process.exit(1)
    }

    console.log(`Target widgets: ${targetWidgets.join(', ')}`)
    console.log(`Overwrite mode: ${shouldOverwrite}`)

    // Generate tests for specified widgets
    for (const widgetName of targetWidgets) {
      if (shouldOverwrite || !testFileExists(widgetName)) {
        generateTestFile(widgetName)
      } else {
        console.log(`Skipping ${widgetName} - test file already exists (use --overwrite to replace)`)
      }
    }

    console.log(`\nSuccessfully generated tests for ${createdFiles.size} widgets`)
    console.log('Run "bun test tests/widgets/" to execute the new tests')
    
  } catch (error) {
    console.error('Error generating tests:', error)
    cleanup()
    process.exit(1)
  }
}

main()
