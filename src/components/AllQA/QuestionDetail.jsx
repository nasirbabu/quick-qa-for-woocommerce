import React, { useState } from 'react';

function Avatar({ initials, role }) {
  const cls = role === 'staff' ? 'qq-av staff'
    : role === 'verified-buyer' ? 'qq-av verified'
    : 'qq-av';
  return <div className={cls}>{initials}</div>;
}

function RoleBadge({ role }) {
  if (role === 'staff') return <span className="qq-msg-role-staff">Store team</span>;
  if (role === 'verified-buyer') return <span className="qq-msg-role-buyer">Verified buyer</span>;
  if (role === 'community') return <span className="qq-msg-role">Community</span>;
  if (role === 'guest') return <span className="qq-msg-role">Guest</span>;
  return <span className="qq-msg-role">Customer</span>;
}

function PendingQuestionDetail({ item, onPublish, onReject }) {
  const [reply, setReply] = useState('');
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">
            Question about <b>{item.product}</b>
          </div>
          <div className="qq-conv-status">Pending review · {item.upvotes} upvote{item.upvotes !== 1 ? 's' : ''}</div>
        </div>
        <div className="qq-conv-meta-actions">
          <span>View product</span>
          <span style={{ color: 'var(--red)' }}>Reject</span>
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

        <div className="qq-section-divider">Write a reply</div>
      </div>

      <div className="qq-composer">
        <div className="qq-composer-card">
          <textarea
            className="qq-textarea"
            placeholder="Write your answer…"
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <div className="qq-bar">
            <div className="qq-bar-left">
              <span>Templates</span>
              <span>AI draft</span>
            </div>
            <div className="qq-bar-right">
              <span className="qq-shortcut">⌘↵ to send</span>
              <button className="btn btn-secondary btn-sm" onClick={onReject}>Reject</button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onPublish(reply)}
                disabled={!reply.trim()}
              >
                Publish &amp; answer
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PendingAnswerDetail({ item, onApprove, onReject }) {
  const pa = item.pendingAnswer;
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">
            Question about <b>{item.product}</b>
          </div>
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
            <button className="btn btn-danger-ghost btn-sm" onClick={onReject}>Reject</button>
            <button className="btn btn-primary btn-sm" onClick={onApprove}>Approve &amp; publish</button>
          </div>
        </div>
      </div>
    </>
  );
}

function AnsweredDetail({ item }) {
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">
            Question about <b>{item.product}</b>
          </div>
          <div className="qq-conv-status" style={{ color: 'var(--green)' }}>
            Answered · {item.answers.length} answer{item.answers.length !== 1 ? 's' : ''}
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
                <span>Mark as best</span>
              </div>
            </div>
          </div>
        ))}

        {item.followups && item.followups.length > 0 && (
          <>
            <div className="qq-thread-divider">Follow-up</div>
            <div className="qq-followup">
              {item.followups.map((f, i) => (
                <div key={i} className="qq-msg">
                  <Avatar initials={f.avatar} role={f.role} />
                  <div className="qq-msg-body">
                    <div className="qq-msg-meta">
                      <b>{f.author}</b>
                      <RoleBadge role={f.role} />
                      <span>· {f.time}</span>
                    </div>
                    <div className="qq-msg-text">{f.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="qq-composer">
        <div className="qq-composer-card">
          <textarea className="qq-textarea" placeholder="Add a follow-up reply…" />
          <div className="qq-bar">
            <div className="qq-bar-left"><span>Templates</span></div>
            <div className="qq-bar-right">
              <button className="btn btn-primary btn-sm">Reply</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FlaggedDetail({ item, onDelete, onKeep }) {
  return (
    <>
      <div className="qq-flag-banner">
        <div className="qq-flag-banner-head">
          <div className="qq-flag-banner-title">
            🚩 Flagged {item.flagCount} times by {item.flags.length} different customers
          </div>
        </div>
        <div className="qq-flag-list">
          {item.flags.map((f, i) => (
            <div key={i} className="qq-flag-item">
              <span className="qq-flag-reason">{f.reason}</span>
              <span className="qq-flag-reporter">{f.reporter}</span>
              <span className="qq-flag-time">{f.time}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">
            Question about <b>{item.product}</b>
          </div>
          <div className="qq-conv-status" style={{ color: 'var(--red)' }}>Flagged content</div>
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
            <div className="qq-msg-text" style={{ color: 'var(--red)' }}>{item.text}</div>
          </div>
        </div>
      </div>

      <div className="qq-action-bar">
        <div className="qq-action-row">
          <div className="qq-action-info">
            This content has been flagged. Review and decide.
          </div>
          <div className="qq-action-buttons">
            <button className="btn btn-secondary btn-sm" onClick={onKeep}>Keep &amp; clear flags</button>
            <button className="btn btn-danger-ghost btn-sm" onClick={onDelete}>Delete content</button>
          </div>
        </div>
      </div>
    </>
  );
}

function RejectedDetail({ item }) {
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">
            Question about <b>{item.product}</b>
          </div>
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
            <button className="btn btn-secondary btn-sm">Restore</button>
            <button className="btn btn-danger-ghost btn-sm">Delete permanently</button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function QuestionDetail({ item, onAction }) {
  if (!item) {
    return (
      <div className="qq-conv">
        <div className="qq-conv-empty">
          <div className="qq-conv-empty-art">💬</div>
          <div className="qq-conv-empty-title">Select a question</div>
          <div className="qq-conv-empty-desc">
            Choose a question from the list on the left to view the conversation and reply.
          </div>
        </div>
      </div>
    );
  }

  const handlePublish = (reply) => onAction('publish', item.id, reply);
  const handleApprove = () => onAction('approve-answer', item.id);
  const handleReject = () => onAction('reject', item.id);
  const handleDelete = () => onAction('delete', item.id);
  const handleKeep = () => onAction('keep', item.id);

  return (
    <div className="qq-conv">
      {item.status === 'pending' && (
        <PendingQuestionDetail item={item} onPublish={handlePublish} onReject={handleReject} />
      )}
      {item.status === 'pending-answer' && (
        <PendingAnswerDetail item={item} onApprove={handleApprove} onReject={handleReject} />
      )}
      {item.status === 'answered' && (
        <AnsweredDetail item={item} />
      )}
      {item.status === 'flagged' && (
        <FlaggedDetail item={item} onDelete={handleDelete} onKeep={handleKeep} />
      )}
      {item.status === 'rejected' && (
        <RejectedDetail item={item} />
      )}
    </div>
  );
}
