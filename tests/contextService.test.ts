import { describe, expect, it, vi } from 'vitest';
import { ContextService } from '../src/services/contextService';
import { requireProjectAdmin as mockRequireProjectAdmin } from '../src/services/projectPermissions';

vi.mock('../src/services/projectPermissions', () => ({
  requireProjectAdmin: vi.fn().mockResolvedValue(undefined),
}));

const mockedRequireProjectAdmin = vi.mocked(mockRequireProjectAdmin);

describe('ContextService', () => {
  const baseRequest = {
    context: {
      accountId: 'user-1',
      extension: {
        project: {
          key: 'TEST',
        },
      },
    },
  };

  it('returns the account id and optional account id', () => {
    const ctx = new ContextService(baseRequest);
    expect(ctx.getAccountId()).toBe('user-1');
    expect(ctx.getOptionalAccountId()).toBe('user-1');
  });

  it('throws when account id missing', () => {
    const ctx = new ContextService({ context: { extension: { project: { key: 'ABC' } } } });
    expect(() => ctx.getAccountId()).toThrow(/authenticated Jira user/);
    expect(ctx.getOptionalAccountId()).toBeNull();
  });

  it('validates project keys', () => {
    const ctx = new ContextService(baseRequest);
    expect(ctx.assertProjectKey('TEST')).toBe('TEST');
    expect(() => ctx.assertProjectKey('OTHER')).toThrow(/Project mismatch/);
  });

  it('ensures session access', () => {
    const ctx = new ContextService(baseRequest);
    expect(ctx.ensureSessionAccess('TEST')).toBe('TEST');
    expect(() => ctx.ensureSessionAccess('OTHER')).toThrow(/Project mismatch/);
  });

  it('delegates requireProjectAdmin to permissions service', async () => {
    const ctx = new ContextService(baseRequest);
    await ctx.requireProjectAdmin();
    expect(mockedRequireProjectAdmin).toHaveBeenCalledWith('TEST');
  });
});
