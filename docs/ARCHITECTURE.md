# Architecture Notes

## Core decision

Hermes Control Center will not replace Hermes runtime internals. It will compose existing Hermes surfaces into a product-grade web experience.

## Existing Hermes capabilities we are building on

- session persistence via `SessionDB`
- admin and configuration endpoints in the current web backend
- runtime/chat API surfaces and streaming/event capabilities
- tool orchestration, background process control, and cron/job primitives

## Incubation architecture

### Frontend
- React + Vite + TypeScript
- route-based shell from day one
- TanStack Query for server state
- i18next for UI internationalization

### Backend strategy
- short term: integrate with existing Hermes admin and runtime APIs
- medium term: define a cleaner product-facing application layer for runs, approvals, workspaces, and playback
- long term: support both local-first and hardened remote deployments

### Runtime contract foundation
- product-facing runtime entities are documented in `docs/RUNTIME_CONTRACT.md`
- frontend pages should converge on shared `workspace/session/run/event/approval/artifact` models instead of page-specific placeholder data
- backend integration should prefer adapter layers that map Hermes-native responses into the product contract
- adapter inputs should live in `src/features/runtime/adapterTypes.ts`, with pure mapping in `src/features/runtime/adapters.ts`
- fixture data should flow through the adapter seam too, so mock/runtime parity improves as live integration lands

## Product model in progress

- Workspace
- Session
- Run
- Event timeline
- Approval
- Artifact
- Policy / preset

## Risks to manage

- drifting too far from Hermes upstream internals
- accidentally coupling browser UX to ephemeral runtime state
- under-designing approvals/auditability
- deferring internationalization until it becomes painful

## Live runtime hydration baseline

Runtime shell pages no longer depend only on fixture selectors. A React Query hook now fetches `/api/sessions`, hydrates `/api/sessions/:id/messages` in parallel, builds the shared runtime snapshot through a pure live adapter, and falls back to the fixture snapshot if hydration fails.

This keeps the shell route-safe during backend failures while allowing Overview, Runs, Approvals, and session-review affordances to render from real Hermes session data when available.

## Session review surface

The `/sessions` route remains the transcript explorer and search entry point, but it now also supports route-based selected-session review via `/sessions/:sessionId`.

- live `SessionInfo[]` remains the source of truth for transcript browsing, deletion, and FTS-backed search
- the shared `RuntimeContractSnapshot` is the source of truth for session→run linkage and compact runtime handoff metrics
- page components should derive session review state through `src/pages/sessionReview.ts` instead of recomputing session/run relationships inline
- selected-session replay trust context should also be derived there, reusing shared run timeline/approval/artifact selectors so the session surface stays aligned with run review semantics
- workspace-scoped session filtering should be derived through `src/pages/sessionsWorkspaceFilter.ts`, not recomputed ad hoc in route components
- selected-session UI must stay bilingual and should hand operators off to `/runs/:runId` when a derived runtime run exists
- `/sessions` and `/sessions/:sessionId` may carry `?workspace=:workspaceSlug`; valid scope should narrow the visible session queue, remain visible in trust context chrome, and be preserved on canonical session/run handoff links

## Workspace review surface

The `/workspaces` route is no longer a static placeholder. It is a read-only operator surface, with optional drill-in via `/workspaces/:workspaceSlug`, backed by the shared runtime snapshot.

- workspace selection, canonical redirect behavior, and workload metrics should be derived through `src/pages/workspaceReview.ts`
- page components should treat `RuntimeContractSnapshot.workspaces` plus linked session/run/approval/artifact relationships as the source of truth for workspace context
- the route may render live-adapter workspaces even before dedicated backend workspace APIs exist, but the UI must stay explicit that this is review/handoff state rather than full workspace management
- workspace review UI should hand operators off into `/sessions/:sessionId`, `/runs/:runId`, `/runs?workspace=:workspaceSlug`, `/approvals/:approvalId`, and `/approvals?workspace=:workspaceSlug` instead of duplicating those deeper review surfaces
- new workspace shell copy must remain bilingual and follow the same live-vs-fixture hydration badge pattern used by other runtime pages

## Workspace-scoped runs handoff

The `/runs` route now accepts an optional `workspace` query parameter so operators can move from a selected workspace into a scoped run queue without losing context.

- workspace queue scope should be derived through `src/pages/runsWorkspaceFilter.ts`, not recomputed inline in route components
- the active workspace filter may narrow the visible run list, but it must never mutate the shared snapshot or invent new run records
- queue links rendered from `WorkspacesPage` should point to `/runs?workspace=:workspaceSlug` so the state survives reloads and deep links
- the selected run review should surface route-safe trust context from linked session/workspace records, including workspace, repository, default branch, and policy metadata when available
- session and approval drill-in links rendered from a workspace-scoped run review should preserve the active workspace query parameter only when the selected run belongs to that scope
- the Runs page should preserve its existing replay/approval/artifact review layout while making the active workspace scope visible and offering a direct return path to `/workspaces/:workspaceSlug`

## Workspace-scoped approvals handoff

The `/approvals` route now accepts the same optional `workspace` query parameter so governance review can stay inside an operator's active workspace context.

- workspace approval scope should be derived through `src/pages/approvalsWorkspaceFilter.ts`, not recomputed ad hoc in route components
- the active workspace filter may narrow the visible approval list, but it must never mutate the shared snapshot or fabricate approval state
- queue links rendered from `WorkspacesPage` should point to `/approvals?workspace=:workspaceSlug` so the scoped approval inbox survives reloads and deep links
- approval drill-in links should preserve the active workspace query parameter whenever the selected approval belongs to the scoped workspace
- the Approvals page should surface workspace, repository, policy, run, session, and latest replay context without introducing write actions or bypassing the shared runtime selectors

## Replay timeline enrichment

Replay semantics now stay inside the adapter boundary instead of leaking into page components.

- `src/features/runtime/liveAdapter.ts` derives deterministic lifecycle `system` events and transcript-linked `artifact` events from live session/message input
- `src/pages/runsReplaySummary.ts` computes selected-run replay metrics from contract events only
- `src/pages/RunsPage.tsx` renders a replay-summary card for the selected run while preserving the existing live/fixture source badge and fallback warning behavior
- route-level UI continues to consume `RuntimeContractSnapshot` selectors and summaries rather than raw Hermes session payloads
