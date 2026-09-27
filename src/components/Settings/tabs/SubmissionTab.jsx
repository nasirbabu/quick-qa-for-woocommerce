import React from 'react';
import Toggle from '../components/Toggle';
import { __ } from '../../../i18n';

export default function SubmissionTab({ draft, onChange, isPro }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  return (
    <>
      <h1 className="qq-settings-page-title">{ __( 'Submission', 'quick-qa-for-woocommerce' ) }</h1>
      <p className="qq-settings-page-sub">{ __( 'Who can ask questions and how submissions are protected from spam.', 'quick-qa-for-woocommerce' ) }</p>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Who can ask questions', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'More people asking means more Q&A content for SEO. Fewer means tighter spam control.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-radio-group">
          {[
            {
              val:   'both',
              title: <><span>{ __( 'Both logged-in customers and guests', 'quick-qa-for-woocommerce' ) }</span> <span className="qq-muted">({ __( 'recommended', 'quick-qa-for-woocommerce' ) })</span></>,
              help:  __( 'Anyone visiting your store can ask. Highest volume of Q&A content.', 'quick-qa-for-woocommerce' ),
            },
            {
              val:   'logged-in',
              title: __( 'Only logged-in customers', 'quick-qa-for-woocommerce' ),
              help:  __( 'Visitors must create an account before asking. Reduces spam at the cost of fewer questions.', 'quick-qa-for-woocommerce' ),
            },
            {
              val:   'guests',
              title: <><span>{ __( 'Only guests', 'quick-qa-for-woocommerce' ) }</span> <span className="qq-muted">({ __( 'rarely used', 'quick-qa-for-woocommerce' ) })</span></>,
              help:  __( 'Unusual setup. Only choose this if your store has anonymous-only browsing.', 'quick-qa-for-woocommerce' ),
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
              <div className="qq-settings-field-label">{ __( 'Require email from guests', 'quick-qa-for-woocommerce' ) }</div>
              <div className="qq-settings-field-help">
                { __( 'Guest must provide an email so they can be notified when their question is answered. Email is never shown publicly.', 'quick-qa-for-woocommerce' ) }
              </div>
            </div>
            <div className="qq-settings-field-control">
              <Toggle checked={draft.require_email_for_guests} onChange={v => set('require_email_for_guests', v)} />
            </div>
          </div>
        )}
      </div>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">
          { __( 'Spam protection', 'quick-qa-for-woocommerce' ) }
          {!isPro && <span className="qq-badge-pro">{ __( 'Pro', 'quick-qa-for-woocommerce' ) }</span>}
        </div>
        <div className="qq-settings-card-desc">{ __( 'Stop bots and abuse before they reach your queue.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Honeypot field', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( "Invisible field that bots fill but humans don't. Catches most automated spam silently. Recommended.", 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.enable_honeypot} onChange={v => set('enable_honeypot', v)} disabled={!isPro} />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Google reCAPTCHA', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Adds an “I\'m not a robot” check. Stronger than honeypot but adds friction. Use only if you see persistent spam.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.recaptcha_enabled} onChange={v => set('recaptcha_enabled', v)} disabled={!isPro} />
          </div>
        </div>

        {draft.recaptcha_enabled && (
          <div className="qq-settings-recaptcha-keys">
            <div className="qq-settings-recaptcha-hint">
              { __( 'reCAPTCHA v2 (“I\'m not a robot”) requires a site key and secret key.', 'quick-qa-for-woocommerce' ) }{' '}
              <a
                href="https://www.google.com/recaptcha/admin/create"
                target="_blank"
                rel="noopener noreferrer"
                className="qq-settings-link"
              >
                { __( "Get your keys at Google's reCAPTCHA admin console ↗", 'quick-qa-for-woocommerce' ) }
              </a>
            </div>
            <div className="qq-settings-key-field">
              <label className="qq-settings-key-label">
                { __( 'Site key', 'quick-qa-for-woocommerce' ) } <span className="qq-muted">({ __( 'public — embedded in the widget', 'quick-qa-for-woocommerce' ) })</span>
              </label>
              <input
                className="qq-settings-input"
                type="text"
                value={draft.recaptcha_site_key}
                onChange={e => set('recaptcha_site_key', e.target.value)}
                placeholder={ __( '6LeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'quick-qa-for-woocommerce' ) }
                spellCheck={false}
                disabled={!isPro}
              />
            </div>
            <div className="qq-settings-key-field">
              <label className="qq-settings-key-label">
                { __( 'Secret key', 'quick-qa-for-woocommerce' ) } <span className="qq-muted">({ __( 'server only — never exposed to customers', 'quick-qa-for-woocommerce' ) })</span>
              </label>
              <input
                className="qq-settings-input"
                type="password"
                value={draft.recaptcha_secret_key}
                onChange={e => set('recaptcha_secret_key', e.target.value)}
                placeholder={ __( '6LeXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', 'quick-qa-for-woocommerce' ) }
                spellCheck={false}
                autoComplete="new-password"
                disabled={!isPro}
              />
            </div>
          </div>
        )}

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Submission rate limit', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Maximum questions a single visitor can submit per hour. Stops flood attacks.', 'quick-qa-for-woocommerce' ) }</div>
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
                disabled={!isPro}
              />
              <span className="qq-settings-input-unit">{ __( 'per hour', 'quick-qa-for-woocommerce' ) }</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
