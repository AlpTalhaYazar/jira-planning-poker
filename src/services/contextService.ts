import { assertProjectContext, getContextProjectKey } from '../utils/context';
import { requireProjectAdmin } from './projectPermissions';

export class ContextService {
  constructor(private readonly req: any) {}

  getAccountId(): string {
    const accountId = this.req.context?.accountId;
    if (!accountId) {
      throw new Error('This action requires an authenticated Jira user.');
    }
    return accountId;
  }

  getOptionalAccountId(): string | null {
    return this.req.context?.accountId ?? null;
  }

  getProjectKey(): string {
    return getContextProjectKey(this.req);
  }

  assertProjectKey(projectKey?: string): string {
    return assertProjectContext(this.req, projectKey);
  }

  ensureSessionAccess(projectKey: string): string {
    return assertProjectContext(this.req, projectKey);
  }

  async requireProjectAdmin(projectKey?: string): Promise<void> {
    const key = projectKey ?? this.getProjectKey();
    await requireProjectAdmin(key);
  }
}
