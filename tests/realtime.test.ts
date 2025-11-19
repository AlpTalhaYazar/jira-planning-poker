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
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Missing required realtime configuration'));
  });

  it('reports enabled when relay secrets are configured', async () => {
    process.env.RELAY_API_KEY = 'test-key';
    process.env.RELAY_JWT_SECRET = 'test-secret';
    process.env.RELAY_BASE_URL = 'https://relay.example.com';
    const realtime = await import('../src/api/realtime');
    expect(realtime.isRelayEnabled()).toBe(true);
  });

  it('requires a relay base URL', async () => {
    process.env.RELAY_API_KEY = 'test-key';
    process.env.RELAY_JWT_SECRET = 'test-secret';
    delete process.env.RELAY_BASE_URL;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const realtime = await import('../src/api/realtime');
    expect(realtime.isRelayEnabled()).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Missing required realtime configuration'));
  });
});
