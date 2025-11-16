import { invoke } from '@forge/bridge';
export async function fetchIssuesForProject(params) {
    const response = await invoke('getIssuesForProject', params);
    return response;
}
