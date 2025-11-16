import type { SessionWithParticipants } from '../../types/poker';
interface SessionPageProps {
    data: SessionWithParticipants;
    onBack: () => void;
    onSessionData: (data: SessionWithParticipants) => void;
    viewerAccountId?: string;
}
export default function SessionPage({ data, onBack, onSessionData, viewerAccountId }: SessionPageProps): import("react/jsx-runtime").JSX.Element;
export {};
