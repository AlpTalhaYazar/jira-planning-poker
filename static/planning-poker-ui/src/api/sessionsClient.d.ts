import type { Issue } from '../types/poker';
export interface GetIssuesRequest {
    projectKey?: string;
    jql?: string;
    maxResults?: number;
}
export declare function fetchIssuesForProject(params: GetIssuesRequest): Promise<Issue[]>;
