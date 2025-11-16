import type { Participant } from '../types/poker';
interface ParticipantsListProps {
    participants: Participant[];
    votes: Record<string, string | null>;
    isRevealed: boolean;
}
export declare function ParticipantsList({ participants, votes, isRevealed }: ParticipantsListProps): import("react/jsx-runtime").JSX.Element;
export default ParticipantsList;
