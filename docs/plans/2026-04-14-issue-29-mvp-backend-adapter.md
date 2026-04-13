# Issue 29 MVP Backend Adapter Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Ship a thin Hermes-backed MVP adapter so the chat-first Sessions surface works even when the full public runtime API is not available yet.

**Architecture:** Add a narrow Python sidecar at `scripts/mvp_backend.py` that exposes only the minimum session/chat endpoints needed by the current React MVP shell. Keep the frontend additive: normalize slightly different backend payload shapes, preserve bilingual UI copy, and avoid changing the broader runtime contract work already on `develop`.

**Tech Stack:** React, TypeScript, Vite, Vitest, Python 3 standard library HTTP server, Hermes CLI.

---

### Task 1: Add the MVP backend entrypoint and npm script

**Objective:** Create an explicit, reviewable adapter entrypoint instead of relying on undocumented local hacks.

**Files:**
- Create: `scripts/mvp_backend.py`
- Modify: `package.json`
- Modify: `README.md`

**Step 1: Write the failing expectation**

Expected developer command:

```bash
npm run backend:mvp
```

Expected before implementation: FAIL — missing npm script and missing Python entrypoint.

**Step 2: Run to verify failure**

Run: `npm run backend:mvp`

Expected: npm exits non-zero because `backend:mvp` does not exist yet.

**Step 3: Write minimal implementation**

Add this script entry:

```json
{
  "scripts": {
    "backend:mvp": "python3 ./scripts/mvp_backend.py"
  }
}
```

Create `scripts/mvp_backend.py` with a small `ThreadingHTTPServer` shell that binds to `127.0.0.1:9119` by default and prints a startup banner.

**Step 4: Run to verify pass**

Run: `npm run backend:mvp`

Expected: PASS — process starts and prints `Hermes Control Center MVP backend listening on http://127.0.0.1:9119`.

**Step 5: Commit**

```bash
git add package.json README.md scripts/mvp_backend.py
git commit -m "feat: add issue-29 MVP backend adapter entrypoint"
```

---

### Task 2: Implement the minimum session/chat adapter contract

**Objective:** Expose the smallest coherent backend surface needed by the chat-first Sessions UI.

**Files:**
- Modify: `scripts/mvp_backend.py`
- Modify: `README.md`

**Step 1: Write the failing smoke checks**

```bash
curl -s http://127.0.0.1:9119/api/status
curl -s -X POST http://127.0.0.1:9119/api/session/new -H 'Content-Type: application/json' -d '{}'
curl -s http://127.0.0.1:9119/api/sessions
```

Expected before implementation: FAIL — missing endpoints or placeholder responses.

**Step 2: Run to verify failure**

Run each curl command against the initial server.

Expected: 404 or incomplete payloads.

**Step 3: Write minimal implementation**

Implement these endpoints only:
- `GET /api/status`
- `GET /api/sessions`
- `GET /api/sessions/:id/messages`
- `POST /api/session/new`
- `POST /api/chat`
- `DELETE /api/sessions/:id`

Store adapter session state under `~/.hermes/control-center-mvp/sessions/*.json` and shell out to the installed `hermes` CLI for replies.

**Step 4: Run smoke verification**

Run:

```bash
python3 scripts/mvp_backend.py &
BACKEND_PID=$!
sleep 2
curl -s http://127.0.0.1:9119/api/status
curl -s -X POST http://127.0.0.1:9119/api/session/new -H 'Content-Type: application/json' -d '{"workspace":"/root/hermes-control-center"}'
kill $BACKEND_PID
wait $BACKEND_PID 2>/dev/null || true
```

Expected: PASS — status JSON returns `gateway_state: "mvp-adapter"` and the new session response contains a `session_id`.

**Step 5: Commit**

```bash
git add scripts/mvp_backend.py README.md
git commit -m "feat: add issue-29 MVP session chat adapter"
```

---

### Task 3: Harden frontend API normalization for adapter responses

**Objective:** Let the Sessions UI tolerate both nested and direct session payloads without breaking existing session views.

**Files:**
- Modify: `src/lib/api.ts`
- Test: `src/lib/api.test.ts`

**Step 1: Write failing tests**

```ts
it("accepts direct session payloads and prefers non-system preview text", async () => {
  // adapter returns a top-level session payload instead of { session: ... }
})

it("falls back to top-level chat messages and derives the assistant answer when needed", async () => {
  // adapter returns messages but omits explicit answer
})
```

**Step 2: Run test to verify failure**

Run: `npm run test -- --run src/lib/api.test.ts`

Expected: FAIL — current normalization assumes one payload shape.

**Step 3: Write minimal implementation**

Add small helpers in `src/lib/api.ts`:
- `extractSessionPayload()`
- `extractSessionMessages()`
- `countToolCalls()`

Update `createSession()` and `sendChatMessage()` to accept both nested and top-level session payloads.

**Step 4: Run test to verify pass**

Run: `npm run test -- --run src/lib/api.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/api.ts src/lib/api.test.ts
git commit -m "feat: harden issue-29 adapter API normalization"
```

---

### Task 4: Tighten the chat-first Sessions UX around real adapter behavior

**Objective:** Make the MVP Sessions page feel like a usable app, not just a data viewer.

**Files:**
- Modify: `src/pages/SessionsPage.tsx`
- Modify: `src/locales/en/app.json`
- Modify: `src/locales/zh-CN/app.json`
- Test: `src/pages/SessionsPage.chat.test.ts`
- Test: `src/lib/api.test.ts`
- Modify: `README.md`

**Step 1: Write failing tests**

```ts
it("switches the active conversation from the left session list", async () => {
  // clicking another session updates the route and transcript
})

it("supports cmd-or-ctrl-enter as a fast send shortcut", async () => {
  // keyboard shortcut sends from the composer
})

it("sends session deletion through the sessions endpoint", async () => {
  // adapter-backed delete uses DELETE /api/sessions/:id
})
```

**Step 2: Run tests to verify failure**

Run:

```bash
npm run test -- --run src/pages/SessionsPage.chat.test.ts src/lib/api.test.ts
```

Expected: FAIL — current UI lacks at least one of the route switch, keyboard send, or delete-path behaviors.

**Step 3: Write minimal implementation**

Update `src/pages/SessionsPage.tsx` to:
- navigate between sessions from the left list
- auto-scroll the transcript on new messages when not in search-highlight mode
- support `Cmd/Ctrl+Enter` send
- show a localized toast on delete failure instead of silently swallowing it

Document the adapter usage in `README.md` and localize any new shell text in both English and Simplified Chinese.

**Step 4: Run tests to verify pass**

Run:

```bash
npm run test -- --run src/pages/SessionsPage.chat.test.ts src/lib/api.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/pages/SessionsPage.tsx src/pages/SessionsPage.chat.test.ts src/lib/api.test.ts src/locales/en/app.json src/locales/zh-CN/app.json README.md
git commit -m "feat: polish issue-29 chat-first adapter UX"
```

---

### Task 5: Full verification and promotion

**Objective:** Verify the increment as a coherent, reviewable branch update before pushing PR changes.

**Files:**
- Modify: `docs/DEVLOG.md`
- Modify: `README.md`
- Modify: `docs/plans/2026-04-14-issue-29-mvp-backend-adapter.md`

**Step 1: Run targeted tests**

```bash
npm run test -- --run src/lib/api.test.ts src/pages/SessionsPage.chat.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts
```

Expected: PASS.

**Step 2: Run project verification**

```bash
npm run lint
npm run typecheck
npm run build
```

Expected:
- `npm run lint` PASS, with only the known non-blocking `CronPage` exhaustive-deps warning if it still exists
- `npm run typecheck` PASS
- `npm run build` PASS, with any existing non-blocking Vite chunk-size warning noted explicitly

**Step 3: Run backend smoke verification**

```bash
python3 scripts/mvp_backend.py &
BACKEND_PID=$!
sleep 2
curl -s http://127.0.0.1:9119/api/status
kill $BACKEND_PID
wait $BACKEND_PID 2>/dev/null || true
```

Expected: PASS.

**Step 4: Append the devlog**

Add a concise timestamped entry to `docs/DEVLOG.md` summarizing:
- what changed
- validation status
- PR status
- next focus

**Step 5: Commit**

```bash
git add docs/DEVLOG.md docs/plans/2026-04-14-issue-29-mvp-backend-adapter.md README.md package.json scripts/mvp_backend.py src/lib/api.ts src/lib/api.test.ts src/locales/en/app.json src/locales/zh-CN/app.json src/pages/SessionsPage.tsx src/pages/SessionsPage.chat.test.ts
git commit -m "feat: add issue-29 MVP backend adapter"
```
