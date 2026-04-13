# Issue #27 Approval Review Session Handoff Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Preserve workspace scope when operators jump from a workspace-scoped approval review into the related session review.

**Architecture:** Keep the approval review surface on the shared runtime contract and extract a tiny handoff helper instead of duplicating scope checks inline. Reuse the existing workspace query-param pattern from the run/session surfaces so approval review stays route-safe and easy to reason about.

**Tech Stack:** React, TypeScript, React Router, Vitest, Vite

---

### Task 1: Lock scoped approval-session handoff behavior in tests

**Objective:** Add focused coverage for approval review session links and the scope guard.

**Files:**
- Modify: `src/pages/ApprovalsPage.workspaceFilter.test.ts`

**Step 1: Write failing test**

```ts
it("preserves workspace scope on a deep-linked approval review", () => {
  const { markup } = renderApprovalsRoute("/approvals/approval-customer-support-network?workspace=customer-support");

  expect(markup).toContain("/sessions/sess-customer-support?workspace=customer-support");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/ApprovalsPage.workspaceFilter.test.ts`
Expected: FAIL — the approval review session handoff still drops the workspace query.

**Step 3: Write minimal implementation**

```ts
expect(getScopedApprovalReviewWorkspaceSlug("ws-customer-support", "customer-support", "ws-hcc")).toBeNull();
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/ApprovalsPage.workspaceFilter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/ApprovalsPage.workspaceFilter.test.ts
git commit -m "test: lock approval session handoff scope"
```

### Task 2: Make approval review session/run handoff route-safe

**Objective:** Update the approval review surface so both session and run drill-ins only preserve `?workspace=` when the related run belongs to the active scope.

**Files:**
- Modify: `src/pages/ApprovalsPage.tsx`
- Create: `src/pages/approvalReviewHandoff.ts`

**Step 1: Write failing test**

```ts
expect(markup).toContain("/runs/run-customer-support-triage?workspace=customer-support");
expect(markup).toContain("/sessions/sess-customer-support?workspace=customer-support");
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/ApprovalsPage.workspaceFilter.test.ts`
Expected: FAIL — the session link is unscoped and the guard is implicit.

**Step 3: Write minimal implementation**

```ts
export function getScopedApprovalReviewWorkspaceSlug(activeWorkspaceId, activeWorkspaceSlug, relatedRunWorkspaceId) {
  if (!activeWorkspaceId || !activeWorkspaceSlug || !relatedRunWorkspaceId) {
    return null;
  }

  return activeWorkspaceId === relatedRunWorkspaceId ? activeWorkspaceSlug : null;
}
```

Use the helper to drive both `buildRunPath()` and `buildSessionPath()` calls in `ApprovalsPage.tsx`.

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/ApprovalsPage.workspaceFilter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/ApprovalsPage.tsx src/pages/approvalReviewHandoff.ts src/pages/ApprovalsPage.workspaceFilter.test.ts
git commit -m "feat: preserve approval review session scope"
```

### Task 3: Document the route-safe approval handoff increment

**Objective:** Record the new approval-review handoff rule in architecture, runtime contract, and devlog docs.

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/DEVLOG.md`
- Create: `docs/plans/2026-04-14-issue-27-approval-session-handoff.md`

**Step 1: Write failing documentation expectation**

```md
- workspace-scoped approval review should preserve the active workspace query parameter on both run and session drill-ins when the selected approval belongs to that workspace.
```

**Step 2: Run focused verification before docs finalize**

Run: `npm run test -- --run src/pages/ApprovalsPage.workspaceFilter.test.ts`
Expected: PASS

**Step 3: Write minimal documentation updates**

```md
- approval review now keeps route-safe session handoff aligned with the existing scoped run handoff.
```

**Step 4: Run full verification**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- PASS for lint except the known non-blocking `CronPage.tsx` exhaustive-deps warning
- PASS for typecheck
- PASS for build except the known non-blocking Vite chunk-size warning

**Step 5: Commit**

```bash
git add docs/ARCHITECTURE.md docs/RUNTIME_CONTRACT.md docs/DEVLOG.md docs/plans/2026-04-14-issue-27-approval-session-handoff.md
git commit -m "docs: record approval session handoff"
```
