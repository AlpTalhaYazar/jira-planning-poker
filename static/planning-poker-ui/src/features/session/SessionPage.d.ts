import type { ProjectConfig, SessionWithParticipants } from '../../types/poker';
interface SessionPageProps {
    data: SessionWithParticipants;
    onBack: () => void;
    onSessionData: (data: SessionWithParticipants) => void;
    viewerAccountId?: string;
    projectConfig?: ProjectConfig | null;
    onDebugEvent: (entry: {
        direction: 'incoming' | 'outgoing';
        event: string;
        payload: unknown;
    }) => void;
}
export default function SessionPage({ data, onBack, onSessionData, viewerAccountId, projectConfig, onDebugEvent }: SessionPageProps): import("react/jsx-runtime").JSX.Element;
export {};
