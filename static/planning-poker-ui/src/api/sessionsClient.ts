import { invoke } from '@forge/bridge';
import type { Issue } from '../types/poker';

export interface GetIssuesRequest {
  projectKey?: string;
  jql?: string;
  maxResults?: number;
}

export async function fetchIssuesForProject(params: GetIssuesRequest): Promise<Issue[]> {
  const response = await invoke<Issue[]>('getIssuesForProject', params);
  return response;
}
