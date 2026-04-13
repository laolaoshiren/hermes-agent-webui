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
