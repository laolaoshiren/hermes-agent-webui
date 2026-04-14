# Auth Design Spike (Lane D)
Date: 2026-04-14

Objective: Provide a concrete, implementation-ready auth design to guide Wave 2 (MVP) and beyond.

## 1. Deployment Modes
- Private mode (default)
  - Single owner access to UI.
  - Single password login for the owner.
  - All authenticated endpoints require a valid session.
- Public mode
  - Read-only public view without auth.
  - Any write operations require authentication.
  - CORS configured appropriately for public deployments.

## 2. Auth Mechanism
- Credential storage
  - Password is stored as a bcrypt hash in either:
    - Environment variable: `HERMES_AUTH_PASSWORD_BCRYPT`
    - Or config file: `config/auth.json` with `passwordHash` field
  - One of these must be set; otherwise startup warns and disables login.
- Session handling (choose one; cookie recommended for simplicity)
  - Session cookie (Recommended)
    - Server creates a secure, HTTP-only session cookie on login.
    - Cookie flags: `HttpOnly`, `SameSite=Lax` (or `Strict`), optionally `Secure` in production.
    - Server-side session store (e.g., memory store for MVP, file/Redis later).
    - Session TTL: 8 hours (configurable).
  - JWT (Alternative)
    - Short-lived access token (e.g., 30 minutes) returned to client.
    - Store in HTTP-only cookie for XSS protection; refresh flow can be added later.
    - For MVP, prefer cookie sessions to reduce complexity.

## 3. Implementation Plan
- Backend
  - `auth_required` decorator/middleware
    - Checks session validity; if invalid or missing, returns 401.
    - Apply to all protected endpoints; skip public GET routes in Public mode.
  - Login endpoint: `POST /api/auth/login`
    - Request body: `{ password: string }`
    - Behavior: Compare against bcrypt hash; on success create session, set cookie; on failure 401.
    - Rate limit: e.g., 5 attempts/min per IP.
  - Logout endpoint: `DELETE /api/auth/session`
    - Destroys session; clears cookie.
  - Session validation middleware
    - Attach user context to request; used by `auth_required`.
- Frontend
  - Login gate
    - If unauthenticated, redirect to `/login`.
    - Login page posts password to `POST /api/auth/login`; on success redirect to `/`.
  - Auth context/provider
    - Provides `isAuthenticated` state to components.
    - Exposes `login()` and `logout()` helpers.
  - Protected route wrapper
    - Wraps routes to enforce auth; falls back to login.
  - API client
    - If using cookie sessions: credentials: 'include' for requests.
    - If JWT: inject `Authorization: Bearer <token>` header.

## 4. Frontend Integration Points
- Pages
  - `Login` page component: password form, error messages, rate-limit feedback.
  - Optional: `PublicReadOnlyBanner` when in Public mode for unauthenticated users.
- Components
  - `AuthProvider`: context for auth state, login/logout, session status.
  - `ProtectedRoute`: HOC or wrapper to guard routes.
- Hooks
  - `useAuth()`: access auth state and actions.
- API client setup
  - Axios/fetch configured with credentials for cookies, interceptors for 401→login redirect.

## 5. Security Considerations
- Brute force protection
  - Rate-limit login endpoint; backoff and optional lockout after repeated failures.
  - Return identical error for wrong password to avoid user enumeration.
- CORS
  - In Public mode, restrict allowed origins to known UI domain(s).
  - Avoid wildcard `*` when cookies are used.
- Config validation
  - Warn on startup if a default or empty password is detected.
  - Provide CLI command to hash a password and set `HERMES_AUTH_PASSWORD_BCRYPT`.
- Cookies
  - Prefer `HttpOnly`, `SameSite=Lax`, `Secure` in production.
  - Use HTTPS in production; set `Secure` flag accordingly.
- Logging and telemetry
  - Log failed login attempts without sensitive data; aggregate metrics if available.

## 6. Minimal MVP Scope (Wave 2)
Implement the following to deliver a working auth flow quickly:
- Password login with bcrypt hash from env var.
- Server-side session cookie auth.
- `POST /api/auth/login` and `DELETE /api/auth/session`.
- `auth_required` middleware protecting API routes.
- Login page, auth provider, protected route wrapper.
- Basic rate limiting for login attempts.

## 7. Open Questions
- Multi-user support: Is single-owner sufficient for foreseeable future?
- Session store: Memory vs. file vs. Redis; persistence requirements?
- Public mode exposure: Which endpoints are read-only by default?
- Password management: CLI tooling to rotate passwords and update hash.

## 8. Acceptance Criteria for Wave 2
- Unauthenticated users are redirected to `/login`.
- Correct password grants a session cookie; incorrect returns 401.
- Protected API endpoints return 401 without valid session.
- Logout invalidates session and clears cookie.
- Rate limiting prevents more than N login attempts per minute per IP.
- Startup warns if no password hash configured.
