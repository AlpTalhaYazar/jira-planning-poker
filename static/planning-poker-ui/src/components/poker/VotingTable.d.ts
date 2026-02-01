interface Participant {
    id: string;
    name: string;
    avatar: string;
    accountId: string;
    connectionStatus?: 'online' | 'away' | 'offline';
}
interface VotingTableProps {
    votes: Record<string, string>;
    isRevealed: boolean;
    onReveal: () => void;
    finalEstimate: string | null;
    onSubmitEstimate: (val: string) => void;
    participants?: Participant[];
    isModerator?: boolean;
}
export declare function VotingTable({ votes, isRevealed, onReveal, finalEstimate, onSubmitEstimate, participants, isModerator }: VotingTableProps): import("react/jsx-runtime").JSX.Element;
export {};
