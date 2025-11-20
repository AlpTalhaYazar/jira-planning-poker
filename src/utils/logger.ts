type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  payload?: unknown;
}

const log = (level: LogLevel, message: string, payload?: unknown) => {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    ...(payload !== undefined ? { payload: normalizePayload(payload) } : {}),
  };

  const serialized = safeStringify(entry);
  switch (level) {
    case "debug":
      console.debug(serialized);
      break;
    case "info":
      console.info(serialized);
      break;
    case "warn":
      console.warn(serialized);
      break;
    case "error":
    default:
      console.error(serialized);
      break;
  }
};

const normalizePayload = (payload: unknown): unknown => {
  if (payload instanceof Error) {
    return {
      name: payload.name,
      message: payload.message,
      stack: payload.stack,
    };
  }
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch {
    return { summary: String(payload) };
  }
};

const safeStringify = (entry: LogEntry): string => {
  try {
    return JSON.stringify(entry);
  } catch {
    return JSON.stringify({
      level: entry.level,
      timestamp: entry.timestamp,
      message: `${entry.message} (payload serialization failed)`,
    });
  }
};

export const logger = {
  debug: (message: string, payload?: unknown) => log("debug", message, payload),
  info: (message: string, payload?: unknown) => log("info", message, payload),
  warn: (message: string, payload?: unknown) => log("warn", message, payload),
  error: (message: string, payload?: unknown) => log("error", message, payload),
};
