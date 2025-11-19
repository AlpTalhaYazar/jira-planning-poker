import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('realtime config validation', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('logs a warning and disables relay when secrets are missing', async () => {
    delete process.env.RELAY_API_KEY;
    delete process.env.RELAY_JWT_SECRET;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const realtime = await import('../src/api/realtime');
    expect(realtime.isRelayEnabled()).toBe(false);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Missing required realtime configuration: RELAY_API_KEY, RELAY_JWT_SECRET')
    );
  });

  it('reports enabled when relay secrets are configured', async () => {
    process.env.RELAY_API_KEY = 'test-key';
    process.env.RELAY_JWT_SECRET = 'test-secret';
    const realtime = await import('../src/api/realtime');
    expect(realtime.isRelayEnabled()).toBe(true);
  });
});
