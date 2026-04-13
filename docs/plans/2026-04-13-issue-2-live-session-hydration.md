# Issue #2 Live Session Hydration Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace fixture-only runtime shell data with a live `/api/sessions` + session-message hydration path that builds the shared runtime snapshot from real Hermes session records, while preserving a safe fixture fallback.

**Architecture:** Add a pure runtime live-adapter module that converts `SessionInfo[]` plus `SessionMessage[]` into the existing runtime contract (`RuntimeContractSnapshot`). Wrap the adapter in a React Query hook that fetches sessions, hydrates messages in parallel, falls back to the existing fixture snapshot on fetch failure, and exposes loading/error/source metadata to the Overview / Runs / Approvals pages.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Query, existing `src/lib/api.ts` client, existing runtime adapter contract.

---

### Task 1: Add a pure live runtime adapter module

**Objective:** Convert live Hermes session data into the existing runtime contract without touching UI code yet.

**Files:**
- Create: `src/features/runtime/liveAdapter.ts`
- Test: `src/features/runtime/liveAdapter.test.ts`
- Reference: `src/features/runtime/adapters.ts`
- Reference: `src/features/runtime/types.ts`
- Reference: `src/lib/api.ts`

**Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildRuntimeSnapshotFromSessions } from "@/features/runtime/liveAdapter";

it("builds one run per live session and derives message/tool timeline events", () => {
  const snapshot = buildRuntimeSnapshotFromSessions({
    sessions: [createSession({ id: "sess-1", is_active: true })],
    messagesBySessionId: {
      "sess-1": [
        createMessage({ role: "user", content: "Investigate runtime bug", timestamp: 1712991000 }),
        createToolMessage({ tool_name: "terminal", content: "npm run lint", timestamp: 1712991030 }),
      ],
    },
  });

  expect(snapshot.runs).toHaveLength(1);
  expect(snapshot.runs[0]?.status).toBe("running");
  expect(snapshot.events.map((event) => event.kind)).toEqual(["message", "tool_call"]);
});

it("adds transcript artifacts and completed status for ended sessions", () => {
  const snapshot = buildRuntimeSnapshotFromSessions({
    sessions: [createSession({ id: "sess-2", is_active: false, ended_at: 1712992000 })],
    messagesBySessionId: { "sess-2": [createMessage({ role: "assistant", content: "Done", timestamp: 1712991500 })] },
  });

  expect(snapshot.runs[0]?.status).toBe("completed");
  expect(snapshot.artifacts[0]?.kind).toBe("transcript");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/features/runtime/liveAdapter.test.ts`
Expected: FAIL — module `@/features/runtime/liveAdapter` does not exist.

**Step 3: Write minimal implementation**

```ts
export function buildRuntimeSnapshotFromSessions(input: {
  sessions: SessionInfo[];
  messagesBySessionId: Record<string, SessionMessage[]>;
}): RuntimeContractSnapshot {
  const workspaces = [{
    id: "ws-hermes-runtime",
    name: "Hermes Runtime",
    slug: "hermes-runtime",
    status: "active",
    repository: null,
    defaultBranch: null,
    policyPreset: "runtime-observe",
    activeRunCount: 0,
    updatedAt: new Date().toISOString(),
  }];

  // derive session summaries, run summaries, transcript artifacts, and message/tool events
}
```

Implementation rules:
- derive exactly one run per session for this baseline slice
- map `session.source === "cron"` to trigger `cron`; otherwise default to `manual`
- set run status to `running` when `is_active === true`, `completed` when `ended_at` exists, otherwise `queued`
- create one transcript artifact per session when there is at least one message
- convert `user` / `assistant` messages into `message` timeline events
- convert `tool` messages and `tool_calls` arrays into `tool_call` timeline events
- never invent approvals in this baseline slice; keep approvals empty
- reuse the existing runtime contract shape so selectors/pages do not need a new domain model

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/features/runtime/liveAdapter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/runtime/liveAdapter.ts src/features/runtime/liveAdapter.test.ts
git commit -m "feat: add live runtime session adapter"
```

### Task 2: Add a React Query runtime snapshot hook with fixture fallback

**Objective:** Fetch sessions + messages from the backend, build a live snapshot, and expose status metadata to the UI.

**Files:**
- Create: `src/features/runtime/useRuntimeSnapshot.ts`
- Modify: `src/features/runtime/selectors.ts`
- Reference: `src/features/runtime/mockData.ts`
- Reference: `src/lib/api.ts`

**Step 1: Write failing test**

```ts
it("falls back to fixture snapshot when live hydration fails", async () => {
  vi.spyOn(api, "getSessions").mockRejectedValue(new Error("boom"));

  const { result } = renderHook(() => useRuntimeSnapshot(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.source).toBe("fixture");
  expect(result.current.snapshot.runs.length).toBeGreaterThan(0);
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/features/runtime/useRuntimeSnapshot.test.ts`
Expected: FAIL — hook file does not exist.

**Step 3: Write minimal implementation**

```ts
export function useRuntimeSnapshot() {
  return useQuery({
    queryKey: ["runtime-snapshot"],
    queryFn: async () => {
      try {
        const sessions = await api.getSessions();
        const messageEntries = await Promise.all(
          sessions.map(async (session) => {
            const response = await api.getSessionMessages(session.id);
            return [session.id, response.messages] as const;
          }),
        );

        return {
          source: "live" as const,
          snapshot: buildRuntimeSnapshotFromSessions({
            sessions,
            messagesBySessionId: Object.fromEntries(messageEntries),
          }),
          error: null,
        };
      } catch (error) {
        return {
          source: "fixture" as const,
          snapshot: runtimeContractSnapshot,
          error: error instanceof Error ? error.message : "Unknown runtime hydration error",
        };
      }
    },
  });
}
```

Selector refactor rules:
- make selectors accept a `RuntimeContractSnapshot` parameter
- keep tiny helper wrappers if useful, but stop importing fixture data directly inside selector logic
- preserve behavior for default run selection and route-safe lookup

**Step 4: Run tests to verify pass**

Run: `npm run test -- --run src/features/runtime/liveAdapter.test.ts src/features/runtime/useRuntimeSnapshot.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/runtime/useRuntimeSnapshot.ts src/features/runtime/selectors.ts src/features/runtime/useRuntimeSnapshot.test.ts
git commit -m "feat: add runtime snapshot query hook"
```

### Task 3: Connect Overview, Runs, and Approvals pages to the live snapshot hook

**Objective:** Drive the product shell from live runtime data with clear bilingual loading/fallback messaging.

**Files:**
- Modify: `src/pages/OverviewPage.tsx`
- Modify: `src/pages/RunsPage.tsx`
- Modify: `src/pages/ApprovalsPage.tsx`
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`

**Step 1: Write failing UI test**

```ts
it("shows live runtime source badge and fallback warning when fixture data is in use", async () => {
  mockUseRuntimeSnapshot({ source: "fixture", hydrationError: "500", snapshot: runtimeContractSnapshot });
  render(<OverviewPage />);
  expect(screen.getByText("Fixture fallback")).toBeInTheDocument();
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/OverviewPage.test.tsx`
Expected: FAIL — pages still use direct fixture imports.

**Step 3: Write minimal implementation**

```tsx
const runtimeQuery = useRuntimeSnapshot();
const snapshot = runtimeQuery.data?.snapshot ?? runtimeContractSnapshot;
const runtimeCounts = getRuntimeCounts(snapshot);
const runtimeSource = runtimeQuery.data?.source ?? "fixture";
const hydrationError = runtimeQuery.data?.error ?? null;
```

UI rules:
- show loading skeleton/text while query is pending
- show a small source indicator: live data vs fixture fallback
- when fallback is active, surface a compact bilingual warning instead of a hard crash
- keep invalid route handling safe: if a route id is missing from the current snapshot, redirect to the current default run/approval
- do not add fake approvals when live data has none; render the existing empty states honestly

**Step 4: Run tests to verify pass**

Run: `npm run test -- --run`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/OverviewPage.tsx src/pages/RunsPage.tsx src/pages/ApprovalsPage.tsx src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: hydrate runtime shell from live sessions"
```

### Task 4: Document and verify the live hydration baseline

**Objective:** Record the new runtime boundary and prove the increment is releasable.

**Files:**
- Modify: `docs/RUNTIME_CONTRACT.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/DEVLOG.md`

**Step 1: Update docs**

```md
## Live hydration baseline

The control center now derives a runtime snapshot from `/api/sessions` plus per-session message hydration.
This baseline intentionally creates one run per session, transcript artifacts per hydrated session, and message/tool timeline events.
Approvals remain empty until Hermes exposes durable approval records through a backend endpoint.
```

**Step 2: Run full verification**

Run:
- `npm run test -- --run`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Expected:
- tests pass
- lint passes (existing `CronPage` warning may remain non-blocking)
- typecheck passes
- build passes

**Step 3: Commit**

```bash
git add docs/RUNTIME_CONTRACT.md docs/ARCHITECTURE.md docs/DEVLOG.md
git commit -m "docs: record live runtime hydration baseline"
```

### Task 5: Push and open the reviewable PR

**Objective:** Ship the increment through the normal GitHub flow into `develop`.

**Files:**
- No source changes required

**Step 1: Push branch**

Run: `git push -u origin feat/issue-2-live-session-hydration`
Expected: branch published successfully

**Step 2: Open PR**

```bash
PR title: feat: hydrate runtime shell from live sessions
Base: develop

PR body:
## Summary
- add a live runtime adapter from `/api/sessions` plus message hydration
- expose runtime source metadata with fixture fallback
- drive Overview / Runs / Approvals from the shared live snapshot hook

## Test Plan
- [x] npm run test -- --run
- [x] npm run lint
- [x] npm run typecheck
- [x] npm run build

Closes #2
```

**Step 3: Confirm branch state**

Run: `git status --short --branch`
Expected: clean working tree on `feat/issue-2-live-session-hydration`
