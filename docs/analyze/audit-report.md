# Technical Audit: Jira Planning Poker

**Date:** 2025-11-19
**Scope:** End-to-end analysis of `jira-planning-poker` (Forge backend + React frontend)

---

## 1. Prioritized Findings List

### Critical Severity

- **Race Condition in Session Join** (Bug / Reliability)
  - **Location:** `src/api/sessions.ts:78` (`joinSession`)
  - **Issue:** The `joinSession` function fetches the participant list, appends the new user, and writes it back using `storage.set`. Forge Storage does not support atomic updates or transactions for this pattern. If two users join simultaneously, one will overwrite the other's entry, causing the first user to "disappear" from the session.
  - **Remediation:** Use `storage.set` with a unique key per participant (e.g., `session:${sessionId}:participant:${accountId}`) instead of a single list. Alternatively, implement a locking mechanism (complex in Forge) or accept the risk for low-concurrency scenarios (not recommended for production).
- **Missing Tests** (Quality)
  - **Location:** Entire Repo
  - **Issue:** There are zero automated tests (unit, integration, or e2e). Any refactor or dependency update carries a 100% risk of regression.
  - **Remediation:** Initialize Jest/Vitest. Add unit tests for `src/api/` logic (mocking `@forge/api`). Add component tests for `SessionPage`.
- **Hidden votes exposed before reveal** (Security / Privacy)
  - **Location:** `src/api/sessions.ts:156-167`, `src/api/votes.ts:17-44`
  - **Issue:** `buildSnapshot` always includes the full `IssueVoteState.votes` object, and `getSession` lets clients pass any `issueKey` override. A participant (or anyone invoking the resolver) can therefore read every card value long before the moderator reveals them, defeating the whole planning poker mechanic.
  - **Remediation:** Only return booleans such as `{ hasVoted: true }` until `isRevealed` is true, and restrict `issueKey` overrides to moderators. Add API and component tests to ensure hidden votes stay inaccessible.

### High Severity

- **N+1 Query in Session Listing** (Performance)
  - **Location:** `src/api/sessions.ts:56` (`listSessionsByProject`)
  - **Issue:** The function fetches a list of IDs, then performs a `storage.get` for _each_ session in parallel. While `Promise.all` helps, this will hit Forge Storage rate limits or timeout as the number of sessions grows.
  - **Remediation:** Store a summary object in the project index (e.g., `{ id, name, createdAt }`) so the list can be rendered without fetching full session details. Only fetch full details when opening a session.
- **Secret Management in Code** (Security)
  - **Location:** `src/api/realtime.ts:10`
  - **Issue:** `process.env.RELAY_API_KEY` and `RELAY_JWT_SECRET` are used. While standard for Node, ensure these are set via `forge variables` and not hardcoded or committed. The audit assumes they are environment variables, but validation is missing.
  - **Remediation:** Add a startup check or `checkConfig` function that validates these variables exist and logs a clear error (redacted) if missing.
- **Duplicate Realtime Event Handling** (Bug / Reliability)
  - **Location:** `static/planning-poker-ui/src/hooks/useRealtimeSession.ts:87`
  - **Issue:** `socket.onAny` captures all events, including those already handled by `socket.on('session:event')`. This triggers `onSessionEvent` twice for some messages, causing double network requests to `refreshSession`.
  - **Remediation:** Remove the specific `session:event` listener or filter it out in `onAny`. Consolidate logic to a single handler.
- **Incorrect Jira search endpoint** (Bug)
  - **Location:** `src/api/jira.ts:37-49`
  - **Issue:** The resolver calls `route\`/rest/api/3/search/jql\``which is not a valid REST path. Jira search expects`POST /rest/api/3/search` with the JQL in the body, so this function always receives a 404/400 and the frontend cannot load backlog issues.
  - **Remediation:** Switch to `/rest/api/3/search`, add a contract test for `getIssuesForProject`, and surface a user-friendly error when search fails.
- **Jira read/write bypasses user permissions** (Security)
  - **Location:** `src/api/jira.ts:37-90`
  - **Issue:** Both the search resolver and `applyEstimate` call Jira with `api.asApp()`. Any participant—regardless of their Jira Browse/Edit Issue rights—can therefore read every issue and push story point updates, because the app credentials carry `read:jira-work`/`write:jira-work`.
  - **Remediation:** Use `api.asUser()` (or `asUser().withActAsAccountId`) so Jira enforces the caller's permissions, and block the request if Jira denies access. Reserve `asApp()` for automation that has explicit approval.
- **Session APIs accept arbitrary project keys** (Security)
  - **Location:** `src/index.ts:24-56`, `src/api/sessions.ts:56-67`
  - **Issue:** `listSessionsByProject`/`getIssuesForProject` trust the payload's `projectKey` and never compare it to `req.context.extension.project?.key`. Anyone who can open one project page can enumerate or mutate sessions for every other project by sending a different key.
  - **Remediation:** Validate that the requested project matches the Forge context (and that the user has Browse permission via Jira's `/project/{key}` endpoint) before touching storage.
- **Project configuration is world-writable** (Security / Admin Controls)
  - **Location:** `src/index.ts:184-205`, `static/planning-poker-ui/src/App.tsx:189-309`
  - **Issue:** The config form is shown to every viewer and the resolver writes whatever comes in without checking that the caller is a project admin/moderator. Any teammate can silently change deck values or the target Jira custom field for all sessions.
  - **Remediation:** Require project admin/editor permissions (e.g., Jira `PROJECT_ADMIN` or `EDIT_ISSUES`) before calling `setProjectConfig`, and hide or disable the UI unless the viewer passes that check.

### Medium Severity

- **Hardcoded Relay URL** (Architecture)
  - **Location:** `src/api/realtime.ts:5`
  - **Issue:** `DEFAULT_BASE_URL` is hardcoded to `https://relay.alptalha.dev`. This creates a dependency on a specific external service.
  - **Remediation:** Make this purely configuration-driven. Fail if `RELAY_BASE_URL` is not set, rather than falling back to a hardcoded external dev server.
- **No Cleanup for Old Sessions** (Maintenance)
  - **Location:** `src/api/sessions.ts`
  - **Issue:** Sessions are created forever. There is no TTL or cleanup mechanism. Storage will grow indefinitely.
  - **Remediation:** Implement a `cron` module (Forge Scheduled Triggers) to archive or delete sessions older than X days.
- **Frontend Polling Fallback is Aggressive** (Performance)
  - **Location:** `static/planning-poker-ui/src/features/session/SessionPage.tsx:224`
  - **Issue:** Polling runs every `POLLING_INTERVAL_MS` (likely 2-5s) when realtime is disabled. This will consume Forge invocation quotas rapidly for active teams.
  - **Remediation:** Implement exponential backoff or increase the interval. Add a "manual refresh" button to reduce auto-polling reliance.
- **Configured estimate field ignored when rendering issues** (Bug)
  - **Location:** `src/api/jira.ts:45-75`
  - **Issue:** Search always requests `customfield_10016` and `extractEstimate` checks only two hard-coded IDs, so a custom `estimateFieldId` saved via project config never surfaces in the UI.
  - **Remediation:** Include the configured field ID in the Jira `fields` list (fallback to story points only if undefined) and parse that field when building the issue DTO.
- **Sessions never persist a backlog** (Architecture)
  - **Location:** `src/api/sessions.ts:23-35` (only reference to `issueKeys`)
  - **Issue:** `Session.issueKeys` is initialized to `[]` and is never written anywhere else in the repo, so reopened sessions cannot recall which issues were discussed. Each client just re-runs their own JQL which can diverge per user.
  - **Remediation:** Store the applied JQL and/or a concrete ordered list of issue keys with the session so reconnecting participants share the same backlog and history.
- **Always-on realtime debug overlay leaks sensitive payloads** (Security / DX)
  - **Location:** `static/planning-poker-ui/src/App.tsx:315-335`, `static/planning-poker-ui/src/features/session/SessionPage.tsx:189-216`
  - **Issue:** `RealtimeDebugToasts` is rendered for every user and `onToken` pushes the full relay token payload (including the JWT) into the DOM. Tokens and internal events are exposed and the UI is cluttered in production.
  - **Remediation:** Guard the debug UI behind a feature flag or `process.env.NODE_ENV !== 'production'` and redact secrets before logging.
- **Forge deploy never builds the React bundle** (DX / Release)
  - **Location:** `package.json:5-7`, `manifest.yml:7-12`
  - **Issue:** The only root script is `build: forge deploy --verbose`. It never runs `npm run build` inside `static/planning-poker-ui`, yet the manifest points to `static/planning-poker-ui/dist`. Deploys can therefore push stale or missing assets.
  - **Remediation:** Add a `predeploy`/`prepare` step that runs `npm --prefix static/planning-poker-ui run build` (or use npm workspaces) before invoking `forge deploy`.

### Low Severity

- **Type Assertion Risks** (Code Quality)
  - **Location:** `src/api/sessions.ts:58`
  - **Issue:** `(await storage.get(key)) as string[]`. If the storage shape changes or is corrupted, this casts will runtime error.
  - **Remediation:** Use Zod or a runtime validation library to parse storage data before using it.
- **Console Logging** (DX)
  - **Location:** Various
  - **Issue:** `console.log` and `console.error` are used freely.
  - **Remediation:** Use a structured logger or standard wrapper to allow filtering and better observability in Forge logs.
- **“Open in Jira” link never renders** (Bug)
  - **Location:** `static/planning-poker-ui/src/components/IssuePanel.tsx:34-52`, `src/api/jira.ts:58-63`
  - **Issue:** The UI expects `issue.link`, but `getIssuesForProject` never sets it, so the external link block is always hidden and users cannot jump to Jira from the session.
  - **Remediation:** Include the issue URL when mapping Jira responses (e.g., `link: route\`/browse/${issue.key}\``) so the UI can render a working link.

---

## 2. Architectural/Refactor Recommendations

### 1. Flatten Data Model for Concurrency

**Current:** `session:{id}:participants` -> `Participant[]`
**Proposed:** `session:{id}:participant:{accountId}` -> `Participant`
**Why:** Solves the race condition in `joinSession`. Allows independent updates (e.g., "last seen" heartbeat) without reading the whole list.

### 2. Optimistic UI Updates

**Current:** Frontend waits for API response + Refresh before showing changes.
**Proposed:** Update local state immediately (e.g., show "Voted" status) while waiting for the server.
**Why:** Makes the app feel instant, even if the relay or backend is slow.

### 3. Service Layer Abstraction

**Current:** Resolvers call `src/api/*` directly.
**Proposed:** Introduce a `Service` class/interface pattern.
**Why:** Facilitates unit testing. You can mock `StorageService` and `JiraService` to test `SessionService` logic in isolation.

### 4. Enforce Project Context & RBAC in Resolvers

**Current:** Resolver payloads trust any `projectKey` and `setProjectConfig` has no authorization.
**Proposed:** Inject a `ContextService` that validates the requested project against `req.context.extension.project.key` and verifies Jira permissions (e.g., via `/mypermissions`) before touching storage or Jira.
**Why:** Prevents cross-project data leaks and ensures only project admins update shared configuration.

### 5. Persist and Share Session Backlogs

**Current:** `Session.issueKeys` is unused, so each client re-fetches issues independently.
**Proposed:** When a moderator applies JQL or steps through issues, store the ordered keys/JQL string alongside the session and emit updates to other clients.
**Why:** Participants stay in sync after reconnects and you can render historical context (completed issues, timestamps).

### 6. Production-Safe Telemetry & Debugging

**Current:** `RealtimeDebugToasts` shows every event/token to end users.
**Proposed:** Wrap diagnostics behind a feature flag and sanitize payloads before logging.
**Why:** Reduces information leakage and keeps the UI uncluttered during normal usage.

---

## 3. Testing & Quality Gaps

- **Backend unit coverage (Critical):** No tests protect `src/api` or resolver validation. Add suites for `sessions`, `votes`, `jira`, and `realtime` to cover happy paths plus edge cases (concurrent joins, vote reveal gating, Jira 4xx propagation, relay config validation). Mock `@forge/api` to simulate API/storage failures.
- **Authorization tests (High):** Add integration-style tests (Vitest/Jest + stubbed resolver context) proving that project keys must match the Forge context and that `setProjectConfig` refuses non-admins. This prevents regressions after RBAC fixes.
- **Jira contract tests (High):** Add tests that assert `getIssuesForProject` calls `/rest/api/3/search` with the configured `estimateFieldId`, and that `applyEstimate` passes through numeric vs string values correctly.
- **Frontend component/state tests (Medium):** Use React Testing Library to cover `SessionPage` flows (vote submission, reveal, revote, JQL updates), realtime fallbacks, and UI permission checks (non-moderators cannot reveal, config form hidden).
- **End-to-end smoke (Medium):** Scripted Cypress/Playwright test (or Forge UI Kit automation) that exercises session creation → voting → estimate application against a mocked Jira site to catch regressions across backend/frontend contracts.
- **Tooling hooks (Low):** No `lint`, `test`, or `typecheck` npm scripts exist. Add them and wire into CI so failures block deploys before `forge deploy`.

---

## 4. Documentation Corrections

- **`docs/04-architecture.md`:** Still describes a future Forge Realtime integration. Update the diagram + text to explain the custom relay (`relay.alptalha.dev`), JWT issuance, and Socket.IO client so reviewers understand the actual topology and risk envelope.
- **`docs/05-manifest-draft.yml`:** References `static/planning-poker-ui/build` and lacks the external fetch scopes that now exist in `manifest.yml`. Sync the draft with the ship-ready manifest (use `dist`, include relay origins, document required Forge variables).
- **`docs/06-implementation-plan.md`:** Phases 3–6 assume polling-only storage and Forge Realtime EAP. Revise to reflect the adopted relay, the missing backlog persistence, and the new security/permission steps that must precede Marketplace readiness.
- **`docs/07-repo-structure.md`:** Mentions `tests/` scaffolding that does not exist. Either create the directory or update the doc to show the current structure plus the new `docs/analyze` outputs.
- **Security/Compliance doc gap:** No document explains how relay secrets are provisioned or how Jira permissions are enforced. Add a section (either in `04-architecture` or a new `08-security.md`) covering scopes, RBAC, and data-at-rest guarantees.

---

## 5. Risk & Readiness Assessment

**Release Readiness:** **NOT READY**

- **Blockers:**
  - **Privacy breach:** Votes can be read before reveal via `getSession`.
  - **Authorization gaps:** Jira operations and config changes ignore user permissions.
  - **Data integrity:** Participant join is non-atomic and project scoping is unenforced.
  - **Operational blind spots:** No automated tests or build pipeline for the frontend bundle.

**Top Follow-up Actions:**

1.  **Lock down data access:** Enforce project-context validation, moderator-only vote reveals, and Jira `asUser()` permissions; redact votes until revealed.
2.  **Stabilize storage model:** Move participants/votes to per-entity keys (or transactional patterns) and persist issue backlogs.
3.  **Ship with tests & build automation:** Add lint/test scripts, build the React app as part of deploy, and create CI gates before `forge deploy`.
4.  **Document + monitor relay:** Publish the relay architecture, validate secrets at startup, and add logging/alerting for publish failures.
