# Hermes Agent WebUI

Chat-first, secure, self-hosted frontend for Hermes Agent.
Owner-first by default. Public-deployable when you want.

[![CI](https://github.com/laolaoshiren/hermes-agent-webui/actions/workflows/ci.yml/badge.svg)](https://github.com/laolaoshiren/hermes-agent-webui/actions/workflows/ci.yml) [![Pages](https://github.com/laolaoshiren/hermes-agent-webui/actions/workflows/pages.yml/badge.svg)](https://github.com/laolaoshiren/hermes-agent-webui/actions/workflows/pages.yml) [![Release](https://img.shields.io/github/v/release/laolaoshiren/hermes-agent-webui)](https://github.com/laolaoshiren/hermes-agent-webui/releases)

Hermes Agent WebUI puts conversations first. It focuses on the flow you actually use: sessions, chat, and a workspace that feels obvious instead of heavy.

Why it matters now:
- Chat-first UX instead of control-panel-first UI.
- Owner-first security: sensible defaults, fewer knobs, safer public deploys.
- Standalone and modern: a clean frontend that invites contributors and fast iteration.
- Plays well with Hermes core: extends it, not replaces it.

Why not just use X?
- Built-in admin surfaces are powerful but not chat-first for daily use.
- Open WebUI is great for LLMs; this targets Hermes-specific workflows (sessions, approvals, run reviews) with native integration.
- Community WebUIs exist; this one prioritizes safe public deployment and a contributor-friendly stack from day one.
## What you should expect right now

Already real:
- session list and session hydration path
- chat-oriented sessions surface
- config/env/cron/skills integration path
- Hermes-backed MVP adapter for session/chat flows
- roadmap / architecture / devlog / CI discipline

Still actively being transformed:
- app shell is being refocused from control-center framing to chat-first product framing
- public-safe auth and deployment flow
- stronger workspace panel and runtime stream UX
- better GitHub presentation with screenshots, demo polish, and contributor onboarding

## Product direction

Primary product priorities:
1. chat-first session workflow
2. workspace-aware Hermes usage
3. owner-first secure deployment
4. contributor-friendly modern stack
5. fast iteration in a standalone repo, with stable pieces upstreamed later when proven

## Quick ship options

Run in Docker:

```bash
docker build -t hermes-agent-webui .
docker run --rm -p 8088:80 hermes-agent-webui
```

Or with Compose:

```bash
docker compose up --build
```

GHCR container publishing is wired through GitHub Actions.

## Local development

```bash
npm install
npm run backend:mvp
npm run dev
```

By default Vite proxies `/api` and `/v1` to `http://127.0.0.1:9119`.

## MVP backend adapter

```bash
cd /root/hermes-agent-webui
npm run backend:mvp
```

Current adapter endpoints:
- `GET /api/status`
- `GET /api/sessions`
- `GET /api/sessions/:id/messages`
- `POST /api/session/new`
- `POST /api/chat`
- `DELETE /api/sessions/:id`

The current adapter shells out to the installed `hermes` CLI for replies and stores adapter session state under `~/.hermes/control-center-mvp/`.

## Build checks

```bash
npm run build
npm run lint
npm run typecheck
```

## Repository conventions

- `docs/DEVLOG.md` records continuous project activity in public, human-readable form.
- `docs/ROADMAP.md` captures staged execution.
- `docs/ARCHITECTURE.md` records system boundaries and design constraints.
- `docs/plans/` contains implementation plans detailed enough for parallel subagents.

## Current competitive strategy

The near-term goal is simple:
- copy what users already love from strong Hermes web frontends
- fix the pain points they still complain about
- build original advantages around public-safe deployment, owner-first flow, and cleaner product UX

## Fast feedback loop

If you try the project and hit a problem, open an issue immediately:
- bug report: `https://github.com/laolaoshiren/hermes-agent-webui/issues/new/choose`
- feature request: `https://github.com/laolaoshiren/hermes-agent-webui/issues/new/choose`

Current operating principle:
- ship fast
- let users touch the product early
- fix visible problems quickly
- keep the public repo looking alive and responsive

## Inspirations

Primary inspirations and lessons incorporated into this project:
- Hermes official web/admin surfaces
- Open WebUI
- nesquena/hermes-webui
- OpenClaw
- Poco
- Mission Control
- OpenHands
- LibreChat
