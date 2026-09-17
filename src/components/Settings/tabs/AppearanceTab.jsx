import React, { useState, useEffect } from 'react';
import './AppearanceTab.css';
import Toggle from '../components/Toggle';
import AppearancePreview from '../components/AppearancePreview';
import { __ } from '../../../i18n';

const COLOR_PRESETS = [
  { name: __('Coral', 'quick-qa-for-woocommerce'),   hex: '#FF6B4A' },
  { name: __('Crimson', 'quick-qa-for-woocommerce'), hex: '#C44A3A' },
  { name: __('Amber', 'quick-qa-for-woocommerce'),   hex: '#E89A2C' },
  { name: __('Olive', 'quick-qa-for-woocommerce'),   hex: '#6A8E3F' },
  { name: __('Teal', 'quick-qa-for-woocommerce'),    hex: '#2E8B8B' },
  { name: __('Navy', 'quick-qa-for-woocommerce'),    hex: '#3B5BA5' },
  { name: __('Indigo', 'quick-qa-for-woocommerce'),  hex: '#6A4FB3' },
  { name: __('Magenta', 'quick-qa-for-woocommerce'), hex: '#C0398F' },
  { name: __('Slate', 'quick-qa-for-woocommerce'),   hex: '#5A6373' },
  { name: __('Black', 'quick-qa-for-woocommerce'),   hex: '#1F1D1A' },
];

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export default function AppearanceTab({ draft, onChange }) {
  const [cssOpen,      setCssOpen]      = useState(false);
  const [previewState, setPreviewState] = useState('logged-in');
  const [hexInput,     setHexInput]     = useState(draft.appr_color);

  // Keep hex input in sync when draft changes externally (discard / swatch from another source)
  useEffect(() => {
    setHexInput(draft.appr_color);
  }, [draft.appr_color]);

  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  function handleHexInput(val) {
    setHexInput(val);
    if (HEX_RE.test(val)) {
      set('appr_color', val);
    }
  }

  function handleSwatchClick(hex) {
    set('appr_color', hex);
    // hexInput will sync via the useEffect above
  }

  return (
    <>
      <h1 className="qq-settings-page-title">{__('Appearance', 'quick-qa-for-woocommerce')}</h1>
      <p className="qq-settings-page-sub">{__('How the Q&A widget looks on your product pages. Preview updates as you change.', 'quick-qa-for-woocommerce')}</p>

      <div className="qq-appr-grid">

        {/* ── Left: controls ── */}
        <div className="qq-appr-main">

          {/* Brand color */}
          <div className="qq-appr-section">
            <div className="qq-appr-section-title">{__('Brand color', 'quick-qa-for-woocommerce')}</div>
            <div className="qq-appr-section-desc">{__('Used for buttons, links, and accents.', 'quick-qa-for-woocommerce')}</div>

            <div className="qq-color-swatches">
              {COLOR_PRESETS.map(p => (
                <button
                  key={p.hex}
                  className={`qq-color-swatch${draft.appr_color.toUpperCase() === p.hex.toUpperCase() ? ' selected' : ''}`}
                  style={{ background: p.hex }}
                  title={p.name}
                  onClick={() => handleSwatchClick(p.hex)}
                />
              ))}
            </div>

            <div className="qq-color-hex-row">
              <input
                className="qq-color-hex-input"
                maxLength={7}
                value={hexInput}
                onChange={e => handleHexInput(e.target.value)}
                placeholder="#FF6B4A"
                spellCheck={false}
              />
              <div
                className="qq-color-hex-preview"
                style={{ background: HEX_RE.test(hexInput) ? hexInput : draft.appr_color }}
              />
              <span className="qq-color-hex-note">{__('or paste a custom hex', 'quick-qa-for-woocommerce')}</span>
            </div>
          </div>

          {/* Layout */}
          <div className="qq-appr-section">
            <div className="qq-appr-section-title">{__('Layout', 'quick-qa-for-woocommerce')}</div>
            <div className="qq-appr-section-desc">{__('Shape, spacing, and density.', 'quick-qa-for-woocommerce')}</div>

            <SwatchRow label={__('Corner radius', 'quick-qa-for-woocommerce')}>
              {[
                { value: 'sharp',   label: __('Sharp', 'quick-qa-for-woocommerce') },
                { value: 'rounded', label: __('Rounded', 'quick-qa-for-woocommerce') },
                { value: 'pill',    label: __('Pill', 'quick-qa-for-woocommerce') },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_radius === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_radius', opt.value)}>
                  <span className={`qq-swatch-shape ${opt.value}`} />
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label={__('Avatar shape', 'quick-qa-for-woocommerce')}>
              {[
                { value: 'circle', label: __('Circle', 'quick-qa-for-woocommerce') },
                { value: 'square', label: __('Square', 'quick-qa-for-woocommerce') },
                { value: 'hidden', label: __('Hidden', 'quick-qa-for-woocommerce') },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_avatar_style === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_avatar_style', opt.value)}>
                  <span className={`qq-swatch-shape ${opt.value}`} />
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label={__('Thread container', 'quick-qa-for-woocommerce')}>
              {[
                { value: 'bordered', label: __('Bordered', 'quick-qa-for-woocommerce') },
                { value: 'filled',   label: __('Filled background', 'quick-qa-for-woocommerce') },
                { value: 'minimal',  label: __('Minimal', 'quick-qa-for-woocommerce') },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_card_style === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_card_style', opt.value)}>
                  <span className={`qq-swatch-card-demo ${opt.value}`} />
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label={__('Density', 'quick-qa-for-woocommerce')}>
              {[
                { value: 'compact',     label: __('Compact', 'quick-qa-for-woocommerce') },
                { value: 'comfortable', label: __('Comfortable', 'quick-qa-for-woocommerce') },
                { value: 'spacious',    label: __('Spacious', 'quick-qa-for-woocommerce') },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_density === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_density', opt.value)}>
                  <span className={`qq-swatch-density ${opt.value}`}><span /><span /><span /></span>
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label={__('Font size', 'quick-qa-for-woocommerce')}>
              {[
                { value: 'small',  label: __('Small', 'quick-qa-for-woocommerce'),  abbr: __('S', 'quick-qa-for-woocommerce') },
                { value: 'medium', label: __('Medium', 'quick-qa-for-woocommerce'), abbr: __('M', 'quick-qa-for-woocommerce') },
                { value: 'large',  label: __('Large', 'quick-qa-for-woocommerce'),  abbr: __('L', 'quick-qa-for-woocommerce') },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_font_size === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_font_size', opt.value)}>
                  {opt.abbr}
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label={__('Font family', 'quick-qa-for-woocommerce')}>
              <select
                className="qq-settings-select"
                value={draft.appr_font_mode}
                onChange={e => set('appr_font_mode', e.target.value)}
                style={{ minWidth: 180 }}
              >
                <option value="inherit">{__('Inherit from theme', 'quick-qa-for-woocommerce')}</option>
                <option value="system">{__('System font', 'quick-qa-for-woocommerce')}</option>
                <option value="custom">{__('Custom…', 'quick-qa-for-woocommerce')}</option>
              </select>
            </SwatchRow>

            {draft.appr_font_mode === 'custom' && (
              <SwatchRow label={__('Font stack', 'quick-qa-for-woocommerce')}>
                <input
                  className="qq-settings-input"
                  value={draft.appr_font_custom}
                  onChange={e => set('appr_font_custom', e.target.value)}
                  placeholder='"Inter", sans-serif'
                  style={{ minWidth: 220, fontFamily: 'monospace', textAlign: 'left' }}
                  spellCheck={false}
                />
              </SwatchRow>
            )}
          </div>

          {/* What to show */}
          <div className="qq-appr-section">
            <div className="qq-appr-section-title">{__('What to show', 'quick-qa-for-woocommerce')}</div>
            <div className="qq-appr-section-desc">{__('Toggle elements on or off in the customer-facing widget.', 'quick-qa-for-woocommerce')}</div>

            <div className="qq-visibility-list">
              {[
                { key: 'appr_show_upvotes',       label: __('Upvote button on questions', 'quick-qa-for-woocommerce') },
                { key: 'appr_show_helpful',        label: __('"Was this helpful?" on answers', 'quick-qa-for-woocommerce') },
                { key: 'appr_show_role_badges',    label: __('Role badges (Verified buyer, Staff)', 'quick-qa-for-woocommerce') },
                { key: 'appr_show_best_highlight', label: __('"Best answer" gold highlight', 'quick-qa-for-woocommerce') },
                { key: 'appr_show_avatars',        label: __('Avatars', 'quick-qa-for-woocommerce') },
              ].map(item => (
                <div key={item.key} className="qq-visibility-row">
                  <span className="qq-visibility-row-label">{item.label}</span>
                  <Toggle checked={draft[item.key]} onChange={v => set(item.key, v)} />
                </div>
              ))}
            </div>
          </div>

          {/* Custom CSS collapsible */}
          <div className={`qq-css-collapsible${cssOpen ? ' open' : ''}`}>
            <div className="qq-css-collapsible-head" onClick={() => setCssOpen(o => !o)}>
              <div>
                <span className="qq-css-collapsible-title">{__('Custom CSS', 'quick-qa-for-woocommerce')}</span>
                <span className="qq-css-collapsible-sub">{__('For power users', 'quick-qa-for-woocommerce')}</span>
              </div>
              <span className="qq-css-collapsible-icon">›</span>
            </div>
            <div className="qq-css-collapsible-body">
              <div className="qq-css-collapsible-hint">
                {__('Injected into the Q&A widget on every product page. Scope selectors with', 'quick-qa-for-woocommerce')}{' '}
                <code className="qq-css-code-tag">.qa-widget</code>{' '}
                {__('to avoid affecting other parts of your site.', 'quick-qa-for-woocommerce')}
              </div>
              <textarea
                className="qq-custom-css-area"
                value={draft.appr_custom_css}
                onChange={e => set('appr_custom_css', e.target.value)}
                placeholder={`.qa-widget .qa-q-text { font-weight: 600; }\n.qa-widget .qa-answer { background: #fafafa; }`}
                spellCheck={false}
                rows={8}
              />
              <div className="qq-css-collapsible-warn">
                {__('⚠ Invalid CSS may break the widget layout. Test before saving.', 'quick-qa-for-woocommerce')}
              </div>
            </div>
          </div>

        </div>

        {/* ── Right: live preview ── */}
        <div className="qq-appr-sidebar">
          <div className="qq-preview-card">
            <div className="qq-preview-card-head">
              <span>{__('Preview', 'quick-qa-for-woocommerce')}</span>
              <div className="qq-preview-state-tabs">
                {[
                  { key: 'logged-in',  label: __('Logged in', 'quick-qa-for-woocommerce') },
                  { key: 'logged-out', label: __('Logged out', 'quick-qa-for-woocommerce') },
                ].map(s => (
                  <button
                    key={s.key}
                    className={`qq-preview-state-tab${previewState === s.key ? ' active' : ''}`}
                    onClick={() => setPreviewState(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="qq-preview-card-body">
              <AppearancePreview draft={draft} previewState={previewState} />
            </div>
          </div>

          {previewState === 'logged-out' && draft.who_can_ask !== 'logged-in' && (
            <p className="qq-preview-guest-note">
              {__('ℹ Your Submission settings allow guests to ask. Logged-out users can still ask questions — they just provide an email. Switch', 'quick-qa-for-woocommerce')}{' '}
              <b>{__('Who can ask', 'quick-qa-for-woocommerce')}</b> {__('to', 'quick-qa-for-woocommerce')} <b>{__('Logged-in only', 'quick-qa-for-woocommerce')}</b>{' '}
              {__('in Submission settings to force the login prompt above.', 'quick-qa-for-woocommerce')}
            </p>
          )}
        </div>

      </div>
    </>
  );
}

function SwatchRow({ label, children }) {
  return (
    <div className="qq-appr-row">
      <div className="qq-appr-row-label">{label}</div>
      <div className="qq-swatch-group">{children}</div>
    </div>
  );
}
