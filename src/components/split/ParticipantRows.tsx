import React from 'react';
import { Participant, ParticipantShare } from '../../domain/split/types';
import { MotionButton } from '../motion/MotionButton';

interface ParticipantRowsProps {
  participants: Participant[];
  shares?: ParticipantShare[];
  currencySymbol: string;
  onUpdateName: (id: string, newName: string) => void;
  onAddParticipant: () => void;
  onRemoveParticipant: (id: string) => void;
  isReadOnly?: boolean;
}

export const ParticipantRows: React.FC<ParticipantRowsProps> = ({
  participants,
  shares,
  currencySymbol,
  onUpdateName,
  onAddParticipant,
  onRemoveParticipant,
  isReadOnly = false
}) => {
  const canRemove = participants.length > 2;

  // Build a lookup for calculated shares if provided
  const shareMap = new Map<string, ParticipantShare>();
  if (shares) {
    for (const s of shares) {
      shareMap.set(s.participantId, s);
    }
  }

  return (
    <div className="participant-rows-container">
      <div className="participants-list">
        {participants.map((p, idx) => {
          const share = shareMap.get(p.id);

          return (
            <div
              key={p.id}
              className={`participant-row ${p.isCurrentUser ? 'current-user-row' : ''}`}
            >
              {/* Left: Participant Name / Badge */}
              <div className="participant-info">
                <span className="participant-index">{idx + 1}</span>

                {p.isCurrentUser ? (
                  <div className="participant-current-user-box">
                    <span className="participant-name-static">You</span>
                    <span className="participant-self-badge">Your Share</span>
                  </div>
                ) : isReadOnly ? (
                  <span className="participant-name-static">{p.name}</span>
                ) : (
                  <input
                    type="text"
                    className="participant-name-input"
                    value={p.name}
                    placeholder={`Person ${idx + 1}`}
                    maxLength={30}
                    onChange={(e) => onUpdateName(p.id, e.target.value)}
                  />
                )}
              </div>

              {/* Right: Calculated share or Remove action */}
              <div className="participant-meta-actions">
                {share && (
                  <div className="participant-calculated-share">
                    <span className="share-percentage">{share.percentage}%</span>
                    <span className="share-amount tabular-nums">
                      {currencySymbol}{share.amount.toFixed(2)}
                    </span>
                  </div>
                )}

                {!p.isCurrentUser && !isReadOnly && (
                  <button
                    type="button"
                    className="btn-remove-participant"
                    onClick={() => onRemoveParticipant(p.id)}
                    disabled={!canRemove}
                    aria-label={`Remove ${p.name}`}
                    title={!canRemove ? 'Minimum 2 participants required' : `Remove ${p.name}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Person Action */}
      {!isReadOnly && (
        <MotionButton
          type="button"
          className="btn-add-person"
          onClick={onAddParticipant}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add person</span>
        </MotionButton>
      )}
    </div>
  );
};
