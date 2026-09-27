import React, { useState, useEffect, useRef } from 'react';
import { __, _n, sprintf } from '../../i18n';

const settings = window.quickQaAdmin || { restUrl: '', nonce: '' };

async function apiFetch(path, options = {}) {
  const res = await fetch(settings.restUrl + path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': settings.nonce,
    },
    method: options.method || 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || sprintf( __( 'Request failed (%d)', 'quick-qa-for-woocommerce' ), res.status ));
  }
  return res.json();
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Avatar({ initials, role }) {
  const cls = role === 'staff' ? 'qq-av staff'
    : role === 'verified-buyer' ? 'qq-av verified'
    : 'qq-av';
  return <div className={cls}>{initials}</div>;
}

function RoleBadge({ role }) {
  if (role === 'staff')          return <span className="qq-msg-role-staff">{__( 'Store team', 'quick-qa-for-woocommerce' )}</span>;
  if (role === 'verified-buyer') return <span className="qq-msg-role-buyer">{__( 'Verified buyer', 'quick-qa-for-woocommerce' )}</span>;
  if (role === 'community')      return <span className="qq-msg-role">{__( 'Community', 'quick-qa-for-woocommerce' )}</span>;
  if (role === 'guest')          return <span className="qq-msg-role">{__( 'Guest', 'quick-qa-for-woocommerce' )}</span>;
  if (role === 'customer')       return <span className="qq-msg-role">{__( 'Original asker', 'quick-qa-for-woocommerce' )}</span>;
  return <span className="qq-msg-role">{__( 'Customer', 'quick-qa-for-woocommerce' )}</span>;
}

// ── Template picker modal ─────────────────────────────────────────────────────

function TemplatePicker({ onInsert, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    apiFetch('admin/templates')
      .then(data => setTemplates(data || []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  // Auto-focus search once templates load.
  useEffect(() => {
    if (!loading && searchRef.current) searchRef.current.focus();
  }, [loading]);

  const filtered = search.trim()
    ? templates.filter(t =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.content.toLowerCase().includes(search.toLowerCase())
      )
    : templates;

  function handleSelect(t) {
    onInsert(t.content, t.id);
    onClose();
  }

  return (
    <div className="qq-modal-overlay" onClick={onClose}>
      <div className="qq-modal qq-tpl-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="qq-modal-head">
          <div className="qq-modal-head-text">
            <div className="qq-modal-title">{__( 'Insert a template', 'quick-qa-for-woocommerce' )}</div>
            <div className="qq-modal-desc">
              {__( 'Pick a template to pre-fill the answer field. You can edit it before publishing.', 'quick-qa-for-woocommerce' )}
            </div>
          </div>
          <button className="qq-modal-close" onClick={onClose}>&#x2715;</button>
        </div>

        <div className="qq-tpl-pick-search-wrap">
          <input
            ref={searchRef}
            className="qq-tpl-pick-search"
            type="text"
            placeholder={__( 'Search templates…', 'quick-qa-for-woocommerce' )}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="qq-tpl-pick-list">
          {loading && (
            <div className="qq-tpl-pick-empty">{__( 'Loading templates…', 'quick-qa-for-woocommerce' )}</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="qq-tpl-pick-empty">
              {search.trim()
                ? __( 'No templates match your search.', 'quick-qa-for-woocommerce' )
                : __( 'No templates yet. Create some in Reply Templates.', 'quick-qa-for-woocommerce' )}
            </div>
          )}
          {!loading && filtered.map(t => (
            <div key={t.id} className="qq-tpl-pick-item" onClick={() => handleSelect(t)}>
              <div className="qq-tpl-pick-item-name">
                {t.name}
                <span className="qq-tpl-pick-item-cat">{t.category}</span>
              </div>
              <div className="qq-tpl-pick-item-preview">
                {t.content.length > 120 ? t.content.slice(0, 120) + '…' : t.content}
              </div>
            </div>
          ))}
        </div>

        <div className="qq-modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>{__( 'Cancel', 'quick-qa-for-woocommerce' )}</button>
        </div>
      </div>
    </div>
  );
}

// ── Pending question (needs approval) ────────────────────────────────────────

function PendingQuestionDetail({ item, onApprove, onApproveAndAnswer, onReject, saving }) {
  const [reply,              setReply]              = useState('');
  const [pickerOpen,         setPickerOpen]          = useState(false);
  const [insertedTemplateId, setInsertedTemplateId]  = useState(null);

  function handleInsert(content, templateId) {
    setReply(content);
    setInsertedTemplateId(templateId);
  }

  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">{__( 'Question about', 'quick-qa-for-woocommerce' )} <b>{item.product}</b></div>
          <div className="qq-conv-status">
            {sprintf(
              // translators: %d is the number of upvotes on the question
              _n( 'Pending review · %d upvote', 'Pending review · %d upvotes', item.upvotes, 'quick-qa-for-woocommerce' ),
              item.upvotes
            )}
          </div>
        </div>
        <div className="qq-conv-meta-actions">
          <a href={item.productPermalink} target="_blank" rel="noopener noreferrer">{__( 'View product', 'quick-qa-for-woocommerce' )}</a>
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
              <span>{sprintf( __( '↑ %d upvotes', 'quick-qa-for-woocommerce' ), item.upvotes )}</span>
            </div>
          </div>
        </div>

        <div className="qq-section-divider">{__( 'Optional: write a reply', 'quick-qa-for-woocommerce' )}</div>
      </div>

      <div className="qq-composer">
        <div className="qq-composer-card">
          <textarea
            className="qq-textarea"
            placeholder={__( 'Write an answer to publish alongside approval…', 'quick-qa-for-woocommerce' )}
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <div className="qq-bar">
            <div className="qq-bar-left">
              <span className="qq-bar-action" onClick={() => setPickerOpen(true)}>
                {__( 'Templates', 'quick-qa-for-woocommerce' )}
              </span>
            </div>
            <div className="qq-bar-right">
              <button
                className="btn btn-danger-ghost btn-sm"
                onClick={onReject}
                disabled={saving}
              >
                {__( 'Reject', 'quick-qa-for-woocommerce' )}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onApprove}
                disabled={saving}
              >
                {__( 'Approve', 'quick-qa-for-woocommerce' )}
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onApproveAndAnswer(reply, insertedTemplateId)}
                disabled={!reply.trim() || saving}
              >
                {__( 'Approve & answer', 'quick-qa-for-woocommerce' )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <TemplatePicker
          onInsert={handleInsert}
          onClose={() => setPickerOpen(false)}
        />
      )}
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
          <div className="qq-conv-product">{__( 'Question about', 'quick-qa-for-woocommerce' )} <b>{item.product}</b></div>
          <div className="qq-conv-status">{__( 'Community answer pending review', 'quick-qa-for-woocommerce' )}</div>
        </div>
        <div className="qq-conv-meta-actions">
          <a href={item.productPermalink} target="_blank" rel="noopener noreferrer">{__( 'View product', 'quick-qa-for-woocommerce' )}</a>
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
              {sprintf( _n( '%d approved answer', '%d approved answers', item.answers.length, 'quick-qa-for-woocommerce' ), item.answers.length )}
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

        <div className="qq-thread-divider">{__( 'Pending answer', 'quick-qa-for-woocommerce' )}</div>

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
            {__( 'Review this community answer before it goes public.', 'quick-qa-for-woocommerce' )}
          </div>
          <div className="qq-action-buttons">
            <button
              className="btn btn-danger-ghost btn-sm"
              onClick={onReject}
              disabled={saving}
            >
              {__( 'Reject', 'quick-qa-for-woocommerce' )}
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={onApprove}
              disabled={saving}
            >
              {__( 'Approve & publish', 'quick-qa-for-woocommerce' )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Follow-up reply composer (admin replying to a customer follow-up) ────────

function FollowupReplyComposer({ onReply, saving }) {
  const [text, setText] = useState('');

  function handleSubmit() {
    if (!text.trim()) return;
    // Keep the draft if the action fails (e.g. the free staff answer cap).
    Promise.resolve(onReply(text)).then(ok => { if (ok !== false) setText(''); });
  }

  return (
    <div className="qq-composer qq-followup-composer">
      <div className="qq-composer-card">
        <textarea
          className="qq-textarea"
          placeholder={__( 'Reply to this follow-up…', 'quick-qa-for-woocommerce' )}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <div className="qq-bar">
          <div className="qq-bar-left" />
          <div className="qq-bar-right">
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSubmit}
              disabled={!text.trim() || saving}
            >
              {saving ? __( 'Replying…', 'quick-qa-for-woocommerce' ) : __( 'Reply & resolve thread', 'quick-qa-for-woocommerce' )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Answered / approved question ─────────────────────────────────────────────

function AnsweredDetail({ item, onPublish, onReplyFollowup, onToggleLock, saving }) {
  const [reply,              setReply]              = useState('');
  const [pickerOpen,         setPickerOpen]          = useState(false);
  const [insertedTemplateId, setInsertedTemplateId]  = useState(null);

  function handleSubmit() {
    if (!reply.trim()) return;
    // Keep the draft if the action fails (e.g. the free staff answer cap).
    Promise.resolve(onPublish(reply, insertedTemplateId)).then(ok => {
      if (ok === false) return;
      setReply('');
      setInsertedTemplateId(null);
    });
  }

  function handleInsert(content, templateId) {
    setReply(content);
    setInsertedTemplateId(templateId);
  }

  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">{__( 'Question about', 'quick-qa-for-woocommerce' )} <b>{item.product}</b></div>
          <div className="qq-conv-status" style={{ color: 'var(--green)' }}>
            {item.answers.length > 0
              ? sprintf( _n( 'Answered · %d answer', 'Answered · %d answers', item.answers.length, 'quick-qa-for-woocommerce' ), item.answers.length )
              : __( 'Approved · no answers yet', 'quick-qa-for-woocommerce' )}
            {item.isLocked && <span className="qq-resolved-badge">{__( 'Resolved', 'quick-qa-for-woocommerce' )}</span>}
          </div>
        </div>
        <div className="qq-conv-meta-actions">
          <a href={item.productPermalink} target="_blank" rel="noopener noreferrer">{__( 'View on product page', 'quick-qa-for-woocommerce' )}</a>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onToggleLock}
            disabled={saving}
          >
            {item.isLocked ? __( 'Unlock thread', 'quick-qa-for-woocommerce' ) : __( 'Lock thread', 'quick-qa-for-woocommerce' )}
          </button>
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
              {sprintf( _n( '%d answer', '%d answers', item.answers.length, 'quick-qa-for-woocommerce' ), item.answers.length )}
            </div>
            {item.answers.map(ans => (
              <div key={ans.id} className={`qq-msg ${ans.isBest ? 'qq-msg-best' : ''}`}>
                <Avatar initials={ans.avatar} role={ans.role} />
                <div className="qq-msg-body">
                  <div className="qq-msg-meta">
                    <b>{ans.author}</b>
                    <RoleBadge role={ans.role} />
                    <span>· {ans.time}</span>
                    {ans.isBest && <span className="qq-best-tag">{__( '★ Best answer', 'quick-qa-for-woocommerce' )}</span>}
                  </div>
                  <div className="qq-msg-text">{ans.text}</div>
                  <div className="qq-msg-foot">
                    <span>{sprintf( __( '👍 %d helpful', 'quick-qa-for-woocommerce' ), ans.helpful )}</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="qq-section-divider">{__( 'No answers yet — be the first to reply', 'quick-qa-for-woocommerce' )}</div>
        )}

        {item.followups && item.followups.length > 0 && item.followups.map(fu => (
          <div key={fu.id} className="qq-followup">
            <div className="qq-thread-divider">{__( 'Customer follow-up', 'quick-qa-for-woocommerce' )}</div>
            <div className="qq-msg">
              <Avatar initials={fu.avatar} role="customer" />
              <div className="qq-msg-body">
                <div className="qq-msg-meta">
                  <b>{fu.author}</b>
                  <RoleBadge role="customer" />
                  <span>· {fu.time}</span>
                </div>
                <div className="qq-msg-text">{fu.text}</div>
              </div>
            </div>

            {fu.reply ? (
              <div className="qq-msg">
                <Avatar initials={fu.reply.avatar} role="staff" />
                <div className="qq-msg-body">
                  <div className="qq-msg-meta">
                    <b>{fu.reply.author}</b>
                    <RoleBadge role="staff" />
                    <span>· {fu.reply.time}</span>
                  </div>
                  <div className="qq-msg-text">{fu.reply.text}</div>
                </div>
              </div>
            ) : (
              <FollowupReplyComposer
                onReply={(text) => onReplyFollowup(fu.dbId, text)}
                saving={saving}
              />
            )}
          </div>
        ))}
      </div>

      <div className="qq-composer">
        <div className="qq-composer-card">
          <textarea
            className="qq-textarea"
            placeholder={item.answers.length > 0 ? __( 'Add a follow-up reply…', 'quick-qa-for-woocommerce' ) : __( 'Write your answer…', 'quick-qa-for-woocommerce' )}
            value={reply}
            onChange={e => setReply(e.target.value)}
          />
          <div className="qq-bar">
            <div className="qq-bar-left">
              <span className="qq-bar-action" onClick={() => setPickerOpen(true)}>
                {__( 'Templates', 'quick-qa-for-woocommerce' )}
              </span>
            </div>
            <div className="qq-bar-right">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSubmit}
                disabled={!reply.trim() || saving}
              >
                {saving ? __( 'Publishing…', 'quick-qa-for-woocommerce' ) : __( 'Publish reply', 'quick-qa-for-woocommerce' )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {pickerOpen && (
        <TemplatePicker
          onInsert={handleInsert}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// ── Flagged question ──────────────────────────────────────────────────────────

function FlaggedDetail({ item, onDismiss, onDelete, saving }) {
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">{__( 'Question about', 'quick-qa-for-woocommerce' )} <b>{item.product}</b></div>
          <div className="qq-conv-status" style={{ color: '#A32D2D' }}>
            {sprintf(
              _n(
                'Auto-hidden after %d flag · awaiting your review',
                'Auto-hidden after %d flags · awaiting your review',
                item.flagCount,
                'quick-qa-for-woocommerce'
              ),
              item.flagCount
            )}
          </div>
        </div>
      </div>

      <div className="qq-flag-banner">
        <div className="qq-flag-banner-head">
          <div className="qq-flag-banner-title">
            <div className="qq-flag-icon">!</div>
            {item.flags.length > 1
              ? sprintf(
                  // translators: %1$d is the total number of flags, %2$d is the number of distinct customers who flagged
                  __( 'Flagged %1$d times by %2$d different customers', 'quick-qa-for-woocommerce' ),
                  item.flagCount,
                  item.flags.length
                )
              : sprintf(
                  _n( 'Flagged %d time', 'Flagged %d times', item.flagCount, 'quick-qa-for-woocommerce' ),
                  item.flagCount
                )}
          </div>
          {item.flags.length > 0 && (
            <div className="qq-flag-banner-meta">{sprintf( __( 'First flag: %s', 'quick-qa-for-woocommerce' ), item.flags[0].time )}</div>
          )}
        </div>
        {item.flags.length > 0 && (
          <div className="qq-flag-list">
            {item.flags.map((f, i) => (
              <div key={i} className="qq-flag-item">
                <span className="qq-flag-reason">{f.reason}</span>
                <span className="qq-flag-reporter">{f.reporter}</span>
                <span className="qq-flag-time">{f.time}</span>
              </div>
            ))}
          </div>
        )}
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
            <div className="qq-flagged-box">
              <div className="qq-msg-text">{item.text}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="qq-action-bar">
        <div className="qq-action-row">
          <div className="qq-action-info">
            {item.flags.length > 0
              ? <>{__( 'Multiple customers reported this as', 'quick-qa-for-woocommerce' )} <b>{item.flags[0].reason.toLowerCase()}</b>.</>
              : __( 'This content was flagged by customers.', 'quick-qa-for-woocommerce' )}
          </div>
          <div className="qq-action-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={onDismiss}
              disabled={saving}
            >
              {__( 'Dismiss flags', 'quick-qa-for-woocommerce' )}
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={onDelete}
              disabled={saving}
            >
              {__( 'Delete', 'quick-qa-for-woocommerce' )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Approved question with one or more flagged answers ────────────────────────

function FlaggedAnswersDetail({ item, onDismissAnswer, onDeleteAnswer, saving }) {
  return (
    <>
      <div className="qq-conv-head">
        <div>
          <div className="qq-conv-product">{__( 'Question about', 'quick-qa-for-woocommerce' )} <b>{item.product}</b></div>
          <div className="qq-conv-status" style={{ color: '#A32D2D' }}>
            {sprintf(
              _n(
                '%d answer auto-hidden · awaiting your review',
                '%d answers auto-hidden · awaiting your review',
                item.flaggedAnswers.length,
                'quick-qa-for-woocommerce'
              ),
              item.flaggedAnswers.length
            )}
          </div>
        </div>
        <div className="qq-conv-meta-actions">
          <a href={item.productPermalink} target="_blank" rel="noopener noreferrer">{__( 'View product', 'quick-qa-for-woocommerce' )}</a>
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
              {sprintf( _n( '%d approved answer', '%d approved answers', item.answers.length, 'quick-qa-for-woocommerce' ), item.answers.length )}
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

        <div className="qq-thread-divider">{__( 'Flagged answers', 'quick-qa-for-woocommerce' )}</div>

        {item.flaggedAnswers.map(ans => (
          <div key={ans.id} className="qq-flag-banner">
            <div className="qq-flag-banner-head">
              <div className="qq-flag-banner-title">
                <div className="qq-flag-icon">!</div>
                {ans.flags.length > 1
                  ? sprintf(
                      // translators: %1$d is the total number of flags, %2$d is the number of distinct customers who flagged
                      __( 'Flagged %1$d times by %2$d different customers', 'quick-qa-for-woocommerce' ),
                      ans.flagCount,
                      ans.flags.length
                    )
                  : sprintf(
                      _n( 'Flagged %d time', 'Flagged %d times', ans.flagCount, 'quick-qa-for-woocommerce' ),
                      ans.flagCount
                    )}
              </div>
              {ans.flags.length > 0 && (
                <div className="qq-flag-banner-meta">{sprintf( __( 'First flag: %s', 'quick-qa-for-woocommerce' ), ans.flags[0].time )}</div>
              )}
            </div>
            {ans.flags.length > 0 && (
              <div className="qq-flag-list">
                {ans.flags.map((f, i) => (
                  <div key={i} className="qq-flag-item">
                    <span className="qq-flag-reason">{f.reason}</span>
                    <span className="qq-flag-reporter">{f.reporter}</span>
                    <span className="qq-flag-time">{f.time}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="qq-msg" style={{ marginTop: 12 }}>
              <Avatar initials={ans.avatar} role={ans.role} />
              <div className="qq-msg-body">
                <div className="qq-msg-meta">
                  <b>{ans.author}</b>
                  <RoleBadge role={ans.role} />
                  <span>· {ans.time}</span>
                </div>
                <div className="qq-flagged-box">
                  <div className="qq-msg-text">{ans.text}</div>
                </div>
              </div>
            </div>

            <div className="qq-action-buttons" style={{ marginTop: 12 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onDismissAnswer(ans.dbId)}
                disabled={saving}
              >
                {__( 'Dismiss flags', 'quick-qa-for-woocommerce' )}
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onDeleteAnswer(ans.dbId)}
                disabled={saving}
              >
                {__( 'Delete', 'quick-qa-for-woocommerce' )}
              </button>
            </div>
          </div>
        ))}
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
          <div className="qq-conv-product">{__( 'Question about', 'quick-qa-for-woocommerce' )} <b>{item.product}</b></div>
          <div className="qq-conv-status" style={{ color: 'var(--text-3)' }}>{__( 'Rejected', 'quick-qa-for-woocommerce' )}</div>
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
          <div className="qq-action-info">{__( 'This question was rejected.', 'quick-qa-for-woocommerce' )}</div>
          <div className="qq-action-buttons">
            <button
              className="btn btn-secondary btn-sm"
              onClick={onRestore}
              disabled={saving}
            >
              {__( 'Restore', 'quick-qa-for-woocommerce' )}
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
          <div className="qq-conv-empty-title">{__( 'Select a question', 'quick-qa-for-woocommerce' )}</div>
          <div className="qq-conv-empty-desc">
            {__( 'Choose a question from the list to view the conversation and take action.', 'quick-qa-for-woocommerce' )}
          </div>
        </div>
      </div>
    );
  }

  const handleApprove          = () => onAction('approve-question', item.id);
  const handleApproveAndAnswer = (reply, templateId) => onAction('publish', item.id, { answer_text: reply, template_id: templateId });
  const handleReject           = () => onAction('reject', item.id);
  const handleApproveAnswer    = () => onAction('approve-answer', item.id);
  const handleRejectAnswer     = () => onAction('reject-answer', item.id);
  const handlePublish          = (reply, templateId) => onAction('publish', item.id, { answer_text: reply, template_id: templateId });
  const handleReplyFollowup    = (parentAnswerId, text) => onAction('reply-followup', item.id, { answer_text: text, parent_answer_id: parentAnswerId });
  const handleToggleLock       = () => onAction(item.isLocked ? 'unlock-thread' : 'lock-thread', item.id);
  const handleRestore          = () => onAction('approve-question', item.id);
  const handleDismissFlags     = () => onAction('dismiss-flags', item.id);
  const handleDeleteFlagged    = () => onAction('delete-flagged', item.id);
  const handleDismissAnswer    = (answerDbId) => onAction('dismiss-answer-flags', item.id, answerDbId);
  const handleDeleteAnswer     = (answerDbId) => onAction('delete-flagged-answer', item.id, answerDbId);

  // Flags that have been recorded but haven't crossed the auto-hide threshold
  // yet — surfaced here so moderators can see them accumulating, since this
  // content is otherwise indistinguishable from unflagged content.
  const belowThresholdFlagCount = item.status !== 'flagged'
    ? item.flagCount + item.answers.reduce((sum, a) => sum + (a.flagCount || 0), 0)
    : 0;

  return (
    <div className="qq-conv">
      {belowThresholdFlagCount > 0 && (
        <div className="qq-flag-banner qq-flag-banner--soft">
          {sprintf(
            _n(
              '⚑ %d flag recorded on this question so far — it will auto-hide once flags reach your configured threshold.',
              '⚑ %d flags recorded on this question so far — it will auto-hide once flags reach your configured threshold.',
              belowThresholdFlagCount,
              'quick-qa-for-woocommerce'
            ),
            belowThresholdFlagCount
          )}
        </div>
      )}
      {item.status === 'flagged' && (
        <FlaggedDetail
          item={item}
          onDismiss={handleDismissFlags}
          onDelete={handleDeleteFlagged}
          saving={saving}
        />
      )}
      {item.status === 'answer-flagged' && (
        <FlaggedAnswersDetail
          item={item}
          onDismissAnswer={handleDismissAnswer}
          onDeleteAnswer={handleDeleteAnswer}
          saving={saving}
        />
      )}
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
          onReplyFollowup={handleReplyFollowup}
          onToggleLock={handleToggleLock}
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
