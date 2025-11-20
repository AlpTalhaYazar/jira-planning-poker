# Implementation Plan

## Phase 0 – Environment & Skeleton

**Goal:** Have a minimal Forge app installed and rendered in Jira.

Tasks:

- Install Forge CLI and create Forge dev site.:contentReference[oaicite:10]{index=10}
- `forge create` → Jira → Custom UI template.
- Update `manifest.yml` to use a `jira:projectPage` module.
- Build simple React component: “Hello from Planning Poker”.
- `forge deploy` & `forge install` in dev Jira site.:contentReference[oaicite:11]{index=11}

Deliverable:

- App visible under Project → Planning Poker menu item.

---

## Phase 1 – Local-only Poker UI (no Jira integration)

**Goal:** Implement core poker interaction fully on the frontend, using mock data.

Tasks:

- In React:
  - Hard-code list of 3–5 mock “issues”.
  - Implement deck UI (cards, selected state).
  - Implement participants (initially mock users).
  - Implement voting + reveal logic in local state.
- Build a simple session switcher (dropdown / select).
- Add basic layout with Atlaskit components.

Deliverable:

- Functional planning poker “room” with local data, suitable for UX testing.

---

## Phase 2 – Jira Integration (Read-Only)

**Goal:** Load real Jira issues into the session.

Tasks:

- Implement backend resolver `getIssuesForProject`:
  - Accept `projectKey`, `jql`, or `sprintId`.
  - Use Jira REST API via `@forge/api` to execute search.:contentReference[oaicite:12]{index=12}
- On session creation, call resolver and populate issues in FE.
- Display issue key, summary, status.
- Add link to open issue in Jira.

Deliverable:

- Session issues come from Jira, not mock data.

---

## Phase 3 – Session Persistence in Forge Storage

**Goal:** Support multiple users and page reloads with concurrency-safe storage.

Tasks:

- Backend:
  - Implement `createSession`, `getSession`, `joinSession`, `leaveSession`.
  - Store each participant under `session:${id}:participant:${accountId}` so concurrent joins never clobber entries.
  - Maintain `project:${projectKey}:sessions` index with the latest metadata for fast listing and cleanup tasks.
- Frontend:
  - On page load, read the session index for the current project and display cards.
  - When user selects/creates session:
    - `joinSession` in backend (which auto-enrolls the viewer).
    - Start polling + realtime subscription (see Phase 6) with optimistic fallbacks.
- Track `lastSeenAt` to determine who’s “online”.

Deliverable:

- Sessions are persisted with per-entity storage so concurrent joins/vote updates remain consistent across tabs.

---

## Phase 4 – Voting Persistence & Reveal Flow

**Goal:** Persist votes and share across users.

Tasks:

- Backend:
  - Implement `castVote`, `clearVotes`, `revealIssue`.
  - Store each vote under `session:${id}:issue:${issue}:vote:${accountId}` plus a lightweight meta key for reveal state (no global arrays).
- Frontend:
  - Merge server votes with optimistic local selections so the UI responds instantly even before the next poll.
  - Show:
    - Who has voted (boolean)
    - When status is “revealed”, show all values.
- UX:
  - Moderator controls reveal.
  - Add “Revote” / “Next issue” buttons.

Deliverable:

- Real multiplayer voting experience using realtime events or exponential polling, without lost updates.

---

## Phase 5 – Write Back Estimates to Jira

**Goal:** Update Jira issues with agreed estimates.

Tasks:

- Backend:
  - Add `applyEstimate` resolver.
  - Given `issueKey` + numeric value:
    - Call Jira REST API `PUT /rest/api/3/issue/{issueIdOrKey}`.
    - Use configured estimate field ID (e.g. `customfield_10016` for Story Points).:contentReference[oaicite:13]{index=13}
- Config:
  - Implement `ProjectConfig`:
    - Estimate field id
    - Deck type
    - Default JQL
  - Store config in Forge storage keyed by `projectKey`.
- Frontend:
  - Add simple settings page in Project Page (e.g. tabs) for admin.

Deliverable:

- Team can estimate issues and have Jira updated automatically.

---

## Phase 6 – Real-Time UX + Backlog Sync

**Goal:** Reduce latency and keep every participant on the same issue order.

Tasks:

- Backend:
  - Issue short-lived relay tokens via `getRealtimeToken` after verifying the viewer participates in the session.
  - Publish concise events (`session.joined`, `vote.cast`, `session.backlogUpdated`, etc.) to the external relay.
  - Expose `updateSessionBacklog` so moderators can persist the ordered issue list + JQL as they fetch issues.
- Frontend:
  - Subscribe to relay events via `useRealtimeSession`. When disabled, fall back to exponential polling with a manual refresh control.
  - After loading issues, moderators call `updateSessionBacklog` whenever the ordered list or JQL changes.
  - Redact sensitive data (relay tokens) before logging and hide debug toasts in production builds.

Deliverable:

- Near-instant updates with safe fallbacks, plus persisted backlogs so reconnecting participants stay aligned.

---

## Phase 7 – Hardening & Marketplace Readiness

**Goal:** Prepare for Atlassian Marketplace listing.

Tasks:

- Implement permissions checks through `ContextService` and Jira `mypermissions` (project admins only for config, moderators only for backlog/reveal/apply).
- Add error handling and loading states everywhere, including optimistic UI rollback when actions fail.
- Testing:
  - Unit tests for core backend logic (`sessions`, `votes`, `jira`, `realtime`, cleanup).
  - Unit tests for frontend components (`SessionPage`, realtime hook, backlog sync).
- Monitoring:
  - Scheduled cleanup keeps storage tidy; relay config validation prevents silent failures.
- Documentation:
  - README, usage docs, admin docs, security/relay explanation in `docs/04-architecture.md`.
- Marketplace:
  - Prepare listing assets (logo, screenshots, description).
  - Follow Atlassian “Start building with Atlassian” & Marketplace guidelines.:contentReference[oaicite:15]{index=15}
