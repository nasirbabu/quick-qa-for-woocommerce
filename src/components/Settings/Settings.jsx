import React, { useState, useEffect } from 'react';
import './Settings.css';
import { DEFAULT_SETTINGS, TABS } from './constants';
import GeneralTab    from './tabs/GeneralTab';
import SubmissionTab from './tabs/SubmissionTab';
import ModerationTab    from './tabs/ModerationTab';
import NotificationsTab from './tabs/NotificationsTab';
import CommunityTab    from './tabs/CommunityTab';
import AppearanceTab   from './tabs/AppearanceTab';

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

function ComingSoonTab({ label }) {
  return (
    <div className="qq-settings-coming-soon">
      <div className="qq-settings-coming-soon-title">{label}</div>
      <p>This section is coming soon.</p>
    </div>
  );
}

export default function Settings() {
  const [activeTab,  setActiveTab]  = useState('general');
  const [settings,   setSettings]   = useState(null);
  const [draft,      setDraft]      = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [loadError,  setLoadError]  = useState(null);
  const [categories, setCategories] = useState([]);
  const [products,   setProducts]   = useState([]);

  useEffect(() => {
    apiFetch('admin/settings')
      .then(data => {
        const merged = { ...DEFAULT_SETTINGS, ...data };
        setSettings(merged);
        setDraft(merged);
      })
      .catch(err => setLoadError(err.message));

    apiFetch('admin/settings/categories').then(setCategories).catch(() => {});
    apiFetch('admin/settings/products').then(setProducts).catch(() => {});
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

  function renderTab() {
    switch (activeTab) {
      case 'general':
        return <GeneralTab draft={draft} onChange={setDraft} categories={categories} products={products} />;
      case 'submission':
        return <SubmissionTab draft={draft} onChange={setDraft} />;
      case 'moderation':
        return <ModerationTab draft={draft} onChange={setDraft} />;
      case 'notifications':
        return <NotificationsTab draft={draft} onChange={setDraft} />;
      case 'community':
        return <CommunityTab draft={draft} onChange={setDraft} />;
      case 'appearance':
        return <AppearanceTab draft={draft} onChange={setDraft} />;
      default: {
        const tab = TABS.find(t => t.key === activeTab);
        return <ComingSoonTab label={tab?.label ?? activeTab} />;
      }
    }
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
          {renderTab()}

          <div className="qq-savebar">
            <div className="qq-savebar-msg">
              {saveStatus === 'error'
                ? <b className="qq-savebar-error">Save failed. Please try again.</b>
                : isDirty
                  ? <><b>Unsaved changes.</b> They will not apply until you save.</>
                  : 'All changes saved'}
            </div>
            <div className="qq-savebar-actions">
              <button className="btn btn-ghost"    onClick={handleDiscard} disabled={!isDirty || saving}>Discard</button>
              <button className="btn btn-primary"  onClick={handleSave}    disabled={!isDirty || saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
