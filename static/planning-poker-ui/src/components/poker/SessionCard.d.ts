interface SessionCardProps {
    session: {
        id: string;
        name: string;
        deck: string;
        created: string;
        status: 'waiting' | 'active' | 'closed' | 'completed';
    };
    onJoin: () => void;
}
export declare function SessionCard({ session, onJoin }: SessionCardProps): import("react/jsx-runtime").JSX.Element;
export {};
