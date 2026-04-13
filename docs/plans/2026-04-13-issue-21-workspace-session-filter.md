# Workspace-Scoped Session Exploration and Handoff Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add workspace-scoped session exploration so operators can stay inside one workspace lane while reviewing transcripts and handing off into related runtime objects.

**Architecture:** Reuse the existing runtime contract snapshot as the workspace authority, add a small pure helper for session/workspace filtering, and thread the `?workspace=<slug>` query parameter through the Sessions and Workspaces product-shell routes. Keep canonical redirects explicit so invalid slugs do not silently render unrelated data.

**Tech Stack:** React, TypeScript, React Router, Vitest, i18next

---

### Task 1: Add a pure workspace-session filter helper

**Objective:** Centralize workspace query handling for the Sessions surface in a pure helper with focused tests.

**Files:**
- Create: `src/pages/sessionsWorkspaceFilter.ts`
- Test: `src/pages/sessionsWorkspaceFilter.test.ts`

**Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";

import { runtimeContractSnapshot } from "@/features/runtime/mockData";
import { deriveSessionsWorkspaceFilter } from "@/pages/sessionsWorkspaceFilter";

describe("deriveSessionsWorkspaceFilter", () => {
  it("filters sessions to the selected workspace", () => {
    const state = deriveSessionsWorkspaceFilter(runtimeContractSnapshot, "hermes-control-center");

    expect(state.selectedWorkspace?.slug).toBe("hermes-control-center");
    expect(state.filteredSessions.every((session) => session.workspaceId === "ws-hcc")).toBe(true);
    expect(state.shouldClearInvalidWorkspace).toBe(false);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/sessionsWorkspaceFilter.test.ts`
Expected: FAIL — module or export does not exist yet.

**Step 3: Write minimal implementation**

```ts
import { getWorkspaceBySlug } from "@/features/runtime/selectors";
import type { RuntimeContractSnapshot, SessionSummary, WorkspaceSummary } from "@/features/runtime/types";

export interface SessionsWorkspaceFilterState {
  selectedWorkspace: WorkspaceSummary | null;
  filteredSessions: SessionSummary[];
  shouldClearInvalidWorkspace: boolean;
}

export function deriveSessionsWorkspaceFilter(
  snapshot: RuntimeContractSnapshot,
  workspaceSlug: string | null | undefined,
): SessionsWorkspaceFilterState {
  const selectedWorkspace = workspaceSlug ? getWorkspaceBySlug(snapshot, workspaceSlug) : null;

  return {
    selectedWorkspace,
    filteredSessions: selectedWorkspace
      ? snapshot.sessions.filter((session) => session.workspaceId === selectedWorkspace.id)
      : snapshot.sessions,
    shouldClearInvalidWorkspace: Boolean(workspaceSlug && !selectedWorkspace),
  };
}
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/sessionsWorkspaceFilter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/sessionsWorkspaceFilter.ts src/pages/sessionsWorkspaceFilter.test.ts
git commit -m "test: add workspace session filter helper coverage"
```

### Task 2: Wire workspace scope into SessionsPage routing and handoff

**Objective:** Make SessionsPage honor the workspace query parameter, preserve canonical workspace-aware links, and expose workspace trust context.

**Files:**
- Modify: `src/pages/SessionsPage.tsx`
- Modify: `src/pages/sessionReview.ts`
- Test: `src/pages/SessionsPage.route.test.ts`

**Step 1: Write failing test**

```ts
it("keeps workspace scope on session review and related run handoff", () => {
  const markup = renderSessionsRoute("/sessions/sess-20260413-runtime-contract?workspace=hermes-control-center");

  expect(markup).toContain("Workspace-scoped sessions");
  expect(markup).toContain("/runs/run-runtime-adapter?workspace=hermes-control-center");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/SessionsPage.route.test.ts`
Expected: FAIL — workspace trust context and scoped handoff are missing.

**Step 3: Write minimal implementation**

```tsx
const [searchParams] = useSearchParams();
const workspaceSlug = searchParams.get("workspace");
const workspaceFilter = deriveSessionsWorkspaceFilter(snapshot, workspaceSlug);
const filteredSessions = sessions.filter((session) => workspaceFilter.filteredSessions.some((item) => item.id === session.id));
const relatedRunLink = workspaceFilter.selectedWorkspace
  ? `/runs/${review.relatedRun.id}?workspace=${workspaceFilter.selectedWorkspace.slug}`
  : `/runs/${review.relatedRun.id}`;
```

Also extend `deriveSessionReview()` so it can choose a default session from a pre-filtered list, and render a visible workspace-scope summary card when a valid workspace is active.

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/SessionsPage.route.test.ts src/pages/sessionsWorkspaceFilter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/SessionsPage.tsx src/pages/sessionReview.ts src/pages/SessionsPage.route.test.ts src/pages/sessionsWorkspaceFilter.ts src/pages/sessionsWorkspaceFilter.test.ts
git commit -m "feat: add workspace-scoped session review"
```

### Task 3: Add workspace-to-session queue handoff, i18n, and docs

**Objective:** Complete the public product-shell slice by updating workspace handoff links, bilingual copy, and architecture docs.

**Files:**
- Modify: `src/pages/WorkspacesPage.tsx`
- Test: `src/pages/WorkspacesPage.test.ts`
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/DEVLOG.md`

**Step 1: Write failing test**

```ts
expect(markup).toContain("Open workspace session queue");
expect(markup).toContain("/sessions?workspace=hermes-control-center");
expect(markup).toContain("/sessions/sess-20260413-runtime-contract?workspace=hermes-control-center");
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/WorkspacesPage.test.ts`
Expected: FAIL — queue link and scoped session review link are not rendered yet.

**Step 3: Write minimal implementation**

```tsx
<Link className="mt-3 inline-flex text-sm text-primary underline-offset-4 hover:underline" to={`/sessions?workspace=${selectedWorkspace.slug}`}>
  {t("workspaces.openWorkspaceSessionQueue")}
</Link>
<Link className="mt-2 inline-flex text-sm text-primary underline-offset-4 hover:underline" to={`/sessions/${review.primarySession.id}?workspace=${selectedWorkspace.slug}`}>
  {t("workspaces.openSessionReview")}
</Link>
```

Add matching English + Simplified Chinese translation keys and document that workspace-scoped session review is another route-safe product-shell handoff.

**Step 4: Run tests and verification**

Run: `npm run test -- --run src/pages/sessionsWorkspaceFilter.test.ts src/pages/SessionsPage.route.test.ts src/pages/WorkspacesPage.test.ts`
Expected: PASS

Run: `npm run lint`
Expected: PASS with the existing non-blocking `CronPage` exhaustive-deps warning only.

Run: `npm run typecheck`
Expected: PASS

Run: `npm run build`
Expected: PASS with the existing non-blocking Vite chunk-size warning only.

**Step 5: Commit**

```bash
git add src/pages/WorkspacesPage.tsx src/pages/WorkspacesPage.test.ts src/locales/en/app.json src/locales/zh-CN/app.json docs/ARCHITECTURE.md docs/RUNTIME_CONTRACT.md docs/DEVLOG.md
git commit -m "docs: complete workspace session handoff slice"
```

### Task 4: Open reviewable GitHub flow

**Objective:** Push the focused branch and open a PR into `develop` linked to issue #21.

**Files:**
- Modify: none

**Step 1: Confirm branch state**

Run: `git status --short --branch`
Expected: clean working tree on `feat/issue-21-workspace-session-filter`

**Step 2: Push branch**

Run: `git push -u origin feat/issue-21-workspace-session-filter`
Expected: remote branch created or updated

**Step 3: Open PR**

Run a GitHub API or `gh` flow to open a PR titled `feat: add workspace-scoped session exploration` into `develop`, include `Closes #21`, and summarize validation.

**Step 4: Commit**

No additional commit required.
