# Workspace-Scoped Runs Queue and Handoff Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Let operators move from a selected workspace into a workspace-scoped Runs view without losing context or seeing mismatched runs.

**Architecture:** Keep the existing runtime contract as the single source of truth. Add small pure helpers for workspace-aware run filtering and canonical URL resolution, then thread the selected workspace context through `RunsPage` via route-safe query parameters and localized shell copy.

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest, i18next

---

### Task 1: Add workspace-scoped run filtering helpers

**Objective:** Introduce pure helpers that derive the filtered run list and canonical workspace filter state from `RuntimeContractSnapshot`.

**Files:**
- Create: `src/pages/runsWorkspaceFilter.ts`
- Test: `src/pages/runsWorkspaceFilter.test.ts`

**Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { deriveRunsWorkspaceFilterState } from "@/pages/runsWorkspaceFilter";

describe("deriveRunsWorkspaceFilterState", () => {
  it("returns workspace-scoped runs and canonical slug when a valid workspace slug is provided", () => {
    const state = deriveRunsWorkspaceFilterState(runtimeContractSnapshot, "customer-support");

    expect(state.selectedWorkspace?.slug).toBe("customer-support");
    expect(state.filteredRuns.every((run) => run.workspaceId === state.selectedWorkspace?.id)).toBe(true);
    expect(state.shouldRedirectToCanonicalWorkspace).toBe(false);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/runsWorkspaceFilter.test.ts`
Expected: FAIL — helper file does not exist yet.

**Step 3: Write minimal implementation**

```ts
import { getDefaultWorkspace, getRunsForWorkspace, getWorkspaceBySlug } from "@/features/runtime/selectors";
import type { RunSummary, RuntimeContractSnapshot, WorkspaceSummary } from "@/features/runtime/types";

export interface RunsWorkspaceFilterState {
  selectedWorkspace: WorkspaceSummary | null;
  canonicalWorkspaceSlug: string | null;
  shouldRedirectToCanonicalWorkspace: boolean;
  shouldClearInvalidWorkspace: boolean;
  filteredRuns: RunSummary[];
}

export function deriveRunsWorkspaceFilterState(
  snapshot: RuntimeContractSnapshot,
  workspaceSlug: string | null | undefined,
): RunsWorkspaceFilterState {
  const matchedWorkspace = workspaceSlug ? getWorkspaceBySlug(snapshot, workspaceSlug) : null;
  const selectedWorkspace = matchedWorkspace;

  return {
    selectedWorkspace,
    canonicalWorkspaceSlug: selectedWorkspace?.slug ?? null,
    shouldRedirectToCanonicalWorkspace: Boolean(workspaceSlug && selectedWorkspace && workspaceSlug !== selectedWorkspace.slug),
    shouldClearInvalidWorkspace: Boolean(workspaceSlug && !selectedWorkspace),
    filteredRuns: selectedWorkspace ? getRunsForWorkspace(snapshot, selectedWorkspace.id) : snapshot.runs,
  };
}
```

**Step 4: Expand test coverage for invalid filters and unfiltered fallback**

```ts
it("marks invalid workspace filters for clearing", () => {
  const state = deriveRunsWorkspaceFilterState(runtimeContractSnapshot, "missing-workspace");

  expect(state.selectedWorkspace).toBeNull();
  expect(state.shouldClearInvalidWorkspace).toBe(true);
  expect(state.filteredRuns).toEqual(runtimeContractSnapshot.runs);
});
```

**Step 5: Run tests to verify pass**

Run: `npm run test -- --run src/pages/runsWorkspaceFilter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/runsWorkspaceFilter.ts src/pages/runsWorkspaceFilter.test.ts
git commit -m "feat: add workspace-scoped run filter helpers"
```

### Task 2: Make the Runs page honor workspace scope

**Objective:** Read the workspace query param, keep selected run state consistent with the filtered queue, and show active workspace context with a back-link.

**Files:**
- Modify: `src/pages/RunsPage.tsx`
- Test: `src/pages/RunsPage.workspaceFilter.test.ts`

**Step 1: Write failing test**

```tsx
it("renders only workspace-scoped runs when a workspace filter is present", async () => {
  window.history.replaceState({}, "", "/runs?workspace=customer-support");
  renderRunsPage();

  expect(await screen.findByText(/workspace-scoped queue/i)).toBeInTheDocument();
  expect(screen.queryByText(/infrastructure rollout/i)).not.toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts`
Expected: FAIL — page does not yet read `workspace` query params.

**Step 3: Write minimal implementation**

```tsx
const [searchParams] = useSearchParams();
const workspaceSlug = searchParams.get("workspace");
const workspaceFilter = deriveRunsWorkspaceFilterState(snapshot, workspaceSlug);
const visibleRuns = workspaceFilter.filteredRuns;
const defaultRun = visibleRuns[0] ?? null;
const matchedRun = runId ? visibleRuns.find((run) => run.id === runId) ?? null : null;
```

Add route-safe redirects:

```tsx
if (workspaceFilter.shouldClearInvalidWorkspace) {
  return <Navigate to={runId ? `/runs/${runId}` : "/runs"} replace />;
}

if (runId && !matchedRun) {
  return <Navigate to={workspaceFilter.selectedWorkspace ? `/runs?workspace=${workspaceFilter.selectedWorkspace.slug}` : `/runs/${defaultRun.id}`} replace />;
}
```

Add a visible filter summary card with a back-link:

```tsx
<Link to={`/workspaces/${workspaceFilter.selectedWorkspace.slug}`}>
  {t("runs.returnToWorkspace")}
</Link>
```

**Step 4: Add route coverage for invalid filters and filtered selected-run fallback**

```tsx
it("clears invalid workspace filters instead of rendering mismatched data", async () => {
  window.history.replaceState({}, "", "/runs?workspace=missing-workspace");
  renderRunsPage();

  await waitFor(() => {
    expect(window.location.pathname).toBe("/runs");
  });
});
```

**Step 5: Run tests to verify pass**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts src/pages/runsWorkspaceFilter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/RunsPage.tsx src/pages/RunsPage.workspaceFilter.test.ts src/pages/runsWorkspaceFilter.ts src/pages/runsWorkspaceFilter.test.ts
git commit -m "feat: add workspace-scoped runs review"
```

### Task 3: Add workspace queue handoff and bilingual shell copy

**Objective:** Expose a queue-style CTA from Workspaces and localize the new runs filter copy in English + Simplified Chinese.

**Files:**
- Modify: `src/pages/WorkspacesPage.tsx`
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`
- Test: `src/pages/WorkspacesPage.test.ts`

**Step 1: Write failing test**

```tsx
it("links the selected workspace to the scoped runs queue", async () => {
  renderWorkspacesPage("/workspaces/customer-support");

  const queueLink = await screen.findByRole("link", { name: /open workspace run queue/i });
  expect(queueLink).toHaveAttribute("href", "/runs?workspace=customer-support");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/WorkspacesPage.test.ts`
Expected: FAIL — queue-style handoff is not rendered yet.

**Step 3: Write minimal implementation**

```tsx
<Link className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline" to={`/runs?workspace=${selectedWorkspace.slug}`}>
  {t("workspaces.openWorkspaceRunQueue")}
</Link>
```

Add localized strings:

```json
"openWorkspaceRunQueue": "Open workspace run queue"
```

```json
"openWorkspaceRunQueue": "打开此工作空间的运行队列"
```

**Step 4: Run focused tests to verify pass**

Run: `npm run test -- --run src/pages/WorkspacesPage.test.ts src/pages/RunsPage.workspaceFilter.test.ts src/pages/runsWorkspaceFilter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/WorkspacesPage.tsx src/pages/WorkspacesPage.test.ts src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: add workspace queue handoff copy"
```

### Task 4: Full verification and docs hygiene

**Objective:** Confirm the increment is stable, append the public devlog, and prepare the branch for PR.

**Files:**
- Modify: `docs/DEVLOG.md`

**Step 1: Run focused tests**

Run: `npm run test -- --run src/pages/runsWorkspaceFilter.test.ts src/pages/RunsPage.workspaceFilter.test.ts src/pages/WorkspacesPage.test.ts`
Expected: PASS

**Step 2: Run repository verification**

Run: `npm run lint`
Expected: PASS with only the known non-blocking `CronPage.tsx` exhaustive-deps warning

Run: `npm run typecheck`
Expected: PASS

Run: `npm run build`
Expected: PASS with the existing non-blocking Vite chunk-size warning at most

**Step 3: Append the devlog entry**

```md
## 2026-04-13 HH:MM +08:00

- Continued issue #17 on `feat/issue-17-workspace-run-filter`.
- Added workspace-scoped runs filtering and queue-style handoff from Workspaces.
- Validation status:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run build` ✅
```

**Step 4: Commit**

```bash
git add docs/DEVLOG.md
git commit -m "docs: log workspace-scoped runs review increment"
```

**Step 5: Push and open PR**

```bash
git push -u origin feat/issue-17-workspace-run-filter
```

Open PR into `develop` with title:

```text
feat: add workspace-scoped runs queue and handoff
```

Include `Closes #17` in the PR body.
