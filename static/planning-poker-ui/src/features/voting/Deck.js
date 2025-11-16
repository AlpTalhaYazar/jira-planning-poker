import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Deck({ values, selectedValue, onSelect, disabled, isRevealed }) {
    return (_jsxs("section", { className: "deck-section", children: [_jsx("div", { className: "deck-header", children: _jsxs("div", { children: [_jsx("h3", { children: "Pick a card" }), _jsx("p", { children: isRevealed ? 'Votes are revealed – revote to change' : 'Your vote is private until reveal' })] }) }), _jsx("div", { className: "deck-grid", children: values.map((value) => {
                    const isSelected = selectedValue === value;
                    return (_jsx("button", { type: "button", className: `deck-card${isSelected ? ' selected' : ''}`, onClick: () => onSelect(value), disabled: disabled, children: value }, value));
                }) })] }));
}
