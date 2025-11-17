import type { ProjectConfig, SessionWithParticipants } from '../../types/poker';
interface SessionPageProps {
    data: SessionWithParticipants;
    onBack: () => void;
    onSessionData: (data: SessionWithParticipants) => void;
    viewerAccountId?: string;
    projectConfig?: ProjectConfig | null;
}
export default function SessionPage({ data, onBack, onSessionData, viewerAccountId, projectConfig }: SessionPageProps): import("react/jsx-runtime").JSX.Element;
export {};
