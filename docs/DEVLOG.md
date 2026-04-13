# Development Log

This log is intentionally public-facing and continuously append-only so both the repository owner and future contributors can track what happened, why it happened, and what is currently in motion.

## 2026-04-14 07:11 +08:00

- Reviewed the canonical repository state from a clean checkout at `/root/hermes-control-center` and confirmed the GitHub repo rename now resolves to `laolaoshiren/hermes-agent-webui` while local/public product surfaces still lagged behind.
- Monitored and merged PR #35 (`fix: preserve session UX during runtime hydration`) into `develop` after confirming mergeability and successful CI.
- Started issue #34 on branch `feat/issue-34-brand-rename` with a saved implementation plan at `docs/plans/2026-04-14-issue-34-brand-seo-rename.md`.
- Completed the first brand/SEO alignment wave for the renamed repo:
  - updated fixture-driven runtime naming and localized overview/shell copy from **Hermes Control Center** to **Hermes Agent Web UI**
  - added focused regression coverage for workspace, run, session, and overview surfaces
  - aligned README, contributing guide, package metadata, browser title/description, architecture docs, and runtime contract wording with the new UI-first product identity
- Validation status:
  - `npm run lint` ✅ (known non-blocking warning remains in `src/pages/CronPage.tsx` for `react-hooks/exhaustive-deps`)
  - `npm run typecheck` ✅
  - `npm run build` ✅ (existing Vite chunk-size warning only)
  - `npm run test -- src/pages/WorkspacesPage.test.ts src/pages/RunsPage.test.ts src/pages/SessionsPage.route.test.ts src/pages/OverviewPage.test.ts --run` ✅
  - independent branch review against `origin/develop...HEAD` ✅ with no security or logic issues found
- Next focus:
  - finish the GitHub growth lane under issue #33 (README polish, bilingual discoverability, badges/community packaging)
  - or deepen runtime-facing product metadata/testing so browser/document-level branding and future rename surfaces stay locked down

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

## 2026-04-13 16:12 +08:00

- Product direction has been explicitly corrected toward the original goal: ship a directly usable Hermes-connected web UI first, instead of continuing to prioritize shell polish over usability.
- Created issue #29 to track the fast MVP pivot: `Fast MVP pivot: ship a directly usable Hermes Web UI similar to hermes-webui`.
- Cloned and inspected `nesquena/hermes-webui` locally at `/root/reference-hermes-webui` as the immediate implementation reference.
- Created focused branch `feat/issue-29-fast-mvp-parity` from `develop`.
- Added `docs/plans/2026-04-13-fast-mvp-parity.md` to force the next work into a chat-first/session-first MVP path.
- Updated `docs/ROADMAP.md` so Phase 1 explicitly prioritizes fast usable parity before deeper abstraction.
- Immediate next focus:
  - identify the single fastest working chat loop against Hermes
  - make the default UI feel like a real app instead of a shell/architecture landing page
  - ship the first version quickly, then iterate

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

## 2026-04-14 00:26 +08:00

- Merged ready PR #20 (`feat: add workspace-scoped approvals review`) into `develop`, closed issue #19, and created issue #21 (`Product shell: add workspace-scoped session exploration and handoff`) from the next simulated-user/operator trust gap.
- Continued on fresh branch `feat/issue-21-workspace-session-filter` with the workspace-scoped session increment:
  - added `docs/plans/2026-04-13-issue-21-workspace-session-filter.md`
  - added `src/pages/sessionsWorkspaceFilter.ts` plus focused coverage in `src/pages/sessionsWorkspaceFilter.test.ts`
  - updated `src/pages/SessionsPage.tsx` and `src/pages/sessionReview.ts` so `/sessions` and `/sessions/:sessionId` honor `?workspace=<slug>`, preserve scoped handoff links, and avoid invalid redirects while runtime hydration is pending
  - added route and redirect coverage in `src/pages/SessionsPage.route.test.ts` and `src/pages/SessionsPage.redirect.test.ts`
  - updated `src/pages/WorkspacesPage.tsx` and `src/pages/WorkspacesPage.test.ts` so workspace handoff now includes a queue-style session link and preserves workspace scope on primary session review
  - localized new shell copy in English + Simplified Chinese and documented the route-safe workspace session handoff in `docs/ARCHITECTURE.md` and `docs/RUNTIME_CONTRACT.md`
  - added `jsdom` as a dev dependency so redirect behavior can be verified through client-side router navigation tests
- Review status:
  - spec compliance review ✅ PASS
  - independent code quality review ✅ APPROVED after fixing pending-hydration redirect behavior and tightening redirect coverage
- Validation status:
  - `npm run test -- --run src/pages/sessionsWorkspaceFilter.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts src/pages/WorkspacesPage.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - commit and push the issue #21 branch
  - open the PR into `develop` with validation notes and close the issue on merge
  - then decide whether the next workspace-model slice should target session-to-replay trust context or bundle-size trimming for the growing runtime shell

## 2026-04-14 01:01 +08:00

- Merged ready PR #22 (`feat: add workspace-scoped session exploration`) into `develop`, deleted the completed feature branch, and explicitly closed issue #21 to keep queue hygiene current.
- Ran an internal simulated-user pass from the session-review surface and identified the next trust gap: operators could open a workspace-scoped session queue, but the selected-session panel still hid replay recency and handoff cues for the primary related run.
- Created issue #23 (`Product shell: add session replay trust context and run handoff cues`) and continued on fresh branch `feat/issue-23-session-replay-context`.
- Added the first session replay trust-context increment:
  - added `docs/plans/2026-04-14-issue-23-session-replay-context.md`
  - extended `src/pages/sessionReview.ts` so selected-session review now derives replay summary data, latest replay event, and linked approval/artifact collections from the primary related run
  - updated `src/pages/SessionsPage.tsx` to render a replay-trust panel inside the selected-session runtime handoff surface while preserving workspace-scoped run links
  - added focused coverage in `src/pages/sessionReview.test.ts`, `src/pages/SessionsPage.route.test.ts`, `src/pages/SessionsPage.redirect.test.ts`, and `src/pages/runsReplaySummary.test.ts`
  - localized the new replay-trust shell copy in English + Simplified Chinese and documented the derivation rule in `docs/ARCHITECTURE.md` and `docs/RUNTIME_CONTRACT.md`
- Review status:
  - spec compliance review ⚠️ initially flagged missing docs/devlog updates plus a replay-summary count mismatch; those gaps were fixed in this run
- Validation status:
  - `npm run test -- --run src/pages/runsReplaySummary.test.ts src/pages/sessionReview.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - run the final quality review for issue #23 and address anything it finds before promotion
  - commit and push the branch, then open PR into `develop`
  - continue improving replayability/workspace trust surfaces without breaking the shared runtime contract

## 2026-04-14 05:07 +08:00

- Checked repository and GitHub state at the start of the cron run from `feat/issue-29-fast-mvp-parity`: no open PRs were waiting for merge, PR #30 had already promoted the earlier chat-first slice, and the current highest-value action was to re-promote the newer MVP backend-adapter increment.
- Re-validated the current issue #29 branch before promotion:
  - `npm run test -- --run src/lib/api.test.ts src/pages/SessionsPage.chat.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts` ✅
  - `python3 -m unittest discover -s tests -p 'test_mvp_backend.py' -v` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Promotion/hygiene actions completed in this run:
  - appended the public devlog for traceability
  - opened PR #31 from `feat/issue-29-fast-mvp-parity` into `develop` for the backend-adapter delta beyond merged PR #30
  - closed stale issue #27, which had already been satisfied by merged PR #28 but remained open in GitHub
  - created follow-up issue #32 (`Fast MVP parity: add streaming chat transport and in-flight session UX`) from the internal simulated-user pass so the next increment stays issue-driven
- Next focus:
  - monitor PR #31 until checks are green and mergeable
  - implement issue #32 as the next fast-parity slice once PR #31 lands
  - keep repository hygiene tight as the MVP branch train continues

## Working principles

- plan-driven execution
- autonomous continuation with cron-backed follow-up
- visible public logs for every development wave
- frequent small commits over giant opaque dumps
- review and verification before each promotion step

## 2026-04-14 06:31 +08:00

- Checked repo/GitHub state at the start of the cron run from the active MVP branch and found PR #31 (`feat: add issue-29 MVP backend adapter`) mergeable with green GitHub Actions checks, so promotion came first.
- Merged PR #31 into `develop`, synced the branch locally, and deleted the completed `feat/issue-29-fast-mvp-parity` branch to keep the repo tidy.
- Continued issue #32 on a fresh branch `feat/issue-32-streaming-chat-ux`, but kept this run intentionally scoped to the first reviewable in-flight UX slice before full SSE transport work.
- Added plan-driven issue #32 documentation:
  - added `docs/plans/2026-04-14-issue-32-pending-hydration-chat-ux.md`
- Implemented the pending-hydration chat UX hardening slice:
  - updated `src/pages/SessionsPage.tsx` so runtime hydration no longer replaces the entire Sessions surface with a blocking loader
  - preserved workspace scope and requested-session route intent while runtime snapshot data is still pending
  - prevented unresolved session routes from rendering the wrong transcript or enabling the composer too early
  - preserved provisional workspace scope when starting a new chat before hydration completes
  - fixed a reviewer-found edge case so deleting the currently selected session returns safely to the base Sessions route instead of leaving a stale detail URL behind
- Added/updated focused regression coverage:
  - `src/pages/SessionsPage.chat.test.ts`
  - `src/pages/SessionsPage.route.test.ts`
  - `src/pages/SessionsPage.redirect.test.ts`
- Review status:
  - spec compliance review ✅ PASS
  - independent quality review ✅ APPROVED after fixing the selected-session delete-route edge case
- Validation status:
  - `npm run test -- --run src/pages/SessionsPage.chat.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - push this issue #32 pending-hydration slice and open the PR into `develop`
  - continue issue #32 with actual streaming transport (`/api/chat/start` + SSE) now that the route-safe in-flight shell behavior is hardened
  - keep the MVP branch train small and reviewable while preserving bilingual/runtime-contract discipline

## 2026-04-14 01:54 +08:00

- Checked repo/GitHub state from `develop`: no open PRs were waiting to merge, the latest merged increment was PR #24, and the next product-shell trust gap was on the selected run review surface.
- Ran an internal simulated-user pass, created issue #25 (`Product shell: add run review trust context and workspace-safe handoff`), and continued on fresh branch `feat/issue-25-run-review-context`.
- Added the run-review trust-context increment:
  - added `docs/plans/2026-04-14-issue-25-run-review-trust-context.md`
  - updated `src/pages/RunsPage.tsx` so selected run review now surfaces session handoff, linked workspace/repository/default-branch/policy context, and preserves workspace scope on approval/session drill-ins when applicable
  - updated `src/pages/RunsPage.workspaceFilter.test.ts` and `src/pages/RunsPage.test.ts` to cover scoped handoff preservation plus canonical unscoped behavior
  - localized the new run-review trust chrome in English + Simplified Chinese
  - documented the route-safe run-review trust context in `docs/ARCHITECTURE.md` and `docs/RUNTIME_CONTRACT.md`
- Review status:
  - spec compliance review ✅ PASS
  - independent quality review ✅ APPROVED
- Validation status:
  - `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - run full verification for the issue #25 branch
  - commit and push the branch, then open PR into `develop`
  - continue tightening run/session/approval replayability without breaking the shared runtime contract

## 2026-04-14 02:26 +08:00

- Re-validated PR #26 (`feat: add run review trust context and scoped handoff`) before promotion and ran the full required frontend verification suite.
- Addressed an independent review concern by tightening workspace-safe handoff logic:
  - extracted `src/pages/runsReviewHandoff.ts` to make the workspace-scope rule explicit and lint-safe
  - updated `src/pages/RunsPage.tsx` so session/approval drill-ins only preserve `?workspace=` when the selected run actually belongs to the active workspace scope
  - extended `src/pages/RunsPage.workspaceFilter.test.ts` with direct regression coverage for the scoped-handoff guard
- Validation status:
  - `npm run test -- --run src/pages/RunsPage.workspaceFilter.test.ts src/pages/RunsPage.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Review status:
  - independent quality re-review ✅ APPROVED after the scoped-handoff guard fix
- Next focus:
  - push the final PR #26 fixup and merge it into `develop`
  - close issue #25 after promotion
  - run a fresh simulated-user pass to pick the next approval/replayability gap

## 2026-04-14 02:31 +08:00

- Merged PR #26 (`feat: add run review trust context and scoped handoff`) into `develop`, deleted the completed branch, and closed issue #25 to keep the queue accurate.
- Ran a fresh simulated-user pass on the approval review surface and identified the next route-trust gap: workspace-scoped approval review preserved the run handoff, but `Open session review` still dropped the active workspace scope.
- Created issue #27 (`Product shell: preserve workspace-scoped session handoff from approval review`) and started fresh branch `feat/issue-27-approval-session-handoff`.
- Added the first implementation/planning slice for issue #27:
  - added `docs/plans/2026-04-14-issue-27-approval-session-handoff.md`
  - added `src/pages/approvalReviewHandoff.ts` to centralize workspace-safe approval review handoff rules
  - updated `src/pages/ApprovalsPage.tsx` so related run and session drill-ins share the same scoped-workspace guard
  - extended `src/pages/ApprovalsPage.workspaceFilter.test.ts` with scoped session-link coverage plus direct guard regression coverage
  - documented the new approval-review handoff rule in `docs/ARCHITECTURE.md` and `docs/RUNTIME_CONTRACT.md`
- Validation status:
  - `npm run test -- --run src/pages/ApprovalsPage.workspaceFilter.test.ts` ✅
- Next focus:
  - run full verification for issue #27 (`npm run lint`, `npm run typecheck`, `npm run build`)
  - open a focused PR into `develop` once verification passes
  - continue tightening approval/session/replay handoff trust without breaking the shared runtime contract

## 2026-04-14 03:14 +08:00

- Checked repo and GitHub state at the start of the maintainer run, then promoted ready PR #28 (`feat: preserve approval review session scope`) into `develop` via fast-forward after confirming the branch was clean and GitHub Actions checks were green.
- Continued issue #29 (`Fast MVP pivot: ship a directly usable Hermes Web UI similar to hermes-webui`) on `feat/issue-29-fast-mvp-parity` with the first chat-first/product-shell increment:
  - kept the roadmap/plan updates that explicitly prioritize fast usable MVP parity before deeper shell abstraction
  - inspected `/root/reference-hermes-webui` and selected the fastest backend path for the first send loop: `POST /api/session/new` plus `POST /api/chat` as the smallest coherent Hermes-backed MVP slice
  - moved the default app landing route from `/overview` to `/sessions` and promoted Sessions to the first nav slot
  - upgraded `src/pages/SessionsPage.tsx` from a review-only surface into a chat-first split view with a right-side conversation panel, composer, localized backend-unavailable states, and a `New chat` action
  - extended `src/lib/api.ts` with additive session/chat helpers for the fast MVP route while preserving existing session read APIs
  - localized all new composer/chat failure copy in English + Simplified Chinese
  - added focused coverage in `src/lib/api.test.ts` and `src/pages/SessionsPage.chat.test.ts`
- Validation status:
  - `npm run test -- --run src/lib/api.test.ts src/pages/SessionsPage.chat.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
- Next focus:
  - commit and push the issue #29 chat-first MVP slice, then open/update the PR into `develop`
  - decide whether the next parity increment should add streaming (`/api/chat/start` + SSE) or a thin backend adapter when Hermes does not yet expose the fast chat routes
  - keep the default experience obviously product-like while avoiding divergence from Hermes runtime/session architecture

## 2026-04-14 04:26 +08:00

- Rebased `feat/issue-29-fast-mvp-parity` onto the latest `develop` so the open PR can continue from a clean product baseline instead of carrying stale pre-merge branch state.
- Added a focused implementation handoff at `docs/plans/2026-04-14-issue-29-mvp-backend-adapter.md` for the thin MVP backend adapter slice.
- Continued issue #29 with the backend-adapter hardening increment:
  - added `scripts/mvp_backend.py` plus `npm run backend:mvp` so the chat-first Sessions MVP has a minimal Hermes-backed sidecar when the full runtime API is unavailable
  - documented the adapter endpoints, timeout, and optional CORS allowlist in `README.md`
  - hardened `src/lib/api.ts` and `src/lib/api.test.ts` so the frontend accepts both nested and top-level adapter session payloads and derives assistant answers/tool-call counts safely
  - updated `src/pages/SessionsPage.tsx` and `src/pages/SessionsPage.chat.test.ts` so new chats preserve workspace scope, propagate known workspace paths into adapter-backed create/send calls, keep optimistic scoped sessions isolated per workspace slug, retain transcript auto-scroll, and surface delete failures with a localized toast
  - updated `scripts/mvp_backend.py` plus `tests/test_mvp_backend.py` so session summaries retain workspace metadata and the stdlib backend coverage exercises helper logic plus the create/list/messages/chat/delete HTTP flow without invoking the real Hermes CLI
  - added English + Simplified Chinese copy for the new delete-failure path
- Validation status:
  - `npm run test -- --run src/lib/api.test.ts src/pages/SessionsPage.chat.test.ts src/pages/SessionsPage.route.test.ts src/pages/SessionsPage.redirect.test.ts` ✅
  - `python3 -m unittest discover -s tests -p 'test_mvp_backend.py' -v` ✅
  - `npm run lint` ✅ with the pre-existing non-blocking `react-hooks/exhaustive-deps` warning in `src/pages/CronPage.tsx`
  - `npm run typecheck` ✅
  - `npm run build` ✅ with the existing non-blocking Vite chunk-size warning
  - backend smoke check against `GET /api/status`, `POST /api/session/new`, `POST /api/chat`, and `DELETE /api/sessions/:id` ✅
- Review status:
  - spec compliance review ✅ PASS
  - independent quality review ✅ APPROVED after fixing workspace-scoped new-chat routing and adding backend test coverage
- Next focus:
  - commit and force-push the rebased issue #29 branch, then update PR #30 with the adapter/testing notes
  - monitor the refreshed PR checks and merge once green
  - then choose the next MVP parity slice between streaming chat (`/api/chat/start` + SSE) and richer workspace/runtime alignment for chat sessions
