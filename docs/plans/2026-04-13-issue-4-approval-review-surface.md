# Issue #4 Approval Review Surface Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a first reviewable approval inbox flow that deep-links between approvals and runs, so operators can inspect a selected approval together with the owning run timeline.

**Architecture:** Keep the existing runtime contract as the single source of truth and add a thin selection/navigation layer on top of it. Use route parameters plus shared runtime selector helpers so the Runs and Approvals pages render the same run/approval relationships instead of maintaining page-specific lookup logic.

**Tech Stack:** React 19, React Router 7, TypeScript, i18next, existing card/badge UI primitives, Vite

---

### Task 1: Add shared runtime selector helpers

**Objective:** Centralize runtime lookups so Runs and Approvals use the same run/approval/timeline/artifact relationship logic.

**Files:**
- Create: `src/features/runtime/selectors.ts`
- Modify: `src/features/runtime/mockData.ts`
- Test: verification via `npm run typecheck`

**Step 1: Write the selector module**

```ts
import { runtimeContractSnapshot } from "@/features/runtime/mockData";

export function getRunById(runId: string) {
  return runtimeContractSnapshot.runs.find((run) => run.id === runId) ?? null;
}

export function getApprovalById(approvalId: string) {
  return runtimeContractSnapshot.approvals.find((approval) => approval.id === approvalId) ?? null;
}
```

**Step 2: Add relationship helpers**

```ts
export function getRunArtifacts(runId: string) {
  return runtimeContractSnapshot.artifacts.filter((artifact) => artifact.runId === runId);
}

export function getRunTimeline(runId: string) {
  return runtimeContractSnapshot.events
    .filter((event) => event.runId === runId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}
```

**Step 3: Verify selectors compile**

Run: `npm run typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add src/features/runtime/selectors.ts src/features/runtime/mockData.ts
git commit -m "feat: add runtime selector helpers"
```

### Task 2: Add route-based run review selection

**Objective:** Let `/runs/:runId` drive the selected run and make the run summary list navigable.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/RunsPage.tsx`
- Test: verification via `npm run lint`

**Step 1: Add route patterns for run detail selection**

```tsx
<Route path="/runs" element={<RunsPage />} />
<Route path="/runs/:runId" element={<RunsPage />} />
```

**Step 2: Read the route parameter inside `RunsPage`**

```tsx
const { runId } = useParams();
const selectedRun = getRunById(runId ?? "") ?? defaultRun;
```

**Step 3: Make each run summary card navigate to its detail route**

```tsx
<Link to={`/runs/${run.id}`} className="block border border-border bg-background/60 p-4">
  ...
</Link>
```

**Step 4: Surface selected-run context clearly**

```tsx
<div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
  {t("runs.selectedRunLabel")}
</div>
```

**Step 5: Verify UI code quality**

Run: `npm run lint`
Expected: PASS (existing `CronPage` exhaustive-deps warning may remain)

**Step 6: Commit**

```bash
git add src/App.tsx src/pages/RunsPage.tsx
git commit -m "feat: add route-based run review selection"
```

### Task 3: Add approval drill-in with related run context

**Objective:** Let `/approvals/:approvalId` select an approval and expose the owning run plus a direct path into the run review surface.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/ApprovalsPage.tsx`
- Modify: `src/pages/RunsPage.tsx`
- Test: verification via `npm run typecheck`

**Step 1: Add route patterns for approval detail selection**

```tsx
<Route path="/approvals" element={<ApprovalsPage />} />
<Route path="/approvals/:approvalId" element={<ApprovalsPage />} />
```

**Step 2: Make approval cards navigable and selectable**

```tsx
<Link to={`/approvals/${approval.id}`} className="block border border-border bg-background/60 p-4">
  ...
</Link>
```

**Step 3: Add a selected approval review panel**

```tsx
const selectedApproval = getApprovalById(approvalId ?? "") ?? runtimeContractSnapshot.approvals[0];
const relatedRun = getRunById(selectedApproval.runId);
```

**Step 4: Add a direct link into the related run review**

```tsx
<Link to={`/runs/${selectedApproval.runId}`}>{t("approvals.openRunReview")}</Link>
```

**Step 5: Verify type safety**

Run: `npm run typecheck`
Expected: PASS

**Step 6: Commit**

```bash
git add src/App.tsx src/pages/ApprovalsPage.tsx src/pages/RunsPage.tsx
git commit -m "feat: add approval drill-in and run linkage"
```

### Task 4: Localize the new review-surface copy

**Objective:** Keep the new run/approval navigation UX bilingual from day one.

**Files:**
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`
- Test: verification via `npm run build`

**Step 1: Add English strings**

```json
"selectedRunLabel": "Selected run",
"openApproval": "Open approval",
"selectedApprovalTitle": "Selected approval",
"openRunReview": "Open run review"
```

**Step 2: Add Simplified Chinese strings**

```json
"selectedRunLabel": "当前选中运行",
"openApproval": "查看审批",
"selectedApprovalTitle": "当前选中审批",
"openRunReview": "查看运行审查"
```

**Step 3: Verify production build**

Run: `npm run build`
Expected: PASS

**Step 4: Commit**

```bash
git add src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: localize approval review surface copy"
```

### Task 5: Record project hygiene and verification

**Objective:** Keep project discipline intact by updating public docs and verifying the increment before promotion.

**Files:**
- Modify: `docs/DEVLOG.md`
- Test: `npm run lint && npm run typecheck && npm run build`

**Step 1: Append a timestamped `DEVLOG` entry**

```md
## 2026-04-13 HH:MM +08:00
- Merged PR #7 into `develop`
- Advanced issue #4 with approval drill-in and run review routing
- Validation: lint/typecheck/build
- Next focus: adapter layer from Hermes session/runtime APIs into the shared contract
```

**Step 2: Run the full required verification**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: PASS (allow the known non-blocking `CronPage` lint warning only if unchanged)

**Step 3: Commit**

```bash
git add docs/DEVLOG.md
git commit -m "docs: log approval review surface progress"
```

### Promotion checklist

- Push branch: `git push -u origin feat/issue-4-approval-review-surface`
- Open PR into `develop` with summary, issue linkage, and validation notes
- Wait for CI or inspect checks via GitHub API
- Merge only when checks are green and branch state is coherent
