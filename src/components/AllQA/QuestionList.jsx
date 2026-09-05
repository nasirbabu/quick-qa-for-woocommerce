import React from 'react';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatch(text, query) {
  const q = query.trim();
  if (!q || text == null) return text;
  const parts = String(text).split(new RegExp(`(${escapeRegExp(q)})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase()
      ? <mark key={i}>{part}</mark>
      : part
  );
}

function StatusPill({ status }) {
  const map = {
    pending:          ['pending',        'Pending'],
    'pending-answer': ['pending-answer', 'Review answer'],
    flagged:          ['flagged',        'Flagged'],
    'answer-flagged': ['flagged',        'Flagged'],
    answered:         ['answered',       'Answered'],
    rejected:         ['rejected',       'Rejected'],
  };
  const [cls, label] = map[status] || ['pending', status];
  return <span className={`qq-status-pill ${cls}`}>{label}</span>;
}

export default function QuestionList({ items, selectedId, onSelect, showAllBadge, selectedIds = [], onToggleSelect = () => {}, bulkMode = false, search = '' }) {
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
        const isSelected  = selectedIds.includes(item.id);
        const isActive    = selectedId === item.id && !bulkMode;
        // Total flags across the question itself and every answer (approved
        // ones accumulating flags below the threshold, plus any already
        // auto-hidden), so a moderator can see flags building up early.
        const flagBadgeCount = item.flagCount
          + item.answers.reduce((sum, a) => sum + (a.flagCount || 0), 0)
          + item.flaggedAnswers.reduce((sum, a) => sum + a.flagCount, 0);

        return (
          <div
            key={item.id}
            className={`qq-row${isActive ? ' active' : ''}${isSelected ? ' selected' : ''}`}
            onClick={() => bulkMode ? onToggleSelect(item.id) : onSelect(item.id)}
          >
            <div
              className={`qq-row-check${isSelected ? ' checked' : ''}`}
              onClick={e => { e.stopPropagation(); onToggleSelect(item.id); }}
            >
              {isSelected ? '✓' : ''}
            </div>
            <div className="qq-row-top">
              <span className="qq-row-name">{highlightMatch(displayName, search)}</span>
              <span className="qq-row-time">{item.time}</span>
            </div>
            <div className="qq-row-product">{highlightMatch(item.product, search)}</div>
            <div className="qq-row-q">{highlightMatch(displayText, search)}</div>
            <div className="qq-row-foot">
              <span>↑ {item.upvotes}</span>
              {flagBadgeCount > 0 && (
                <span className="qq-flag-tag">{flagBadgeCount} flag{flagBadgeCount !== 1 ? 's' : ''}</span>
              )}
              {showAllBadge && <StatusPill status={item.status} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
