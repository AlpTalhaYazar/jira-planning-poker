import { beforeEach, describe, expect, it } from 'vitest';
import { getForgeTestingApi } from './setup';

const testingApi = getForgeTestingApi();

describe('project permissions service', () => {
  beforeEach(() => {
    testingApi.reset();
  });

  it('returns true when user has admin permission', async () => {
    testingApi.onUserRequest('/rest/api/3/mypermissions?projectKey=ADM', async () =>
      Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          append() {},
          delete() {},
          get: () => null,
          has: () => false,
          set() {},
          forEach() {},
        },
        json: async () => ({
          permissions: {
            PROJECT_ADMIN: { havePermission: true },
          },
        }),
        text: async () => '',
        arrayBuffer: async () => new ArrayBuffer(0),
      })
    );

    const { canEditProjectConfig } = await import('../src/services/projectPermissions');
    await expect(canEditProjectConfig('ADM')).resolves.toBe(true);
  });
});
