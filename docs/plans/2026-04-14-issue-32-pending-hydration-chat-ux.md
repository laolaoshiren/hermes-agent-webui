# Issue #32 Pending-Hydration Chat UX Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Keep the Sessions chat surface usable and route-safe while runtime hydration is still pending, without waiting for the later streaming transport work.

**Architecture:** Treat pending runtime hydration as a first-class UI state inside `SessionsPage` instead of replacing the whole page with a blocking loader. Preserve workspace scope and requested session intent during hydration, and only apply canonical redirects after runtime snapshot data is available.

**Tech Stack:** React, TypeScript, React Router, Vitest, i18next

---

### Task 1: Preserve session/workspace route intent during pending hydration

**Objective:** Prevent `SessionsPage` from clearing workspace scope or redirecting away from a requested session before runtime hydration finishes.

**Files:**
- Modify: `src/pages/SessionsPage.tsx`
- Test: `src/pages/SessionsPage.route.test.ts`
- Test: `src/pages/SessionsPage.redirect.test.ts`

**Step 1: Write failing tests**

```ts
it("keeps the sessions shell visible while runtime hydration is still pending", () => {
  runtimeQueryState = { data: undefined, isPending: true };
  const { markup } = renderSessionsRoute("/sessions?workspace=hermes-control-center");
  expect(markup).toContain("Workspace-scoped sessions");
  expect(markup).toContain("Return to workspace review");
});

it("does not clear workspace scope while runtime hydration is pending without a snapshot", async () => {
  runtimeQueryState = { data: undefined, isPending: true };
  const location = await renderSessionsRoute("/sessions?workspace=missing-workspace");
  expect(location.search).toBe("?workspace=missing-workspace");
});
```

**Step 2: Run tests to verify failure**

Run: `npm run test -- --run src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts`
Expected: FAIL — hydration still renders a blocking loader or clears route scope too early.

**Step 3: Write minimal implementation**

```ts
const runtimeStillLoading = runtimeQuery.isPending;
const hasRuntimeSnapshotData = runtimeQuery.data !== undefined;
const effectiveWorkspaceSlug = activeWorkspaceSlug ?? (runtimeStillLoading ? workspaceSlug : null);

if (!runtimeStillLoading && workspaceFilter.shouldClearInvalidWorkspace) {
  return <Navigate to={sessionId ? `/sessions/${sessionId}` : "/sessions"} replace />;
}

if (!runtimeStillLoading && review.shouldRedirectToCanonical && review.canonicalSessionId) {
  return <Navigate to={buildSessionPath(review.canonicalSessionId, effectiveWorkspaceSlug)} replace />;
}
```

**Step 4: Run tests to verify pass**

Run: `npm run test -- --run src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/SessionsPage.tsx src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts
git commit -m "fix: preserve session scope during runtime hydration"
```

### Task 2: Keep the chat panel visible and safe while the requested session is unresolved

**Objective:** Show the conversation shell during pending hydration, but avoid rendering the wrong session transcript or enabling composer actions too early.

**Files:**
- Modify: `src/pages/SessionsPage.tsx`
- Test: `src/pages/SessionsPage.chat.test.ts`

**Step 1: Write failing tests**

```ts
it("does not render another session while a requested session route is still hydrating", async () => {
  runtimeQueryState = { data: undefined, isPending: true };
  const { container } = await renderSessionsRoute("/sessions/sess-missing");
  expect(container.textContent).toContain("Hydrating live runtime");
  expect(container.querySelector("textarea")?.hasAttribute("disabled")).toBe(true);
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/SessionsPage.chat.test.ts`
Expected: FAIL — the page either hides the chat shell entirely or resolves to the wrong transcript/composer state.

**Step 3: Write minimal implementation**

```ts
const pendingRequestedSession =
  runtimeStillLoading && !hasRuntimeSnapshotData && Boolean(sessionId) && !sessions.some((session) => session.id === sessionId);

<textarea disabled={pendingRequestedSession} />
<Button disabled={pendingRequestedSession || sendPending || composerValue.trim().length === 0} />
```

Also keep the selected-session summary/transcript area in a loading state until the requested route is resolvable.

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/SessionsPage.chat.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/SessionsPage.tsx src/pages/SessionsPage.chat.test.ts
git commit -m "fix: guard chat panel during pending runtime hydration"
```

### Task 3: Preserve workspace-scoped new-chat behavior before hydration completes

**Objective:** Allow operators to start a new chat from a workspace-scoped Sessions route before runtime hydration finishes, while preserving workspace scope in the resulting route.

**Files:**
- Modify: `src/pages/SessionsPage.tsx`
- Test: `src/pages/SessionsPage.chat.test.ts`

**Step 1: Write failing test**

```ts
it("preserves provisional workspace scope when starting a new chat before runtime hydration finishes", async () => {
  runtimeQueryState = { data: undefined, isPending: true };
  const createSession = vi.spyOn(api, "createSession").mockResolvedValue(...);
  const { router } = await renderSessionsRoute("/sessions?workspace=hermes-control-center");
  expect(router.state.location.search).toBe("?workspace=hermes-control-center");
});
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/pages/SessionsPage.chat.test.ts`
Expected: FAIL — new chat loses provisional workspace scope during hydration.

**Step 3: Write minimal implementation**

```ts
const effectiveWorkspaceSlug = activeWorkspaceSlug ?? (runtimeStillLoading ? workspaceSlug : null);
await createSession({
  workspaceSlug: effectiveWorkspaceSlug,
  workspacePath: scopedChatWorkspacePath,
});
```

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/pages/SessionsPage.chat.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/SessionsPage.tsx src/pages/SessionsPage.chat.test.ts docs/plans/2026-04-14-issue-32-pending-hydration-chat-ux.md
git commit -m "docs: add issue-32 pending hydration chat UX plan"
```

### Task 4: Verify the focused issue #32 slice

**Objective:** Confirm the pending-hydration UX slice is safe to promote as a reviewable sub-increment under issue #32.

**Files:**
- Modify: `docs/DEVLOG.md`

**Step 1: Run focused tests**

Run: `npm run test -- --run src/pages/SessionsPage.chat.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts`
Expected: PASS

**Step 2: Run required project verification**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: PASS (existing non-blocking `CronPage` exhaustive-deps warning may remain)

**Step 3: Update the public devlog**

Add a timestamped entry summarizing the issue #32 pending-hydration slice, validation, and next focus on streaming transport.

**Step 4: Commit**

```bash
git add docs/DEVLOG.md
git commit -m "docs: log issue-32 pending hydration slice"
```
