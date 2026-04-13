# Issue #23 Session Replay Trust Context Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add replay-aware trust context to the selected session review so operators can tell whether they should stay in transcript review or jump into run replay.

**Architecture:** Extend the existing `sessionReview` derivation layer instead of duplicating replay logic inside `SessionsPage`. Keep routing workspace-safe by reusing the current session/run path builders and only adding derived presentation data for the already-selected related run. Reuse the existing run replay summary helper patterns so session review stays aligned with the runtime contract and bilingual product shell.

**Tech Stack:** React, TypeScript, React Router, react-i18next, Vitest, Vite

---

### Task 1: Extend session review derivation with replay trust context

**Objective:** Teach the session-review helper to derive replay summary, latest replay event, and related approval/artifact counts for the selected session's primary run.

**Files:**
- Modify: `src/pages/sessionReview.ts`
- Test: `src/pages/sessionReview.test.ts`
- Reference: `src/pages/runsReplaySummary.ts`

**Step 1: Write failing test**

```ts
it("derives replay trust context for the selected session's related run", () => {
  const selectedRuntimeSession = runtimeContractSnapshot.sessions[0]!;
  const review = deriveSessionReview(
    [createSession({ id: selectedRuntimeSession.id, is_active: true })],
    runtimeContractSnapshot,
    selectedRuntimeSession.id,
  );

  expect(review.replaySummary.totalEvents).toBeGreaterThan(0);
  expect(review.latestReplayEvent?.runId).toBe(review.relatedRun?.id);
  expect(review.relatedApprovals.length).toBeGreaterThanOrEqual(0);
  expect(review.relatedArtifacts.length).toBeGreaterThanOrEqual(0);
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/sessionReview.test.ts`
Expected: FAIL — `replaySummary`, `latestReplayEvent`, `relatedApprovals`, or `relatedArtifacts` do not exist on `SessionReviewState`.

**Step 3: Write minimal implementation**

```ts
import { deriveReplaySummary } from "@/pages/runsReplaySummary";

export interface SessionReviewState {
  // existing fields...
  replaySummary: ReturnType<typeof deriveReplaySummary>;
  latestReplayEvent: RunTimelineEvent | null;
  relatedApprovals: ApprovalSummary[];
  relatedArtifacts: ArtifactSummary[];
}

const relatedTimeline = relatedRun
  ? snapshot.events.filter((event) => event.runId === relatedRun.id)
  : [];
const replaySummary = deriveReplaySummary(relatedTimeline);
const latestReplayEvent = relatedTimeline[0] ?? null;
const relatedApprovals = relatedRun
  ? snapshot.approvals.filter((approval) => approval.runId === relatedRun.id)
  : [];
const relatedArtifacts = relatedRun
  ? snapshot.artifacts.filter((artifact) => artifact.runId === relatedRun.id)
  : [];
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/sessionReview.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/sessionReview.ts src/pages/sessionReview.test.ts
git commit -m "feat: derive session replay trust context"
```

### Task 2: Render replay-aware selected-session review UI

**Objective:** Update `SessionsPage` so the selected-session panel shows replay status, recency, and run handoff cues without breaking workspace-scoped navigation.

**Files:**
- Modify: `src/pages/SessionsPage.tsx`
- Test: `src/pages/SessionsPage.route.test.ts`
- Test: `src/pages/SessionsPage.redirect.test.ts`

**Step 1: Write failing test**

```ts
it("renders replay-aware run context for the selected session", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/sessions/session-live-1"]}>
      <SessionsPage />
    </MemoryRouter>,
  );

  expect(markup).toContain("Replay trust context");
  expect(markup).toContain("Latest replay event");
  expect(markup).toContain("Open run review");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts`
Expected: FAIL — new replay-context copy is absent.

**Step 3: Write minimal implementation**

```tsx
{runtimeSource && review.relatedRun ? (
  <div className="space-y-3 border border-border bg-background/60 p-4 text-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          {t("sessions.replayContextLabel")}
        </div>
        <div className="mt-1 font-medium text-foreground">{t("sessions.replayContextTitle")}</div>
      </div>
      <Badge variant="outline">
        {t("sessions.replayEventsBadge", { count: review.replaySummary.totalEvents })}
      </Badge>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>{review.replaySummary.messageCount}</div>
      <div>{review.replaySummary.toolCallCount}</div>
      <div>{review.relatedApprovals.length}</div>
      <div>{review.relatedArtifacts.length}</div>
    </div>
    <div className="text-sm leading-6 text-muted-foreground">
      {review.latestReplayEvent
        ? formatRuntimeTimestamp(review.latestReplayEvent.timestamp)
        : t("sessions.noReplayEvents")}
    </div>
  </div>
) : null}
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/SessionsPage.tsx src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts
git commit -m "feat: render session replay trust panel"
```

### Task 3: Add bilingual copy for the new replay trust surface

**Objective:** Localize the new selected-session replay trust context in English and Simplified Chinese.

**Files:**
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`

**Step 1: Write failing test**

```ts
expect(markup).toContain("Replay trust context");
expect(markup).toContain("会话回放信任上下文");
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/SessionsPage.route.test.ts`
Expected: FAIL — missing translation keys render raw lookup strings or old copy.

**Step 3: Write minimal implementation**

```json
{
  "sessions": {
    "replayContextLabel": "Replay trust context",
    "replayContextTitle": "Selected session replay posture",
    "latestReplayEventLabel": "Latest replay event",
    "replayEventsBadge_one": "1 replay event",
    "replayEventsBadge_other": "{{count}} replay events",
    "noReplayEvents": "No replay events linked to the selected session yet."
  }
}
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/SessionsPage.route.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: localize session replay trust copy"
```

### Task 4: Document and verify the issue #23 increment

**Objective:** Update public docs, run verification, and prepare the branch for PR review.

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/DEVLOG.md`

**Step 1: Write failing documentation/test expectation**

```md
- Session review now exposes replay-aware trust context for the primary related run.
```

**Step 2: Run verification before docs finalize**

Run: `npm run test -- --run src/pages/sessionReview.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts`
Expected: PASS

**Step 3: Write minimal documentation updates**

```md
- `SessionsPage` now renders replay trust context derived from the selected session's primary related run, including replay recency and linked approvals/artifacts.
```

**Step 4: Run full focused verification**

Run:
- `npm run test -- --run src/pages/sessionReview.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- PASS for tests
- PASS for lint except the known non-blocking `CronPage.tsx` exhaustive-deps warning
- PASS for typecheck
- PASS for build except the known non-blocking Vite chunk-size warning

**Step 5: Commit**

```bash
git add docs/ARCHITECTURE.md docs/RUNTIME_CONTRACT.md docs/DEVLOG.md
git commit -m "docs: record session replay trust context"
```

---

## Review checklist

- [ ] Tasks are sequential and bite-sized
- [ ] Session review derivation stays DRY by reusing existing replay-summary logic
- [ ] Workspace-scoped session and run links remain canonical
- [ ] New copy is localized in English and Simplified Chinese
- [ ] Focused tests cover derivation plus route/render behavior
- [ ] `npm run lint`, `npm run typecheck`, and `npm run build` are executed before promotion
- [ ] `docs/DEVLOG.md` gets a timestamped entry for this run
- [ ] Branch is pushed and PR targets `develop`
