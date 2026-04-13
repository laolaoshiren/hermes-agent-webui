# Contributing to Hermes Agent Web UI

Thanks for contributing.

## Branch strategy

- `main`: stable public branch
- `develop`: integration branch for active iteration
- `feat/*`: feature work
- `fix/*`: bug fixes
- `chore/*`: repository/infra/docs maintenance

## Expected workflow

1. Open or claim an issue.
2. Create a focused branch from `develop`.
3. Keep changes small and reviewable.
4. Run validation locally:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run build`
5. Update `docs/DEVLOG.md` when the change materially advances the project.
6. Open a pull request into `develop`.

## Engineering principles

- Prefer extending Hermes' existing architecture over rewriting it.
- Keep UI text localizable.
- Treat session content and backend-provided URLs as untrusted.
- Preserve a public paper trail: plans, issues, PRs, roadmap, devlog.
- Optimize for long-term maintainability, not one-off demos.

## Scope priorities

1. foundation and architecture coherence
2. runtime UX and replayability
3. approvals and operational review
4. workspace model and collaboration
5. deployment hardening and multi-user readiness
