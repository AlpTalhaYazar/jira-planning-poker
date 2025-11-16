# Architecture Overview

## 1. High-Level Diagram (Textual)

- Jira Cloud
  - Hosts the product UI, calls Forge app.
- Forge App
  - **Frontend (Custom UI)**
    - React app rendered in a `jira:projectPage`.
    - Uses `@forge/bridge` to talk to backend and access context.:contentReference[oaicite:8]{index=8}
  - **Backend (Forge Functions)**
    - Exposes resolvers for session and voting operations.
    - Uses `@forge/api` to access Jira REST & Forge storage.:contentReference[oaicite:9]{index=9}
  - **Storage**
    - Key–value store for sessions, participants, votes.

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

Example resolvers:

- `createSession(input: CreateSessionRequest): CreateSessionResponse`
- `getSession(sessionId: string): SessionDto`
- `joinSession(sessionId: string): SessionDto`
- `leaveSession(sessionId: string): void`
- `castVote(sessionId: string, issueKey: string, value: string): SessionDto`
- `clearVotes(sessionId: string, issueKey: string): SessionDto`
- `revealIssue(sessionId: string, issueKey: string): SessionDto`
- `applyEstimate(sessionId: string, issueKey: string, value: number): SessionDto`
- `getProjectConfig(projectKey: string)`
- `setProjectConfig(projectKey: string, config: ProjectConfig)`

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

Storage strategy (one possible approach):

- `session:${sessionId} → Session`
- `session:${sessionId}:participants → Participant[]`
- `session:${sessionId}:issue:${issueKey}:votes → Vote[]`
- For queries, you'll usually fetch `Session`, `Participants`, and votes for `currentIssueKey`.

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

- src/context/

  - SessionContext.tsx

- src/components/

  - Shared UI components (buttons, cards, layout wrappers).
