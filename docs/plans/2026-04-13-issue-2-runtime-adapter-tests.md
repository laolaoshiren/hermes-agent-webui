# Runtime Adapter Test Coverage Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add repeatable unit-test coverage for the runtime adapter seam so contract invariants stay protected as live Hermes session/runtime integration lands.

**Architecture:** Introduce a lightweight Vitest test harness that fits the existing Vite + TypeScript stack, then cover the pure adapter layer with focused invariant and normalization tests. Keep the adapter seam pure and product-facing: tests should exercise `buildRuntimeSnapshot()` directly from Hermes-shaped input fixtures rather than mounting UI pages.

**Tech Stack:** React, Vite, TypeScript, Vitest

---

### Task 1: Add lightweight Vitest project wiring

**Objective:** Make the repository capable of running focused TypeScript unit tests without changing the production build path.

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `eslint.config.js`
- Modify: `tsconfig.app.json`

**Step 1: Write failing test command expectation**

Run: `npm run test -- --run`
Expected: FAIL — missing script and/or missing Vitest dependency

**Step 2: Add minimal test tooling**

Add:
- `vitest` to `devDependencies`
- `test` script in `package.json`
- Vitest globals and include pattern in `vite.config.ts`
- test globals in `eslint.config.js`
- `vitest/globals` types in `tsconfig.app.json`

**Step 3: Run test command to verify harness boots**

Run: `npm run test -- --run`
Expected: PASS with `No test files found` or equivalent zero-test startup success

**Step 4: Commit**

```bash
git add package.json vite.config.ts eslint.config.js tsconfig.app.json
git commit -m "test: add vitest runtime adapter harness"
```

### Task 2: Add runtime adapter happy-path coverage

**Objective:** Prove the adapter produces the expected contract snapshot from Hermes-shaped source records.

**Files:**
- Create: `src/features/runtime/adapters.test.ts`
- Modify: `src/features/runtime/adapters.ts` (only if test-driven fixes reveal gaps)

**Step 1: Write failing tests**

Add tests for:
- building sessions with derived previews and run relationships
- sorting events chronologically
- computing `approvalIds`, `artifactIds`, `eventCount`, and `activeRunCount`

**Step 2: Run focused test file**

Run: `npm run test -- --run src/features/runtime/adapters.test.ts`
Expected: FAIL — missing tests or mismatched adapter behavior

**Step 3: Write minimal implementation fixes if needed**

Keep implementation changes inside `src/features/runtime/adapters.ts` only if tests expose a real contract gap.

**Step 4: Re-run focused tests**

Run: `npm run test -- --run src/features/runtime/adapters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/runtime/adapters.test.ts src/features/runtime/adapters.ts
git commit -m "test: cover runtime adapter happy path"
```

### Task 3: Add invariant regression coverage

**Objective:** Lock down the contract validation rules so future live integration work cannot silently break cross-entity linkages.

**Files:**
- Modify: `src/features/runtime/adapters.test.ts`
- Modify: `src/features/runtime/adapters.ts` (only if invariant behavior is incorrect)

**Step 1: Write failing invariant tests**

Cover at least:
- duplicate entity ids rejected
- missing linked approval/artifact rejected
- invalid event link fields rejected by event kind
- session/run workspace mismatch rejected

**Step 2: Run focused test file**

Run: `npm run test -- --run src/features/runtime/adapters.test.ts`
Expected: FAIL if any invariant is missing or implemented incorrectly

**Step 3: Apply minimal implementation fix if required**

Keep the adapter strict; do not weaken validation to make tests pass.

**Step 4: Re-run focused tests**

Run: `npm run test -- --run src/features/runtime/adapters.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/runtime/adapters.test.ts src/features/runtime/adapters.ts
git commit -m "test: lock runtime adapter invariants"
```

### Task 4: Verify repository health and document the increment

**Objective:** Confirm the new test lane and adapter coverage integrate cleanly with the existing frontend workflow.

**Files:**
- Modify: `docs/DEVLOG.md`

**Step 1: Run repository verification**

Run:
- `npm run test -- --run`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- tests PASS
- lint PASS (existing `CronPage.tsx` exhaustive-deps warning may remain non-blocking)
- typecheck PASS
- build PASS

**Step 2: Append devlog entry**

Add a timestamped summary covering:
- Vitest harness added
- runtime adapter tests added
- validation result
- next runtime integration focus

**Step 3: Commit**

```bash
git add docs/DEVLOG.md
git commit -m "docs: log runtime adapter test coverage wave"
```
