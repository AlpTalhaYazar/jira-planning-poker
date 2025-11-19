import { vi } from 'vitest';
import { createForgeApiMock } from './helpers/forge-api-mock';

const forgeApiMock = createForgeApiMock();

vi.mock('@forge/api', () => forgeApiMock);

type ForgeModuleWithTesting = typeof import('@forge/api') & { __testing: any };

const forgeModule = forgeApiMock.default as unknown as ForgeModuleWithTesting;

export const getForgeTestingApi = () => forgeModule.__testing;
