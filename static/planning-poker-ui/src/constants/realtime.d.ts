/**
 * Realtime connection configuration constants
 */
/** Time before token expiry to trigger refresh (in milliseconds) */
export declare const TOKEN_REFRESH_BUFFER_MS = 15000;
/** Retry delay after connection error (in milliseconds) */
export declare const CONNECTION_RETRY_DELAY_MS = 5000;
/** Polling interval when realtime is disabled or in error state (in milliseconds) */
export declare const POLLING_INTERVAL_MS = 4000;
/** Maximum polling interval during backoff (in milliseconds) */
export declare const MAX_POLLING_INTERVAL_MS = 30000;
