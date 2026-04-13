# Runtime Contract Foundation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Define and surface the first product-facing contract for sessions, runs, event timelines, and approvals so the web shell can evolve against a stable runtime model instead of ad-hoc page copy.

**Architecture:** Introduce a shared frontend runtime domain module that represents the product contract independently from current backend transport details. Pair that module with a written contract document and mock data so the Runs and Approvals pages can render against realistic product objects now while staying aligned with future Hermes admin/runtime integration.

**Tech Stack:** React 19, TypeScript, Vite, i18next, existing UI card/badge primitives

---

### Task 1: Add the implementation plan and runtime contract document

**Objective:** Record the intended API shape and delivery steps before code changes continue.

**Files:**
- Create: `docs/plans/2026-04-13-runtime-contract-foundation.md`
- Create: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/ARCHITECTURE.md`

**Step 1: Write the contract document**

Document the following sections in `docs/RUNTIME_CONTRACT.md`:

```md
# Runtime Contract Foundation

## Goals
- define product-facing objects for workspace context, sessions, runs, event timelines, approvals, and artifacts
- keep frontend contracts stable while Hermes backend integration evolves
- make replayability and auditability first-class from the start
```

**Step 2: Capture the integration strategy**

Describe how current Hermes admin endpoints map into the new contract and call out temporary mock-data usage.

**Step 3: Verify docs render clearly**

Run: `sed -n '1,220p' docs/RUNTIME_CONTRACT.md`
Expected: sections appear in order with concrete field-level tables and no placeholder TODO text.

**Step 4: Commit**

```bash
git add docs/plans/2026-04-13-runtime-contract-foundation.md docs/RUNTIME_CONTRACT.md docs/ARCHITECTURE.md
git commit -m "docs: define runtime contract foundation"
```

### Task 2: Create shared runtime domain types and fixture data

**Objective:** Give the frontend a single source of truth for runtime-facing product objects.

**Files:**
- Create: `src/features/runtime/types.ts`
- Create: `src/features/runtime/mockData.ts`

**Step 1: Define type unions and interfaces**

```ts
export type RunStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed";

export interface RunTimelineEvent {
  id: string;
  kind: "message" | "tool_call" | "approval" | "artifact" | "system";
  status: "pending" | "active" | "completed" | "failed";
  ...
}
```

**Step 2: Add realistic fixture objects**

Populate sessions, runs, approvals, and timeline events that reflect Hermes concepts such as tool calls, browser work, approvals, artifacts, and replay metadata.

**Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: PASS with no new TypeScript errors.

**Step 4: Commit**

```bash
git add src/features/runtime/types.ts src/features/runtime/mockData.ts
git commit -m "feat: add runtime contract models"
```

### Task 3: Refactor Runs and Approvals pages to consume the shared contract

**Objective:** Replace placeholder copy-only sections with contract-backed product previews.

**Files:**
- Modify: `src/pages/RunsPage.tsx`
- Modify: `src/pages/ApprovalsPage.tsx`
- Modify: `src/pages/OverviewPage.tsx`
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`

**Step 1: Wire page chrome through i18n**

Add translation keys for runtime contract copy instead of introducing new hardcoded shell text.

**Step 2: Render contract-backed summaries**

Use the fixture module to render:
- run status summaries
- a selected run timeline preview
- approval queue cards with owner/scope/expiry metadata
- overview metrics that reinforce the runtime direction

**Step 3: Run lint/typecheck/build**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: all commands pass; existing non-blocking exhaustive-deps warning in `CronPage` remains the only known warning if still present.

**Step 4: Commit**

```bash
git add src/pages/RunsPage.tsx src/pages/ApprovalsPage.tsx src/pages/OverviewPage.tsx src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: surface runtime contract previews"
```

### Task 4: Update public project history and prepare PR handoff

**Objective:** Leave the repository ready for review with a durable record of what changed.

**Files:**
- Modify: `docs/DEVLOG.md`

**Step 1: Append a timestamped log entry**

Add a concise entry that includes:
- issue/branch focus
- what shipped
- validation commands and outcome
- next focus

**Step 2: Push and open PR**

```bash
git push -u origin feat/runtime-contract-foundation
```

Open a PR into `develop` titled:

```text
feat: define runtime contract foundation
```

PR body should summarize contract docs, shared types, runtime mock data, UI updates, and validation.

**Step 3: Final verification**

Run: `git status --short --branch`
Expected: clean working tree on `feat/runtime-contract-foundation`.

**Step 4: Commit if needed**

```bash
git add docs/DEVLOG.md
git commit -m "docs: record runtime contract foundation progress"
```
