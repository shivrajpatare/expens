import React from 'react';

export interface DemoStateOption {
  id: string;
  label: string;
  spent: number;
  description: string;
}

interface TodayStateSelectorProps {
  options: DemoStateOption[];
  selectedId: string;
  onSelect: (option: DemoStateOption) => void;
}

export const TodayStateSelector: React.FC<TodayStateSelectorProps> = ({
  options,
  selectedId,
  onSelect
}) => {
  return (
    <div className="demo-states-card" aria-label="Verification State Demonstrator">
      <div className="demo-states-header">
        <span>State Verification (Phase 3 Demo)</span>
      </div>

      <div className="demo-states-pills" role="tablist">
        {options.map((opt) => {
          const isSelected = opt.id === selectedId;
          return (
            <button
              key={opt.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`demo-pill ${isSelected ? 'active' : ''}`}
              onClick={() => onSelect(opt)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
