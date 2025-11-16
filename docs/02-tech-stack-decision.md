# Tech Stack Decision

## 1. Platform Choice – Forge vs Connect vs Custom Integration

- **Decision:** Use **Atlassian Forge** as the primary app platform.
- **Reasoning:**
  - Forge is now Atlassian’s preferred and strategic platform for Jira Cloud apps.:contentReference[oaicite:0]{index=0}
  - New Marketplace apps are expected to be Forge-based; Connect publishing is being phased out.:contentReference[oaicite:1]{index=1}
  - Forge provides:
    - Built-in auth to Jira & Atlassian account
    - Serverless compute (no infra to manage)
    - Secure storage (key–value)
    - Simple manifest-driven module declaration

## 2. UI Technology – UI Kit vs Custom UI

- **Decision:** Use **Forge Custom UI** with **React + TypeScript**.
- **Reasoning:**
  - Planning Poker requires:
    - Interactive UI (cards, animations, live updates)
    - Flexible layout (multi-column, responsive)
  - Custom UI allows any HTML/CSS/JS; Forge hosts static assets.:contentReference[oaicite:2]{index=2}
  - TypeScript improves correctness and DX.

## 3. Frontend Libraries

- **Framework:** React + TypeScript
- **UI Library:** **Atlaskit** (Atlassian’s React component library) for native Jira look & feel.
- **State Management:** React Query or simple context + hooks; keep it light.
- **Build Tooling:** Vite or CRA/Next as supported by Forge Custom UI (simple Vite/CRA is enough).

## 4. Backend

- **Runtime:** Forge functions (Node.js env) using `@forge/api`.
- **Language:** TypeScript.
- **Responsibilities:**
  - Session creation/join
  - Vote persistence
  - Integration with Jira REST APIs (read/write issues)
  - Security checks (permissions, membership, etc.)

(Optional later):

- Add an **external .NET microservice** if heavy processing or external integrations are needed. For v1, stay fully within Forge.

## 5. Data Storage

- **Forge Storage API** (key–value per app+site).:contentReference[oaicite:3]{index=3}
- Structures:
  - Sessions: `session:${sessionId}`
  - Participants: `session:${sessionId}:participants`
  - Votes: `session:${sessionId}:votes:${issueKey}`

## 6. Real-time Updates

- **Phase 1 (MVP):** Frontend polling (every 2–3 seconds) for session state.
- **Phase 2 (Optional):** **Forge Realtime (Preview/EAP)** for WebSocket-like events.:contentReference[oaicite:4]{index=4}
  - Use channels `planning-poker:${sessionId}` for:
    - Participant join/leave
    - Vote changes
    - Reveal events

## 7. Testing & Tooling

- **Unit tests (FE):** Vitest/Jest + React Testing Library.
- **Unit tests (BE):** Jest.
- **Linting:** ESLint, Prettier.
- **CI:** GitHub Actions or similar (build, test, forge deploy to dev).
