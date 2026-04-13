# Hermes Control Center

Hermes Control Center is a product-grade web UI for Hermes Agent.

This repository exists to evolve Hermes from a useful CLI/gateway/admin surface into a full web workspace with:
- chat and autonomous run management
- project-centric workflows
- approvals and operational review queues
- session replay, artifacts, logs, and observability
- internationalization from day one
- a disciplined large-project workflow: roadmap, issues, milestones, CI, PRs, releases, and development logs

## Why a separate repository first?

The initial development strategy is:
1. move fast in an independent open-source repo
2. iterate on architecture, UX, and delivery discipline
3. upstream the stable pieces back into Hermes when the structure is proven

This keeps the iteration loop fast while reducing risk to Hermes core.

## Current phase

Phase 0 / Foundation:
- bootstrap the standalone workspace from Hermes' existing `web/` app
- establish routing, i18n, planning docs, CI, and development log discipline
- define the product architecture and delivery roadmap
- begin the first product shell for overview, workspaces, runs, approvals, and operations

## Development

```bash
npm install
npm run dev
```

By default Vite proxies both `/api` and `/v1` to `http://127.0.0.1:9119`.
Override with:

```bash
VITE_HERMES_API_ORIGIN=http://127.0.0.1:9119 npm run dev
```

## Build

```bash
npm run build
npm run lint
npm run typecheck
```

## Repository conventions

- `docs/DEVLOG.md` records continuous project activity in public, human-readable form.
- `docs/ROADMAP.md` captures the staged execution plan.
- `docs/ARCHITECTURE.md` captures system boundaries and design constraints.
- `docs/plans/` contains implementation plans detailed enough for parallel subagents.

## Product direction

Primary inspirations and lessons incorporated into this project:
- OpenClaw: control-plane and gateway mindset
- Poco: project/workspace + artifact + playback ergonomics
- Mission Control: task board + live activity stream
- OpenHands: maintainable product layering
- LibreChat: strong session and streaming UX
- Open WebUI: extensibility and admin surface depth
