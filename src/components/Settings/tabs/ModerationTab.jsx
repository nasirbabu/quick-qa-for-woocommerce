import React from 'react';
import Toggle from '../components/Toggle';
import { __ } from '../../../i18n';

export default function ModerationTab({ draft, onChange }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  const APPROVAL_OPTIONS = [
    {
      val:   'manual',
      title: <>{ __( 'Require my approval', 'quick-qa-for-woocommerce' ) } <span className="qq-muted">({ __( 'recommended for new stores', 'quick-qa-for-woocommerce' ) })</span></>,
      help:  __( 'Every question lands in your Pending queue. You decide what goes public. Best protection against spam.', 'quick-qa-for-woocommerce' ),
    },
    {
      val:   'auto',
      title: __( 'Auto-publish', 'quick-qa-for-woocommerce' ),
      help:  __( "Questions appear publicly the moment they're submitted. Faster for customers, but spam can slip through. Use only if you have other anti-spam tools running.", 'quick-qa-for-woocommerce' ),
    },
    {
      val:   'trust-tiered',
      title: <>{ __( 'Trust-tiered', 'quick-qa-for-woocommerce' ) } <span className="qq-muted">({ __( 'advanced', 'quick-qa-for-woocommerce' ) })</span></>,
      help:  __( 'Repeat customers and verified buyers auto-publish. Everyone else needs approval. Balances speed and safety.', 'quick-qa-for-woocommerce' ),
    },
  ];

  return (
    <>
      <h1 className="qq-settings-page-title">{ __( 'Moderation', 'quick-qa-for-woocommerce' ) }</h1>
      <p className="qq-settings-page-sub">{ __( 'Decide what gets your manual review before going live, and who is blocked entirely.', 'quick-qa-for-woocommerce' ) }</p>

      {/* Question approval */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Question approval', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'When a customer submits a new question, what should happen next?', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-radio-group">
          {APPROVAL_OPTIONS.map(opt => (
            <div
              key={opt.val}
              className={`qq-radio-card${draft.question_approval_mode === opt.val ? ' selected' : ''}`}
              onClick={() => set('question_approval_mode', opt.val)}
            >
              <div className="qq-radio-circle" />
              <div className="qq-radio-text">
                <div className="qq-radio-title">{opt.title}</div>
                <div className="qq-radio-help">{opt.help}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profanity filter */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Profanity filter', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'Auto-reject questions containing words on your blocklist.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Enable profanity filter', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Questions containing any blocklist word are auto-rejected without entering the queue.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.profanity_filter} onChange={v => set('profanity_filter', v)} />
          </div>
        </div>

        {draft.profanity_filter && (
          <div className="qq-settings-field-stacked">
            <div className="qq-settings-field-label">{ __( 'Blocklist words', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Comma-separated. Case-insensitive. Anything containing these words is auto-rejected.', 'quick-qa-for-woocommerce' ) }</div>
            <textarea
              className="qq-settings-textarea"
              value={draft.profanity_words}
              onChange={e => set('profanity_words', e.target.value)}
              placeholder={ __( 'spam, scam, fake', 'quick-qa-for-woocommerce' ) }
              rows={3}
            />
          </div>
        )}

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Auto-reject very short questions', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Questions under your minimum length (set in General) are rejected silently.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.auto_reject_short} onChange={v => set('auto_reject_short', v)} />
          </div>
        </div>
      </div>

      {/* Email blocklist */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Email blocklist', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'Stop specific people from submitting. They get a generic submission error and never reach your queue.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field-stacked qq-settings-field-stacked--solo">
          <div className="qq-settings-field-label">{ __( 'Blocked email addresses or domains', 'quick-qa-for-woocommerce' ) }</div>
          <div className="qq-settings-field-help">{ __( 'One per line. You can use full addresses (sam@example.com) or whole domains (@spamdomain.net).', 'quick-qa-for-woocommerce' ) }</div>
          <textarea
            className="qq-settings-textarea"
            value={draft.email_blocklist}
            onChange={e => set('email_blocklist', e.target.value)}
            placeholder={ __( 'spammer@example.com\n@known-spam-domain.net', 'quick-qa-for-woocommerce' ) }
            rows={4}
          />
        </div>
      </div>

      {/* Flagging */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Flagging', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( "Shoppers can flag a question or answer as spam, incorrect, offensive, a duplicate, or other. Once a single item collects enough flags, it's automatically hidden from public view and moved to your Flagged queue for review.", 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Auto-hide after', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( "Number of flags a question or answer needs before it's automatically hidden and queued for your review.", 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <div className="qq-settings-input-wrap">
              <input
                className="qq-settings-input qq-settings-input--short"
                type="number"
                min="1"
                max="999"
                value={draft.flag_auto_hide_threshold}
                onChange={e => set('flag_auto_hide_threshold', Math.max(1, parseInt(e.target.value, 10) || 3))}
              />
              <span className="qq-settings-input-unit">{ __( 'flags', 'quick-qa-for-woocommerce' ) }</span>
            </div>
          </div>
        </div>
      </div>

      {/* Email allowlist */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Email allowlist', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'Trusted senders bypass approval entirely, regardless of your global rules above.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field-stacked qq-settings-field-stacked--solo">
          <div className="qq-settings-field-label">{ __( 'Always-trusted email addresses or domains', 'quick-qa-for-woocommerce' ) }</div>
          <div className="qq-settings-field-help">{ __( 'Useful for staff testing, agency partners, or known repeat customers. Their questions auto-publish.', 'quick-qa-for-woocommerce' ) }</div>
          <textarea
            className="qq-settings-textarea"
            value={draft.email_allowlist}
            onChange={e => set('email_allowlist', e.target.value)}
            placeholder={ __( 'staff@yourstore.com\n@agency-partner.com', 'quick-qa-for-woocommerce' ) }
            rows={4}
          />
        </div>
      </div>
    </>
  );
}
