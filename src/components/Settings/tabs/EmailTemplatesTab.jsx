import React, { useState, useEffect, useRef, useCallback } from 'react';
import './EmailTemplatesTab.css';
import Toggle from '../components/Toggle';
import { __, sprintf } from '../../../i18n';

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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || __('Request failed', 'quick-qa-for-woocommerce'));
  return data;
}

const RECIPIENT_LABELS = {
  admin: __('to Admin / staff', 'quick-qa-for-woocommerce'),
  asker: __('to Customer', 'quick-qa-for-woocommerce'),
  participants: __('to Participants', 'quick-qa-for-woocommerce'),
};

export default function EmailTemplatesTab() {
  const [resource, setResource] = useState(null); // { global, templates }
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [savingGlobal, setSavingGlobal] = useState(false);

  const load = useCallback(() => {
    return apiFetch('admin/email-templates')
      .then(data => { setResource(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleEnabled(id, val) {
    setResource(r => ({ ...r, templates: { ...r.templates, [id]: { ...r.templates[id], enabled: val } } }));
    apiFetch('admin/email-templates', { method: 'POST', body: { templates: { [id]: { enabled: val } } } })
      .then(setResource)
      .catch(() => load());
  }

  function saveGlobal(next) {
    setSavingGlobal(true);
    apiFetch('admin/email-templates', { method: 'POST', body: { global: next } })
      .then(setResource)
      .finally(() => setSavingGlobal(false));
  }

  if (loading) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg">{__('Loading email templates…', 'quick-qa-for-woocommerce')}</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg qq-state-msg--error">
          {/* translators: %s is the error message returned by the server */}
          {sprintf(__('Failed to load email templates: %s', 'quick-qa-for-woocommerce'), error)}
        </div>
      </div>
    );
  }
  if (!resource) return null;

  if (editingId) {
    const template = resource.templates[editingId];
    return (
      <EmailTemplateEditor
        id={editingId}
        template={template}
        global={resource.global}
        onBack={() => setEditingId(null)}
        onSaved={updated => {
          setResource(r => ({ ...r, templates: { ...r.templates, [editingId]: updated } }));
        }}
      />
    );
  }

  const ids           = Object.keys(resource.templates);
  const enabledCount  = ids.filter(id => resource.templates[id].enabled).length;
  const adminIds      = ids.filter(id => resource.templates[id].group === 'admin');
  const customerIds   = ids.filter(id => resource.templates[id].group === 'customer');

  return (
    <>
      <h1 className="qq-settings-page-title">{__('Email templates', 'quick-qa-for-woocommerce')}</h1>
      <p className="qq-settings-page-sub">
        {sprintf(
          // translators: 1: number of email templates currently enabled, 2: total number of email templates
          __('%1$d of %2$d are currently enabled.', 'quick-qa-for-woocommerce'),
          enabledCount,
          ids.length
        )}
      </p>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('Default sender', 'quick-qa-for-woocommerce')}</div>
        <div className="qq-settings-card-desc">{__('Used for every email below, unless a template overrides it.', 'quick-qa-for-woocommerce')}</div>
        <GlobalSenderFields global={resource.global} onSave={saveGlobal} saving={savingGlobal} />
      </div>

      <div className="qq-email-list">
        <div className="qq-email-group-label">
          {/* translators: %d is the number of admin-facing email templates */}
          {sprintf(__('Admin emails (%d)', 'quick-qa-for-woocommerce'), adminIds.length)}
        </div>
        {adminIds.map(id => (
          <EmailTemplateRow key={id} id={id} template={resource.templates[id]} onToggle={toggleEnabled} onEdit={setEditingId} />
        ))}

        <div className="qq-email-group-label">
          {/* translators: %d is the number of customer-facing email templates */}
          {sprintf(__('Customer emails (%d)', 'quick-qa-for-woocommerce'), customerIds.length)}
        </div>
        {customerIds.map(id => (
          <EmailTemplateRow key={id} id={id} template={resource.templates[id]} onToggle={toggleEnabled} onEdit={setEditingId} />
        ))}
      </div>
    </>
  );
}

function EmailTemplateRow({ id, template, onToggle, onEdit }) {
  return (
    <div className={`qq-email-row${template.enabled ? '' : ' disabled'}`} onClick={() => onEdit(id)}>
      <div className="qq-email-row-toggle" onClick={e => e.stopPropagation()}>
        <Toggle checked={template.enabled} onChange={val => onToggle(id, val)} />
      </div>
      <div className="qq-email-row-info">
        <div className="qq-email-row-name">{template.name}</div>
        <div className="qq-email-row-subject">{template.subject}</div>
      </div>
      <div className="qq-email-row-recipient">{RECIPIENT_LABELS[template.recipient] || ''}</div>
      <div className="qq-email-row-edit">{__('Edit →', 'quick-qa-for-woocommerce')}</div>
    </div>
  );
}

function GlobalSenderFields({ global, onSave, saving }) {
  const [draft, setDraft] = useState(global);
  useEffect(() => setDraft(global), [global]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(global);

  function set(key, val) { setDraft(d => ({ ...d, [key]: val })); }

  return (
    <>
      <div className="qq-settings-field-stacked">
        <div className="qq-settings-field-label">{__('Sender name', 'quick-qa-for-woocommerce')}</div>
        <input
          className="qq-settings-input qq-settings-input--full"
          value={draft.sender_name}
          onChange={e => set('sender_name', e.target.value)}
        />
      </div>
      <div className="qq-settings-field-stacked">
        <div className="qq-settings-field-label">{__('Sender email address', 'quick-qa-for-woocommerce')}</div>
        <input
          className="qq-settings-input qq-settings-input--full"
          type="email"
          value={draft.sender_address}
          onChange={e => set('sender_address', e.target.value)}
        />
      </div>
      <div className="qq-settings-field-stacked">
        <div className="qq-settings-field-label">{__('Reply-to address', 'quick-qa-for-woocommerce')}</div>
        <input
          className="qq-settings-input qq-settings-input--full"
          type="email"
          value={draft.reply_to}
          onChange={e => set('reply_to', e.target.value)}
        />
      </div>
      <div className="qq-settings-field-stacked">
        <div className="qq-settings-field-label">{__('Default email footer', 'quick-qa-for-woocommerce')}</div>
        <div className="qq-settings-field-help">{__('Appended automatically to customer-facing emails.', 'quick-qa-for-woocommerce')}</div>
        <textarea
          className="qq-settings-textarea"
          rows={3}
          value={draft.footer}
          onChange={e => set('footer', e.target.value)}
        />
      </div>
      <div className="qq-email-global-actions">
        <button className="btn btn-primary" disabled={!dirty || saving} onClick={() => onSave(draft)}>
          {saving ? __('Saving…', 'quick-qa-for-woocommerce') : __('Save sender settings', 'quick-qa-for-woocommerce')}
        </button>
      </div>
    </>
  );
}

function EmailTemplateEditor({ id, template, global, onBack, onSaved }) {
  const [subject, setSubject]               = useState(template.subject);
  const [body, setBody]                     = useState(template.body);
  const [enabled, setEnabled]               = useState(template.enabled);
  const [senderOverride, setSenderOverride] = useState(template.sender_override);
  const [preview, setPreview]               = useState(null);
  const [saving, setSaving]                 = useState(false);
  const [testStatus, setTestStatus]         = useState(null);

  const bodyRef     = useRef(null);
  const debounceRef = useRef(null);

  const dirty = subject !== template.subject
    || body !== template.body
    || enabled !== template.enabled
    || senderOverride !== template.sender_override;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      apiFetch(`admin/email-templates/${id}/preview`, { method: 'POST', body: { subject, body } })
        .then(setPreview)
        .catch(() => {});
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [id, subject, body]);

  function insertVariable(token) {
    const el = bodyRef.current;
    const tokenText = `{${token}}`;
    if (!el) {
      setBody(b => b + tokenText);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end   = el.selectionEnd ?? body.length;
    const next  = body.slice(0, start) + tokenText + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + tokenText.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function handleSave() {
    setSaving(true);
    apiFetch('admin/email-templates', {
      method: 'POST',
      body: { templates: { [id]: { subject, body, enabled, sender_override: senderOverride } } },
    })
      .then(data => onSaved(data.templates[id]))
      .finally(() => setSaving(false));
  }

  function handleSendTest() {
    setTestStatus('sending');
    apiFetch(`admin/email-templates/${id}/test`, { method: 'POST', body: { subject, body } })
      .then(res => setTestStatus(res.sent ? 'sent' : 'error'))
      .catch(() => setTestStatus('error'));
  }

  return (
    <>
      <div className="qq-email-back" onClick={onBack}>{__('← Back to email templates', 'quick-qa-for-woocommerce')}</div>
      <h1 className="qq-settings-page-title">{template.name}</h1>
      <p className="qq-settings-page-sub">{template.description}</p>

      <div className="qq-email-editor-grid">
        <div className="qq-email-editor-main">
          <div className="qq-settings-card">
            <div className="qq-settings-card-title">{__('Email content', 'quick-qa-for-woocommerce')}</div>
            <div className="qq-settings-card-desc">{__('Click any variable on the right to insert it at your cursor.', 'quick-qa-for-woocommerce')}</div>

            <div className="qq-settings-field-stacked">
              <div className="qq-settings-field-label">{__('Subject line', 'quick-qa-for-woocommerce')}</div>
              <input
                className="qq-settings-input qq-settings-input--full"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div className="qq-settings-field-stacked">
              <div className="qq-settings-field-label">{__('Email body', 'quick-qa-for-woocommerce')}</div>
              <textarea
                ref={bodyRef}
                className="qq-settings-textarea qq-email-body-textarea"
                rows={12}
                value={body}
                onChange={e => setBody(e.target.value)}
              />
            </div>

            <div className="qq-email-test-row">
              <button className="btn btn-ghost" onClick={handleSendTest} disabled={testStatus === 'sending'}>
                {testStatus === 'sending' ? __('Sending…', 'quick-qa-for-woocommerce') : __('Send test email to me', 'quick-qa-for-woocommerce')}
              </button>
              {testStatus === 'sent' && <span className="qq-email-test-status qq-email-test-status--ok">{__('Sent!', 'quick-qa-for-woocommerce')}</span>}
              {testStatus === 'error' && <span className="qq-email-test-status qq-email-test-status--error">{__('Failed to send.', 'quick-qa-for-woocommerce')}</span>}
              <span className="qq-settings-field-help">{__('Sends a copy with sample data to your admin email.', 'quick-qa-for-woocommerce')}</span>
            </div>
          </div>

          <div className="qq-settings-card">
            <div className="qq-settings-card-title">{__('Email behavior', 'quick-qa-for-woocommerce')}</div>

            <div className="qq-settings-field">
              <div className="qq-settings-field-info">
                <div className="qq-settings-field-label">{__('Enable this email', 'quick-qa-for-woocommerce')}</div>
                <div className="qq-settings-field-help">
                  {enabled ? __('This email will be sent automatically.', 'quick-qa-for-woocommerce') : __('This email is currently off and will not be sent.', 'quick-qa-for-woocommerce')}
                </div>
              </div>
              <div className="qq-settings-field-control">
                <Toggle checked={enabled} onChange={setEnabled} />
              </div>
            </div>

            <div className="qq-settings-field-stacked">
              <div className="qq-settings-field-label">{__('Sender name override', 'quick-qa-for-woocommerce')}</div>
              <div className="qq-settings-field-help">
                {/* translators: %s is the store's default sender name */}
                {sprintf(__('Optional. Falls back to your default sender name (%s).', 'quick-qa-for-woocommerce'), global.sender_name)}
              </div>
              <input
                className="qq-settings-input qq-settings-input--full"
                value={senderOverride}
                onChange={e => setSenderOverride(e.target.value)}
                placeholder={global.sender_name}
              />
            </div>
          </div>

          <div className="qq-email-save-row">
            <button className="btn btn-primary" onClick={handleSave} disabled={!dirty || saving}>
              {saving ? __('Saving…', 'quick-qa-for-woocommerce') : __('Save changes', 'quick-qa-for-woocommerce')}
            </button>
          </div>
        </div>

        <div className="qq-email-editor-sidebar">
          <div className="qq-settings-card">
            <div className="qq-settings-card-title">{__('Available variables', 'quick-qa-for-woocommerce')}</div>
            <div className="qq-settings-card-desc">{__('Click to insert at your cursor position in the body.', 'quick-qa-for-woocommerce')}</div>
            <div className="qq-email-var-list">
              {Object.entries(template.variables).map(([token, desc]) => (
                <div key={token} className="qq-email-var" onClick={() => insertVariable(token)}>
                  <code className="qq-email-var-code">{`{${token}}`}</code>
                  <div className="qq-email-var-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="qq-settings-card">
            <div className="qq-settings-card-title">{__('Live preview', 'quick-qa-for-woocommerce')}</div>
            {preview ? (
              <div className="qq-email-preview">
                <div className="qq-email-preview-meta">
                  <div><b>{__('From:', 'quick-qa-for-woocommerce')}</b> {preview.from}</div>
                  <div><b>{__('To:', 'quick-qa-for-woocommerce')}</b> {preview.to}</div>
                </div>
                <div className="qq-email-preview-subject">{preview.subject}</div>
                <div className="qq-email-preview-body">{preview.body}</div>
              </div>
            ) : (
              <div className="qq-settings-field-help">{__('Loading preview…', 'quick-qa-for-woocommerce')}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
