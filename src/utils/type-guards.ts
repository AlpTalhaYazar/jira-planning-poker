import type { Participant, ProjectConfig, Session } from "../types/domain";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

export const isParticipant = (value: unknown): value is Participant => {
  if (!isRecord(value)) {
    return false;
  }
  const participant = value as Partial<Participant>;
  return (
    typeof participant.accountId === "string" &&
    typeof participant.displayName === "string" &&
    typeof participant.avatarUrl === "string" &&
    typeof participant.joinedAt === "string" &&
    typeof participant.lastSeenAt === "string" &&
    typeof participant.isModerator === "boolean"
  );
};

export const isSession = (value: unknown): value is Session => {
  if (!isRecord(value)) {
    return false;
  }
  const session = value as Partial<Session>;
  return (
    typeof session.id === "string" &&
    typeof session.name === "string" &&
    typeof session.projectKey === "string" &&
    typeof session.creatorAccountId === "string" &&
    typeof session.createdAt === "string" &&
    typeof session.status === "string" &&
    typeof session.deckType === "string" &&
    isStringArray(session.deckValues) &&
    Array.isArray(session.issueKeys) &&
    session.issueKeys.every((key) => typeof key === "string") &&
    (typeof session.currentIssueKey === "string" ||
      session.currentIssueKey === null) &&
    (session.jql === undefined || typeof session.jql === "string")
  );
};

export const isProjectConfig = (value: unknown): value is ProjectConfig => {
  if (!isRecord(value)) {
    return false;
  }
  const config = value as Partial<ProjectConfig>;
  return (
    typeof config.projectKey === "string" &&
    typeof config.deckType === "string" &&
    (config.estimateFieldId === undefined ||
      typeof config.estimateFieldId === "string") &&
    (config.deckValues === undefined || isStringArray(config.deckValues)) &&
    (config.defaultJql === undefined ||
      typeof config.defaultJql === "string") &&
    (config.canEdit === undefined || typeof config.canEdit === "boolean")
  );
};
