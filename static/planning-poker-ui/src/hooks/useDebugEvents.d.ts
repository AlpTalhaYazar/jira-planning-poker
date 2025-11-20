export interface DebugEvent {
  id: string;
  timestamp: string;
  direction: "incoming" | "outgoing";
  event: string;
  payload: unknown;
}
export declare const useDebugEvents: () => {
  events: DebugEvent[];
  pushEvent: (event: Omit<DebugEvent, "id" | "timestamp">) => void;
};
