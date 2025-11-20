import api, { route } from "@forge/api";

interface PermissionResponse {
  permissions?: Record<
    string,
    {
      havePermission?: boolean;
    }
  >;
}

const PERMISSION_KEYS = ["ADMINISTER_PROJECTS"];

const fetchPermissions = async (
  projectKey: string
): Promise<PermissionResponse> => {
  const response = await api
    .asUser()
    .requestJira(
      route`/rest/api/3/mypermissions?projectKey=${projectKey}&permissions=${PERMISSION_KEYS.join(
        ","
      )}`
    );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Unable to verify Jira permissions (${response.status}): ${text}`
    );
  }
  return (await response.json()) as PermissionResponse;
};

export const canEditProjectConfig = async (
  projectKey: string
): Promise<boolean> => {
  const data = await fetchPermissions(projectKey);
  return PERMISSION_KEYS.some((key) => data.permissions?.[key]?.havePermission);
};

export const requireProjectAdmin = async (
  projectKey: string
): Promise<void> => {
  const allowed = await canEditProjectConfig(projectKey);
  if (!allowed) {
    throw new Error(
      "You must be a project admin to manage Planning Poker configuration."
    );
  }
};
