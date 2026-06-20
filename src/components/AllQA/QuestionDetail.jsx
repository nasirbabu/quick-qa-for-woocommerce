import React, { useState } from 'react';

function Avatar({ initials, role }) {
  const cls = role === 'staff' ? 'qq-av staff'
    : role === 'verified-buyer' ? 'qq-av verified'
    : 'qq-av';
  return <div className={cls}>{initials}</div>;
}

function RoleBadge({ role }) {
  if (role === 'staff')          return <span className="qq-msg-role-staff">Store team</span>;
  if (role === 'verified-buyer') return <span className="qq-msg-role-buyer">Verified buyer</span>;
  if (role === 'community')      return <span className="qq-msg-role">Community</span>;
  if (role === 'guest')          return <span className="qq-msg-role">Guest</span>;
  return <span className="qq-msg-role">Customer</span>;
}

// ── Pending question (needs approval) ────────────────────────────────────────

function PendingQuestionDetail({ item, onApprove, onApproveAndAnswer, onReject, saving }) {
  const [reply, setReply] = useState('');
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">Question about <b>{item.product}</b></div>
          <div className="qq-conv-status">
            Pending review · {item.upvotes} upvote{item.upvotes !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="qq-conv-meta-actions">
          <span>View product</span>
        </div>
      </div>

      <div className="qq-conv-body">
        <div className="qq-msg">
          <Avatar initials={item.avatar} role={item.role} />
          <div className="qq-msg-body">
            <div className="qq-msg-meta">
              <b>{item.customer}</b>
              <RoleBadge role={item.role} />
              <span>· {item.time}</span>
            </div>
            <div className="qq-msg-text">{item.text}</div>
            <div className="qq-msg-foot">
              <span>↑ {item.upvotes} upvotes</span>
            </div>
          </div>
        </div>

        <div className="qq-section-divider">Optional: write a reply</div>
      </div>

      <div className="qq-composer">
        <div className="qq-composer-card">
          <textarea
            className="qq-textarea"
            placeholder="Write an answer to publish alongside approval…"
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <div className="qq-bar">
            <div className="qq-bar-left" />
            <div className="qq-bar-right">
              <button
                className="btn btn-danger-ghost btn-sm"
                onClick={onReject}
                disabled={saving}
              >
                Reject
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onApprove}
                disabled={saving}
              >
                Approve
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onApproveAndAnswer(reply)}
                disabled={!reply.trim() || saving}
              >
                Approve &amp; answer
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Pending answer (community answer awaiting review) ─────────────────────────

function PendingAnswerDetail({ item, onApprove, onReject, saving }) {
  const pa = item.pendingAnswer;
  if (!pa) return null;
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">Question about <b>{item.product}</b></div>
          <div className="qq-conv-status">Community answer pending review</div>
        </div>
        <div className="qq-conv-meta-actions">
          <span>View product</span>
        </div>
      </div>

      <div className="qq-conv-body">
        <div className="qq-msg" style={{ opacity: 0.7 }}>
          <Avatar initials={item.avatar} role={item.role} />
          <div className="qq-msg-body">
            <div className="qq-msg-meta">
              <b>{item.customer}</b>
              <RoleBadge role={item.role} />
              <span>· {item.time}</span>
            </div>
            <div className="qq-msg-text">{item.text}</div>
          </div>
        </div>

        {item.answers.length > 0 && (
          <>
            <div className="qq-thread-divider">
              {item.answers.length} approved answer{item.answers.length !== 1 ? 's' : ''}
            </div>
            {item.answers.map(ans => (
              <div key={ans.id} className="qq-msg">
                <Avatar initials={ans.avatar} role={ans.role} />
                <div className="qq-msg-body">
                  <div className="qq-msg-meta">
                    <b>{ans.author}</b>
                    <RoleBadge role={ans.role} />
                    <span>· {ans.time}</span>
                  </div>
                  <div className="qq-msg-text">{ans.text}</div>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="qq-thread-divider">Pending answer</div>

        <div className="qq-pending-card">
          <div className="qq-msg-meta" style={{ marginBottom: 10 }}>
            <b>{pa.author}</b>
            <RoleBadge role={pa.role} />
            <span>· {pa.time}</span>
          </div>
          <div className="qq-pending-text">{pa.text}</div>
          <div className="qq-pending-meta">
            {pa.meta.map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>
      </div>

      <div className="qq-action-bar">
        <div className="qq-action-row">
          <div className="qq-action-info">
            Review this community answer before it goes public.
          </div>
          <div className="qq-action-buttons">
            <button
              className="btn btn-danger-ghost btn-sm"
              onClick={onReject}
              disabled={saving}
            >
              Reject
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={onApprove}
              disabled={saving}
            >
              Approve &amp; publish
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Answered / approved question ─────────────────────────────────────────────

function AnsweredDetail({ item, onPublish, saving }) {
  const [reply, setReply] = useState('');

  function handleSubmit() {
    if (!reply.trim()) return;
    onPublish(reply);
    setReply('');
  }

  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">Question about <b>{item.product}</b></div>
          <div className="qq-conv-status" style={{ color: 'var(--green)' }}>
            {item.answers.length > 0
              ? `Answered · ${item.answers.length} answer${item.answers.length !== 1 ? 's' : ''}`
              : 'Approved · no answers yet'}
          </div>
        </div>
        <div className="qq-conv-meta-actions">
          <span>View on product page</span>
        </div>
      </div>

      <div className="qq-conv-body">
        <div className="qq-msg" style={{ opacity: 0.7 }}>
          <Avatar initials={item.avatar} role={item.role} />
          <div className="qq-msg-body">
            <div className="qq-msg-meta">
              <b>{item.customer}</b>
              <RoleBadge role={item.role} />
              <span>· {item.time}</span>
            </div>
            <div className="qq-msg-text">{item.text}</div>
          </div>
        </div>

        {item.answers.length > 0 ? (
          <>
            <div className="qq-section-divider">
              {item.answers.length} answer{item.answers.length !== 1 ? 's' : ''}
            </div>
            {item.answers.map(ans => (
              <div key={ans.id} className={`qq-msg ${ans.isBest ? 'qq-msg-best' : ''}`}>
                <Avatar initials={ans.avatar} role={ans.role} />
                <div className="qq-msg-body">
                  <div className="qq-msg-meta">
                    <b>{ans.author}</b>
                    <RoleBadge role={ans.role} />
                    <span>· {ans.time}</span>
                    {ans.isBest && <span className="qq-best-tag">★ Best answer</span>}
                  </div>
                  <div className="qq-msg-text">{ans.text}</div>
                  <div className="qq-msg-foot">
                    <span>👍 {ans.helpful} helpful</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="qq-section-divider">No answers yet — be the first to reply</div>
        )}
      </div>

      <div className="qq-composer">
        <div className="qq-composer-card">
          <textarea
            className="qq-textarea"
            placeholder={item.answers.length > 0 ? 'Add a follow-up reply…' : 'Write your answer…'}
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <div className="qq-bar">
            <div className="qq-bar-left"><span>Templates</span></div>
            <div className="qq-bar-right">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={!reply.trim() || saving}
              >
                {saving ? 'Publishing…' : 'Publish reply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Rejected question ─────────────────────────────────────────────────────────

function RejectedDetail({ item, onRestore, saving }) {
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">Question about <b>{item.product}</b></div>
          <div className="qq-conv-status" style={{ color: 'var(--text-3)' }}>Rejected</div>
        </div>
      </div>

      <div className="qq-conv-body">
        <div className="qq-msg" style={{ opacity: 0.6 }}>
          <Avatar initials={item.avatar} role={item.role} />
          <div className="qq-msg-body">
            <div className="qq-msg-meta">
              <b>{item.customer}</b>
              <RoleBadge role={item.role} />
              <span>· {item.time}</span>
            </div>
            <div className="qq-msg-text">{item.text}</div>
          </div>
        </div>
      </div>

      <div className="qq-action-bar">
        <div className="qq-action-row">
          <div className="qq-action-info">This question was rejected.</div>
          <div className="qq-action-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={onRestore}
              disabled={saving}
            >
              Restore
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function QuestionDetail({ item, onAction, saving }) {
  if (!item) {
    return (
      <div className="qq-conv">
        <div className="qq-conv-empty">
          <div className="qq-conv-empty-art">💬</div>
          <div className="qq-conv-empty-title">Select a question</div>
          <div className="qq-conv-empty-desc">
            Choose a question from the list to view the conversation and take action.
          </div>
        </div>
      </div>
    );
  }

  const handleApprove          = () => onAction('approve-question', item.id);
  const handleApproveAndAnswer = (reply) => onAction('publish', item.id, reply);
  const handleReject           = () => onAction('reject', item.id);
  const handleApproveAnswer    = () => onAction('approve-answer', item.id);
  const handleRejectAnswer     = () => onAction('reject-answer', item.id);
  const handlePublish          = (reply) => onAction('publish', item.id, reply);
  const handleRestore          = () => onAction('approve-question', item.id);

  return (
    <div className="qq-conv">
      {item.status === 'pending' && (
        <PendingQuestionDetail
          item={item}
          onApprove={handleApprove}
          onApproveAndAnswer={handleApproveAndAnswer}
          onReject={handleReject}
          saving={saving}
        />
      )}
      {item.status === 'pending-answer' && (
        <PendingAnswerDetail
          item={item}
          onApprove={handleApproveAnswer}
          onReject={handleRejectAnswer}
          saving={saving}
        />
      )}
      {item.status === 'answered' && (
        <AnsweredDetail
          item={item}
          onPublish={handlePublish}
          saving={saving}
        />
      )}
      {item.status === 'rejected' && (
        <RejectedDetail
          item={item}
          onRestore={handleRestore}
          saving={saving}
        />
      )}
    </div>
  );
}
