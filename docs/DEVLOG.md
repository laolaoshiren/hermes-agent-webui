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

## 2026-04-13 17:15 +08:00

- Promoted the approval-review slice into `develop` after fixing reviewer-found null-safety gaps and confirming PR #9 checks were green.
- Continued issue #2 on fresh branch `feat/issue-2-runtime-adapter-scaffolding` with the first adapter-boundary increment:
  - added `docs/plans/2026-04-13-issue-2-runtime-adapter-scaffolding.md`
  - added `src/features/runtime/adapterTypes.ts` to describe Hermes-facing runtime adapter inputs
  - added `src/features/runtime/adapters.ts` with pure snapshot builders plus invariant validation for ids, relationships, and event link fields
  - refactored `src/features/runtime/mockData.ts` so the product shell now consumes an adapter-built runtime snapshot instead of hand-assembled contract arrays
  - extended `docs/RUNTIME_CONTRACT.md` and `docs/ARCHITECTURE.md` with the adapter boundary and ownership rules
- Validation status:
  - `npm run lint` ✅ (existing non-blocking warning remains in `src/pages/CronPage.tsx` for `react-hooks/exhaustive-deps`)
  - `npm run typecheck` ✅
  - `npm run build` ✅
- Next focus:
  - push the adapter-scaffolding branch and open/update a review thread into `develop`
  - connect the adapter seam to live `/api/sessions` + session-message hydration instead of fixture-only sources
  - decide the next focused runtime slice between replay timeline enrichment and approval action surfaces

## 2026-04-13 17:45 +08:00

- Continued issue #2 on `feat/issue-2-runtime-adapter-scaffolding` with runtime adapter test coverage:
  - added a lightweight Vitest harness to the existing Vite + TypeScript setup
  - added focused `buildRuntimeSnapshot()` coverage for happy-path mapping, derived session previews, sorted events, and run/workspace aggregates
  - locked invariant regressions for duplicate ids, missing linked entities, invalid event-kind link fields, and session/run workspace mismatches
- Validation status:
  - `npm run test -- --run` ✅
  - `npm run lint` ✅ (existing non-blocking warning remains in `src/pages/CronPage.tsx` for `react-hooks/exhaustive-deps`)
  - `npm run typecheck` ✅
  - `npm run build` ✅
- Next focus:
  - hydrate the runtime adapter from live Hermes session and runtime endpoints
  - extend coverage as timeline replay and approval action surfaces gain real backend integration

## 2026-04-13 17:55 +08:00

- Wrapped the runtime-adapter test wave into reviewable GitHub flow:
  - committed and pushed `[verified] test: add runtime adapter coverage`
  - opened PR #10 into `develop` for issue #2
  - merged ready PR #9 (`feat: add approval review drill-in surface`) after confirming GitHub checks were green and the branch was mergeable
- Validation status:
  - `npm run test -- --run` ✅
  - `npm run lint` ✅ (existing non-blocking warning remains in `src/pages/CronPage.tsx` for `react-hooks/exhaustive-deps`)
  - `npm run typecheck` ✅
  - `npm run build` ✅
- Next focus:
  - rebase runtime adapter work on the latest `develop` if needed after PR #9 promotion
  - start live `/api/sessions` + session-message hydration through the adapter seam behind the new test harness

## 2026-04-13 18:37 +08:00

- Continued issue #2 on fresh branch `feat/issue-2-live-session-hydration` with the first live runtime hydration baseline:
  - added `docs/plans/2026-04-13-issue-2-live-session-hydration.md`
  - added `src/features/runtime/liveAdapter.ts` and coverage in `src/features/runtime/liveAdapter.test.ts`
  - added `src/features/runtime/useRuntimeSnapshot.ts` plus fallback-path coverage in `src/features/runtime/useRuntimeSnapshot.test.ts`
  - refactored runtime selectors to operate on injected snapshots instead of fixture globals
  - connected Overview / Runs / Approvals to live session hydration with compact source and fallback messaging
  - localized new runtime hydration shell copy in English + Simplified Chinese
  - documented the live hydration baseline in `docs/RUNTIME_CONTRACT.md` and `docs/ARCHITECTURE.md`
- Validation status:
  - `npm run test -- --run` ✅
  - `npm run lint` ✅ (existing non-blocking warning remains in `src/pages/CronPage.tsx` for `react-hooks/exhaustive-deps`)
  - `npm run typecheck` ✅
  - `npm run build` ✅ (existing Vite chunk-size warning remains non-blocking)
- Review status:
  - spec compliance review ✅ PASS
  - independent quality review ✅ APPROVED
- Next focus:
  - push this live-hydration slice and open a PR into `develop`
  - decide the next issue #2 split between richer run replay semantics and durable approval backend ingestion
  - consider page-level integration tests for live vs fixture runtime query states as the shell gets more dynamic

## 2026-04-13 19:49 +08:00

- Continued issue #2 on fresh branch `feat/issue-2-replay-timeline-enrichment` with a replay-focused runtime slice:
  - added `docs/plans/2026-04-13-issue-2-replay-timeline-enrichment.md`
  - enriched `src/features/runtime/liveAdapter.ts` so live session hydration now emits deterministic lifecycle `system` events, transcript-linked `artifact` events, and type-safe metadata
  - expanded `src/features/runtime/liveAdapter.test.ts` to cover replay lifecycle behavior, deterministic timestamps, null/blank fallbacks, and epoch-edge cases
  - added `src/pages/runsReplaySummary.ts` plus focused tests to derive selected-run replay counts from contract events
  - updated `src/pages/RunsPage.tsx` with a replay-summary card and honest empty-state messaging for runs that have no replay events
  - localized the new replay-summary shell copy in English + Simplified Chinese and added static-markup page coverage in `src/pages/RunsPage.test.ts`
  - documented the replay-timeline increment in `docs/RUNTIME_CONTRACT.md` and `docs/ARCHITECTURE.md`
- Validation status:
  - `npm run test -- --run src/features/runtime/liveAdapter.test.ts src/pages/runsReplaySummary.test.ts src/pages/RunsPage.test.ts` ✅
  - `npm run lint` ✅ (existing non-blocking warning remains in `src/pages/CronPage.tsx` for `react-hooks/exhaustive-deps`)
  - `npm run typecheck` ✅
  - `npm run build` ✅ (existing Vite chunk-size warning remains non-blocking)
- Review status:
  - Task 1 spec compliance review ✅ PASS
  - Task 1 code quality review ✅ APPROVED after deterministic timestamp and type-safety fixes
  - Task 2 spec compliance review ✅ PASS
  - Task 2 code quality review ✅ APPROVED
- Next focus:
  - push this replay-timeline slice and open a PR into `develop`
  - continue issue #2 with richer live replay semantics for approval and artifact ingestion once backend surfaces exist
  - consider trimming the main bundle as replay/runtime UI keeps growing

## 2026-04-13 20:54 +08:00

- Created issue #13 (`Product shell: add session review surface and runtime handoff`) and implemented the first session-review product shell slice on fresh branch `feat/issue-13-session-review-surface`.
- Added plan-driven implementation and code changes for the session review increment:
  - added `docs/plans/2026-04-13-issue-13-session-review-surface.md`
  - added route support for `/sessions/:sessionId`
  - added `src/pages/sessionReview.ts` helper logic for canonical session selection, multi-run-aware handoff prioritization, and compact session metrics
  - refactored `src/pages/SessionsPage.tsx` into a bilingual product shell that preserves transcript exploration while adding selected-session review and run handoff
  - added focused test coverage in `src/pages/sessionReview.test.ts` and `src/pages/SessionsPage.route.test.ts`
  - documented the session-review architecture/runtime-contract boundary in `docs/ARCHITECTURE.md` and `docs/RUNTIME_CONTRACT.md`
- Review status:
  - spec compliance review ✅ PASS
  - independent code quality review ✅ APPROVED after fixing multi-run handoff selection, reducing unnecessary runtime hydration on `/sessions`, and tightening route/helper coverage
- Validation status:
  - `npm run test -- --run src/pages/sessionReview.test.ts src/pages/SessionsPage.route.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - push issue #13 branch and open a PR into `develop`
  - decide whether the next shell increment should target workspace foundations or deeper session/run replay linkage
  - trim bundle growth as more runtime-facing shell surfaces land

## 2026-04-13 21:19 +08:00

- Performed the scheduled maintainer pass from `feat/issue-13-session-review-surface` after confirming there were no open PRs queued for merge and that issue #13 remains the active focused increment.
- Re-validated the session-review branch before promotion:
  - `npm run test -- --run src/pages/sessionReview.test.ts src/pages/SessionsPage.route.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Promotion focus for this run:
  - append the public devlog for traceability
  - push the branch state if needed
  - open the issue #13 PR into `develop` so the session-review slice can move through CI and review
- Next focus:
  - monitor the new issue #13 PR until checks are green and mergeable
  - then pick the next focused increment between workspace foundations and deeper session/run replay linkage
  - keep bundle growth visible as runtime-facing product surfaces expand

## 2026-04-13 22:05 +08:00

- Created issue #15 (`Product shell: add workspace review surface and operator handoff`) after an internal simulated-user/product pass confirmed that Workspaces was the highest-trust-gap top-level route.
- Continued from fresh branch `feat/issue-15-workspace-review-surface` with a focused workspace-model shell increment:
  - added `docs/plans/2026-04-13-issue-15-workspace-review-surface.md`
  - added workspace selectors in `src/features/runtime/selectors.ts`
  - added `src/pages/workspaceReview.ts` for canonical workspace selection, slug-based drill-in, derived workload metrics, and primary handoff targets
  - replaced the static `WorkspacesPage` placeholder with a runtime-backed read-only review surface and `/workspaces/:workspaceSlug` support
  - localized the new workspace shell copy in English + Simplified Chinese
  - documented the workspace review surface in `docs/ARCHITECTURE.md` and `docs/RUNTIME_CONTRACT.md`
  - added focused Vitest coverage in `src/pages/workspaceReview.test.ts` and `src/pages/WorkspacesPage.test.ts` for canonical selection, drill-in rendering, loading, and empty-state behavior
- Review status:
  - spec compliance review ✅ PASS
  - independent quality review ⚠️ flagged a possible future UX refinement around invalid-slug handling, but the current canonical redirect behavior was kept to match issue #15 acceptance criteria
- Validation status:
  - `npm run test -- --run src/pages/workspaceReview.test.ts src/pages/WorkspacesPage.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - commit and push the workspace review slice
  - open PR into `develop` for issue #15
  - then decide whether the next workspace-model increment should target richer not-found/error semantics or cross-workspace runtime filtering

## 2026-04-13 22:49 +08:00

- Merged ready PR #16 (`feat: add workspace review surface and operator handoff`) into `develop`, deleted the completed branch, and continued from fresh branch `feat/issue-17-workspace-run-filter`.
- Created issue #17 (`Product shell: add workspace-scoped runs queue and handoff`) after an internal simulated-user pass showed the main workspace-to-runs trust gap: operators could only jump to a single primary run and lost workspace context.
- Added the workspace-scoped runs increment:
  - added `docs/plans/2026-04-13-issue-17-workspace-run-filter.md`
  - added `src/pages/runsWorkspaceFilter.ts` plus focused coverage in `src/pages/runsWorkspaceFilter.test.ts`
  - updated `src/pages/RunsPage.tsx` to honor `?workspace=<slug>` queue scope, preserve deep-link context, and provide a return path to the selected workspace review
  - updated `src/pages/WorkspacesPage.tsx` so operator handoff now includes a queue-style workspace run link and preserves workspace scope on primary-run drill-in
  - localized the new shell copy in English + Simplified Chinese and documented the route-safe workspace handoff in `docs/ARCHITECTURE.md` and `docs/RUNTIME_CONTRACT.md`
  - added focused route coverage in `src/pages/RunsPage.workspaceFilter.test.ts` and updated `src/pages/WorkspacesPage.test.ts`
- Review status:
  - spec compliance review ✅ PASS
  - independent code quality review ✅ APPROVED after fixing scoped primary-run handoff and tightening route coverage
- Validation status:
  - `npm run test -- --run src/pages/runsWorkspaceFilter.test.ts src/pages/RunsPage.workspaceFilter.test.ts src/pages/WorkspacesPage.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - push issue #17 and open the PR into `develop`
  - if the PR goes green, merge it and then continue either with richer workspace-scoped approval/session filtering or with bundle-size trimming for the growing runtime shell

## 2026-04-13 23:23 +08:00

- Merged ready PR #18 (`feat: add workspace-scoped runs queue and handoff`) into `develop`, deleted the completed branch, and cleaned up issue hygiene by closing completed issues #15 and #17.
- Ran an internal simulated-user + architecture pass after the merge and selected governance UX as the next highest-trust gap.
- Created issue #19 (`Product shell: add workspace-scoped approvals queue and trust context`) and continued on fresh branch `feat/issue-19-workspace-approvals-filter`.
- Added the first workspace-scoped approvals increment:
  - added `docs/plans/2026-04-13-issue-19-workspace-approvals-filter.md`
  - added `src/pages/approvalsWorkspaceFilter.ts` plus focused coverage in `src/pages/approvalsWorkspaceFilter.test.ts`
  - updated `src/pages/ApprovalsPage.tsx` to honor `?workspace=<slug>`, preserve scoped deep links, and surface workspace/repository/policy/run/session trust context
  - added route coverage in `src/pages/ApprovalsPage.workspaceFilter.test.ts`
  - updated `src/pages/WorkspacesPage.tsx` and `src/pages/WorkspacesPage.test.ts` so workspace handoff now includes a queue-style approvals link and preserves scope on primary approval review
  - localized new approvals/workspace handoff copy in English + Simplified Chinese
  - documented the route-safe workspace approvals queue in `docs/ARCHITECTURE.md` and `docs/RUNTIME_CONTRACT.md`
- Validation status:
  - `npm run test -- --run src/pages/approvalsWorkspaceFilter.test.ts src/pages/ApprovalsPage.workspaceFilter.test.ts src/pages/WorkspacesPage.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - run independent spec/quality review on issue #19 and address any gaps before promotion
  - push the branch and open PR into `develop`
  - then decide whether the next workspace-model slice should target scoped session exploration or bundle-size trimming for the growing runtime shell

## Working principles

- plan-driven execution
- autonomous continuation with cron-backed follow-up
- visible public logs for every development wave
- frequent small commits over giant opaque dumps
- review and verification before each promotion step
