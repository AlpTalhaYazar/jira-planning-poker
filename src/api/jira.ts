import api, { route } from "@forge/api";
import type { Issue, ApplyEstimateInput } from "../types/domain";

interface GetIssuesParams {
  projectKey: string;
  jql?: string;
  maxResults?: number;
  estimateFieldId?: string;
}

interface JiraSearchResponse {
  issues: Array<{
    key: string;
    self?: string;
    fields: {
      summary?: string;
      status?: {
        name?: string;
      };
      [key: string]: unknown;
    };
  }>;
}

interface JiraIssueResponse {
  key: string;
  self?: string;
  fields: {
    summary?: string;
    status?: { name?: string };
    issuetype?: { name?: string };
    assignee?: { displayName?: string };
    description?: unknown;
    [key: string]: unknown;
  };
}

const DEFAULT_MAX_RESULTS = 20;

export const getIssuesForProject = async ({
  projectKey,
  jql,
  maxResults,
  estimateFieldId,
}: GetIssuesParams): Promise<Issue[]> => {
  const effectiveMax = Math.min(
    Math.max(maxResults ?? DEFAULT_MAX_RESULTS, 1),
    100
  );
  const effectiveJql =
    jql ??
    (projectKey
      ? `project = "${projectKey}" AND statusCategory != Done ORDER BY updated DESC`
      : "ORDER BY updated DESC");

  const fields = Array.from(
    new Set([
      "summary",
      "status",
      ...(estimateFieldId ? [estimateFieldId] : []),
      ...estimateFieldCandidates,
    ])
  );

  const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jql: effectiveJql,
      maxResults: effectiveMax,
      fields,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to search Jira issues (${response.status}): ${text}`
    );
  }

  const data = (await response.json()) as JiraSearchResponse;

  return data.issues.map((issue) => ({
    key: issue.key,
    summary: issue.fields.summary ?? "No summary",
    status: issue.fields.status?.name ?? "Unknown",
    estimate: extractEstimate(issue.fields, estimateFieldId),
    link: buildIssueLink(issue),
  }));
};

export const getIssue = async (issueKey: string): Promise<Issue> => {
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/issue/${issueKey}?fields=summary,status,issuetype,assignee,description`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch issue ${issueKey} (${response.status}): ${text}`);
  }

  const issue = (await response.json()) as JiraIssueResponse;

  return {
    key: issue.key,
    summary: issue.fields.summary ?? "No summary",
    status: issue.fields.status?.name ?? "Unknown",
    estimate: extractEstimate(issue.fields),
    type: issue.fields.issuetype?.name,
    assignee: issue.fields.assignee?.displayName,
    description: extractDescription(issue.fields.description),
    link: buildIssueLink(issue),
  };
};

const estimateFieldCandidates = ["customfield_10016", "customfield_10002"];

const extractEstimate = (
  fields: Record<string, unknown>,
  preferredFieldId?: string
): string | undefined => {
  const candidates = preferredFieldId
    ? [preferredFieldId, ...estimateFieldCandidates]
    : estimateFieldCandidates;
  for (const candidate of candidates) {
    const value = fields[candidate];
    if (typeof value === "number" || typeof value === "string") {
      return String(value);
    }
  }
  return undefined;
};

type DescriptionNode = {
  text?: string;
  content?: DescriptionNode[];
};

const extractDescription = (rawDescription: unknown): string | undefined => {
  if (!rawDescription) {
    return undefined;
  }
  if (typeof rawDescription === "string") {
    return rawDescription;
  }

  const textParts: string[] = [];
  const walk = (nodes: DescriptionNode[]) => {
    nodes.forEach((node) => {
      if (!node) {
        return;
      }
      if (typeof node.text === "string") {
        textParts.push(node.text);
      }
      if (Array.isArray(node.content)) {
        walk(node.content);
      }
    });
  };

  const doc = rawDescription as { content?: DescriptionNode[] };
  if (Array.isArray(doc.content)) {
    walk(doc.content);
  }

  const flattened = textParts.join(" ").trim();
  return flattened || undefined;
};

const buildIssueLink = (issue: {
  key: string;
  self?: string;
}): string | undefined => {
  if (!issue.self) {
    return undefined;
  }
  try {
    const url = new URL(issue.self);
    return `${url.origin}/browse/${issue.key}`;
  } catch {
    return undefined;
  }
};

export const applyEstimate = async (
  { sessionId, issueKey, value }: ApplyEstimateInput,
  fieldId: string
) => {
  const response = await api
    .asUser()
    .requestJira(route`/rest/api/3/issue/${issueKey}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          [fieldId]: Number.isFinite(Number(value)) ? Number(value) : value,
        },
      }),
    });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to apply estimate (${response.status}) ${text}`);
  }

  return {
    sessionId,
    issueKey,
    value,
  };
};


interface JiraUserResponse {
  accountId: string;
  displayName?: string;
  avatarUrls?: Record<string, string>;
}

export const fetchCurrentUserProfile = async (): Promise<{
  accountId: string;
  displayName: string;
  avatarUrl: string;
}> => {
  const response = await api.asUser().requestJira(route`/rest/api/3/myself`);
  if (!response.ok) {
    throw new Error(
      `Failed to resolve current user profile (${response.status})`
    );
  }
  const data = (await response.json()) as JiraUserResponse;
  if (!data.accountId) {
    throw new Error("Current user profile missing accountId");
  }
  return {
    accountId: data.accountId,
    displayName: data.displayName ?? "Unknown teammate",
    avatarUrl: data.avatarUrls?.["48x48"] ?? "",
  };
};
