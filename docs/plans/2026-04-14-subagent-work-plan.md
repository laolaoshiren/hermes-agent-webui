# Subagent Work Plan (Parallel Lanes)
Date: 2026-04-14

Goal: Deliver Auth MVP (Wave 2) with parallel subagents.

## Lanes and Owners
- Lane A: Repo/DevOps
  - Initialize repo structure (already present), docs, and local run scripts.
  - Ensure consistent dev environment setup instructions.
  - Prepare scripts for password hashing CLI.
- Lane B: Backend Auth
  - Implement session cookie auth and `POST /api/auth/login`, `DELETE /api/auth/session`.
  - Add `auth_required` middleware and rate limiting for login.
  - Config validation for `HERMES_AUTH_PASSWORD_BCRYPT` or `config/auth.json`.
- Lane C: Frontend Auth
  - Implement Login page, AuthProvider, ProtectedRoute.
  - Integrate API client with cookie credentials; handle 401→login redirect.
- Lane D: Design and Planning
  - Auth design document (done): docs/plans/2026-04-14-auth-design-spike.md
  - Track progress, acceptance criteria, and open questions.

## Deliverables
- Auth design doc (done).
- Backend endpoints and middleware (Lane B).
- Frontend login and guards (Lane C).
- Dev scripts/docs for hashing and run (Lane A).

## Suggested Branching
- feature/auth-backend (Lane B)
- feature/auth-frontend (Lane C)
- chore/auth-devops (Lane A)

## Coordination
- Converge on session cookie model and cookie name/flags.
- Finalize rate-limit thresholds and storage.
- Agree on error shapes (401 body) for consistent frontend handling.
