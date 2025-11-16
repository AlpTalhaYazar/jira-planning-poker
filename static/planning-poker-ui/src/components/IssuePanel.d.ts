import type { Issue } from '../types/poker';
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
}
export declare function IssuePanel({ issue, index, total, onPrevious, onNext, onReveal, onResetVotes, onAdvanceIssue, isRevealed, disableReveal, disableNext, isLoading, }: IssuePanelProps): import("react/jsx-runtime").JSX.Element;
export default IssuePanel;
