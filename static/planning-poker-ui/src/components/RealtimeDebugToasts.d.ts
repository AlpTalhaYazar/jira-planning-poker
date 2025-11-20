import type { DebugEvent } from "../hooks/useDebugEvents";
interface RealtimeDebugToastsProps {
  events: DebugEvent[];
}
export default function RealtimeDebugToasts({
  events,
}: RealtimeDebugToastsProps): import("react/jsx-runtime").JSX.Element | null;
export {};
