# Development Log

This log is intentionally public-facing and continuously append-only so both the repository owner and future contributors can track what happened, why it happened, and what is currently in motion.

## 2026-04-13 15:04 +08:00

- Project incubator repository created: `laolaoshiren/hermes-control-center`
- Token validation completed successfully against GitHub API with full repository/workflow/admin scopes.
- Selected product working name: **Hermes Control Center**
- Chosen incubation strategy:
  - independent public repository first
  - Hermes core inspected locally and treated as the upstream architecture source
  - web UI to evolve from Hermes' existing `web/` React app and current runtime/admin capabilities
- Completed architecture reconnaissance:
  - Hermes already has a React admin app, FastAPI admin backend, and separate runtime/chat/API server surfaces.
  - Lowest-risk approach is extension and composition, not full rewrite.
- Completed external product reconnaissance:
  - OpenClaw, Poco, Mission Control, OpenHands, LibreChat, Open WebUI
- Began foundation sprint:
  - copied Hermes `web/` app into standalone repo bootstrap
  - introduced route-based shell direction
  - introduced bilingual i18n foundation (`en`, `zh-CN`)
  - prepared planning/docs/CI-first repository discipline
- First implementation wave completed:
  - added Overview / Workspaces / Runs / Approvals routes while retaining inherited admin pages
  - added GitHub Actions CI workflow
  - added URL sanitization for external links in markdown and key-management surfaces
  - added explicit initial-load error states for Status / Config / Keys views
  - verified `npm run lint`, `npm run typecheck`, and `npm run build`
- Repository governance wave started on feature branch `feat/repository-governance`:
  - added `CONTRIBUTING.md`
  - added issue templates and PR template
  - preparing a formal PR into `develop`

## 2026-04-13 15:39 +08:00

- Merged the repository-governance increment into `develop` and continued from a fresh focused branch: `feat/runtime-contract-foundation`.
- Advanced issue #2 by adding the first runtime-facing product contract foundation:
  - added `docs/RUNTIME_CONTRACT.md`
  - added `docs/plans/2026-04-13-runtime-contract-foundation.md`
  - extended `docs/ARCHITECTURE.md` with runtime-contract guidance and invariants
  - added shared runtime domain models in `src/features/runtime/types.ts`
  - added realistic contract fixtures in `src/features/runtime/mockData.ts`
  - refactored Overview / Runs / Approvals to render from the shared contract instead of isolated placeholder arrays
  - localized new runtime-facing shell and fixture-backed content in English + Simplified Chinese
- Validation status:
  - `npm run lint` ✅ (existing non-blocking warning remains in `src/pages/CronPage.tsx` for `react-hooks/exhaustive-deps`)
  - `npm run typecheck` ✅
  - `npm run build` ✅
- Environment note:
  - installed `npm` plus a local Node.js 22.12.0 runtime so the Vite 7 build can execute successfully in this maintainer environment
- Added a minimum owner-facing operations board at `/ops` so the project owner can immediately see:
  - what Hermes is doing now
  - how many employee/subagent/automation lanes are active
  - what each worker is currently handling
  - which workstreams are on track vs planned
- Next focus:
  - open the runtime-contract PR into `develop`
  - keep the owner-visibility board updated as new worker lanes and milestones appear
  - begin adapter-layer work from existing Hermes session/runtime endpoints into the shared run/timeline contract

## 2026-04-13 16:13 +08:00

- Merged PR #7 (`feat: runtime contract foundation`) into `develop` after confirming the branch was mergeable and GitHub Actions checks were green.
- Continued issue #4 on fresh branch `feat/issue-4-approval-review-surface` with the first operator-facing approval review slice:
  - added `docs/plans/2026-04-13-issue-4-approval-review-surface.md`
  - added shared runtime selector helpers in `src/features/runtime/selectors.ts`
  - added route-based drill-in for `/runs/:runId` and `/approvals/:approvalId`
  - connected the Runs page to related approval review links and added selected-run context
  - connected the Approvals page to a selected approval panel plus related-run review handoff
  - localized all new shell chrome in English + Simplified Chinese
- Validation status:
  - `npm run lint` ✅ (existing non-blocking warning remains in `src/pages/CronPage.tsx` for `react-hooks/exhaustive-deps`)
  - `npm run typecheck` ✅
  - `npm run build` ✅
- Next focus:
  - push this issue #4 slice and open a PR into `develop`
  - add adapter-facing runtime selectors/mappers from Hermes session/runtime responses into the shared contract
  - decide the next issue split for timeline replay depth vs approval action surfaces

## Working principles

- plan-driven execution
- autonomous continuation with cron-backed follow-up
- visible public logs for every development wave
- frequent small commits over giant opaque dumps
- review and verification before each promotion step
