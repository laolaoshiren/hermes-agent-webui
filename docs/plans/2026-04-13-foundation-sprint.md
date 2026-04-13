# Hermes Control Center Foundation Sprint Plan

> For Hermes: use subagent-driven-development when executing independent follow-up tasks from this plan.

## Goal

Turn the copied Hermes web admin UI into the initial standalone product shell for Hermes Control Center, while establishing planning, CI, logging, and internationalization discipline suitable for a long-lived open-source project.

## Immediate tasks

### Task 1 — Repository discipline
- ensure README, roadmap, architecture notes, and devlog exist
- add CI workflow
- create initial issue/milestone structure in GitHub

### Task 2 — Product shell foundation
- convert the single-page tab shell into route-based navigation
- add new top-level routes for overview, workspaces, runs, and approvals
- preserve access to existing admin/ops pages

### Task 3 — Internationalization foundation
- add i18next wiring
- create English and Simplified Chinese namespaces
- localize shell-level chrome first

### Task 4 — Verification
- install dependencies
- run lint, typecheck, and build
- fix issues immediately

### Task 5 — Continuous execution
- schedule cron-driven follow-up work with self-contained prompts
- append outcomes to the devlog after each wave
