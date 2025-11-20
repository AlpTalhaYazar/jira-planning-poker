# Security & Compliance Overview

## 1. Jira Scopes & Access

- `read:jira-work`, `write:jira-work`, `read:jira-user`, `storage:app`.
- All Jira REST calls go through `api.asUser()` so the viewer’s permissions (Browse/Edit Issues, Project Admin) are enforced by Jira.

## 2. Forge Storage & Data Residency

- Sessions, participants, votes, and backlog metadata are stored under per-entity keys in the Forge global storage (data-at-rest per Atlassian hosting).
- Scheduled cleanup (`planning-poker-cleanup-trigger`) deletes sessions older than `SESSION_TTL_DAYS`, plus associated participant/vote keys, to limit retention.

## 3. Project RBAC

- `ContextService` enforces that every resolver’s project/key matches the Forge context.
- `requireProjectAdmin` checks Jira `mypermissions` before allowing config changes; moderators only can reveal/advance/apply estimates.

## 4. Relay Secret Management

- `RELAY_BASE_URL`, `RELAY_API_KEY`, `RELAY_JWT_SECRET` are required Forge variables; startup validation logs a warning and disables realtime if missing.
- Realtime tokens are short-lived JWTs generated per session+account, redacted before logging, and never rendered in production debug UI.

## 5. Client Telemetry & Privacy

- Realtime debug toasts/logs are hidden when `NODE_ENV === 'production'`.
- Socket.io events never include raw vote values before reveal; the frontend submits optimistic votes locally and waits for the reveal flag before surfacing values.
