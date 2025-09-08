#!/usr/bin/env bun
import { parseArgs } from "node:util"
import * as fs from "node:fs"
import * as path from "node:path"
import { generateWidgetMockData } from "@/lib/mock-data-generator"
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
Usage: bun run scripts/generate-widget-tests-fixed.ts [options] [widget-names...]

Options:
  -a, --all        Generate tests for all widgets missing test files
  --overwrite      Overwrite existing test files
  -h, --help       Show this help message

Examples:
  bun run scripts/generate-widget-tests-fixed.ts bar-chart venn-diagram
  bun run scripts/generate-widget-tests-fixed.ts --all
  bun run scripts/generate-widget-tests-fixed.ts bar-chart --overwrite
  bun run scripts/generate-widget-tests-fixed.ts --all --overwrite
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
import { generateWidgetMockData } from "@/lib/mock-data-generator"
import { faker } from "@faker-js/faker"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"
import type { z } from "zod"
import { ${generatorName}, ${schemaName} } from "@/lib/widgets/generators"

type ${inputType} = z.input<typeof ${schemaName}>`

  const helperFunction = `
const validateAndGenerate = async (input: ${inputType}): Promise<string> => {
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
  
  return await ${generatorName}(parsed)
}`

  // Generate 50 normal test cases with reasonable values
  const normalTests = Array.from({ length: 50 }, (_, i) => {
    const seed = i + 1
    return `
test("${kebabName} - normal variation ${i + 1}", async () => {
  // Set faker seed for reproducible tests
  faker.seed(${seed})
  
  const mockData = generateWidgetMockData(${schemaName}, {
    numeric: { min: 1, max: 1000, precision: 1 },
    string: { minLength: 1, maxLength: 100 },
    array: { min: 1, max: 10 },
    optional: { probability: 0.8 }
  })
  
  const svg = await validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})`
  }).join('\n')

  // Generate 50 extreme test cases with extreme values
  const extremeTests = Array.from({ length: 50 }, (_, i) => {
    const seed = i + 1001
    return `
test("${kebabName} - extreme variation ${i + 1}", () => {
  // Set faker seed for reproducible tests
  faker.seed(${seed})
  
  const mockData = generateWidgetMockData(${schemaName}, {
    numeric: { min: 0.001, max: 9999999, precision: 4 },
    string: { minLength: 0, maxLength: 1000 },
    array: { min: 0, max: 100 },
    optional: { probability: 0.3 }
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
