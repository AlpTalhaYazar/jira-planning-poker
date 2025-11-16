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

**Goal:** Support multiple users and page reloads.

Tasks:

- Backend:
  - Implement `createSession`, `getSession`, `joinSession`, `leaveSession`.
  - Store `Session` + `Participant[]` in Forge storage.
- Frontend:
  - On page load, get existing sessions for project (simple list).
  - When user selects/creates session:
    - `joinSession` in backend.
    - Start polling (`getSession`) every ~2 seconds.
- Track `lastSeenAt` to determine who’s “online”.

Deliverable:

- Sessions are persisted; multiple browser windows see same state.

---

## Phase 4 – Voting Persistence & Reveal Flow

**Goal:** Persist votes and share across users.

Tasks:

- Backend:
  - Implement `castVote`, `clearVotes`, `revealIssue`.
  - Store votes under `session:${sessionId}:issue:${issueKey}:votes`.
- Frontend:
  - On interval, fetch session + votes for current issue.
  - Show:
    - Who has voted (boolean)
    - When status is “revealed”, show all values.
- UX:
  - Moderator controls reveal.
  - Add “Revote” / “Next issue” buttons.

Deliverable:

- Real multiplayer voting experience using polling.

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

## Phase 6 – Real-Time UX (Optional but Recommended)

**Goal:** Reduce latency and polling using Forge Realtime.

Tasks:

- Join Forge Realtime EAP and configure.:contentReference[oaicite:14]{index=14}
- Backend:
  - On vote, join/leave, reveal, etc., publish event to channel `planning-poker:${sessionId}`.
- Frontend:
  - Subscribe to that channel.
  - Update local session state on events instead of (or in addition to) polling.

Deliverable:

- Near-instant updates as participants interact.

---

## Phase 7 – Hardening & Marketplace Readiness

**Goal:** Prepare for Atlassian Marketplace listing.

Tasks:

- Implement permissions checks:
  - Only users with project access can see sessions.
  - Only users with “Edit Issues” permission can apply estimates.
- Add error handling and loading states everywhere.
- Testing:
  - Unit tests for core backend logic.
  - Unit tests for core frontend components.
- Documentation:
  - README, usage docs, admin docs.
- Marketplace:
  - Prepare listing assets (logo, screenshots, description).
  - Follow Atlassian “Start building with Atlassian” & Marketplace guidelines.:contentReference[oaicite:15]{index=15}
