import React, { useState, useEffect } from 'react';
import './Settings.css';
import { __, sprintf } from '../../i18n';
import { DEFAULT_SETTINGS, TABS } from './constants';
import GeneralTab    from './tabs/GeneralTab';
import SubmissionTab from './tabs/SubmissionTab';
import ModerationTab    from './tabs/ModerationTab';
import NotificationsTab from './tabs/NotificationsTab';
import CommunityTab    from './tabs/CommunityTab';
import AppearanceTab   from './tabs/AppearanceTab';
import EmailTemplatesTab from './tabs/EmailTemplatesTab';
import SEOTab           from './tabs/SEOTab';
import ImportExportTab  from './tabs/ImportExportTab';

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
  if (!res.ok) throw new Error(data?.message || __( 'Request failed', 'quick-qa-for-woocommerce' ));
  return data;
}

function ComingSoonTab({ label }) {
  return (
    <div className="qq-settings-coming-soon">
      <div className="qq-settings-coming-soon-title">{label}</div>
      <p>{ __( 'This section is coming soon.', 'quick-qa-for-woocommerce' ) }</p>
    </div>
  );
}

export default function Settings() {
  const isPro = Boolean(window.quickQaAdmin?.isPro);
  const [activeTab,  setActiveTab]  = useState('general');
  const [settings,   setSettings]   = useState(null);
  const [draft,      setDraft]      = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [saveError,  setSaveError]  = useState('');
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
    } catch (err) {
      setSaveError(err.message);
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
        <div className="qq-state-msg qq-state-msg--error">
          { sprintf(
            // translators: %s is the error message returned by the settings API request.
            __( 'Failed to load settings: %s', 'quick-qa-for-woocommerce' ),
            loadError
          ) }
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg">{ __( 'Loading settings…', 'quick-qa-for-woocommerce' ) }</div>
      </div>
    );
  }

  function renderTab() {
    switch (activeTab) {
      case 'general':
        return <GeneralTab draft={draft} onChange={setDraft} categories={categories} products={products} />;
      case 'submission':
        return <SubmissionTab draft={draft} onChange={setDraft} isPro={isPro} />;
      case 'moderation':
        return <ModerationTab draft={draft} onChange={setDraft} />;
      case 'notifications':
        return <NotificationsTab draft={draft} onChange={setDraft} isPro={isPro} />;
      case 'community':
        return <CommunityTab draft={draft} onChange={setDraft} />;
      case 'appearance':
        return <AppearanceTab draft={draft} onChange={setDraft} isPro={isPro} />;
      case 'email-templates':
        return <EmailTemplatesTab isPro={isPro} />;
      case 'seo':
        return <SEOTab draft={draft} onChange={setDraft} settings={settings} isPro={isPro} />;
      case 'import-export':
        return <ImportExportTab categories={categories} isPro={isPro} />;
      default: {
        const tab = TABS.find(t => t.key === activeTab);
        return <ComingSoonTab label={tab?.label ?? activeTab} />;
      }
    }
  }

  return (
    <div className="qq-settings-body">
      <div className="qq-settings-sidebar">
        <div className="qq-settings-sidebar-label">{ __( 'Settings', 'quick-qa-for-woocommerce' ) }</div>
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

          {activeTab !== 'email-templates' && activeTab !== 'import-export' && (
            <div className="qq-savebar">
              <div className="qq-savebar-msg">
                {saveStatus === 'error'
                  ? <b className="qq-savebar-error">{ saveError || __( 'Save failed. Please try again.', 'quick-qa-for-woocommerce' ) }</b>
                  : isDirty
                    ? <><b>{ __( 'Unsaved changes.', 'quick-qa-for-woocommerce' ) }</b> { __( 'They will not apply until you save.', 'quick-qa-for-woocommerce' ) }</>
                    : __( 'All changes saved', 'quick-qa-for-woocommerce' )}
              </div>
              <div className="qq-savebar-actions">
                <button className="btn btn-ghost"    onClick={handleDiscard} disabled={!isDirty || saving}>{ __( 'Discard', 'quick-qa-for-woocommerce' ) }</button>
                <button className="btn btn-primary"  onClick={handleSave}    disabled={!isDirty || saving}>
                  {saving ? __( 'Saving…', 'quick-qa-for-woocommerce' ) : __( 'Save changes', 'quick-qa-for-woocommerce' )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
