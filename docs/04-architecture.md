# Architecture Overview

## 1. High-Level Diagram (Textual)

- **Jira Cloud**
  - Hosts the project page. `@forge/bridge` passes context (account + project key) into the UI.
- **Forge App**
  - **Frontend (Custom UI)**
    - React/Vite application served from `static/planning-poker-ui/dist`.
    - Talks to backend resolvers via bridge, subscribes to the relay over Socket.IO, and falls back to exponential polling with manual refresh controls when realtime is unavailable.
  - **Backend (Forge Functions)**
    - Entry point `src/index.ts` wires resolvers through a `ContextService` that enforces project scoping and RBAC.
    - Domain logic lives in `src/api/*` (sessions, votes, Jira, config) with thin service wrappers (`services/contextService.ts`, `services/projectPermissions.ts`).
  - **Storage**
    - Global KV store keyed per-entity: `session:${id}`, `session:${id}:participant:${accountId}`, `session:${id}:issue:${issue}:meta`, `session:${id}:issue:${issue}:vote:${accountId}`.
    - A scheduled task (`src/cleanup.ts`) prunes sessions older than `SESSION_TTL_DAYS` and clears associated participant/vote keys.
- **Relay Service**
  - Externally hosted Socket.IO relay (configurable `RELAY_BASE_URL`).
  - Forge backend publishes events via authenticated fetch using `RELAY_API_KEY`; clients obtain JWTs via `generateRelayToken`.

## 2. Forge Modules

In `manifest.yml` (conceptual):

- `jira:projectPage`
  - Key: `planning-poker-project-page`
  - Title: `Planning Poker`
  - Resource: `planning-poker-ui`
  - Resolver: `planning-poker-backend`
- (Later) `jira:issuePanel` or `jira:issueGlance`:
  - Show last session info or quick-start from issue.

## 3. Backend Services (Forge Functions)

- `ContextService`
  - Wraps the Forge resolver request, exposes helpers like `getAccountId`, `assertProjectKey`, `ensureSessionAccess`, and `requireProjectAdmin`.
  - Every resolver instantiates it, so project-scoping + RBAC lives in one place.
- Domain modules under `src/api/*`
  - `sessions.ts` manages session/participant storage, backlog persistence, and the per-project session index.
  - `votes.ts` stores votes per entity key (no race-prone arrays) and enforces reveal state before writes.
  - `jira.ts` handles search + estimate updates via `api.asUser()`, respecting project config for target fields.
  - `config.ts` reads/writes project configuration with `canEdit` metadata.
- Scheduled cleanup (`src/cleanup.ts`)
  - Triggered daily via `planning-poker-cleanup-trigger` to delete sessions older than `SESSION_TTL_DAYS`.

## 4. Data Model

### 4.1 Session

```ts
type DeckType = "fibonacci" | "tshirt" | "powers-of-two" | "custom";

interface Session {
  id: string;
  projectKey: string;
  creatorAccountId: string;
  createdAt: string;
  status: "active" | "closed";
  deckType: DeckType;
  deckValues: string[]; // e.g. ['0', '1', '2', '3', '5', '8', '13', '?', '☕']
  issueKeys: string[];
  currentIssueKey: string | null;
}
```

### 4.2 Participant

```ts
interface Participant {
  accountId: string;
  displayName: string;
  avatarUrl: string;
  joinedAt: string;
  lastSeenAt: string;
  isModerator: boolean;
}
```

### 4.3 Vote

```ts
interface Vote {
  sessionId: string;
  issueKey: string;
  accountId: string;
  value: string; // card label
  createdAt: string;
}
```

Storage strategy (implemented):

- `session:${sessionId} → Session`
- `session:${sessionId}:participant:${accountId} → Participant`
- `session:${sessionId}:issue:${issueKey}:meta → { isRevealed }`
- `session:${sessionId}:issue:${issueKey}:vote:${accountId} → Vote`
- `project:${projectKey}:sessions → SessionListEntry[]` (for list view & cleanup)

Moderators automatically synchronize ordered backlog data (issue keys + applied JQL) through the `updateSessionBacklog` resolver so reconnecting clients stay consistent even after local refreshes.

## 5. Frontend Structure

Recommended React structure:

- src/app/App.tsx

  - Router-like view for:
    - Project sessions list
    - Session detail view (main poker UI)
    - Settings view

- src/features/session/

  - SessionPage.tsx
  - IssuePanel.tsx
  - Deck.tsx
  - ParticipantsList.tsx
  - ResultsPanel.tsx

- src/api/

  - sessionsClient.ts (wraps Forge bridge calls)

- src/components/

  - Shared UI components (buttons, cards, layout wrappers).

- src/hooks/

  - `useRealtimeSession.ts` handles Socket.IO token refresh, deduplicated event dispatch, exponential reconnect, and emits sanitized debug events (disabled in production builds).

## 6. Realtime & Telemetry

- Forge backend exposes `getRealtimeToken` only to session participants, enforcing project context and storing relay config in Forge variables.
- Frontend prefers realtime events but falls back to exponential polling (`4s → 30s`) plus a manual "Refresh now" button.
- Debug toasts/logs are hidden when `NODE_ENV === "production"` and tokens are redacted before logging to avoid leaking JWTs.
