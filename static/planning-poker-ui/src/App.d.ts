type SessionStatus = "waiting" | "active" | "closed" | "completed";
export type SessionSummary = {
    id: string;
    name: string;
    deck: string;
    created: string;
    status: SessionStatus;
    currentIssueKey?: string | null;
    autoReveal?: boolean;
    allowChangeVote?: boolean;
    timerEnabled?: boolean;
    timerSeconds?: number;
    jql?: string;
};
export type AppState = "home" | "waiting" | "active";
export default function App(): import("react/jsx-runtime").JSX.Element;
export {};
