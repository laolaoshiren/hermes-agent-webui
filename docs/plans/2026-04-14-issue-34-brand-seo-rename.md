# Issue 34 Brand/SEO Rename Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Align the product’s public-facing name with the already-renamed GitHub repository by replacing user-visible “Hermes Control Center” branding with the more discoverable UI-first name “Hermes Agent Web UI”.

**Architecture:** Keep the scope intentionally narrow: update public docs, package metadata, browser metadata, i18n strings, and mock product identity used by the frontend shell/tests. Do not rename backend env vars, storage directories, or local workspace paths in this increment; that would be a separate compatibility-focused migration.

**Tech Stack:** Vite, React, TypeScript, react-i18next, Vitest, npm package metadata, Markdown docs

---

### Task 1: Add failing coverage for the renamed product identity

**Objective:** Prove the shell and fixture-driven pages should render the new public name before changing implementation.

**Files:**
- Modify: `src/pages/WorkspacesPage.test.ts`
- Modify: `src/pages/RunsPage.test.ts`
- Modify: `src/pages/SessionsPage.route.test.ts`

**Step 1: Write failing test**

Replace current expectations that assert `Hermes Control Center` with `Hermes Agent Web UI`, for example:

```ts
expect(markup).toContain("Hermes Agent Web UI");
expect(markup).toContain("Showing 1 session linked to Hermes Agent Web UI.");
expect(markup).toContain(
  "Hermes Agent Web UI does not currently expose any sessions in the shared runtime snapshot.",
);
```

**Step 2: Run test to verify failure**

Run: `npm run test -- src/pages/WorkspacesPage.test.ts src/pages/RunsPage.test.ts src/pages/SessionsPage.route.test.ts --run`
Expected: FAIL — assertions still mention `Hermes Control Center`.

**Step 3: Write minimal implementation**

Update the mock runtime workspace name and any copy source those tests depend on so the rendered pages use `Hermes Agent Web UI`.

**Step 4: Run test to verify pass**

Run: `npm run test -- src/pages/WorkspacesPage.test.ts src/pages/RunsPage.test.ts src/pages/SessionsPage.route.test.ts --run`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/WorkspacesPage.test.ts src/pages/RunsPage.test.ts src/pages/SessionsPage.route.test.ts src/features/runtime/mockData.ts src/locales/en/app.json src/locales/zh-CN/app.json
git commit -m "feat: align shell branding with repo rename"
```

### Task 2: Update public docs and browser/package metadata

**Objective:** Make the repository landing surfaces and browser metadata reflect the new product identity and search terms.

**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `index.html`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/RUNTIME_CONTRACT.md`

**Step 1: Write failing test**

Use a lightweight file-level verification via grep-equivalent checks after editing target strings.

**Step 2: Run test to verify failure**

Run: `python3 - <<'PY'
from pathlib import Path
paths = [
    'README.md','CONTRIBUTING.md','package.json','package-lock.json','index.html','docs/ARCHITECTURE.md','docs/RUNTIME_CONTRACT.md'
]
needle = 'Hermes Control Center'
for rel in paths:
    text = Path(rel).read_text(encoding='utf-8')
    assert needle not in text, f'{rel} still contains old brand'
PY`
Expected: FAIL — multiple files still contain the old brand.

**Step 3: Write minimal implementation**

Apply these concrete content changes:

```html
<title>Hermes Agent Web UI</title>
<meta
  name="description"
  content="Hermes Agent Web UI is a fast, usable web interface for Hermes Agent with sessions, runs, approvals, replayability, and bilingual foundations."
/>
```

```json
{
  "name": "hermes-agent-webui"
}
```

README header opening:

```md
# Hermes Agent Web UI

Hermes Agent Web UI is a fast, usable web interface for Hermes Agent.
```

**Step 4: Run test to verify pass**

Run the same Python assertion block from Step 2.
Expected: PASS

**Step 5: Commit**

```bash
git add README.md CONTRIBUTING.md package.json package-lock.json index.html docs/ARCHITECTURE.md docs/RUNTIME_CONTRACT.md
git commit -m "docs: align public metadata with Hermes Agent Web UI"
```

### Task 3: Verify the full branch and update the public paper trail

**Objective:** Confirm the rename is coherent, append the required public devlog entry, and prepare the branch for PR review.

**Files:**
- Modify: `docs/DEVLOG.md`

**Step 1: Write failing test**

Append the new devlog entry only after implementation and verification details are known.

**Step 2: Run verification**

Run:
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test -- src/pages/WorkspacesPage.test.ts src/pages/RunsPage.test.ts src/pages/SessionsPage.route.test.ts --run`

Expected: PASS, except any previously known non-blocking warnings that do not fail the commands.

**Step 3: Write minimal implementation**

Append a timestamped `docs/DEVLOG.md` entry describing:
- PR #35 merge monitoring/completion
- issue #34 rename alignment work
- validation commands/results
- next focus (likely README/community packaging or deeper runtime surfaces)

**Step 4: Re-run focused verification for changed docs/metadata sanity**

Run: `git diff --stat && git status --short`
Expected: clean, reviewable branch with only issue-34 changes.

**Step 5: Commit**

```bash
git add docs/DEVLOG.md
git commit -m "docs: record issue-34 brand rename wave"
```
