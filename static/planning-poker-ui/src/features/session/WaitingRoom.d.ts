import type { SessionWithParticipants } from "../../types/poker";
interface WaitingRoomProps {
    data: SessionWithParticipants;
    viewerAccountId?: string;
    onSessionUpdate: (data: SessionWithParticipants) => void;
}
export default function WaitingRoom({ data, viewerAccountId, onSessionUpdate, }: WaitingRoomProps): import("react/jsx-runtime").JSX.Element;
export {};
