interface DeckProps {
  values: string[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  disabled?: boolean;
  isRevealed: boolean;
}

export default function Deck({ values, selectedValue, onSelect, disabled, isRevealed }: DeckProps) {
  return (
    <section className="deck-section">
      <div className="deck-header">
        <div>
          <h3>Pick a card</h3>
          <p>{isRevealed ? 'Votes are revealed – revote to change' : 'Your vote is private until reveal'}</p>
        </div>
      </div>
      <div className="deck-grid">
        {values.map((value) => {
          const isSelected = selectedValue === value;
          return (
            <button
              key={value}
              type="button"
              className={`deck-card${isSelected ? ' selected' : ''}`}
              onClick={() => onSelect(value)}
              disabled={disabled}
            >
              {value}
            </button>
          );
        })}
      </div>
    </section>
  );
}
