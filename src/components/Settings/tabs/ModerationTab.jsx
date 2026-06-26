import React from 'react';
import Toggle from '../components/Toggle';

const APPROVAL_OPTIONS = [
  {
    val:   'manual',
    title: <>Require my approval <span className="qq-muted">(recommended for new stores)</span></>,
    help:  'Every question lands in your Pending queue. You decide what goes public. Best protection against spam.',
  },
  {
    val:   'auto',
    title: 'Auto-publish',
    help:  "Questions appear publicly the moment they're submitted. Faster for customers, but spam can slip through. Use only if you have other anti-spam tools running.",
  },
  {
    val:   'trust-tiered',
    title: <>Trust-tiered <span className="qq-muted">(advanced)</span></>,
    help:  'Repeat customers and verified buyers auto-publish. Everyone else needs approval. Balances speed and safety.',
  },
];

export default function ModerationTab({ draft, onChange }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  return (
    <>
      <h1 className="qq-settings-page-title">Moderation</h1>
      <p className="qq-settings-page-sub">Decide what gets your manual review before going live, and who is blocked entirely.</p>

      {/* Question approval */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Question approval</div>
        <div className="qq-settings-card-desc">When a customer submits a new question, what should happen next?</div>

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
        <div className="qq-settings-card-title">Profanity filter</div>
        <div className="qq-settings-card-desc">Auto-reject questions containing words on your blocklist.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Enable profanity filter</div>
            <div className="qq-settings-field-help">Questions containing any blocklist word are auto-rejected without entering the queue.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.profanity_filter} onChange={v => set('profanity_filter', v)} />
          </div>
        </div>

        {draft.profanity_filter && (
          <div className="qq-settings-field-stacked">
            <div className="qq-settings-field-label">Blocklist words</div>
            <div className="qq-settings-field-help">Comma-separated. Case-insensitive. Anything containing these words is auto-rejected.</div>
            <textarea
              className="qq-settings-textarea"
              value={draft.profanity_words}
              onChange={e => set('profanity_words', e.target.value)}
              placeholder="spam, scam, fake"
              rows={3}
            />
          </div>
        )}

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Auto-reject very short questions</div>
            <div className="qq-settings-field-help">Questions under your minimum length (set in General) are rejected silently.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.auto_reject_short} onChange={v => set('auto_reject_short', v)} />
          </div>
        </div>
      </div>

      {/* Email blocklist */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Email blocklist</div>
        <div className="qq-settings-card-desc">Stop specific people from submitting. They get a generic submission error and never reach your queue.</div>

        <div className="qq-settings-field-stacked qq-settings-field-stacked--solo">
          <div className="qq-settings-field-label">Blocked email addresses or domains</div>
          <div className="qq-settings-field-help">One per line. You can use full addresses (sam@example.com) or whole domains (@spamdomain.net).</div>
          <textarea
            className="qq-settings-textarea"
            value={draft.email_blocklist}
            onChange={e => set('email_blocklist', e.target.value)}
            placeholder={'spammer@example.com\n@known-spam-domain.net'}
            rows={4}
          />
        </div>
      </div>

      {/* Email allowlist */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Email allowlist</div>
        <div className="qq-settings-card-desc">Trusted senders bypass approval entirely, regardless of your global rules above.</div>

        <div className="qq-settings-field-stacked qq-settings-field-stacked--solo">
          <div className="qq-settings-field-label">Always-trusted email addresses or domains</div>
          <div className="qq-settings-field-help">Useful for staff testing, agency partners, or known repeat customers. Their questions auto-publish.</div>
          <textarea
            className="qq-settings-textarea"
            value={draft.email_allowlist}
            onChange={e => set('email_allowlist', e.target.value)}
            placeholder={'staff@yourstore.com\n@agency-partner.com'}
            rows={4}
          />
        </div>
      </div>
    </>
  );
}
