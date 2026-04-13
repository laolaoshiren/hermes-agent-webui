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
- selected-session UI must stay bilingual and should hand operators off to `/runs/:runId` when a derived runtime run exists

## Replay timeline enrichment

Replay semantics now stay inside the adapter boundary instead of leaking into page components.

- `src/features/runtime/liveAdapter.ts` derives deterministic lifecycle `system` events and transcript-linked `artifact` events from live session/message input
- `src/pages/runsReplaySummary.ts` computes selected-run replay metrics from contract events only
- `src/pages/RunsPage.tsx` renders a replay-summary card for the selected run while preserving the existing live/fixture source badge and fallback warning behavior
- route-level UI continues to consume `RuntimeContractSnapshot` selectors and summaries rather than raw Hermes session payloads
