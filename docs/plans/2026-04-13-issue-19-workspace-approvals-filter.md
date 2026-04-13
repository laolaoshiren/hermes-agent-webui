# Workspace-Scoped Approvals Queue and Trust Context Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Let operators move from a selected workspace into a workspace-scoped Approvals view without losing governance context or reviewing mismatched approvals.

**Architecture:** Reuse the existing runtime contract snapshot as the only source of truth. Add a small pure helper for workspace-aware approval filtering, then thread the active workspace scope through `ApprovalsPage` using route-safe query parameters and derived workspace/run/session trust context.

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest, i18next

---

### Task 1: Add workspace-scoped approval filtering helpers

**Objective:** Introduce pure helpers that derive workspace-scoped approval lists and invalid-filter handling from `RuntimeContractSnapshot`.

**Files:**
- Create: `src/pages/approvalsWorkspaceFilter.ts`
- Test: `src/pages/approvalsWorkspaceFilter.test.ts`

**Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { deriveApprovalsWorkspaceFilterState } from "@/pages/approvalsWorkspaceFilter";

describe("deriveApprovalsWorkspaceFilterState", () => {
  it("returns workspace-scoped approvals when a valid workspace slug is present", () => {
    const state = deriveApprovalsWorkspaceFilterState(runtimeContractSnapshot, "hermes-control-center");

    expect(state.selectedWorkspace?.slug).toBe("hermes-control-center");
    expect(state.filteredApprovals.every((approval) => approval.runId)).toBe(true);
    expect(state.shouldClearInvalidWorkspace).toBe(false);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/approvalsWorkspaceFilter.test.ts`
Expected: FAIL — helper file does not exist yet.

**Step 3: Write minimal implementation**

```ts
import { getApprovalsForWorkspace, getWorkspaceBySlug } from "@/features/runtime/selectors";
import type { ApprovalSummary, RuntimeContractSnapshot, WorkspaceSummary } from "@/features/runtime/types";

export interface ApprovalsWorkspaceFilterState {
  selectedWorkspace: WorkspaceSummary | null;
  shouldClearInvalidWorkspace: boolean;
  filteredApprovals: ApprovalSummary[];
}

export function deriveApprovalsWorkspaceFilterState(
  snapshot: RuntimeContractSnapshot,
  workspaceSlug: string | null | undefined,
): ApprovalsWorkspaceFilterState {
  const selectedWorkspace = workspaceSlug ? getWorkspaceBySlug(snapshot, workspaceSlug) : null;

  return {
    selectedWorkspace,
    shouldClearInvalidWorkspace: Boolean(workspaceSlug && !selectedWorkspace),
    filteredApprovals: selectedWorkspace ? getApprovalsForWorkspace(snapshot, selectedWorkspace.id) : snapshot.approvals,
  };
}
```

**Step 4: Expand test coverage for invalid filters and unfiltered fallback**

```ts
it("marks invalid workspace filters for clearing", () => {
  const state = deriveApprovalsWorkspaceFilterState(runtimeContractSnapshot, "missing-workspace");

  expect(state.selectedWorkspace).toBeNull();
  expect(state.shouldClearInvalidWorkspace).toBe(true);
  expect(state.filteredApprovals).toEqual(runtimeContractSnapshot.approvals);
});
```

**Step 5: Run tests to verify pass**

Run: `npm run test -- --run src/pages/approvalsWorkspaceFilter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/approvalsWorkspaceFilter.ts src/pages/approvalsWorkspaceFilter.test.ts
git commit -m "feat: add workspace-scoped approval filter helpers"
```

### Task 2: Make the Approvals page honor workspace scope and trust context

**Objective:** Read the workspace query param, keep selection inside the active workspace scope, and surface workspace/run/session trust context with clear return paths.

**Files:**
- Modify: `src/pages/ApprovalsPage.tsx`
- Test: `src/pages/ApprovalsPage.workspaceFilter.test.ts`

**Step 1: Write failing test**

```tsx
it("renders only workspace-scoped approvals when a workspace filter is present", () => {
  const { markup } = renderApprovalsRoute("/approvals?workspace=customer-support");

  expect(markup).toContain("Workspace-scoped approvals");
  expect(markup).toContain("Customer Support");
  expect(markup).not.toContain("Review runtime adapter PR");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/ApprovalsPage.workspaceFilter.test.ts`
Expected: FAIL — page does not yet read `workspace` query params.

**Step 3: Write minimal implementation**

```tsx
const [searchParams] = useSearchParams();
const workspaceSlug = searchParams.get("workspace");
const workspaceFilter = deriveApprovalsWorkspaceFilterState(snapshot, workspaceSlug);
const visibleApprovals = workspaceFilter.filteredApprovals;
const defaultApproval = visibleApprovals.find((approval) => approval.status === "pending") ?? visibleApprovals[0] ?? null;
const matchedApproval = approvalId ? visibleApprovals.find((approval) => approval.id === approvalId) ?? null : null;
```

Add route-safe redirects and trust links:

```tsx
if (workspaceFilter.shouldClearInvalidWorkspace) {
  return <Navigate to={approvalId ? `/approvals/${approvalId}` : "/approvals"} replace />;
}
```

```tsx
<Link to={`/workspaces/${workspaceFilter.selectedWorkspace.slug}`}>
  {t("approvals.returnToWorkspace")}
</Link>
```

```tsx
<Link to={`/runs/${relatedRun.id}${workspaceFilter.selectedWorkspace ? `?workspace=${workspaceFilter.selectedWorkspace.slug}` : ""}`}>
  {t("approvals.openRunReview")}
</Link>
```

**Step 4: Expand the selected approval review with workspace, repository, branch, policy, session, and latest replay context**

```tsx
<div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{t("approvals.workspaceLabel")}</div>
<div className="mt-1 font-medium text-foreground">{selectedWorkspace.name}</div>
```

**Step 5: Run focused tests to verify pass**

Run: `npm run test -- --run src/pages/ApprovalsPage.workspaceFilter.test.ts src/pages/approvalsWorkspaceFilter.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/pages/ApprovalsPage.tsx src/pages/ApprovalsPage.workspaceFilter.test.ts src/pages/approvalsWorkspaceFilter.ts src/pages/approvalsWorkspaceFilter.test.ts
git commit -m "feat: add workspace-scoped approvals review"
```

### Task 3: Add workspace handoff copy and bilingual approvals strings

**Objective:** Expose a queue-style workspace-to-approvals handoff and localize the new approvals scope/trust-context copy in English + Simplified Chinese.

**Files:**
- Modify: `src/pages/WorkspacesPage.tsx`
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`
- Test: `src/pages/WorkspacesPage.test.ts`

**Step 1: Write failing test**

```tsx
it("links the selected workspace to the scoped approvals queue", () => {
  const markup = renderWorkspaceRoute("/workspaces/hermes-control-center");

  expect(markup).toContain("Open workspace approvals queue");
  expect(markup).toContain("/approvals?workspace=hermes-control-center");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/WorkspacesPage.test.ts`
Expected: FAIL — queue-style approvals handoff is not rendered yet.

**Step 3: Write minimal implementation**

```tsx
<Link className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline" to={`/approvals?workspace=${selectedWorkspace.slug}`}>
  {t("workspaces.openWorkspaceApprovalsQueue")}
</Link>
```

Add localized strings:

```json
"openWorkspaceApprovalsQueue": "Open workspace approvals queue"
```

```json
"openWorkspaceApprovalsQueue": "打开工作区审批队列"
```

**Step 4: Run focused tests to verify pass**

Run: `npm run test -- --run src/pages/WorkspacesPage.test.ts src/pages/ApprovalsPage.workspaceFilter.test.ts src/pages/approvalsWorkspaceFilter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/WorkspacesPage.tsx src/pages/WorkspacesPage.test.ts src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: add workspace approvals handoff copy"
```

### Task 4: Full verification and docs hygiene

**Objective:** Confirm the increment is stable, document the route-safe approvals scope, append the public devlog, and prepare the branch for PR.

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/DEVLOG.md`

**Step 1: Run focused tests**

Run: `npm run test -- --run src/pages/approvalsWorkspaceFilter.test.ts src/pages/ApprovalsPage.workspaceFilter.test.ts src/pages/WorkspacesPage.test.ts`
Expected: PASS

**Step 2: Run repository verification**

Run: `npm run lint`
Expected: PASS with only the known non-blocking `CronPage.tsx` exhaustive-deps warning

Run: `npm run typecheck`
Expected: PASS

Run: `npm run build`
Expected: PASS with the existing non-blocking Vite chunk-size warning at most

**Step 3: Append the devlog entry**

Add a concise timestamped entry summarizing issue #19, validation, and next focus.

**Step 4: Commit**

```bash
git add docs/ARCHITECTURE.md docs/RUNTIME_CONTRACT.md docs/DEVLOG.md docs/plans/2026-04-13-issue-19-workspace-approvals-filter.md
git commit -m "docs: record workspace approvals queue plan and validation"
```
