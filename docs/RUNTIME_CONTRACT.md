# Runtime Contract Foundation

This document defines the first product-facing runtime contract for Hermes Control Center.

The intent is **not** to rewrite Hermes internals. The intent is to give the web product a stable domain model that can sit on top of existing Hermes admin APIs, runtime APIs, session storage, and future streaming/event endpoints.

## Goals

- define durable product objects for workspaces, sessions, runs, event timelines, approvals, and artifacts
- keep frontend contracts stable while Hermes backend integration evolves
- make replayability and auditability first-class from the start
- align the product shell with Hermes concepts that already exist: sessions, tool calls, processes, browser work, approvals, cron jobs, and logs

## Non-goals

- replacing Hermes `SessionDB` or runtime execution internals
- freezing backend transport details too early
- inventing a separate orchestration engine just for the web UI

## Design principles

1. **Product-facing first** — the browser should consume coherent objects, not raw backend fragments.
2. **Durable replay** — every run event should be representable after the run has ended.
3. **Approval as data** — approvals are auditable objects, not transient modals.
4. **Integration over rewrite** — map existing Hermes capabilities into this contract incrementally.
5. **Bilingual-ready UX** — frontend copy and status labels must remain translation-friendly.

## Core entities

### Workspace

A workspace groups related sessions, runtime policies, repository context, and artifacts.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable workspace identifier |
| `name` | `string` | Human-facing workspace name |
| `slug` | `string` | URL-safe route key |
| `status` | `"active" \| "paused" \| "archived"` | Workspace lifecycle |
| `repository` | object or `null` | GitHub/remote repository context |
| `defaultBranch` | `string \| null` | Usually `develop` or `main` |
| `policyPreset` | `string \| null` | Default execution/approval policy |
| `activeRunCount` | `number` | Live operational signal |
| `updatedAt` | ISO timestamp | For sorting and freshness |

### Session

A session remains the long-lived conversational container from Hermes. Multiple runs may occur inside a session.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Existing Hermes session identifier |
| `workspaceId` | `string \| null` | Optional workspace association during migration |
| `title` | `string \| null` | Human label |
| `source` | `string \| null` | CLI / gateway / cron / API source |
| `model` | `string \| null` | Resolved primary model |
| `startedAt` | ISO timestamp | Session start |
| `lastActiveAt` | ISO timestamp | Most recent activity |
| `messageCount` | `number` | Current aggregate message count |
| `runIds` | `string[]` | Product-level run linkage |
| `preview` | `string \| null` | Safe text preview |

### Run

A run is a first-class execution attempt within a session. It is the primary object for replay, operational review, and approvals.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable run identifier |
| `sessionId` | `string` | Parent session |
| `workspaceId` | `string \| null` | Optional workspace link |
| `title` | `string` | Human-readable objective |
| `status` | `queued \| running \| awaiting_approval \| completed \| failed` | Run lifecycle |
| `startedAt` | ISO timestamp | Execution start |
| `endedAt` | ISO timestamp or `null` | Terminal timestamp |
| `trigger` | `manual \| cron \| webhook \| api` | Invocation source |
| `summary` | `string` | Operator-friendly status summary |
| `approvalIds` | `string[]` | Related approval records |
| `artifactIds` | `string[]` | Produced artifacts |
| `eventCount` | `number` | Timeline density |
| `primaryActor` | `string` | Usually the agent or automation lane |

### Run timeline event

Timeline events normalize replay across chat, tool use, approvals, logs, and artifacts.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable event identifier |
| `runId` | `string` | Parent run |
| `timestamp` | ISO timestamp | Event ordering key |
| `kind` | `message \| tool_call \| approval \| artifact \| system` | High-level event family |
| `status` | `pending \| active \| completed \| failed` | Event lifecycle |
| `title` | `string` | Timeline label |
| `detail` | `string` | Human-readable explanation |
| `actor` | `string` | Agent, reviewer, scheduler, or human |
| `toolName` | `string \| null` | Present for tool events |
| `artifactId` | `string \| null` | Present for artifact events |
| `approvalId` | `string \| null` | Present for approval events |
| `durationMs` | `number \| null` | Optional latency metric |
| `metadata` | `Record<string, string \| number \| boolean>` | Structured context for rendering |

### Approval

Approvals are durable policy records with routing and expiry state.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable approval identifier |
| `runId` | `string` | Owning run |
| `scope` | `filesystem \| secrets \| network \| deployment \| governance` | Policy area |
| `status` | `pending \| approved \| rejected \| expired` | Approval lifecycle |
| `title` | `string` | Approval request title |
| `reason` | `string` | Why the approval exists |
| `requestedBy` | `string` | Agent or policy engine |
| `requestedAt` | ISO timestamp | Request time |
| `expiresAt` | ISO timestamp or `null` | SLA / timeout |
| `reviewer` | `string \| null` | Human or role when resolved |
| `resolutionNote` | `string \| null` | Audit detail |

### Artifact

Artifacts are durable outputs attached to runs and timeline playback.

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `string` | Stable artifact identifier |
| `runId` | `string` | Owning run |
| `kind` | `diff \| log \| transcript \| screenshot \| report` | Artifact family |
| `label` | `string` | Human-friendly display name |
| `path` | `string \| null` | Local or virtual path |
| `sizeBytes` | `number \| null` | Optional display metric |
| `createdAt` | ISO timestamp | Artifact creation time |

## Relationship summary

- one workspace may contain many sessions and many runs
- one session may contain many runs
- one run owns many timeline events, approvals, and artifacts
- approvals and artifacts are replayable through the run timeline rather than living in isolated tabs only

## Contract invariants

- `Run.approvalIds` must exactly match the approvals whose `runId` points at that run
- `Run.artifactIds` must exactly match the artifacts whose `runId` points at that run
- `Run.eventCount` must equal the number of timeline events linked to that run
- timeline events referencing `approvalId` or `artifactId` must point at existing approval/artifact records
- adapters should validate these invariants before data reaches the UI

## Integration mapping from current Hermes surfaces

| Current Hermes surface | Current shape | Product contract target |
| --- | --- | --- |
| `/api/sessions` | session summaries | `Session[]` seed data |
| `/api/sessions/:id/messages` | message list | source material for `RunTimelineEvent` during backfill/migration |
| admin/runtime streaming endpoints | heterogeneous runtime activity | live `RunTimelineEvent` stream |
| background process + cron primitives | job/process state | `Run.trigger`, `Run.status`, and system timeline events |
| approval / command-gating flows | currently fragmented | durable `Approval[]` records linked to runs |
| logs and generated files | operational outputs | `Artifact[]` and artifact timeline events |

## Delivery strategy

### Phase A — frontend contract foundation

- define TypeScript runtime models in the frontend
- add written contract docs in this repository
- render mock product data on Runs and Approvals pages
- use the contract to guide page structure before backend integration lands

### Phase B — adapter layer

- add frontend mappers from existing `/api/sessions` and runtime endpoints into the product contract
- derive basic runs from session history and live execution context
- normalize approval and artifact summaries into dedicated collections

## Adapter entry points

The adapter seam should remain pure and deterministic: raw Hermes-facing payloads go in, product-facing runtime objects come out.

### Frontend-owned adapter inputs

- `SessionInfo` from `/api/sessions` is the base session envelope
- `SessionMessage[]` from `/api/sessions/:id/messages` provides preview/backfill material for timeline hydration
- run/approval/artifact/event source records should stay explicit in `src/features/runtime/adapterTypes.ts` until live backend endpoints settle

### Frontend-owned adapter outputs

- `buildRuntimeSnapshot(source)` in `src/features/runtime/adapters.ts` is the only supported path from Hermes-native payloads into `RuntimeContractSnapshot`
- page components should consume the contract snapshot and selector helpers, never re-derive run/approval relationships ad hoc
- adapter validation must reject broken approval/artifact/event linkages before data reaches the UI

### Phase C — live runtime integration

- stream run events in real time
- persist replay-ready event objects
- connect approvals inbox and run pages to shared backing data

## Temporary mock-data policy

Until backend adapters exist, frontend pages may use realistic mock runtime data **only** when:

- the mock objects conform to the contract in this document
- the UI clearly reflects operational semantics already present in Hermes
- the mock layer stays isolated in a dedicated runtime fixture module
- hardcoded strings remain i18n-aware where they surface in page chrome or operator labels

## Review checklist for future runtime work

- does the change strengthen the shared contract instead of adding page-specific ad hoc fields?
- can the resulting data be replayed after the run is over?
- are approvals modeled as durable records with scope, actor, status, and expiry?
- does the UI remain aligned with Hermes' current architecture rather than bypassing it?
- is newly surfaced operator copy ready for English and Simplified Chinese localization?

## Live hydration baseline

The control center can now derive a `RuntimeContractSnapshot` from live `/api/sessions` records plus per-session message hydration.

- one runtime run is created for each live Hermes session in this baseline
- `session.source === "cron"` maps to `cron`; all other sources map to `manual`
- run status derives from `is_active` / `ended_at`
- transcript artifacts are created only when a session has at least one hydrated message
- `user` / `assistant` messages become `message` timeline events
- `tool` messages and `tool_calls` arrays become `tool_call` timeline events
- approvals remain empty until a durable backend approval endpoint exists
