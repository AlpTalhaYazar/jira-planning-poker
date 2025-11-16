# Jira Planning Poker (Sprint Poker) – Product Overview

## 1. Vision

Provide an in-Jira, frictionless Planning Poker experience that helps Scrum teams estimate issues collaboratively without leaving Jira, and automatically syncs agreed story points back to issues.

## 2. Target Users

- Scrum Masters / Product Owners running refinement/estimation sessions
- Developers participating in estimation
- Agile teams using Jira Cloud (Software)

## 3. Core Use Cases

1. **Start a planning poker session for a project/backlog**

   - From a Jira Project Page, user selects a project/board and set of issues (via JQL, sprint, or backlog).
   - App creates a session with those issues.

2. **Team joins the session**

   - Users open the same Project Page or paste a session link.
   - Participants list is visible, with avatars and presence indicators.

3. **Estimate issues**

   - For each issue:
     - Everyone selects a card (Fibonacci, T-shirt size, etc.).
     - Votes are hidden until the moderator clicks “Reveal” (or all votes are in).
     - The app shows distribution & suggested consensus (avg/median).
     - Moderator chooses final estimate.

4. **Write back to Jira**

   - On consensus, the app updates the configured estimate field on the Jira issue (e.g. Story Points).

5. **Session review**
   - After the session, team can review:
     - Which issues were estimated
     - Final estimates
     - (Later) History of votes, time spent, etc.

## 4. Non-Goals (for v1)

- No cross-instance use (one Jira Cloud site at a time).
- No mobile-first UI (desktop web is primary).
- No integration with 3rd-party tools (e.g., Slack, MS Teams) in v1.
- No advanced reporting (velocity, stats) initially.

## 5. Success Metrics (for later)

- Time-to-estimate: average time to estimate an issue.
- Adoption: active sessions per week per site.
- Engagement: average participants per session.
- Quality: low error rate on Jira writes; no app downtime complaints.
