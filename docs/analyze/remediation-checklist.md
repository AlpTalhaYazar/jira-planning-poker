# Audit Remediation Checklist

Tracking every finding from `docs/analyze/audit-report.md`. Items will be checked off as fixes land, in strict severity order (Critical → High → Medium → Low), followed by architectural/testing/documentation/risk follow-ups.

## Critical

- [x] Race condition in `joinSession` (per-participant storage / locking)
- [x] Missing automated tests across repo (backend + frontend)
- [x] Hidden votes exposed before reveal (redact vote payloads, restrict `issueKey` overrides)

## High

- [x] Session listing performs N+1 storage queries (add session summaries)
- [x] Secret management: validate relay env vars exist
- [x] Duplicate realtime event handling in `useRealtimeSession`
- [x] Incorrect Jira search endpoint usage
- [x] Jira resolvers bypass user permissions (`api.asApp` usage)
- [x] Session APIs allow arbitrary project keys (context validation)
- [x] Project configuration writes lack authorization + UI guard

## Medium

- [x] Hardcoded relay base URL instead of configuration
- [x] No cleanup/TTL for stale sessions (scheduled trigger)
- [x] Polling fallback too aggressive; add backoff/manual refresh
- [x] Configured estimate field ignored when rendering issues
- [x] Sessions fail to persist shared backlog/JQL data
- [x] Realtime debug overlay leaks sensitive payloads (feature flag + redaction)
- [x] Deploys skip frontend build step (run UI build before `forge deploy`)

## Low

- [x] Unsafe type assertions when reading storage (replace casts with runtime schema validation, e.g., Zod)
- [x] Console logging lacks structured logger wrapper (introduce a shared structured logger for Forge logs)
- [x] "Open in Jira" link never renders (set the `issue.link` field when mapping Jira issues)

## Architectural / Refactor Recommendations

- [x] Flatten data model for participants/votes to per-entity keys (supports concurrency)
- [x] Support optimistic UI updates for faster UX
- [x] Introduce service layer abstractions to isolate storage/Jira integrations
- [x] Enforce project context & RBAC via dedicated context service (extends validation work)
- [x] Persist and share session backlogs/JQL history across reconnects
- [x] Production-safe telemetry & debugging controls (guarded diagnostics)

## Testing & Quality Gaps

- [ ] Backend unit test suite for `src/api/*` (sessions, votes, jira, realtime)
- [ ] Authorization-focused integration tests validating project scoping + RBAC
- [ ] Jira contract tests for search + estimate application payloads
- [ ] Frontend component/state tests (Session flows, realtime fallbacks, permissions)
- [ ] End-to-end smoke tests covering session creation → voting → estimation
- [ ] Tooling hooks: `lint`, `test`, `typecheck` scripts wired into CI

## Documentation Corrections

- [ ] Update `docs/04-architecture.md` with relay topology, JWT flow, Socket.IO usage
- [ ] Sync `docs/05-manifest-draft.yml` with actual manifest (dist path, scopes, vars)
- [ ] Revise `docs/06-implementation-plan.md` to reflect relay + backlog persistence work
- [ ] Update `docs/07-repo-structure.md` to match current tree/tests/docs
- [ ] Add security/compliance documentation (scopes, RBAC, relay secret management)

## Risk & Readiness Follow-ups

- [ ] Lock down data access (project validation, moderator-only reveal, Jira `asUser`)
- [ ] Stabilize storage model (per-entity keys, backlog persistence)
- [ ] Ship thorough tests & build automation before release
- [ ] Document and monitor relay service configuration & health
