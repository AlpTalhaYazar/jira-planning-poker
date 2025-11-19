import { cleanupExpiredSessions } from './tasks/cleanupSessions';

export const handler = async () => {
  await cleanupExpiredSessions();
  return { ok: true };
};
