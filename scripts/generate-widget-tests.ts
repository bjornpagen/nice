#!/usr/bin/env bun
import { parseArgs } from "node:util"
import * as fs from "node:fs"
import * as path from "node:path"
import { generateMock } from '@anatine/zod-mock'

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

function detectExports(widgetName: string): { schemaName: string; generatorName: string; inputType: string } {
  const generatorPath = path.join(process.cwd(), 'src/lib/widgets/generators', `${widgetName}.ts`)
  
  if (!fs.existsSync(generatorPath)) {
    throw new Error(`Widget generator file not found: ${generatorPath}`)
  }
  
  const content = fs.readFileSync(generatorPath, 'utf-8')
  
  // Find schema export (ends with PropsSchema)
  const schemaMatch = content.match(/export\s+(?:const|type)\s+(\w+PropsSchema)/)
  if (!schemaMatch) {
    throw new Error(`No PropsSchema export found in ${widgetName}.ts`)
  }
  const schemaName = schemaMatch[1]!
  
  // Find generator export (starts with generate)
  const generatorMatch = content.match(/export\s+const\s+(generate\w+)/)
  if (!generatorMatch) {
    throw new Error(`No generate function export found in ${widgetName}.ts`)
  }
  const generatorName = generatorMatch[1]!
  
  // Derive input type from schema name
  const inputType = schemaName.replace('PropsSchema', 'Input')
  
  return { schemaName, generatorName, inputType }
}

function generateTestFile(widgetName: string): void {
  const testPath = path.join(process.cwd(), 'tests/widgets', `${widgetName}.test.ts`)
  const kebabName = widgetName
  
  console.log(`Generating tests for ${widgetName}...`)
  
  // Generate the test file content
  const testContent = generateTestContent(widgetName, kebabName)
  
  // Write the file
  fs.writeFileSync(testPath, testContent)
  createdFiles.add(testPath)
  
  console.log(`Created: ${testPath}`)
}

function generateTestContent(widgetName: string, kebabName: string): string {
  const { schemaName, generatorName, inputType } = detectExports(widgetName)
  
  const imports = `import { expect, test } from "bun:test"
import { generateMock } from '@anatine/zod-mock'
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

  // Generate 10 normal test cases with reasonable values
  const normalTests = Array.from({ length: 10 }, (_, i) => {
    const seed = i + 1
    return `
test("${kebabName} - normal variation ${i + 1}", () => {
  const mockData = generateMock(${schemaName}, { seed: ${seed} })
  const svg = validateAndGenerate(mockData)
  expect(svg).toMatchSnapshot()
})`
  }).join('\n')

  // Generate 5 extreme test cases with extreme values
  const extremeTests = Array.from({ length: 5 }, (_, i) => {
    const seed = i + 1001
    return `
test("${kebabName} - extreme variation ${i + 1}", () => {
  const mockData = generateMock(${schemaName}, { seed: ${seed} })
  
  // For extreme tests, we expect errors due to unbounded values
  expect(() => validateAndGenerate(mockData)).toThrow(/Unbounded value detected|Non-finite value detected/)
})`
  }).join('\n')

  return `${imports}
${helperFunction}

// ============================================================================
// NORMAL VARIATIONS (10 individual tests)
// ============================================================================
${normalTests}

// ============================================================================
// EXTREME VARIATIONS (5 individual tests)
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
