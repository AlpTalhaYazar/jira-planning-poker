# Requirements & Feature Breakdown

## 1. User Roles

- **Participant:** can join session, vote, view results.
- **Moderator (Session Owner):**
  - Creates sessions
  - Controls issue order
  - Triggers "Reveal", "Revote", "Next issue"
  - Applies estimates to Jira

(Note: For v1, anyone can be a moderator; later we can enforce owner-based rules.)

## 2. Functional Requirements

### 2.1 Session Management

- Create a new planning poker session with:
  - Project selection
  - Sprint / JQL query / Backlog selection
  - Deck type (Fibonacci, T-shirt, custom)
- List of sessions:
  - Recent/open sessions for a project.
- Join an existing session:
  - Via project page list
  - Via URL with sessionId

### 2.2 Issue Management within Session

- Load issues from Jira using REST search API.:contentReference[oaicite:5]{index=5}
- Show:
  - Issue key
  - Summary
  - Current estimate (if any)
  - Status
- Allow moderator to:
  - Skip issue
  - Reorder issues (later)
  - Filter issues (e.g., by status)

### 2.3 Voting Flow

For given issue:

1. Participants see:
   - Issue key + summary
   - Link to open issue in Jira
   - Deck of cards with values (e.g. 0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100, ?, ☕).
2. Each participant selects a card:
   - Only one active vote per user per issue.
3. While voting:
   - Show who has voted/not voted.
   - Votes are hidden.
4. When all have voted or moderator clicks “Reveal”:
   - Show all votes (avatars + chosen card).
   - Show:
     - Min, max, median, avg.
5. Moderator chooses final estimate:
   - Either click on a card value or manually input.

### 2.4 Writing Estimates to Jira

- When moderator confirms:
  - App writes final estimate to configured numeric field via Jira REST API.
  - The API call uses `PUT /rest/api/3/issue/{issueIdOrKey}` with `"fields": { "customfield_xxxxx": value }`.:contentReference[oaicite:6]{index=6}
- Field configuration:
  - Admin UI to select which Jira field is “Estimate” for this project (Story Points or custom).

### 2.5 Session Review

- Simple view for:
  - Issues estimated in this session
  - Their final values
  - Possibly link to issue & who confirmed.

## 3. Non-Functional Requirements

- **Performance:** UI should feel responsive with up to:
  - 50 participants
  - 100 issues per session
- **Reliability:** No data loss on refresh; all data persisted in Forge storage.
- **Security:**
  - Only Jira users with project access can join that project’s sessions.
  - Respect Jira permission model: user can only write estimates if they have “Edit Issues” permission.
- **Compliance:** Follow Forge guidelines for security and privacy.:contentReference[oaicite:7]{index=7}
