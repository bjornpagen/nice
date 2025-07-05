# Khan Academy Data Validation Issues

## Summary
- **Total JSON files**: 69
- **Passed validation**: 54
- **Failed validation**: 15

## Issues by Type

### 1. Empty Question Arrays (4 files)
These courses have exercises that were created but contain no questions:

- `economics-finance-domain-microeconomics.json`
- `humanities-world-history.json`
- `science-ap-biology.json`
- `test-prep-sat-reading-and-writing.json`

### 2. Empty IDs (3 files)
These files have videos or articles missing their ID field:

- `ela-10th-grade-reading-and-vocabulary.json` - 311 items with empty IDs
- `ela-4th-grade-reading-and-vocab.json` - 305 items with empty IDs
- `ela-5th-grade-reading-and-vocab.json` - 280 items with empty IDs

### 3. Duplicate Exercise IDs (7 files)
These files have exercises with duplicate IDs:

- `math-early-math.json` - 121 total, 120 unique (1 duplicate)
- `math-get-ready-for-ap-calc.json` - 112 total, 107 unique (5 duplicates)
- `math-grade-3-tx-teks.json` - 185 total, 183 unique (2 duplicates)
- `science-in-in-class9th-physics-india.json` - 35 total, 33 unique (2 duplicates)
- `science-up-class-11-chemistry.json` - 135 total, 133 unique (2 duplicates)
- `science-up-class-11-physics.json` - 131 total, 128 unique (3 duplicates)
- `test-prep-mcat.json` - 523 total, 519 unique (4 duplicates)

### 4. Course Structure Issue (1 file)
- `test-prep-digital-sat.json` - Course has no units

## Notes
- All failures are data quality issues from the extraction process
- No Zod schema validation errors - the strict schemas are working correctly
- These issues reveal problems in how Khan Academy structures some of their content 