# Designer Prompt: Jira Planning Poker UI Redesign

You are a senior product designer creating a fresh, opinionated redesign of our Jira Planning Poker experience. Generate a single, self-contained design proposal (no code) that the UI team can execute.

## Goal

- Deliver a desktop-first, Jira-native planning poker UI that keeps the workflow intact but feels more intentional, modern, and legible than our current utilitarian layout.
- Preserve compatibility with Jira Cloud/Forge (custom UI rendered in a Jira project page), respecting Atlassian accessibility, spacing, and contrast expectations while introducing a distinct visual direction.

## What to design (must cover)

1. **Sessions Home (project page)**
   - Project context (name/key) surfaced from Jira.
   - Session list cards (name, deck type, created time, open/join action, empty/loading/error states).
   - “Create session” form: session name, optional default JQL/backlog filter, deck type/values hint, create CTA with progress/error handling.
   - Project configuration block: estimate field ID selector/input, default JQL, deck type/values; show when user can/cannot edit.
2. **Waiting Room**
   - Participant grid with avatars and ready status; current user toggle for “Ready/Not Ready”.
   - Moderator-only “Start session” action; space for optional fun/icebreaker (we currently have a tiny Bug Smasher mini-game—feel free to replace with a lighter affordance or omit).
3. **Active Session**
   - JQL filter bar with applied-query summary and loading/error/empty states for issues.
   - Issue panel: key, summary, status, current estimate, Jira deep link; navigation (prev/next), reveal/revote/apply-and-next controls (moderator only), progress through issue list.
   - Voting area: deck of cards (Fibonacci default; supports T-shirt/powers-of-two/custom), selection state, disabled state while revealed.
   - Participants panel: who has/hasn’t voted; post-reveal shows their card values.
   - Results section (post-reveal): avg/median/min/max, suggested consensus; moderator selects final value via chips or custom input; “Apply to Jira” CTA using configured estimate field, with success/failure feedback.
4. **Realtime/resilience cues**
   - Indicator for realtime socket status vs fallback polling; manual refresh affordance when degraded.

## Constraints and compatibility

- Runs inside Jira project page width (~1100px content area); must degrade gracefully on narrower viewports.
- Jira Cloud look-and-feel alignment: sane spacing, readable type scale, strong contrast; light mode first. It should _coexist_ with Atlassian products, not mimic default Atlaskit cards.
- Accessibility: keyboard focus, states for loading/empty/error, clear affordances when user lacks permission (cannot edit config or control session).
- Keep flows intact but allow new IA/layout; avoid duplicating our current grid/card arrangement.

## Data/logic hints (for realism)

- Default Fibonacci deck: `0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕`.
- Session states: `waiting` (ready-up), `active` (voting), `closed` (can be a simple summary view).
- Roles: participants vs moderator (moderator controls reveal/revote/apply/next, can change issues, can start session).
- Jira integration: applying an estimate writes to a configured Jira numeric field (e.g., Story Points); show when field is missing.

## Output format to return

- A concise concept write-up with: name/theme, visual direction (color/typography/iconography), layout notes for each surface above, interaction states (loading/empty/error/disabled), and motion/feedback ideas.
- Include enough detail that an engineer can translate it into React/Vite without guessing, but keep it short and scannable.
- Emphasize originality and Jira coexistence.
