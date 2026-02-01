interface VotingDeckProps {
    options: string[];
    selectedValue?: string;
    onSelect: (value: string) => void;
    onRetract?: () => void;
    disabled?: boolean;
}
export declare function VotingDeck({ options, selectedValue, onSelect, onRetract, disabled }: VotingDeckProps): import("react/jsx-runtime").JSX.Element;
export {};
