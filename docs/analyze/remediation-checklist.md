# Audit Remediation Checklist

Tracking every finding from `docs/analyze/audit-report.md`. Items will be checked off as fixes land, in strict severity order (Critical → High → Medium → Low), followed by architectural/testing/documentation/risk follow-ups.

## Critical

- [x] Race condition in `joinSession` (per-participant storage / locking)
- [ ] Missing automated tests across repo (backend + frontend)
- [ ] Hidden votes exposed before reveal (redact vote payloads, restrict `issueKey` overrides)

## High

- [ ] Session listing performs N+1 storage queries (add session summaries)
- [ ] Secret management: validate relay env vars exist
- [ ] Duplicate realtime event handling in `useRealtimeSession`
- [ ] Incorrect Jira search endpoint usage
- [ ] Jira resolvers bypass user permissions (`api.asApp` usage)
- [ ] Session APIs allow arbitrary project keys (context validation)
- [ ] Project configuration writes lack authorization + UI guard

## Medium

- [ ] Hardcoded relay base URL instead of configuration
- [ ] No cleanup/TTL for stale sessions (scheduled trigger)
- [ ] Polling fallback too aggressive; add backoff/manual refresh
- [ ] Configured estimate field ignored when rendering issues
- [ ] Sessions fail to persist shared backlog/JQL data
- [ ] Realtime debug overlay leaks sensitive payloads (feature flag + redaction)
- [ ] Deploys skip frontend build step (run UI build before `forge deploy`)

## Low

- [ ] Unsafe type assertions when reading storage
- [ ] Console logging lacks structured logger wrapper
- [ ] “Open in Jira” link never renders (missing DTO link field)

## Architectural / Refactor Recommendations

- [ ] Flatten data model for participants/votes to per-entity keys (supports concurrency)
- [ ] Support optimistic UI updates for faster UX
- [ ] Introduce service layer abstractions to isolate storage/Jira integrations
- [ ] Enforce project context & RBAC via dedicated context service (extends validation work)
- [ ] Persist and share session backlogs/JQL history across reconnects
- [ ] Production-safe telemetry & debugging controls (guarded diagnostics)

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
