import React, { useState, useEffect } from 'react';

async function apiFetch(path, options = {}) {
  const base = window.quickQaAdmin?.restUrl || '';
  const res = await fetch(base + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': window.quickQaAdmin?.nonce || '',
      ...(options.headers || {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

function Toggle({ checked, onChange }) {
  return (
    <div
      className={`qq-settings-toggle${checked ? ' on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    />
  );
}

function SubmissionTab({ draft, onChange }) {
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
              <div className="qq-settings-field-help">Guest must provide an email so they can be notified when their question is answered. Email is never shown publicly.</div>
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
            <div className="qq-settings-field-help">Invisible field that bots fill but humans don't. Catches most automated spam silently. Recommended.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.enable_honeypot} onChange={v => set('enable_honeypot', v)} />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Google reCAPTCHA</div>
            <div className="qq-settings-field-help">Adds an "I'm not a robot" check. Stronger than honeypot but adds friction. Use only if you see persistent spam.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.recaptcha_enabled} onChange={v => set('recaptcha_enabled', v)} />
          </div>
        </div>

        {draft.recaptcha_enabled && (
          <div className="qq-settings-recaptcha-keys">
            <div className="qq-settings-recaptcha-hint">
              reCAPTCHA v2 ("I'm not a robot") requires a site key and secret key.{' '}
              <a
                href="https://www.google.com/recaptcha/admin/create"
                target="_blank"
                rel="noopener noreferrer"
                className="qq-settings-link"
              >
                Get your keys at Google's reCAPTCHA admin console ↗
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

function ComingSoonTab({ label }) {
  return (
    <div className="qq-settings-coming-soon">
      <div className="qq-settings-coming-soon-title">{label}</div>
      <p>This section is coming soon.</p>
    </div>
  );
}

const DEFAULT_SETTINGS = {
  who_can_ask:              'both',
  require_email_for_guests: true,
  enable_honeypot:          false,
  submission_rate_limit:    3,
  recaptcha_enabled:        false,
  recaptcha_site_key:       '',
  recaptcha_secret_key:     '',
};

const TABS = [
  { key: 'submission',    label: 'Submission' },
  { key: 'moderation',    label: 'Moderation' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'appearance',    label: 'Appearance' },
];

export default function Settings() {
  const [activeTab,   setActiveTab]   = useState('submission');
  const [settings,    setSettings]    = useState(null);
  const [draft,       setDraft]       = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saveStatus,  setSaveStatus]  = useState('saved');
  const [loadError,   setLoadError]   = useState(null);

  useEffect(() => {
    apiFetch('admin/settings')
      .then(data => {
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        setDraft(merged);
      })
      .catch(err => setLoadError(err.message));
  }, []);

  const isDirty = draft && JSON.stringify(draft) !== JSON.stringify(settings);

  async function handleSave() {
    setSaving(true);
    setSaveStatus('saved');
    try {
      const saved  = await apiFetch('admin/settings', { method: 'POST', body: draft });
      const merged = { ...DEFAULT_SETTINGS, ...saved };
      setSettings(merged);
      setDraft(merged);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setDraft({ ...settings });
    setSaveStatus('saved');
  }

  if (loadError) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg qq-state-msg--error">Failed to load settings: {loadError}</div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg">Loading settings…</div>
      </div>
    );
  }

  function renderContent() {
    if (activeTab === 'submission') return <SubmissionTab draft={draft} onChange={setDraft} />;
    const tab = TABS.find(t => t.key === activeTab);
    return <ComingSoonTab label={tab ? tab.label : activeTab} />;
  }

  return (
    <div className="qq-settings-body">
      <div className="qq-settings-sidebar">
        <div className="qq-settings-sidebar-label">Settings</div>
        {TABS.map(tab => (
          <div
            key={tab.key}
            className={`qq-settings-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div className="qq-settings-main">
        <div className="qq-settings-content">
          {renderContent()}

          <div className="qq-savebar">
            <div className="qq-savebar-msg">
              {saveStatus === 'error'
                ? <b className="qq-savebar-error">Save failed. Please try again.</b>
                : isDirty
                  ? <><b>Unsaved changes.</b> They will not apply until you save.</>
                  : 'All changes saved'}
            </div>
            <div className="qq-savebar-actions">
              <button
                className="btn btn-ghost"
                onClick={handleDiscard}
                disabled={!isDirty || saving}
              >
                Discard
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={!isDirty || saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
