interface IssuePanelProps {
    issue: any;
    current: number;
    total: number;
    onNext: () => void;
    onPrev: () => void;
}
export declare function IssuePanel({ issue, current, total, onNext, onPrev }: IssuePanelProps): import("react/jsx-runtime").JSX.Element;
export {};
