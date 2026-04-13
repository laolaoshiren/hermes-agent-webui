# Session Review Surface Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add a product-grade session review surface that lets operators inspect a selected session, see compact health/usage metrics, and jump directly into the related runtime run review.

**Architecture:** Keep the existing `/api/sessions` and transcript explorer intact, but layer a thin product-shell selection and runtime-handoff surface on top of it. Reuse the live runtime snapshot as the source of truth for session→run linkage, add focused session helpers instead of ad-hoc page logic, and localize all new shell copy in English plus Simplified Chinese.

**Tech Stack:** React 19, React Router 7, TypeScript, React Query, Vitest, i18next

---

### Task 1: Add session review helpers and failing tests

**Objective:** Centralize session-level summary and runtime-handoff logic so the Sessions page does not hand-roll session/run relationships inline.

**Files:**
- Create: `src/pages/sessionReview.ts`
- Test: `src/pages/sessionReview.test.ts`

**Step 1: Write failing test**

```ts
import { describe, expect, it } from "vitest";
import { deriveSessionReview } from "@/pages/sessionReview";
import { runtimeContractSnapshot } from "@/features/runtime/mockData";

describe("deriveSessionReview", () => {
  it("returns the related run and compact counts for a selected session", () => {
    const session = runtimeContractSnapshot.sessions[0]!;
    const review = deriveSessionReview(runtimeContractSnapshot, session.id);

    expect(review.session?.id).toBe(session.id);
    expect(review.relatedRun?.sessionId).toBe(session.id);
    expect(review.metrics.timelineEvents).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/sessionReview.test.ts`
Expected: FAIL — `Cannot find module '@/pages/sessionReview'`

**Step 3: Write minimal implementation**

```ts
export function deriveSessionReview(snapshot: RuntimeContractSnapshot, sessionId: string) {
  const session = snapshot.sessions.find((candidate) => candidate.id === sessionId) ?? null;
  const relatedRun = session ? snapshot.runs.find((run) => run.sessionId === session.id) ?? null : null;

  return {
    session,
    relatedRun,
    metrics: {
      linkedRuns: session?.runIds.length ?? 0,
      timelineEvents: relatedRun ? snapshot.events.filter((event) => event.runId === relatedRun.id).length : 0,
      approvals: relatedRun ? snapshot.approvals.filter((approval) => approval.runId === relatedRun.id).length : 0,
      artifacts: relatedRun ? snapshot.artifacts.filter((artifact) => artifact.runId === relatedRun.id).length : 0,
    },
  };
}
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/sessionReview.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/sessionReview.ts src/pages/sessionReview.test.ts
git commit -m "test: add session review helper coverage"
```

### Task 2: Add route-based selected session review surface

**Objective:** Let `/sessions/:sessionId` render a selected session summary and related runtime handoff without removing the existing transcript explorer.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/SessionsPage.tsx`
- Test: `src/pages/SessionsPage.test.tsx`

**Step 1: Write failing test**

```tsx
it("renders selected session review context and run handoff", () => {
  const markup = renderSessionsPage("/sessions/session-123");
  expect(markup).toContain("Selected session");
  expect(markup).toContain("Open run review");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/SessionsPage.test.tsx`
Expected: FAIL — selected-session review copy not rendered

**Step 3: Write minimal implementation**

```tsx
<Route path="/sessions" element={<SessionsPage />} />
<Route path="/sessions/:sessionId" element={<SessionsPage />} />
```

```tsx
const { sessionId } = useParams();
const selectedSession = sessions.find((session) => session.id === sessionId) ?? sessions[0] ?? null;
const review = deriveSessionReview(snapshot, selectedSession?.id ?? "");
```

Render:
- selected-session card
- compact metrics (messages, tools, linked replay events, linked approvals/artifacts)
- runtime source badge / fallback warning
- related run CTA linking to `/runs/:runId` when available

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/SessionsPage.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/App.tsx src/pages/SessionsPage.tsx src/pages/SessionsPage.test.tsx
git commit -m "feat: add session review surface and run handoff"
```

### Task 3: Localize new session shell copy in English and Chinese

**Objective:** Keep the new session review surface bilingual from the first increment.

**Files:**
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`

**Step 1: Write failing test**

```ts
expect(i18n.t("sessions.selectedTitle")).toBeTruthy();
expect(i18n.t("sessions.openRunReview")).toBeTruthy();
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/SessionsPage.test.tsx`
Expected: FAIL — untranslated keys rendered literally

**Step 3: Write minimal implementation**

```json
"sessions": {
  "eyebrow": "Session operations",
  "title": "Sessions",
  "selectedTitle": "Selected session",
  "openRunReview": "Open run review"
}
```

Add matching Simplified Chinese entries in `src/locales/zh-CN/app.json`.

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/SessionsPage.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: localize session review surface copy"
```

### Task 4: Document and verify the increment

**Objective:** Keep the architecture and project log aligned with the new session review surface.

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/DEVLOG.md`

**Step 1: Update docs**

Document that:
- `/sessions` remains the transcript explorer entry point
- the product shell now supports route-based selected session review
- session review uses the shared runtime snapshot for run linkage

**Step 2: Run verification**

Run:
- `npm run test -- --run src/pages/sessionReview.test.ts src/pages/SessionsPage.test.tsx`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- tests PASS
- lint PASS (existing non-blocking CronPage warning may remain)
- typecheck PASS
- build PASS

**Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md docs/RUNTIME_CONTRACT.md docs/DEVLOG.md
git commit -m "docs: record session review surface increment"
```

---

## Verification checklist

- [ ] `/sessions` still lists and expands session transcripts
- [ ] `/sessions/:sessionId` selects the requested session or redirects to a valid default
- [ ] selected session shows compact health/usage metrics
- [ ] selected session links to `/runs/:runId` when a related runtime run exists
- [ ] all new shell copy exists in `en` and `zh-CN`
- [ ] tests, lint, typecheck, and build pass

## Handoff

- Branch: `feat/issue-13-session-review-surface`
- Issue: `#13`
- Base branch: `develop`
- PR title: `feat: add session review surface and runtime handoff`
