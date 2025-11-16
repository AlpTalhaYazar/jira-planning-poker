import { storage } from '@forge/api';
import type { ProjectConfig } from '../types/domain';

const configKey = (projectKey: string) => `project:${projectKey}:config`;

const defaultDeckValues = ['0', '0.5', '1', '2', '3', '5', '8', '13', '20', '40', '100', '?', '☕'];

export const getProjectConfig = async (projectKey: string): Promise<ProjectConfig> => {
  const stored = (await storage.get(configKey(projectKey))) as ProjectConfig | undefined;
  if (stored) {
    return stored;
  }
  return {
    projectKey,
    deckType: 'fibonacci',
    deckValues: defaultDeckValues,
  };
};

export const setProjectConfig = async (config: ProjectConfig): Promise<ProjectConfig> => {
  const next: ProjectConfig = {
    projectKey: config.projectKey,
    estimateFieldId: config.estimateFieldId,
    deckType: config.deckType,
    deckValues: config.deckValues ?? defaultDeckValues,
    defaultJql: config.defaultJql,
  };
  await storage.set(configKey(config.projectKey), next);
  return next;
};
