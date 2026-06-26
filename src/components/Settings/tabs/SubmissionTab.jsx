import React from 'react';
import Toggle from '../components/Toggle';

export default function SubmissionTab({ draft, onChange }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  return (
    <>
      <h1 className="qq-settings-page-title">Submission</h1>
      <p className="qq-settings-page-sub">Who can ask questions and how submissions are protected from spam.</p>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Who can ask questions</div>
        <div className="qq-settings-card-desc">More people asking means more Q&amp;A content for SEO. Fewer means tighter spam control.</div>

        <div className="qq-radio-group">
          {[
            {
              val:   'both',
              title: <><span>Both logged-in customers and guests</span> <span className="qq-muted">(recommended)</span></>,
              help:  'Anyone visiting your store can ask. Highest volume of Q&A content.',
            },
            {
              val:   'logged-in',
              title: 'Only logged-in customers',
              help:  'Visitors must create an account before asking. Reduces spam at the cost of fewer questions.',
            },
            {
              val:   'guests',
              title: <><span>Only guests</span> <span className="qq-muted">(rarely used)</span></>,
              help:  'Unusual setup. Only choose this if your store has anonymous-only browsing.',
            },
          ].map(opt => (
            <div
              key={opt.val}
              className={`qq-radio-card${draft.who_can_ask === opt.val ? ' selected' : ''}`}
              onClick={() => set('who_can_ask', opt.val)}
            >
              <div className="qq-radio-circle" />
              <div className="qq-radio-text">
                <div className="qq-radio-title">{opt.title}</div>
                <div className="qq-radio-help">{opt.help}</div>
              </div>
            </div>
          ))}
        </div>

        {draft.who_can_ask !== 'logged-in' && (
          <div className="qq-settings-field" style={{ marginTop: 16 }}>
            <div className="qq-settings-field-info">
              <div className="qq-settings-field-label">Require email from guests</div>
              <div className="qq-settings-field-help">
                Guest must provide an email so they can be notified when their question is answered. Email is never shown publicly.
              </div>
            </div>
            <div className="qq-settings-field-control">
              <Toggle checked={draft.require_email_for_guests} onChange={v => set('require_email_for_guests', v)} />
            </div>
          </div>
        )}
      </div>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Spam protection</div>
        <div className="qq-settings-card-desc">Stop bots and abuse before they reach your queue.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Honeypot field</div>
            <div className="qq-settings-field-help">Invisible field that bots fill but humans don&apos;t. Catches most automated spam silently. Recommended.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.enable_honeypot} onChange={v => set('enable_honeypot', v)} />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Google reCAPTCHA</div>
            <div className="qq-settings-field-help">Adds an &ldquo;I&apos;m not a robot&rdquo; check. Stronger than honeypot but adds friction. Use only if you see persistent spam.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.recaptcha_enabled} onChange={v => set('recaptcha_enabled', v)} />
          </div>
        </div>

        {draft.recaptcha_enabled && (
          <div className="qq-settings-recaptcha-keys">
            <div className="qq-settings-recaptcha-hint">
              reCAPTCHA v2 (&ldquo;I&apos;m not a robot&rdquo;) requires a site key and secret key.{' '}
              <a
                href="https://www.google.com/recaptcha/admin/create"
                target="_blank"
                rel="noopener noreferrer"
                className="qq-settings-link"
              >
                Get your keys at Google&apos;s reCAPTCHA admin console ↗
              </a>
            </div>
            <div className="qq-settings-key-field">
              <label className="qq-settings-key-label">
                Site key <span className="qq-muted">(public — embedded in the widget)</span>
              </label>
              <input
                className="qq-settings-input"
                type="text"
                value={draft.recaptcha_site_key}
                onChange={e => set('recaptcha_site_key', e.target.value)}
                placeholder="6LeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                spellCheck={false}
              />
            </div>
            <div className="qq-settings-key-field">
              <label className="qq-settings-key-label">
                Secret key <span className="qq-muted">(server only — never exposed to customers)</span>
              </label>
              <input
                className="qq-settings-input"
                type="password"
                value={draft.recaptcha_secret_key}
                onChange={e => set('recaptcha_secret_key', e.target.value)}
                placeholder="6LeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                spellCheck={false}
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Submission rate limit</div>
            <div className="qq-settings-field-help">Maximum questions a single visitor can submit per hour. Stops flood attacks.</div>
          </div>
          <div className="qq-settings-field-control">
            <div className="qq-settings-input-wrap">
              <input
                className="qq-settings-input qq-settings-input--short"
                type="number"
                min="1"
                max="100"
                value={draft.submission_rate_limit}
                onChange={e => set('submission_rate_limit', Math.max(1, parseInt(e.target.value, 10) || 3))}
              />
              <span className="qq-settings-input-unit">per hour</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
