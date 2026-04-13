# Issue #2 Runtime Adapter Scaffolding Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a shared adapter seam that converts Hermes-native session/runtime payloads into the product-facing runtime contract used by the Runs and Approvals shell.

**Architecture:** Keep the existing product contract as the UI-facing boundary and introduce pure adapter functions underneath it. Refactor fixture data so the current shell renders an adapter-produced snapshot rather than a hand-assembled contract object, which prepares the codebase for live API integration without rewriting page components.

**Tech Stack:** React 19, TypeScript, Vite, existing `src/lib/api.ts` session/admin types, i18next-backed UI shell

---

### Task 1: Define adapter input types

**Objective:** Capture the Hermes-native payload shapes the adapter layer will accept so mapping logic stays explicit and typed.

**Files:**
- Create: `src/features/runtime/adapterTypes.ts`
- Modify: `src/features/runtime/types.ts`
- Test: verification via `npm run typecheck`

**Step 1: Create adapter-source interfaces**

```ts
export interface RuntimeSessionSource {
  session: SessionInfo;
  messages: SessionMessage[];
  runId?: string;
  workspaceId?: string | null;
}
```

**Step 2: Add adapter-side records for runs, approvals, and artifacts**

```ts
export interface RuntimeRunSource {
  id: string;
  sessionId: string;
  status: RunStatus;
  trigger: RunTrigger;
  title: string;
  summary: string;
}
```

**Step 3: Verify types compile**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/features/runtime/adapterTypes.ts src/features/runtime/types.ts
git commit -m "feat: define runtime adapter source types"
```

### Task 2: Add pure runtime adapter helpers

**Objective:** Convert raw Hermes-facing payloads into `RuntimeContractSnapshot` collections without page-level logic.

**Files:**
- Create: `src/features/runtime/adapters.ts`
- Modify: `src/features/runtime/selectors.ts`
- Test: verification via `npm run typecheck`

**Step 1: Add normalization helpers**

```ts
function toIsoTimestamp(value: number | string | null): string | null {
  if (value === null) return null;
  return typeof value === "number" ? new Date(value * 1000).toISOString() : value;
}
```

**Step 2: Add collection builders**

```ts
export function buildRuntimeSnapshot(source: RuntimeAdapterSource): RuntimeContractSnapshot {
  return {
    workspaces: buildWorkspaces(source),
    sessions: buildSessions(source),
    runs: buildRuns(source),
    approvals: buildApprovals(source),
    artifacts: buildArtifacts(source),
    events: buildEvents(source),
  };
}
```

**Step 3: Add invariant-safe linking**

```ts
const approvalsByRun = new Map<string, ApprovalSummary[]>();
const artifactsByRun = new Map<string, ArtifactSummary[]>();
```

**Step 4: Verify compile safety**

Run: `npm run typecheck`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/runtime/adapters.ts src/features/runtime/selectors.ts
git commit -m "feat: add runtime contract adapter helpers"
```

### Task 3: Refactor fixture data to use the adapter layer

**Objective:** Prove the adapter seam by producing the existing runtime snapshot from Hermes-like source fixtures instead of hand-written contract arrays.

**Files:**
- Modify: `src/features/runtime/mockData.ts`
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`
- Test: verification via `npm run lint`

**Step 1: Replace hand-built contract arrays with source fixtures**

```ts
const runtimeAdapterSource: RuntimeAdapterSource = {
  workspaces: [...],
  sessionSources: [...],
  runs: [...],
  approvals: [...],
  artifacts: [...],
};
```

**Step 2: Export the adapter-built snapshot**

```ts
export const runtimeContractSnapshot = buildRuntimeSnapshot(runtimeAdapterSource);
```

**Step 3: Add any new localization keys for adapter-oriented operator copy**

```json
"runtimeAdapterTitle": "Runtime adapter seam"
```

**Step 4: Verify lint quality**

Run: `npm run lint`
Expected: PASS (existing `CronPage` exhaustive-deps warning may remain unchanged)

**Step 5: Commit**

```bash
git add src/features/runtime/mockData.ts src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "refactor: build runtime fixtures through adapter seam"
```

### Task 4: Document the adapter boundary

**Objective:** Make future backend integration obvious for contributors and subagents.

**Files:**
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/ARCHITECTURE.md`
- Test: verification via `npm run build`

**Step 1: Extend the runtime contract doc**

```md
## Adapter entry points
- `/api/sessions` → session summary normalization
- `/api/sessions/:id/messages` → timeline backfill
- future approval/artifact endpoints → durable review objects
```

**Step 2: Extend architecture notes**

```md
- frontend pages should consume adapter-built product objects, not raw admin responses
```

**Step 3: Verify production build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add docs/RUNTIME_CONTRACT.md docs/ARCHITECTURE.md
git commit -m "docs: define runtime adapter boundary"
```

### Task 5: Record the increment and verify promotion readiness

**Objective:** Keep public project hygiene up to date before opening the new branch for review.

**Files:**
- Modify: `docs/DEVLOG.md`
- Test: `npm run lint && npm run typecheck && npm run build`

**Step 1: Append a timestamped devlog entry**

```md
## 2026-04-13 HH:MM +08:00
- Promoted the approval review slice into `develop`
- Started `feat/issue-2-runtime-adapter-scaffolding`
- Added runtime adapter source types and pure snapshot mappers
- Validation: lint/typecheck/build
- Next focus: live API hydration and replay/event timeline enrichment
```

**Step 2: Run the full required verification**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: PASS (allow only the known unchanged `CronPage` warning)

**Step 3: Commit**

```bash
git add docs/DEVLOG.md
git commit -m "docs: log runtime adapter scaffolding progress"
```

### Promotion checklist

- Push branch: `git push -u origin feat/issue-2-runtime-adapter-scaffolding`
- Open or update PR into `develop` with issue linkage and validation notes
- Monitor CI before any merge/promotion
- Continue with live API hydration only after the adapter seam is stable
