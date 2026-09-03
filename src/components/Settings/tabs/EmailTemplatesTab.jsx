import React, { useState, useEffect, useRef, useCallback } from 'react';
import './EmailTemplatesTab.css';
import Toggle from '../components/Toggle';

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
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

const RECIPIENT_LABELS = {
  admin: 'to Admin / staff',
  asker: 'to Customer',
  participants: 'to Participants',
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
        <div className="qq-state-msg">Loading email templates…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg qq-state-msg--error">Failed to load email templates: {error}</div>
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
      <h1 className="qq-settings-page-title">Email templates</h1>
      <p className="qq-settings-page-sub">
        {enabledCount} of {ids.length} are currently enabled.
      </p>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Default sender</div>
        <div className="qq-settings-card-desc">Used for every email below, unless a template overrides it.</div>
        <GlobalSenderFields global={resource.global} onSave={saveGlobal} saving={savingGlobal} />
      </div>

      <div className="qq-email-list">
        <div className="qq-email-group-label">Admin emails ({adminIds.length})</div>
        {adminIds.map(id => (
          <EmailTemplateRow key={id} id={id} template={resource.templates[id]} onToggle={toggleEnabled} onEdit={setEditingId} />
        ))}

        <div className="qq-email-group-label">Customer emails ({customerIds.length})</div>
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
      <div className="qq-email-row-edit">Edit →</div>
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
        <div className="qq-settings-field-label">Sender name</div>
        <input
          className="qq-settings-input qq-settings-input--full"
          value={draft.sender_name}
          onChange={e => set('sender_name', e.target.value)}
        />
      </div>
      <div className="qq-settings-field-stacked">
        <div className="qq-settings-field-label">Sender email address</div>
        <input
          className="qq-settings-input qq-settings-input--full"
          type="email"
          value={draft.sender_address}
          onChange={e => set('sender_address', e.target.value)}
        />
      </div>
      <div className="qq-settings-field-stacked">
        <div className="qq-settings-field-label">Reply-to address</div>
        <input
          className="qq-settings-input qq-settings-input--full"
          type="email"
          value={draft.reply_to}
          onChange={e => set('reply_to', e.target.value)}
        />
      </div>
      <div className="qq-settings-field-stacked">
        <div className="qq-settings-field-label">Default email footer</div>
        <div className="qq-settings-field-help">Appended automatically to customer-facing emails.</div>
        <textarea
          className="qq-settings-textarea"
          rows={3}
          value={draft.footer}
          onChange={e => set('footer', e.target.value)}
        />
      </div>
      <div className="qq-email-global-actions">
        <button className="btn btn-primary" disabled={!dirty || saving} onClick={() => onSave(draft)}>
          {saving ? 'Saving…' : 'Save sender settings'}
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
      <div className="qq-email-back" onClick={onBack}>&larr; Back to email templates</div>
      <h1 className="qq-settings-page-title">{template.name}</h1>
      <p className="qq-settings-page-sub">{template.description}</p>

      <div className="qq-email-editor-grid">
        <div className="qq-email-editor-main">
          <div className="qq-settings-card">
            <div className="qq-settings-card-title">Email content</div>
            <div className="qq-settings-card-desc">Click any variable on the right to insert it at your cursor.</div>

            <div className="qq-settings-field-stacked">
              <div className="qq-settings-field-label">Subject line</div>
              <input
                className="qq-settings-input qq-settings-input--full"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div className="qq-settings-field-stacked">
              <div className="qq-settings-field-label">Email body</div>
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
                {testStatus === 'sending' ? 'Sending…' : 'Send test email to me'}
              </button>
              {testStatus === 'sent' && <span className="qq-email-test-status qq-email-test-status--ok">Sent!</span>}
              {testStatus === 'error' && <span className="qq-email-test-status qq-email-test-status--error">Failed to send.</span>}
              <span className="qq-settings-field-help">Sends a copy with sample data to your admin email.</span>
            </div>
          </div>

          <div className="qq-settings-card">
            <div className="qq-settings-card-title">Email behavior</div>

            <div className="qq-settings-field">
              <div className="qq-settings-field-info">
                <div className="qq-settings-field-label">Enable this email</div>
                <div className="qq-settings-field-help">
                  {enabled ? 'This email will be sent automatically.' : 'This email is currently off and will not be sent.'}
                </div>
              </div>
              <div className="qq-settings-field-control">
                <Toggle checked={enabled} onChange={setEnabled} />
              </div>
            </div>

            <div className="qq-settings-field-stacked">
              <div className="qq-settings-field-label">Sender name override</div>
              <div className="qq-settings-field-help">Optional. Falls back to your default sender name ({global.sender_name}).</div>
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
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>

        <div className="qq-email-editor-sidebar">
          <div className="qq-settings-card">
            <div className="qq-settings-card-title">Available variables</div>
            <div className="qq-settings-card-desc">Click to insert at your cursor position in the body.</div>
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
            <div className="qq-settings-card-title">Live preview</div>
            {preview ? (
              <div className="qq-email-preview">
                <div className="qq-email-preview-meta">
                  <div><b>From:</b> {preview.from}</div>
                  <div><b>To:</b> {preview.to}</div>
                </div>
                <div className="qq-email-preview-subject">{preview.subject}</div>
                <div className="qq-email-preview-body">{preview.body}</div>
              </div>
            ) : (
              <div className="qq-settings-field-help">Loading preview…</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
