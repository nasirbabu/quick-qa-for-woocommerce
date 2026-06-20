import React from 'react';

function StatusPill({ status }) {
  const map = {
    pending:          ['pending',        'Pending'],
    'pending-answer': ['pending-answer', 'Review answer'],
    answered:         ['answered',       'Answered'],
    rejected:         ['rejected',       'Rejected'],
  };
  const [cls, label] = map[status] || ['pending', status];
  return <span className={`qq-status-pill ${cls}`}>{label}</span>;
}

export default function QuestionList({ items, selectedId, onSelect, showAllBadge }) {
  if (items.length === 0) {
    return (
      <div className="qq-queue-list">
        <div className="qq-empty-queue">
          <div className="qq-empty-title">Nothing here</div>
          <div className="qq-empty-desc">No questions match this filter.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="qq-queue-list">
      {items.map(item => {
        const isPendingAnswer = item.tab === 'pending-a';
        const displayName = isPendingAnswer && item.pendingAnswer ? item.pendingAnswer.author : item.customer;
        const displayText = isPendingAnswer && item.pendingAnswer ? item.pendingAnswer.text : item.text;

        return (
          <div
            key={item.id}
            className={`qq-row ${selectedId === item.id ? 'active' : ''}`}
            onClick={() => onSelect(item.id)}
          >
            <div className="qq-row-top">
              <span className="qq-row-name">{displayName}</span>
              <span className="qq-row-time">{item.time}</span>
            </div>
            <div className="qq-row-product">{item.product}</div>
            <div className="qq-row-q">{displayText}</div>
            <div className="qq-row-foot">
              <span>↑ {item.upvotes}</span>
              {showAllBadge && <StatusPill status={item.status} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
