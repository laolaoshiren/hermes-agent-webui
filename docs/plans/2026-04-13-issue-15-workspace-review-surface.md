# Workspace Review Surface Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the placeholder Workspaces route with a runtime-backed workspace review surface that supports canonical selection and operator handoff into related sessions, runs, and approvals.

**Architecture:** Reuse the existing `RuntimeContractSnapshot` as the only source of truth for workspace-linked state. Add thin selector/helper logic for canonical workspace selection and derived metrics, then render a route-based workspace page that follows the same live-vs-fixture hydration pattern as Runs and Sessions.

**Tech Stack:** React, TypeScript, React Router, react-i18next, Vitest, existing Hermes Control Center runtime selectors

---

### Task 1: Add workspace selection and metric helpers

**Objective:** Create reusable helper logic that turns the shared runtime snapshot into a canonical workspace review state.

**Files:**
- Modify: `src/features/runtime/selectors.ts`
- Create: `src/pages/workspaceReview.ts`
- Test: `src/pages/workspaceReview.test.ts`

**Step 1: Write failing test**

```ts
it("derives canonical workspace review state and linked metrics", () => {
  const review = deriveWorkspaceReview(snapshot, null)
  expect(review.canonicalWorkspaceId).toBe("ws-hcc")
  expect(review.metrics.sessions).toBe(1)
  expect(review.metrics.pendingApprovals).toBe(1)
})
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/workspaceReview.test.ts`
Expected: FAIL — helper does not exist yet.

**Step 3: Write minimal implementation**

```ts
export function getDefaultWorkspace(snapshot: RuntimeContractSnapshot) {
  return snapshot.workspaces.find((workspace) => workspace.status === "active") ?? snapshot.workspaces[0] ?? null
}
```

Add helper logic that:
- resolves the selected workspace from route params
- redirects invalid workspace ids to the canonical workspace id
- derives linked session/run/approval/artifact counts
- chooses a primary run and primary approval handoff when available

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/workspaceReview.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/runtime/selectors.ts src/pages/workspaceReview.ts src/pages/workspaceReview.test.ts
git commit -m "feat: add workspace review helpers"
```

### Task 2: Add route-based workspace review UI

**Objective:** Replace the placeholder page with a real runtime-backed workspace review surface.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/WorkspacesPage.tsx`
- Test: `src/pages/WorkspacesPage.test.ts`

**Step 1: Write failing test**

```ts
it("renders selected workspace review and related handoff links", () => {
  const markup = renderWorkspaceRoute("/workspaces/ws-hcc")
  expect(markup).toContain("Hermes Control Center")
  expect(markup).toContain("Open run review")
  expect(markup).toContain("/runs/")
})
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/WorkspacesPage.test.ts`
Expected: FAIL — page still renders placeholder cards only.

**Step 3: Write minimal implementation**

```tsx
<Route path="/workspaces/:workspaceId" element={<WorkspacesPage />} />
```

Replace the current static cards with:
- hydration-aware header actions
- workspace list with selected-state styling
- selected workspace detail cards for repository, policy, freshness, and workload metrics
- handoff links into `/sessions/:sessionId`, `/runs/:runId`, and `/approvals/:approvalId` when data exists
- honest empty state when no workspaces exist

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/WorkspacesPage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/pages/WorkspacesPage.tsx src/pages/WorkspacesPage.test.ts
git commit -m "feat: add workspace review surface"
```

### Task 3: Localize and document the workspace surface

**Objective:** Ensure the new route is bilingual and documented in the public runtime architecture docs.

**Files:**
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/RUNTIME_CONTRACT.md`

**Step 1: Write failing verification**

Check for new hardcoded shell strings in the page:

```bash
python3 - <<'PY'
from pathlib import Path
text = Path('src/pages/WorkspacesPage.tsx').read_text()
for probe in ['Workspace health', 'Open run review', 'Policy preset']:
    print(probe, probe in text)
PY
```

Expected: hardcoded strings still present before localization cleanup.

**Step 2: Write minimal implementation**

Add locale keys for all new workspace copy in English and Simplified Chinese. Update docs so contributors understand that the workspace route is a read-only operator surface derived from the shared runtime contract until richer backend workspace APIs exist.

**Step 3: Run verification**

Run:
- `npm run test -- --run src/pages/workspaceReview.test.ts src/pages/WorkspacesPage.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- tests PASS
- lint PASS (allowing the existing non-blocking `CronPage.tsx` exhaustive-deps warning)
- typecheck PASS
- build PASS

**Step 4: Commit**

```bash
git add src/locales/en/app.json src/locales/zh-CN/app.json docs/ARCHITECTURE.md docs/RUNTIME_CONTRACT.md
git commit -m "docs: localize and document workspace review surface"
```

### Task 4: Final promotion hygiene

**Objective:** Leave the increment in a reviewable, traceable state for GitHub.

**Files:**
- Modify: `docs/DEVLOG.md`

**Step 1: Append public devlog entry**

Document:
- issue number and branch
- what changed
- validation results
- next focus

**Step 2: Run final review commands**

Run:
- `git status --short`
- `git diff --stat develop...HEAD`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: only intended files changed and all verification passes.

**Step 3: Commit and promote**

```bash
git add docs/DEVLOG.md
git commit -m "docs: record workspace review surface progress"
git push -u origin feat/issue-15-workspace-review-surface
```

Then open a PR into `develop` titled:

```text
feat: add workspace review surface and operator handoff
```
