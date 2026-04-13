# Hermes Agent WebUI — First Parallel Execution Wave

Date: 2026-04-14

Goal for this wave:
Stop looking like an early control-center shell and start looking like a real competitive Hermes chat product.

This wave is explicitly optimized for:
- fastest visible product improvement
- strongest migration signal vs competitor and official path
- minimal architecture regret
- contributor-visible momentum on GitHub

---

## Current grounded diagnosis

Observed in codebase now:
- `App.tsx` still presents a broad control-center top nav with many non-core surfaces competing for attention.
- `SessionsPage.tsx` is the strongest current candidate for the real product home.
- `scripts/mvp_backend.py` is a thin shell-out adapter with old naming, old env vars, and startup ambiguity.
- README/package/locales/docs still contain many `Hermes Control Center` and `hermes-control-center` references.
- Tests do exist, especially around sessions/runtime filters/chat route behavior, but the product story still reads older than the repo name.

Implication:
The first visible transformation should be:
- stronger chat-first shell
- clearer backend runtime story
- renamed product surface
- public-ready auth plan started

---

## Wave objective definition

At the end of this wave, the repo should visibly communicate:
1. This is Hermes Agent WebUI, not a generic control center.
2. The app is centered on chat, sessions, and workspace.
3. The backend path is understandable and less fragile.
4. The roadmap toward public-safe deployment is concrete.

---

## Parallel lane overview

### Lane A — Brand and product reframing
Owner intent: change first impression immediately.

Deliverables:
- rename remaining top-level product references from Control Center -> Hermes Agent WebUI
- update README opening sections
- update `package.json` name
- update visible UI strings in locales and shell
- preserve historical docs, but stop exposing outdated identity on the main path

Primary files:
- `README.md`
- `package.json`
- `package-lock.json`
- `CONTRIBUTING.md`
- `src/locales/en/app.json`
- `src/locales/zh-CN/app.json`
- `src/App.tsx`

Acceptance criteria:
- a new visitor sees Hermes Agent WebUI as the primary identity
- old name no longer dominates the first screen, package metadata, or README

Estimated effort:
- 30–60 min

---

### Lane B — Chat-first shell cleanup
Owner intent: make the app feel like a real web UI product, not a route directory.

Deliverables:
- reduce top-nav emphasis on concept/admin pages
- make Sessions the dominant home route and visual priority
- simplify app shell language/tagline around chat + workspace + secure deployment
- ensure session/conversation surface remains the visual center

Primary files:
- `src/App.tsx`
- `src/locales/en/app.json`
- `src/locales/zh-CN/app.json`
- possibly `src/components/PageHeader.tsx`

Acceptance criteria:
- header and shell messaging communicate chat-first Hermes frontend
- non-core routes remain available but no longer define the product identity

Estimated effort:
- 45–90 min

---

### Lane C — Backend runtime stabilization
Owner intent: remove confusion around the MVP adapter and prepare for a proper backend evolution.

Deliverables:
- rename legacy env variables for forward-facing API/backend branding while preserving compatibility
- improve startup log messages
- detect/report occupied port more clearly
- define canonical backend env names and one recommended start path
- reduce reliance on old `control-center-mvp` naming in payloads/status

Primary files:
- `scripts/mvp_backend.py`
- `README.md`
- `tests/test_mvp_backend.py`
- any backend-related docs/plans as needed

Acceptance criteria:
- backend naming matches current repo identity
- startup behavior and docs are clearer
- port conflict story is understandable instead of surprising

Estimated effort:
- 60–120 min

---

### Lane D — Public auth design spike
Owner intent: start building the key differentiator vs official and many hobby UIs.

Deliverables:
- write a minimal auth design for owner-first deployment
- choose first implementation shape: password login + secure session cookie
- specify public/private mode behavior
- identify frontend login gate points and backend middleware boundaries

Primary files:
- new plan/design doc under `docs/plans/`
- likely follow-up changes in backend and app shell after approval

Acceptance criteria:
- auth approach is concrete enough to implement next
- deployment story can be described in README soon

Estimated effort:
- 30–60 min for design, implementation after

---

### Lane E — Competitive README rewrite prep
Owner intent: improve GitHub conversion immediately.

Deliverables:
- rewrite top of README to emphasize:
  - chat-first
  - secure/public deployment
  - owner-first
  - Hermes-native workspace + sessions
- add competitor-aware value framing
- remove foundation-phase language from the first impression

Primary files:
- `README.md`

Acceptance criteria:
- first 20 lines explain why someone should care now
- README no longer undersells the product as just an incubation shell

Estimated effort:
- 45–90 min

---

## Recommended execution order

1. Lane A
2. Lane B
3. Lane C
4. Lane E
5. Lane D implementation kickoff

Why this order:
- A/B/E create immediate visible momentum for users and GitHub visitors
- C removes local engineering friction
- D starts the differentiation engine for the next wave

---

## Hard rules for this wave

1. Do not spend this wave expanding Overview / Runs / Approvals concept surfaces.
2. Do not add more product-sounding pages unless they support chat-first use immediately.
3. Every visible string change should reinforce the new identity.
4. Every backend change should make the future FastAPI/SSE migration easier, not harder.
5. Preserve test coverage whenever changing session/chat behavior.

---

## What success looks like after wave 1

External observer reaction should change from:
- “interesting control-center direction, still early”

to:
- “this is clearly trying to be the main Hermes WebUI product, and it’s moving toward a usable, secure chat-first experience fast.”

---

## Next wave after this one

Wave 2 should implement:
- auth/login
- stronger session actions
- better workspace panel
- clearer streaming/runtime execution states
- screenshot/demo generation for GitHub
