import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import SessionPage from "./SessionPage";
const useRealtimeSessionMock = vi.fn(() => ({ status: "connected" }));
vi.mock("../../hooks/useRealtimeSession", () => ({
  useRealtimeSession: (args) => useRealtimeSessionMock(args),
}));
vi.mock("../../api/sessionsClient", () => {
  const mock = {
    applyEstimate: vi.fn(),
    castVote: vi.fn(),
    clearVotes: vi.fn(),
    fetchIssuesForProject: vi.fn(),
    getSession: vi.fn(),
    revealIssue: vi.fn(),
    setCurrentIssue: vi.fn(),
    updateSessionBacklog: vi.fn(),
  };
  return mock;
});
import * as sessionsClient from "../../api/sessionsClient";
const mockedSessionsClient = vi.mocked(sessionsClient, { deep: true });
const baseSession = {
  session: {
    id: "session-1",
    name: "Demo Session",
    projectKey: "TEST",
    createdAt: "2025-01-01T00:00:00.000Z",
    status: "active",
    deckType: "fibonacci",
    deckValues: ["1", "2", "3", "5"],
    currentIssueKey: "ISSUE-123",
    jql: 'project = "TEST"',
  },
  participants: [
    {
      accountId: "moderator",
      displayName: "Moderator",
      avatarUrl: "",
      joinedAt: "2025-01-01T00:00:00.000Z",
      lastSeenAt: "2025-01-01T00:00:00.000Z",
      isModerator: true,
    },
    {
      accountId: "viewer",
      displayName: "Viewer",
      avatarUrl: "",
      joinedAt: "2025-01-01T00:01:00.000Z",
      lastSeenAt: "2025-01-01T00:01:00.000Z",
      isModerator: false,
    },
  ],
  currentIssueState: {
    issueKey: "ISSUE-123",
    isRevealed: false,
    votes: {
      moderator: {
        accountId: "moderator",
        hasVoted: true,
        value: "3",
        createdAt: "2025-01-01T00:02:00.000Z",
      },
      viewer: {
        accountId: "viewer",
        hasVoted: true,
        value: "5",
        createdAt: "2025-01-01T00:03:00.000Z",
      },
    },
  },
};
const defaultIssue = [
  {
    key: "ISSUE-123",
    summary: "Improve onboarding",
    status: "To Do",
    estimate: "3",
    link: "/browse/ISSUE-123",
  },
];
const defaultIssueState = baseSession.currentIssueState;
const renderSession = (overrides) => {
  const props = {
    data: baseSession,
    onBack: vi.fn(),
    onSessionData: vi.fn(),
    viewerAccountId: "viewer",
    projectConfig: null,
    onDebugEvent: vi.fn(),
    ...overrides,
  };
  return render(_jsx(SessionPage, { ...props }));
};
describe("SessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRealtimeSessionMock.mockReturnValue({ status: "connected" });
    mockedSessionsClient.fetchIssuesForProject.mockResolvedValue(defaultIssue);
    mockedSessionsClient.getSession.mockResolvedValue(baseSession);
    mockedSessionsClient.revealIssue.mockResolvedValue(defaultIssueState);
    mockedSessionsClient.castVote.mockResolvedValue(defaultIssueState);
    mockedSessionsClient.clearVotes.mockResolvedValue(defaultIssueState);
    mockedSessionsClient.setCurrentIssue.mockResolvedValue(baseSession);
    mockedSessionsClient.updateSessionBacklog.mockResolvedValue({ ok: true });
  });
  it("disables reveal action for non-moderators", async () => {
    renderSession({ viewerAccountId: "viewer" });
    const revealButton = await screen.findByRole("button", {
      name: /reveal votes/i,
    });
    expect(revealButton).toBeDisabled();
    await waitFor(() =>
      expect(mockedSessionsClient.fetchIssuesForProject).toHaveBeenCalled()
    );
  });
  it("invokes reveal action when moderator clicks reveal", async () => {
    const user = userEvent.setup();
    renderSession({ viewerAccountId: "moderator" });
    const revealButton = await screen.findByRole("button", {
      name: /reveal votes/i,
    });
    expect(revealButton).toBeEnabled();
    await user.click(revealButton);
    await waitFor(() =>
      expect(mockedSessionsClient.revealIssue).toHaveBeenCalledWith(
        "session-1",
        "ISSUE-123"
      )
    );
    expect(mockedSessionsClient.getSession).toHaveBeenCalled();
  });
  it("shows local selection while keeping other votes hidden before reveal", async () => {
    const hiddenData = {
      ...baseSession,
      currentIssueState: {
        issueKey: "ISSUE-123",
        isRevealed: false,
        votes: {
          moderator: {
            accountId: "moderator",
            hasVoted: true,
          },
          viewer: {
            accountId: "viewer",
            hasVoted: true,
            value: "5",
          },
        },
      },
    };
    renderSession({ data: hiddenData, viewerAccountId: "viewer" });
    await waitFor(() =>
      expect(mockedSessionsClient.fetchIssuesForProject).toHaveBeenCalled()
    );
    const selectedCard = await screen.findByRole("button", { name: "5" });
    expect(selectedCard).toHaveClass("selected");
    expect(screen.queryByText(/Revealed vote/)).toBeNull();
  });
  it("renders manual refresh messaging when realtime is disabled", async () => {
    useRealtimeSessionMock.mockReturnValue({ status: "disabled" });
    renderSession({ viewerAccountId: "viewer" });
    expect(
      await screen.findByText(/falling back to polling/i)
    ).toBeInTheDocument();
  });
});
