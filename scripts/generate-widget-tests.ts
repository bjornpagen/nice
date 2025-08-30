#!/usr/bin/env bun
import { parseArgs } from "node:util"
import * as fs from "node:fs"
import * as path from "node:path"
import { z } from "zod"


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
    .filter(file => file.endsWith('.generated.test.ts'))
    .map(file => file.replace('.generated.test.ts', ''))
}

function getAllMissingWidgets(): string[] {
  const allWidgets = getAllWidgetGenerators()
  const existingTests = getExistingTestFiles()
  return allWidgets.filter(widget => !existingTests.includes(widget))
}

function testFileExists(widgetName: string): boolean {
  const testPath = path.join(process.cwd(), 'tests/widgets', `${widgetName}.generated.test.ts`)
  return fs.existsSync(testPath)
}

// Extract field definitions from zod schema source with more detail
function extractSchemaFields(content: string, schemaName: string): Record<string, any> {
  const fields: Record<string, any> = {}
  
  // Find the main schema definition (be more precise)
  const schemaRegex = new RegExp(`export const ${schemaName}\\s*=\\s*z`)
  const schemaMatch = content.match(schemaRegex)
  if (!schemaMatch) {
    if (schemaName === 'VerticalArithmeticSetupPropsSchema') {
      console.log('DEBUG: Schema not found with regex, trying broader search...')
      console.log('Content includes schema name?', content.includes(schemaName))
    }
    return fields
  }
  
  // Much simpler approach: just look for field patterns in a reasonable window
  const schemaSection = content.substring(schemaMatch.index!, schemaMatch.index! + 1500)
  const lines = schemaSection.split('\n')
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Match any field pattern (z at end of line, z., or schema functions)
    const fieldMatch = line?.match(/^\s*(\w+):\s*(z$|z\.|create\w+Schema\(\)|[A-Z]\w*Schema)/)
    if (fieldMatch) {
      const fieldName = fieldMatch[1]!
      if (fieldName === 'type') continue
      
      // Look ahead for type information
      const fieldDef = lines.slice(i, i + 5).join(' ')
      
      fields[fieldName] = { 
        zodType: 'unknown', 
        nullable: false, 
        enumValues: null, 
        literalValue: null 
      }
      
      // Detect types (check for string arrays first)
      if (fieldDef.includes('.array(z.string()')) fields[fieldName].zodType = 'stringArray'
      else if (fieldDef.includes('.string()')) fields[fieldName].zodType = 'string'
      else if (fieldDef.includes('.number()')) fields[fieldName].zodType = 'number'  
      else if (fieldDef.includes('.boolean()')) fields[fieldName].zodType = 'boolean'
      else if (fieldDef.includes('.array(')) fields[fieldName].zodType = 'array'
      else if (fieldDef.includes('.object(')) fields[fieldName].zodType = 'object'
      else if (fieldDef.includes('createCircleSchema()')) fields[fieldName].zodType = 'circle'
      else if (fieldDef.includes('createSquareSchema()')) fields[fieldName].zodType = 'square'  
      else if (fieldDef.includes('createTapeSchema()')) fields[fieldName].zodType = 'tape'
      else if (fieldDef.includes('createEmojiSchema()')) fields[fieldName].zodType = 'emoji'
      else if (fieldDef.includes('createSegmentSchema()')) fields[fieldName].zodType = 'segment'
      else if (fieldDef.includes('createGroupSchema()')) fields[fieldName].zodType = 'group'
      else if (fieldDef.includes('Schema()')) fields[fieldName].zodType = 'object'
      else if (fieldDef.includes('.discriminatedUnion(')) fields[fieldName].zodType = 'discriminatedUnion'
      else if (fieldDef.includes('.union(')) fields[fieldName].zodType = 'union'
      else fields[fieldName].zodType = 'object'
      
      // Detect modifiers
      if (fieldDef.includes('.nullable()')) fields[fieldName].nullable = true
      
      // Extract literal values
      const literalMatch = fieldDef.match(/\.literal\(\s*["']([^"']+)["']\s*\)/)
      if (literalMatch) {
        fields[fieldName].zodType = 'literal'
        fields[fieldName].literalValue = literalMatch[1]
      }
      
      // Extract enum values
      const enumMatch = fieldDef.match(/\.enum\(\[([^\]]+)\]/)
      if (enumMatch) {
        fields[fieldName].zodType = 'enum'
        fields[fieldName].enumValues = enumMatch[1]!.split(',').map(v => v.trim().replace(/['"]/g, ''))
      }
    }
  }
  
  return fields
}

// Generate faker mock data based on field info
function generateFakerForField(fieldName: string, fieldInfo: any): string {
  const { zodType, nullable, enumValues, literalValue } = fieldInfo
  
  // Handle literal values first (exact values like "vertical")
  if (zodType === 'literal' && literalValue) {
    return `"${literalValue}"`
  }
  
  // Handle enums
  if (zodType === 'enum' && enumValues) {
    const enumArray = enumValues.map((v: string) => `"${v}"`).join(', ')
    return `faker.helpers.arrayElement([${enumArray}])`
  }
  
  let fakerCall = ''
  
  // Handle by zod type FIRST (more reliable than name patterns)
  switch (zodType) {
    case 'boolean':
      fakerCall = 'faker.datatype.boolean()'
      break
    case 'array':
      fakerCall = '[]'
      break
    case 'stringArray':
      fakerCall = '[]' // Could be improved to generate sample strings
      break
    case 'circle':
      fakerCall = `{
      label: faker.lorem.words({ min: 1, max: 3 }),
      color: faker.color.rgb({ format: 'hex' }),
      count: faker.number.int({ min: 1, max: 10 })
    }`
      break
    case 'square':
      fakerCall = `{
      color: faker.color.rgb({ format: 'hex' }),
      area: faker.number.int({ min: 100, max: 500 }),
      sideLabel: faker.helpers.maybe(() => faker.lorem.word(), { probability: 0.7 }) ?? null
    }`
      break
    case 'tape':
      fakerCall = `{
      label: faker.helpers.maybe(() => faker.lorem.words({ min: 1, max: 3 }), { probability: 0.7 }) ?? null,
      color: faker.color.rgb({ format: 'hex' }),
      segments: []
    }`
      break
    case 'emoji':
      fakerCall = `{
      label: faker.helpers.maybe(() => faker.lorem.words({ min: 1, max: 3 }), { probability: 0.7 }) ?? null,
      emoji: faker.lorem.word(),
      size: faker.number.int({ min: 20, max: 80 })
    }`
      break
    case 'segment':
      fakerCall = `{
      color: faker.color.rgb({ format: 'hex' }),
      label: faker.lorem.words({ min: 1, max: 3 }),
      points: []
    }`
      break
    case 'group':
      fakerCall = `{
      color: faker.color.rgb({ format: 'hex' }),
      label: faker.helpers.maybe(() => faker.lorem.words({ min: 1, max: 3 }), { probability: 0.7 }) ?? null,
      before: { width: faker.number.int({ min: 50, max: 200 }), height: faker.number.int({ min: 50, max: 200 }) },
      after: { width: faker.number.int({ min: 50, max: 200 }), height: faker.number.int({ min: 50, max: 200 }) }
    }`
      break
    case 'object':
      // Generate reasonable object defaults based on field name
      if (fieldName.includes('xAxis') || fieldName.includes('yAxis')) {
        fakerCall = `{
      label: faker.lorem.words({ min: 1, max: 3 }),
      min: faker.number.float({ min: 0, max: 50 }),
      max: faker.number.float({ min: 50, max: 100 }),
      tickInterval: faker.number.float({ min: 1, max: 10 }),
      showGridLines: faker.datatype.boolean()
    }`
      } else if (fieldName.includes('base') || fieldName.includes('Base')) {
        fakerCall = `{
      type: "square",
      side: faker.number.int({ min: 50, max: 200 })
    }`
      } else if (fieldName.includes('key')) {
        fakerCall = `{
      label: faker.helpers.maybe(() => faker.lorem.words({ min: 1, max: 3 }), { probability: 0.7 }) ?? null,
      icon: faker.lorem.word()
    }`
      } else {
        fakerCall = '{}'
      }
      break
    case 'discriminatedUnion':
      // Generate a reasonable default variant based on field name
      if (fieldName.includes('shape')) {
        fakerCall = `{
      type: "rectangularPrism",
      width: faker.number.int({ min: 50, max: 200 }),
      height: faker.number.int({ min: 50, max: 200 }),
      length: faker.number.int({ min: 50, max: 200 })
    }`
      } else {
        fakerCall = '{ type: "default" }'
      }
      break
    case 'union':
      // For unions, often one option is null - default to null for simplicity
      fakerCall = 'null'
      break
    case 'string':
      // Apply string-specific patterns
      if (fieldName.includes('operand')) {
        fakerCall = 'faker.number.int({ min: 1, max: 999 }).toString()'
      } else if (fieldName.includes('color') || fieldName.includes('Color')) {
        fakerCall = "faker.color.rgb({ format: 'hex' })"
      } else if (fieldName.includes('label') || fieldName.includes('Label')) {
        fakerCall = 'faker.lorem.words({ min: 1, max: 3 })'
      } else if (fieldName.includes('title') || fieldName.includes('Title')) {
        fakerCall = 'faker.lorem.sentence({ min: 3, max: 8 })'
      } else {
        fakerCall = 'faker.lorem.words({ min: 1, max: 3 })'
      }
      break
    case 'number':
      // Apply number-specific patterns
      if (fieldName.includes('width') || fieldName.includes('Width')) {
        fakerCall = 'faker.number.int({ min: 300, max: 800 })'
      } else if (fieldName.includes('height') || fieldName.includes('Height')) {
        fakerCall = 'faker.number.int({ min: 200, max: 600 })'
      } else if (fieldName.includes('min') || fieldName.includes('Min')) {
        fakerCall = 'faker.number.float({ min: 0, max: 50 })'
      } else if (fieldName.includes('max') || fieldName.includes('Max')) {
        fakerCall = 'faker.number.float({ min: 50, max: 100 })'
      } else if (fieldName.includes('count') || fieldName.includes('Count')) {
        fakerCall = 'faker.number.int({ min: 1, max: 10 })'
      } else if (fieldName.includes('interval') || fieldName.includes('Interval')) {
        fakerCall = 'faker.number.float({ min: 1, max: 10 })'
      } else if (fieldName.includes('angle') || fieldName.includes('Angle')) {
        fakerCall = 'faker.number.float({ min: 0, max: 360 })'
      } else if (fieldName.includes('radius') || fieldName.includes('Radius')) {
        fakerCall = 'faker.number.float({ min: 10, max: 100 })'
      } else {
        fakerCall = 'faker.number.float({ min: 1, max: 100 })'
      }
      break
    default:
      // For unknown types, generate a reasonable default
      fakerCall = 'faker.lorem.word()'
  }
  
  // Handle nullable fields (use null instead of undefined)
  if (nullable) {
    return `faker.helpers.maybe(() => ${fakerCall}, { probability: 0.7 }) ?? null`
  }
  
  return fakerCall
}

function detectExports(widgetName: string): { schemaName: string; generatorName: string; inputType: string; typeLiteral: string } | null {
  const generatorPath = path.join(process.cwd(), 'src/lib/widgets/generators', `${widgetName}.ts`)
  
  if (!fs.existsSync(generatorPath)) {
    console.log(`Skipping ${widgetName} - generator file not found: ${generatorPath}`)
    return null
  }
  
  const content = fs.readFileSync(generatorPath, 'utf-8')
  
  // Find schema export (ends with PropsSchema)
  const schemaMatch = content.match(/export\s+(?:const|type)\s+(\w+PropsSchema)/)
  if (!schemaMatch) {
    console.log(`Skipping ${widgetName} - no PropsSchema export found (likely a utility file)`)
    return null
  }
  const schemaName = schemaMatch[1]!
  
  // Find generator export (starts with generate) - handle coordinate-plane special case
  let generatorMatch = content.match(/export\s+(?:const|function)\s+(generate\w+)/)
  if (!generatorMatch) {
    console.log(`Skipping ${widgetName} - no generate function export found`)
    return null
  }
  let generatorName = generatorMatch[1]!
  
  // Handle coordinate-plane-comprehensive special case
  if (widgetName === 'coordinate-plane-comprehensive' && generatorName === 'generateCoordinatePlaneComprehensive') {
    generatorName = 'generateCoordinatePlane'
  }
  
  // Extract the type literal from the main schema (look for type field specifically)
  const schemaStart = content.indexOf(schemaName)
  const schemaSection = content.substring(schemaStart, schemaStart + 500)
  // Look for the type field in the main schema, not nested ones
  const typeLiteralMatch = schemaSection.match(/type:\s*z\s*\.literal\(\s*["']([^"']+)["']\s*\)/)
  if (!typeLiteralMatch) {
    console.log(`Skipping ${widgetName} - no type literal found in main schema`)
    return null
  }
  const typeLiteral = typeLiteralMatch[1]!
  
  // Derive input type from schema name
  const inputType = schemaName.replace('PropsSchema', 'Input')
  
  return { schemaName, generatorName, inputType, typeLiteral }
}

async function generateTestFile(widgetName: string): Promise<boolean> {
  const testPath = path.join(process.cwd(), 'tests/widgets', `${widgetName}.generated.test.ts`)
  const kebabName = widgetName
  
  console.log(`Generating tests for ${widgetName}...`)
  
  // Try to detect exports - skip if not a valid widget generator
  const exports = detectExports(widgetName)
  if (!exports) {
    return false
  }
  
  // Generate the test file content
  const testContent = await generateTestContent(widgetName, kebabName, exports)
  
  // Write the file and clean up any trailing comma issues
  fs.writeFileSync(testPath, testContent)
  
  // Post-process to fix trailing commas in object literals
  let cleanedContent = fs.readFileSync(testPath, 'utf-8')
  // Fix trailing commas - match comma at end of line before closing brace
  cleanedContent = cleanedContent.replace(/,(\s*\n\s*})/g, '$1')
  // Remove any remaining trailing commas
  cleanedContent = cleanedContent.replace(/,(\s*\/\/[^\n]*\n\s*})/g, '$1')
  fs.writeFileSync(testPath, cleanedContent)
  
  createdFiles.add(testPath)
  
  console.log(`Created: ${testPath}`)
  return true
}

async function generateTestContent(widgetName: string, kebabName: string, exports: { schemaName: string; generatorName: string; inputType: string; typeLiteral: string }): Promise<string> {
  const { schemaName, generatorName, inputType, typeLiteral } = exports
  
  const disclaimer = `// ============================================================================
// AUTO-GENERATED TEST FILE
// ============================================================================
// This file was automatically generated by scripts/generate-widget-tests.ts
// Generated on: ${new Date().toISOString()}
// Widget: ${widgetName}
// 
// DO NOT EDIT THIS FILE DIRECTLY - it will be overwritten on regeneration
// 
// This file contains auto-generated tests using @anatine/zod-mock for mock data.
// Tests will WARN about unbounded values but still generate snapshots to show output.
// 
// ⚠️  If you see warnings about unbounded values in test output:
//    Add .min() and .max() constraints to the relevant zod schema fields
//    Example: z.number().min(0).max(1000) instead of z.number()
// 
// To modify tests for this widget, either:
//   1. Update the schema constraints in src/lib/widgets/generators/${widgetName}.ts and regenerate
//   2. Create a separate hand-written test file (without .generated in the name)
// ============================================================================`

  const imports = `
import { expect, test } from "bun:test"
import { generateMock } from "@anatine/zod-mock"
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
  
  // Check for unbounded values and warn (don't throw - let test continue for snapshot)
  const unboundedIssues: string[] = []
  
  const checkUnboundedValues = (obj: any, path: string = ""): void => {
    if (typeof obj === 'number') {
      if (obj > 10000 || obj < -10000) {
        const fieldName = path.split('.').pop() || path
        unboundedIssues.push(\`\${fieldName} at \${path} (value: \${obj})\`)
        logger.warn("unbounded value detected", { fieldName, path, value: obj })
      }
      if (!isFinite(obj)) {
        const fieldName = path.split('.').pop() || path
        unboundedIssues.push(\`\${fieldName} at \${path} (non-finite: \${obj})\`)
        logger.warn("non-finite value detected", { fieldName, path, value: obj })
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
  
  // Display schema improvement suggestions
  if (unboundedIssues.length > 0) {
    logger.warn("schema improvement needed", {
      widgetType: parsed.type,
      unboundedCount: unboundedIssues.length,
      issues: unboundedIssues,
      suggestion: "Add .min() and .max() constraints to prevent extreme values",
      example: "z.number().min(0).max(1000) instead of z.number()"
    })
    
    // Also show user-friendly console output
    console.warn(\`\\n🔧 SCHEMA IMPROVEMENT NEEDED for \${parsed.type}:\`)
    console.warn(\`   Found \${unboundedIssues.length} unbounded field(s). Consider adding constraints:\`)
    unboundedIssues.forEach(issue => {
      const fieldName = issue.split(' ')[0]
      console.warn(\`   • \${fieldName}: Add .min() and .max() constraints to prevent extreme values\`)
    })
    console.warn(\`   Example: z.number().min(0).max(1000) instead of z.number()\`)
    console.warn(\`\\n📸 Snapshot will still be generated to show current output\\n\`)
  }
  
  return ${generatorName}(parsed)
}`

  

  // Generate test cases using zod-mock with constrained number generation
  const normalTests = `
// Minimal mockery mapper - only constrain absolutely critical fields to prevent render failures
const mockeryMapper = (keyName: string, fakerInstance: any) => {
  // Only constrain exact matches for width/height (not subfields like innerWidth, etc)
  // Let everything else be unbounded so we can identify schema constraint gaps
  if (keyName === 'width') {
    return () => fakerInstance.number.int({ min: 300, max: 800 })
  }
  if (keyName === 'height') {
    return () => fakerInstance.number.int({ min: 200, max: 600 })
  }
  return undefined
}

test("${kebabName} - basic functionality", () => {
  console.log('\\n🧪 Testing ${kebabName} widget...')
  
  const mockData = generateMock(${schemaName}, { 
    seed: 1,
    mockeryMapper
  })
  
  const result = validateAndGenerate(mockData)
  expect(result).toBeDefined()
  expect(typeof result).toBe("string")
  expect(result.length).toBeGreaterThan(0)
})

// Generate 25 variations with different seeds to test more mock data combinations
${Array.from({ length: 25 }, (_, i) => {
  const seed = (i + 1) * 10 + 7; // Seeds: 17, 27, 37, ..., 257
  return `test("${kebabName} - variation ${i + 1} (seed ${seed})", () => {
  const mockData = generateMock(${schemaName}, { 
    seed: ${seed},
    mockeryMapper
  })
  
  const result = validateAndGenerate(mockData)
  expect(result).toMatchSnapshot()
})`;
}).join('\n\n')}`

  return `${disclaimer}
${imports}
${helperFunction}

// ============================================================================
// BASIC TESTS (manual mock data - update TODOs with actual schema fields)
// ============================================================================
${normalTests}
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
    let generatedCount = 0
    for (const widgetName of targetWidgets) {
      if (shouldOverwrite || !testFileExists(widgetName)) {
        const generated = await generateTestFile(widgetName)
        if (generated) {
          generatedCount++
        }
      } else {
        console.log(`Skipping ${widgetName} - test file already exists (use --overwrite to replace)`)
      }
    }

    console.log(`\nSuccessfully generated tests for ${generatedCount} widgets`)
    console.log('Run "bun test tests/widgets/" to execute the new tests')
    
  } catch (error) {
    console.error('Error generating tests:', error)
    cleanup()
    process.exit(1)
  }
}

main()
