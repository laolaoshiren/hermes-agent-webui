# Fast MVP Parity Implementation Plan

> For Hermes: use subagent-driven-development to execute this plan with the fastest path to a usable release.

Goal
- Ship the first genuinely usable Hermes-connected web UI quickly, modeled after nesquena/hermes-webui, then iterate.

Architecture
- Stop optimizing for abstract shell polish first.
- Reorder work toward a chat-first, session-first MVP that talks to Hermes immediately.
- Reuse the current React/Vite codebase, but copy the product priorities of hermes-webui: working chat loop, session list, visible composer, and basic operational controls.

Reference
- Repo: /root/reference-hermes-webui
- Key product cues from README:
  - chat-first center panel
  - session/navigation sidebar
  - immediate usability over architecture perfection
  - Hermes-backed controls and state

Phase A — Fast MVP scope
1. Working session list tied to Hermes state
2. Working conversation view with message history
3. Working composer with send action
4. Hermes-backed request/response path for a first usable loop
5. Minimal model/workspace controls only if they are quick to wire
6. Chinese language toggle must work reliably
7. Demo must visibly differ from the current shell-only state

Task 1: Lock the MVP target
Files:
- Modify: docs/ROADMAP.md
- Modify: docs/DEVLOG.md
Objective:
- Make the roadmap explicitly prioritize fast usable parity over more shell abstraction.
Verification:
- Docs mention chat-first MVP modeled after hermes-webui.

Task 2: Inspect current backend path for fastest usable integration
Files:
- Inspect: current web frontend API client and any existing Hermes runtime endpoints
- Inspect: /root/reference-hermes-webui/server.py and api/routes.py
Objective:
- Decide the single fastest path to working chat:
  - existing Hermes API/server endpoint if available, or
  - a thin local adapter route in this repo if that is faster.
Verification:
- A written note in DEVLOG or PR body explains the chosen fastest path.

Task 3: Build a minimal usable app layout
Files:
- Modify: src/App.tsx
- Create/Modify: session/chat-specific pages/components as needed
Objective:
- Make the default route feel like a real app, not an architecture landing page.
- Put working session navigation and conversation surface first.
Verification:
- Opening the app shows a clear chat/session-oriented UI immediately.

Task 4: Wire real session data
Files:
- Modify: src/lib/api.ts
- Modify/Create: session/chat data hooks/components
Objective:
- Sessions page and/or sidebar must load live data from Hermes instead of primarily showing fallback fixtures.
Verification:
- The demo shows real sessions when backend is available.

Task 5: Wire a first message send/response loop
Files:
- Modify/Create: chat composer and message view components
Objective:
- User can send a message from the web UI and receive a Hermes-backed response through the fastest viable route.
Verification:
- End-to-end manual test on the demo site.

Task 6: Validation and demo readiness
Files:
- Modify: docs/DEVLOG.md
Objective:
- Run npm run lint, npm run typecheck, npm run build
- Restart demo server if needed
- Capture a fresh screenshot for Telegram digest
Verification:
- Demo at :5173 visibly matches MVP intent better than the current shell-first experience.

Notes
- Favor speed and visible usability over deep abstraction.
- Copy what works from hermes-webui first; refactor later.
- If a backend adapter hack is the quickest route to a working first version, do it now and clean it up later.
