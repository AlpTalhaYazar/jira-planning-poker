import { beforeEach, describe, expect, it } from "vitest";
import { storage } from "@forge/api";
import {
  createSession,
  getSession,
  joinSession,
  listSessionsByProject,
  setCurrentIssueKey,
  startSession,
  toggleReady,
} from "../src/api/sessions";
import type { CreateSessionInput } from "../src/api/sessions";
import { recordVote, setIssueRevealState } from "../src/api/votes";
import type { Vote } from "../src/types/domain";
import { getForgeTestingApi } from "./setup";

const testingApi = getForgeTestingApi();

describe("session participants storage", () => {
  beforeEach(() => {
    testingApi.reset();
  });

  const baseInput: CreateSessionInput = {
    projectKey: "TEST",
    name: "Demo Session",
    deckType: "fibonacci",
    deckValues: ["1", "2", "3"],
    creatorAccountId: "user-creator",
  };

  it("stores each participant under its own storage key to avoid lost joins", async () => {
    testingApi.enqueueMyselfResponse({
      accountId: "user-creator",
      displayName: "Creator",
      avatarUrls: { "48x48": "creator.png" },
    });

    const snapshot = await createSession(baseInput);
    expect(snapshot.participants).toHaveLength(1);
    expect(snapshot.participants[0].accountId).toEqual("user-creator");

    testingApi.enqueueMyselfResponse({
      accountId: "user-a",
      displayName: "Teammate A",
      avatarUrls: { "48x48": "a.png" },
    });

    testingApi.enqueueMyselfResponse({
      accountId: "user-b",
      displayName: "Teammate B",
      avatarUrls: { "48x48": "b.png" },
    });

    await Promise.all([
      joinSession(snapshot.session.id),
      joinSession(snapshot.session.id),
    ]);

    const updated = await getSession(snapshot.session.id);
    expect(updated).not.toBeNull();
    expect(updated?.participants).toHaveLength(3);
    expect(updated?.participants.map((p) => p.accountId)).toEqual(
      expect.arrayContaining(["user-creator", "user-a", "user-b"])
    );

    const participantKeys = testingApi.listKeys(
      `session:${snapshot.session.id}:participant:`
    );
    expect(participantKeys).toHaveLength(3);
  });
});

describe("session vote privacy", () => {
  beforeEach(() => {
    testingApi.reset();
  });

  const baseInput: CreateSessionInput = {
    projectKey: "TEST",
    name: "Secure Session",
    deckType: "fibonacci",
    deckValues: ["1", "2", "3", "5", "8"],
    creatorAccountId: "moderator",
  };

  const buildVote = (overrides: Partial<Vote> = {}): Vote => ({
    sessionId: "session-under-test",
    issueKey: "TEST-1",
    accountId: "moderator",
    value: "3",
    createdAt: new Date().toISOString(),
    ...overrides,
  });

  it("redacts votes until reveal and restricts issue overrides to moderators", async () => {
    testingApi.enqueueMyselfResponse({
      accountId: "moderator",
      displayName: "Moderator",
      avatarUrls: { "48x48": "m.png" },
    });

    const snapshot = await createSession(baseInput);
    const sessionId = snapshot.session.id;

    await setCurrentIssueKey(sessionId, "TEST-1");

    testingApi.enqueueMyselfResponse({
      accountId: "user-a",
      displayName: "Participant A",
      avatarUrls: { "48x48": "a.png" },
    });
    await joinSession(sessionId);

    await recordVote(
      sessionId,
      buildVote({ sessionId, accountId: "moderator", value: "3" })
    );
    await recordVote(
      sessionId,
      buildVote({
        sessionId,
        accountId: "user-a",
        value: "5",
        createdAt: new Date().toISOString(),
      })
    );
    await recordVote(
      sessionId,
      buildVote({
        sessionId,
        issueKey: "TEST-2",
        value: "8",
        createdAt: new Date().toISOString(),
      })
    );

    const memberView = await getSession(sessionId, {
      viewerAccountId: "user-a",
    });
    expect(memberView?.currentIssueState?.issueKey).toBe("TEST-1");
    expect(memberView?.currentIssueState?.votes["user-a"]?.value).toBe("5");
    expect(
      memberView?.currentIssueState?.votes["moderator"]?.value
    ).toBeUndefined();

    const nonModeratorOverride = await getSession(sessionId, {
      viewerAccountId: "user-a",
      issueKeyOverride: "TEST-2",
    });
    expect(nonModeratorOverride?.currentIssueState?.issueKey).toBe("TEST-1");

    const moderatorOverride = await getSession(sessionId, {
      viewerAccountId: "moderator",
      issueKeyOverride: "TEST-2",
    });
    expect(moderatorOverride?.currentIssueState?.issueKey).toBe("TEST-2");
    expect(
      moderatorOverride?.currentIssueState?.votes["moderator"]?.value
    ).toBe("8");

    await setIssueRevealState(sessionId, "TEST-1", true);
    const afterReveal = await getSession(sessionId, {
      viewerAccountId: "user-a",
    });
    expect(afterReveal?.currentIssueState?.votes["moderator"]?.value).toBe("3");
  });
});

describe("session backlog persistence", () => {
  beforeEach(() => {
    testingApi.reset();
  });

  it("allows moderators to update backlog data", async () => {
    testingApi.enqueueMyselfResponse({
      accountId: "moderator",
      displayName: "Moderator",
      avatarUrls: { "48x48": "m.png" },
    });
    const snapshot = await createSession({
      projectKey: "BACKLOG",
      name: "Backlog Session",
      deckType: "fibonacci",
      deckValues: ["1", "2", "3"],
      creatorAccountId: "moderator",
    });
    const { updateSessionBacklog } = await import("../src/api/sessions");
    await updateSessionBacklog(
      snapshot.session.id,
      ["TEST-1", "TEST-2"],
      "project = BACKLOG"
    );
    const stored = testingApi.getValue(`session:${snapshot.session.id}`);
    expect(stored.issueKeys).toEqual(["TEST-1", "TEST-2"]);
    expect(stored.jql).toBe("project = BACKLOG");
  });
});

describe("session listing summaries", () => {
  beforeEach(() => {
    testingApi.reset();
  });

  it("stores summary objects in the project index", async () => {
    testingApi.enqueueMyselfResponse({
      accountId: "summary-owner",
      displayName: "Summary Owner",
      avatarUrls: { "48x48": "owner.png" },
    });

    const snapshot = await createSession({
      projectKey: "SUMM",
      name: "Summary Session",
      deckType: "fibonacci",
      deckValues: ["1", "2", "3"],
      creatorAccountId: "summary-owner",
    });

    const indexValue = testingApi.getValue("project:SUMM:sessions");
    expect(Array.isArray(indexValue)).toBe(true);
    expect(indexValue[0]).toMatchObject({
      id: snapshot.session.id,
      name: "Summary Session",
    });

    const sessions = await listSessionsByProject("SUMM");
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({
      id: snapshot.session.id,
      name: "Summary Session",
      projectKey: "SUMM",
    });
  });

  it("migrates legacy indexes that only stored session ids", async () => {
    testingApi.enqueueMyselfResponse({
      accountId: "legacy-owner",
      displayName: "Legacy Owner",
      avatarUrls: { "48x48": "legacy.png" },
    });

    const snapshot = await createSession({
      projectKey: "LEGACY",
      name: "Legacy Session",
      deckType: "fibonacci",
      deckValues: ["1", "2", "3"],
      creatorAccountId: "legacy-owner",
    });

    await storage.set("project:LEGACY:sessions", [snapshot.session.id]);

    const sessions = await listSessionsByProject("LEGACY");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(snapshot.session.id);
    expect(sessions[0].name).toBe("Legacy Session");

    const persistedIndex = testingApi.getValue("project:LEGACY:sessions");
    expect(Array.isArray(persistedIndex)).toBe(true);
    expect(typeof persistedIndex[0]).toBe("object");
    expect(persistedIndex[0]).toMatchObject({
      id: snapshot.session.id,
      name: "Legacy Session",
    });
  });
});

describe("waiting room flow", () => {
  beforeEach(() => {
    testingApi.reset();
  });

  const baseInput: CreateSessionInput = {
    projectKey: "WAIT",
    name: "Waiting Room Session",
    deckType: "fibonacci",
    deckValues: ["1", "2", "3"],
    creatorAccountId: "moderator",
  };

  it("starts in waiting state and transitions to active", async () => {
    testingApi.enqueueMyselfResponse({
      accountId: "moderator",
      displayName: "Moderator",
      avatarUrls: { "48x48": "m.png" },
    });

    const snapshot = await createSession(baseInput);
    expect(snapshot.session.status).toBe("waiting");

    const started = await startSession(snapshot.session.id);
    expect(started.status).toBe("active");

    const fetched = await getSession(snapshot.session.id);
    expect(fetched?.session.status).toBe("active");
  });

  it("allows participants to toggle ready status", async () => {
    testingApi.enqueueMyselfResponse({
      accountId: "moderator",
      displayName: "Moderator",
      avatarUrls: { "48x48": "m.png" },
    });

    const snapshot = await createSession(baseInput);
    const sessionId = snapshot.session.id;

    let session = await toggleReady(sessionId, "moderator", true);
    expect(session.participantsReady).toContain("moderator");

    session = await toggleReady(sessionId, "moderator", false);
    expect(session.participantsReady).not.toContain("moderator");
  });
});
