import type { SessionDefinition } from '../../types/poker';
interface SessionPageProps {
    session: SessionDefinition;
    onBack: () => void;
}
export default function SessionPage({ session, onBack }: SessionPageProps): import("react/jsx-runtime").JSX.Element;
export {};
