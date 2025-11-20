import { storage } from "@forge/api";
import type { ProjectConfig } from "../types/domain";
import { logger } from "../utils/logger";
import { isProjectConfig } from "../utils/type-guards";

const configKey = (projectKey: string) => `project:${projectKey}:config`;

const defaultDeckValues = [
  "0",
  "0.5",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "20",
  "40",
  "100",
  "?",
  "☕",
];

const buildDefaultConfig = (projectKey: string): ProjectConfig => ({
  projectKey,
  deckType: "fibonacci",
  deckValues: defaultDeckValues,
});

export const getProjectConfig = async (
  projectKey: string
): Promise<ProjectConfig> => {
  const stored = await storage.get(configKey(projectKey));
  if (stored) {
    if (isProjectConfig(stored)) {
      return {
        projectKey: stored.projectKey ?? projectKey,
        estimateFieldId: stored.estimateFieldId,
        deckType: stored.deckType,
        deckValues: stored.deckValues ?? defaultDeckValues,
        defaultJql: stored.defaultJql,
        canEdit: stored.canEdit,
      };
    }
    logger.warn("Ignoring malformed project config", { projectKey });
  }
  return buildDefaultConfig(projectKey);
};

export const setProjectConfig = async (
  config: ProjectConfig
): Promise<ProjectConfig> => {
  const next: ProjectConfig = {
    projectKey: config.projectKey,
    estimateFieldId: config.estimateFieldId,
    deckType: config.deckType,
    deckValues: config.deckValues ?? defaultDeckValues,
    defaultJql: config.defaultJql,
    canEdit: config.canEdit,
  };
  await storage.set(configKey(config.projectKey), next);
  return next;
};
