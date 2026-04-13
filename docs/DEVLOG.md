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

## Working principles

- plan-driven execution
- autonomous continuation with cron-backed follow-up
- visible public logs for every development wave
- frequent small commits over giant opaque dumps
- review and verification before each promotion step
