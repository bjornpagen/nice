# Server Actions Directory Violations Report

## Summary
Found 4 files with "use server" directives outside of `src/lib/actions/` directory. 1 has been fixed by removing the directive, 3 require file relocation.

## Fixed ✅

### `src/lib/data/fetchers/interactive-helpers.ts`
- **Issue**: Had "use server" directive in incorrect location
- **Solution**: Removed directive as functions are only used server-side via imports
- **Status**: ✅ **FIXED**

## Remaining Violations to Fix 📋

The following 3 files must be relocated to `src/lib/actions/` as they contain legitimate server actions that are directly called from the client:

### 1. `src/lib/xp/bank.ts`
- **Violating Functions**:
  - `awardBankedXpForExercise()` - Called by tracking system
  - `getBankedXpBreakdownForQuiz()` - Used by client components
- **Usage Pattern**: Direct server action calls from client components
- **Required Action**: Move file to `src/lib/actions/xp/bank.ts`

### 2. `src/lib/data/progress.ts`
- **Violating Functions**:
  - `getUserUnitProgress()` - Directly imported in client layout components
  - `fetchProgressPageData()` - Used in profile pages
- **Usage Pattern**: Server-side data fetching for client components
- **Required Action**: Move file to `src/lib/actions/data/progress.ts`

### 3. `src/lib/xp/service.ts`
- **Violating Function**:
  - `awardXpForAssessment()` - Core server action used by tracking system
- **Usage Pattern**: Main entry point for XP awarding logic, called via server actions
- **Required Action**: Move file to `src/lib/actions/xp/service.ts`

## Migration Strategy

For each violation:

1. **Create new file** in `src/lib/actions/` directory maintaining same naming
2. **Move content** to new location
3. **Update import paths** in all dependent files
4. **Remove old file** after verification
5. **Test thoroughly** to ensure client calls still work

## Dependencies Checklist

- [ ] Update import paths in `src/lib/actions/tracking.ts`
- [ ] Update import paths in client components using progress functions
- [ ] Update any test files that import these functions
- [ ] Verify build succeeds after migration