# Issue #2 Replay Timeline Enrichment Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Enrich the live runtime adapter so session-backed runs expose clearer replay semantics, then surface those semantics in the Runs page with bilingual UX copy.

**Architecture:** Extend the existing live adapter boundary instead of inventing a new domain model. The adapter should derive stable system and artifact timeline events from live sessions and transcript artifacts, expose compact replay stats, and let the Runs page render richer run context without coupling UI code directly to raw Hermes session payloads.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Query, existing runtime adapter contract, existing English + Simplified Chinese locale files.

---

### Task 1: Enrich live replay semantics in the adapter

**Objective:** Derive stable system and artifact events from live Hermes sessions so replay timelines are more useful than raw message/tool events alone.

**Files:**
- Modify: `src/features/runtime/liveAdapter.ts`
- Test: `src/features/runtime/liveAdapter.test.ts`
- Reference: `src/features/runtime/types.ts`
- Reference: `src/lib/api.ts`

**Step 1: Write failing tests**

```ts
it("adds system and artifact replay events around live session content", () => {
  const snapshot = buildRuntimeSnapshotFromSessions({
    sessions: [createSession({ id: "sess-1", is_active: true })],
    messagesBySessionId: {
      "sess-1": [
        createMessage({ role: "user", content: "Inspect runtime health", timestamp: 1712991000 }),
        createMessage({ role: "assistant", content: "I am checking it now.", timestamp: 1712991010 }),
      ],
    },
  });

  expect(snapshot.events.map((event) => event.kind)).toContain("system");
  expect(snapshot.events.map((event) => event.kind)).toContain("artifact");
  expect(snapshot.events.find((event) => event.kind === "artifact")?.artifactId).toBe("artifact-sess-1-transcript");
});

it("adds a completion system event for ended sessions", () => {
  const snapshot = buildRuntimeSnapshotFromSessions({
    sessions: [createSession({ id: "sess-2", is_active: false, ended_at: 1712992000 })],
    messagesBySessionId: { "sess-2": [createMessage({ role: "assistant", content: "Done", timestamp: 1712991500 })] },
  });

  expect(snapshot.events.at(-1)).toEqual(
    expect.objectContaining({
      kind: "system",
      status: "completed",
      title: expect.stringContaining("completed"),
    }),
  );
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/features/runtime/liveAdapter.test.ts`
Expected: FAIL — the live adapter only emits message/tool replay events today.

**Step 3: Write minimal implementation**

```ts
function buildLifecycleEvents(...): RuntimeTimelineEventSource[] {
  return [
    {
      id: `evt-${session.id}-started`,
      runId,
      timestamp: startedAt,
      kind: "system",
      status: "completed",
      title: "Session started",
      detail: `${getRunTitle(session)} started from ${session.source ?? "unknown source"}.`,
      actor: "system",
      toolName: null,
      artifactId: null,
      approvalId: null,
      durationMs: null,
      metadata: { phase: "start" },
    },
  ];
}
```

Implementation rules:
- keep exactly one run per live session for this slice
- preserve existing message and tool event mapping
- add lifecycle system events for session start plus either active heartbeat or completion
- add an artifact timeline event whenever a transcript artifact is created
- keep approvals empty until a real approval backend exists
- keep everything pure and adapter-side; no page component should parse raw `SessionInfo` or `SessionMessage`

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/features/runtime/liveAdapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/runtime/liveAdapter.ts src/features/runtime/liveAdapter.test.ts
git commit -m "feat: enrich live replay timeline semantics"
```

### Task 2: Surface replay summary details in the Runs page

**Objective:** Show clearer replay context for a selected run without breaking the current live/fixture fallback model.

**Files:**
- Modify: `src/pages/RunsPage.tsx`
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`
- Reference: `src/features/runtime/selectors.ts`
- Reference: `src/features/runtime/useRuntimeSnapshot.ts`

**Step 1: Write failing test**

```ts
it("shows replay summary metrics for the selected run", () => {
  render(<RunsPage />);
  expect(screen.getByText("Replay summary")).toBeInTheDocument();
  expect(screen.getByText("Tool calls")).toBeInTheDocument();
  expect(screen.getByText("System events")).toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/RunsPage.test.tsx`
Expected: FAIL — the selected-run panel does not yet render replay-summary metrics.

**Step 3: Write minimal implementation**

```tsx
const replayCounts = {
  messages: selectedTimeline.filter((event) => event.kind === "message").length,
  toolCalls: selectedTimeline.filter((event) => event.kind === "tool_call").length,
  systemEvents: selectedTimeline.filter((event) => event.kind === "system").length,
};
```

UI rules:
- add a compact replay-summary card beside the existing run details
- expose message/tool/system counts plus the latest replay event timestamp
- keep source/fallback badges unchanged
- add all new shell text in both English and Simplified Chinese
- keep empty-state behavior honest when a run has no events

**Step 4: Run tests to verify pass**

Run: `npm run test -- --run src/features/runtime/liveAdapter.test.ts`
Expected: PASS

Then run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: all PASS (with only the known non-blocking Vite chunk-size warning allowed during build, if it appears).

**Step 5: Commit**

```bash
git add src/pages/RunsPage.tsx src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: add replay summary to runs page"
```

### Task 3: Document the replay-timeline increment and release it cleanly

**Objective:** Record the increment in public project docs and ship it through the normal review flow.

**Files:**
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DEVLOG.md`

**Step 1: Update docs**

```md
## Replay timeline enrichment

The live session adapter now derives system lifecycle events and transcript-artifact events in addition to message/tool replay entries.
This keeps replay semantics inside the adapter boundary and lets the Runs page render richer summaries without depending on raw backend payloads.
```

**Step 2: Verify docs and code together**

Run:
- `npm run test -- --run src/features/runtime/liveAdapter.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected: PASS

**Step 3: Commit**

```bash
git add docs/RUNTIME_CONTRACT.md docs/ARCHITECTURE.md docs/DEVLOG.md
git commit -m "docs: record replay timeline enrichment"
```

---

Plan complete and saved. Ready to execute using subagent-driven-development — dispatch a fresh subagent per task with spec compliance review first, then independent code-quality review before proceeding.