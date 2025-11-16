interface DeckProps {
    values: string[];
    selectedValue: string | null;
    onSelect: (value: string) => void;
    disabled?: boolean;
    isRevealed: boolean;
}
export default function Deck({ values, selectedValue, onSelect, disabled, isRevealed }: DeckProps): import("react/jsx-runtime").JSX.Element;
export {};
