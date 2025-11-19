import api from '@forge/api';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

const DEFAULT_BASE_URL = 'https://relay.alptalha.dev';
const TOKEN_TTL_SECONDS = Number(process.env.RELAY_TOKEN_TTL ?? 300);

const relayBaseUrl = () => process.env.RELAY_BASE_URL?.replace(/\/$/, '') || DEFAULT_BASE_URL;

const relayApiKey = process.env.RELAY_API_KEY;
const relayJwtSecret = process.env.RELAY_JWT_SECRET;
let relayConfigChecked = false;
let relayConfigValid = false;

export interface RelayEvent {
  sessionId: string;
  event: string;
  payload?: unknown;
  timestamp?: string;
}

const validateRelayConfig = () => {
  if (relayConfigChecked) {
    return relayConfigValid;
  }
  relayConfigChecked = true;
  const missing: string[] = [];
  if (!relayApiKey) {
    missing.push('RELAY_API_KEY');
  }
  if (!relayJwtSecret) {
    missing.push('RELAY_JWT_SECRET');
  }
  relayConfigValid = missing.length === 0;
  if (!relayConfigValid) {
    console.warn(`[Realtime] Missing required realtime configuration: ${missing.join(', ')}. Relay features disabled.`);
  }
  return relayConfigValid;
};

export const isRelayEnabled = () => validateRelayConfig();

export const generateRelayToken = (sessionId: string, accountId: string) => {
  if (!validateRelayConfig() || !relayJwtSecret) {
    throw new Error('Realtime relay is not configured');
  }
  const expiresIn = TOKEN_TTL_SECONDS;
  const token = jwt.sign(
    {
      sub: accountId,
      sessionId,
      scope: ['subscribe'],
    },
    relayJwtSecret,
    {
      expiresIn,
      issuer: 'jira-planning-poker',
      audience: 'planning-poker-relay',
    }
  );
  return {
    token,
    relayUrl: relayBaseUrl(),
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
};

export const publishRelayEvent = async (event: RelayEvent) => {
  if (!validateRelayConfig() || !relayApiKey) {
    return;
  }
  try {
    const response = await api.fetch(`${relayBaseUrl()}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${relayApiKey}`,
        'X-Relay-Nonce': randomUUID(),
      },
      body: JSON.stringify({
        ...event,
        timestamp: event.timestamp ?? new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.warn(`Failed to publish relay event (${response.status}): ${text}`);
    }
  } catch (err) {
    console.warn('Failed to reach relay service', err);
  }
};
