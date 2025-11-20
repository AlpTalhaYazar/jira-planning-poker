import { act, renderHook, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useRealtimeSession } from "./useRealtimeSession";
import { getRealtimeToken } from "../api/sessionsClient";
vi.mock("../api/sessionsClient", () => ({
  getRealtimeToken: vi.fn().mockResolvedValue({
    token: "test-token",
    relayUrl: "https://relay.example.com",
    expiresAt: null,
  }),
}));
const createSocketMock = () => {
  const listeners = new Map();
  const anyListeners = [];
  const socket = {
    on: vi.fn((event, callback) => {
      const existing = listeners.get(event) ?? [];
      listeners.set(event, [...existing, callback]);
      return socket;
    }),
    onAny: vi.fn((callback) => {
      anyListeners.push(callback);
      return socket;
    }),
    removeAllListeners: vi.fn(() => {
      listeners.clear();
      anyListeners.length = 0;
    }),
    disconnect: vi.fn(),
    emit(event, payload) {
      (listeners.get(event) ?? []).forEach((handler) => handler(payload));
      anyListeners.forEach((handler) => handler(event, payload));
    },
  };
  return socket;
};
const socketMock = createSocketMock();
vi.mock("socket.io-client", () => {
  return {
    io: vi.fn(() => socketMock),
  };
});
describe("useRealtimeSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketMock.removeAllListeners();
  });
  it("emits each session event only once", async () => {
    const onSessionEvent = vi.fn();
    const onSocketEvent = vi.fn();
    renderHook(() =>
      useRealtimeSession({
        sessionId: "SESSION-1",
        onSessionEvent,
        onSocketEvent,
      })
    );
    await waitFor(() => expect(getRealtimeToken).toHaveBeenCalled());
    act(() => {
      socketMock.emit("session:event", {
        sessionId: "SESSION-1",
        event: "session:event",
      });
    });
    expect(onSessionEvent).toHaveBeenCalledTimes(1);
    expect(onSessionEvent).toHaveBeenCalledWith({
      sessionId: "SESSION-1",
      event: "session:event",
    });
    expect(onSocketEvent).toHaveBeenCalledTimes(1);
  });
});
