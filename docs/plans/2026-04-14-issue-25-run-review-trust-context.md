# Issue #25 Run Review Trust Context Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add workspace-aware trust context and route-safe session/approval handoff to the selected run review so operators can stay oriented while moving through replay workflows.

**Architecture:** Extend the existing `RunsPage` route surface without introducing a new data model. Reuse the current workspace filter derivation, runtime snapshot selectors, and route-safe query-param patterns already used by `SessionsPage` and `ApprovalsPage`. Keep trust-context derivation local to the selected run review or extract only a tiny helper if it meaningfully reduces duplication.

**Tech Stack:** React, TypeScript, React Router, react-i18next, Vitest, Vite

---

### Task 1: Lock the desired scoped handoff behavior in tests

**Objective:** Add failing tests that describe the workspace-scoped run review trust surface and deep-link preservation rules.

**Files:**
- Modify: `src/pages/RunsPage.workspaceFilter.test.ts`
- Modify: `src/pages/RunsPage.test.ts`

**Step 1: Write failing test**

```ts
it("preserves workspace scope on run review handoff links", () => {
  const { markup } = renderRunsRoute("/runs/run-customer-support-triage?workspace=customer-support");

  expect(markup).toContain("/sessions/sess-customer-support?workspace=customer-support");
  expect(markup).toContain("/approvals/apr-customer-support?workspace=customer-support");
  expect(markup).toContain("Customer Support");
  expect(markup).toContain("support-ops");
  expect(markup).toContain("support-safe");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts`
Expected: FAIL — selected run review does not yet render scoped session/approval handoff or workspace trust context.

**Step 3: Write minimal implementation**

```ts
function buildSessionHref(sessionId: string, workspaceSlug: string | null) {
  if (!workspaceSlug) return `/sessions/${sessionId}`;
  return `/sessions/${sessionId}?${new URLSearchParams({ workspace: workspaceSlug }).toString()}`;
}

function buildApprovalHref(approvalId: string, workspaceSlug: string | null) {
  if (!workspaceSlug) return `/approvals/${approvalId}`;
  return `/approvals/${approvalId}?${new URLSearchParams({ workspace: workspaceSlug }).toString()}`;
}
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts src/pages/RunsPage.tsx
git commit -m "test: lock run review workspace handoff behavior"
```

### Task 2: Render selected-run trust context and session handoff cues

**Objective:** Upgrade the selected run review from raw identifiers to trust-aware workspace/session context that matches adjacent shell surfaces.

**Files:**
- Modify: `src/pages/RunsPage.tsx`
- Reference: `src/pages/SessionsPage.tsx`
- Reference: `src/pages/ApprovalsPage.tsx`

**Step 1: Write failing test**

```ts
expect(markup).toContain("Run trust context");
expect(markup).toContain("Open session review");
expect(markup).toContain("Repository");
expect(markup).toContain("Default branch");
expect(markup).toContain("Policy preset");
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts`
Expected: FAIL — new selected-run trust-context copy is absent.

**Step 3: Write minimal implementation**

```tsx
const selectedSession = snapshot.sessions.find((session) => session.id === selectedRun.sessionId) ?? null;
const selectedWorkspace = selectedRun.workspaceId
  ? snapshot.workspaces.find((workspace) => workspace.id === selectedRun.workspaceId) ?? null
  : workspaceFilter.selectedWorkspace ?? null;

<Link to={buildSessionHref(selectedRun.sessionId, selectedWorkspace?.slug ?? null)}>
  {t("runs.openSessionReview")}
</Link>
```

Render a small trust-context section with:
- session title/id plus route-safe session link
- workspace name when available
- repository owner/name or fallback copy
- default branch
- policy preset

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/RunsPage.tsx src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts
git commit -m "feat: add run review trust context"
```

### Task 3: Add bilingual copy for run trust context and workspace-safe handoff

**Objective:** Localize new selected-run trust-context labels in English and Simplified Chinese.

**Files:**
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`

**Step 1: Write failing test**

```ts
expect(markup).toContain("Run trust context");
expect(markup).toContain("Open session review");
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts`
Expected: FAIL — translation keys are missing.

**Step 3: Write minimal implementation**

```json
{
  "runs": {
    "trustContextLabel": "Run trust context",
    "trustContextTitle": "Selected run operator context",
    "workspaceLabel": "Workspace",
    "repositoryLabel": "Repository",
    "defaultBranchLabel": "Default branch",
    "policyPresetLabel": "Policy preset",
    "openSessionReview": "Open session review",
    "notSet": "Not set",
    "noRepositoryLinked": "No repository linked"
  }
}
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: localize run trust context copy"
```

### Task 4: Document and verify the issue #25 increment

**Objective:** Update public docs, devlog, and validation evidence for the run review trust-context increment.

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/DEVLOG.md`
- Create: `docs/plans/2026-04-14-issue-25-run-review-trust-context.md`

**Step 1: Write failing documentation expectation**

```md
- The selected run review now preserves workspace-safe session and approval handoff while surfacing workspace trust context.
```

**Step 2: Run focused verification before docs finalize**

Run: `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts`
Expected: PASS after implementation.

**Step 3: Write minimal documentation updates**

```md
- `RunsPage` now exposes selected-run trust context derived from linked workspace and session records, and workspace-scoped drill-in links preserve the active `?workspace=` query parameter.
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
git add docs/ARCHITECTURE.md docs/RUNTIME_CONTRACT.md docs/DEVLOG.md docs/plans/2026-04-14-issue-25-run-review-trust-context.md
git commit -m "docs: record run review trust context"
```

---

## Review checklist

- [ ] Tasks are sequential and bite-sized
- [ ] Selected run review reuses existing workspace filter patterns instead of inventing ad hoc state
- [ ] Session and approval drill-in links preserve workspace scope only when appropriate
- [ ] New copy is localized in English and Simplified Chinese
- [ ] Focused tests cover scoped and unscoped behavior
- [ ] `npm run lint`, `npm run typecheck`, and `npm run build` are executed before promotion
- [ ] `docs/DEVLOG.md` gets a timestamped entry for this run
