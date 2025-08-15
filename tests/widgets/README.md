# Widget Tests

This directory contains tests for widget generators using Bun's snapshot testing feature.

## Structure

- Each widget has its own test file (e.g., `line-graph.test.ts`)
- Snapshots are automatically stored in the `__snapshots__` directory
- Snapshots contain the generated SVG output for each widget

## Running Tests

Run all widget tests:
```bash
bun test tests/widgets/
```

Run a specific widget test:
```bash
bun test tests/widgets/line-graph.test.ts
```

## Updating Snapshots

If you make intentional changes to a widget generator, update the snapshots:
```bash
bun test tests/widgets/ --update-snapshots
```

## Adding New Widget Tests

1. Create a new test file for your widget (e.g., `my-widget.test.ts`)
2. Import the widget generator and schema from `@/lib/widgets/generators`
3. Create test cases with example data
4. Use `expect(svg).toMatchSnapshot()` to snapshot the generated SVG
5. Run the test to create the initial snapshot
