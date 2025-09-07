## Async Unification of Widget Generators

### Goal
- Adopt a single, consistent API for all widget generators: every generator returns a Promise<string>.
- Unify `constraint-geometry-diagram` with the rest of the widgets and future‑proof all generators for async workloads (solvers, I/O, remote calls).

### Rationale
- Simpler call sites: always `await generateX(props)`.
- No hybrid types (no MaybePromise/no normalizers).
- Future changes to any widget’s implementation won’t require API changes.

### Contract
- New type: `WidgetGenerator<TSchema> = (data: z.infer<TSchema>) => Promise<string>`
- All generators become `async` functions. Synchronous generators can remain logically the same; `async` will just wrap the returned string in a resolved promise.

### Scope of Changes

#### 1) Types
- File: `src/lib/widgets/types.ts`
  - Change `WidgetGenerator` to return `Promise<string>`.
  - Remove any MaybePromise or render helpers if introduced previously (after reset these may not exist, but confirm).

#### 2) All Generators (code under `src/lib/widgets/generators/`)
- For each `generateX` export:
  - Add `async` to the function signature.
  - Ensure the function returns the same string; no logic changes necessary for previously-sync code.
- Examples (not exhaustive):
  - `angle-diagram.ts` → `export const generateAngleDiagram = async (props) => { ... }`
  - `pentagon-intersection-diagram.ts` → `export const generatePentagonIntersectionDiagram = async (props) => { ... }`
  - `composite-shape-diagram.ts`, `fraction-number-line.ts`, etc.
  - Already async: `constraint-geometry-diagram.ts` (no change beyond matching the shared type).

#### 3) Dispatchers / Indexes
- `src/lib/widgets/generators/index.ts`
  - If exporting a `generateWidget(widget)` switch, change it to `export async function generateWidget(...)` and `await` each branch result.
- `src/lib/qti-generation/widget-generator.ts`
  - Same as above: make the exported `generateWidget(widget)` async and `await` each generator call.

#### 4) Tests
- Directory: `tests/widgets/`
  - Make tests which call generators `async` and `await` the result.
  - Update assertions which immediately operate on strings to await first.
  - Common updates:
    - `const svg = generateX(parsed)` → `const svg = await generateX(parsed)`
    - `svg.match(/.../)` → ensure `svg` awaited.
  - Example files likely changed (non-exhaustive):
    - `area-graph.test.ts`
    - `line-graph.test.ts`
    - `population-bar-chart.test.ts`
    - `population-change-event-graph.test.ts`
    - `scatter-plot.test.ts`
    - `pi-chart.test.ts`
    - `polygon-graph.test.ts`
    - `coordinate-plane.test.ts`
    - Others that call `generateX` or a `generateWidget` dispatcher.

#### 5) Other Call Sites
- Grep for generator usage across the repo:
  - `src/lib/qti-generation/**/*` (already covered above)
  - `scripts/**/*` (if any scripts render widgets for CLI usage)
  - `src/app/**/*` (unlikely but verify)
- Update all to `await` generator calls.

### Migration Steps
1. Update `WidgetGenerator` type in `src/lib/widgets/types.ts` to `Promise<string>`.
2. Add `async` to all `generate*.ts` exports in `src/lib/widgets/generators/`.
3. Make `generateWidget(widget)` functions in dispatcher files async and `await` per-case results.
4. Update tests: convert test functions to `async` and `await` generator calls.
5. Run `bun typecheck` and fix any residual sync assumptions.
6. Run the test suite; update any missed call sites discovered by failures.

### Rollout Checklist
- [ ] Types updated
- [ ] Every generator is `async`
- [ ] Dispatchers are `async` and `await` internally
- [ ] All tests updated to `await` generator invocations
- [ ] `bun typecheck` passes cleanly
- [ ] Test suite passes

### Notes for `constraint-geometry-diagram`
- Already async; no change necessary besides compatibility with the new global type.
- Keep strict error handling patterns and no-fallback posture as implemented (`@error-handling.mdc`, `@no-fallbacks-save-human-lives.mdc`).

### FAQ
- Q: Does making everything async add runtime overhead?
  - A: Negligible. Synchronous generators instantly resolve; the cost is a microtask.
- Q: Why not keep sync and wrap only async ones?
  - A: Creates a dual-API surface (MaybePromise/normalizers), adds complexity to call sites/tests, and invites regressions. A single async interface is simpler and future-proof.

### Command Reference
- Typecheck: `bun typecheck`
- Recommended grep queries to locate call sites:
  - `rg "const svg = generate[A-Z]" tests/widgets src scripts`
  - `rg "generateWidget\(" src`


