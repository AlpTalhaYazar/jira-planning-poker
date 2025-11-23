import type { Issue } from "../types/poker";
interface IssuePanelProps {
    issue: Issue | undefined;
    index: number;
    total: number;
    onPrevious: () => void;
    onNext: () => void;
    onReveal: () => void;
    onResetVotes: () => void;
    onAdvanceIssue: () => void;
    isRevealed: boolean;
    disableReveal: boolean;
    disableNext: boolean;
    isLoading?: boolean;
    canControl: boolean;
    isBusy?: boolean;
}
export declare function IssuePanel({ issue, index, total, onPrevious, onNext, onReveal, onResetVotes, onAdvanceIssue, isRevealed, disableReveal, disableNext, isLoading, canControl, isBusy, }: IssuePanelProps): import("react/jsx-runtime").JSX.Element;
export default IssuePanel;
