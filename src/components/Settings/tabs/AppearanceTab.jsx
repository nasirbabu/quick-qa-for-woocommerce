import React, { useState, useEffect } from 'react';
import './AppearanceTab.css';
import Toggle from '../components/Toggle';
import AppearancePreview from '../components/AppearancePreview';

const COLOR_PRESETS = [
  { name: 'Coral',   hex: '#FF6B4A' },
  { name: 'Crimson', hex: '#C44A3A' },
  { name: 'Amber',   hex: '#E89A2C' },
  { name: 'Olive',   hex: '#6A8E3F' },
  { name: 'Teal',    hex: '#2E8B8B' },
  { name: 'Navy',    hex: '#3B5BA5' },
  { name: 'Indigo',  hex: '#6A4FB3' },
  { name: 'Magenta', hex: '#C0398F' },
  { name: 'Slate',   hex: '#5A6373' },
  { name: 'Black',   hex: '#1F1D1A' },
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
      <h1 className="qq-settings-page-title">Appearance</h1>
      <p className="qq-settings-page-sub">How the Q&amp;A widget looks on your product pages. Preview updates as you change.</p>

      <div className="qq-appr-grid">

        {/* ── Left: controls ── */}
        <div className="qq-appr-main">

          {/* Brand color */}
          <div className="qq-appr-section">
            <div className="qq-appr-section-title">Brand color</div>
            <div className="qq-appr-section-desc">Used for buttons, links, and accents.</div>

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
              <span className="qq-color-hex-note">or paste a custom hex</span>
            </div>
          </div>

          {/* Layout */}
          <div className="qq-appr-section">
            <div className="qq-appr-section-title">Layout</div>
            <div className="qq-appr-section-desc">Shape, spacing, and density.</div>

            <SwatchRow label="Corner radius">
              {[
                { value: 'sharp',   label: 'Sharp' },
                { value: 'rounded', label: 'Rounded' },
                { value: 'pill',    label: 'Pill' },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_radius === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_radius', opt.value)}>
                  <span className={`qq-swatch-shape ${opt.value}`} />
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label="Avatar shape">
              {[
                { value: 'circle', label: 'Circle' },
                { value: 'square', label: 'Square' },
                { value: 'hidden', label: 'Hidden' },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_avatar_style === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_avatar_style', opt.value)}>
                  <span className={`qq-swatch-shape ${opt.value}`} />
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label="Thread container">
              {[
                { value: 'bordered', label: 'Bordered' },
                { value: 'filled',   label: 'Filled background' },
                { value: 'minimal',  label: 'Minimal' },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_card_style === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_card_style', opt.value)}>
                  <span className={`qq-swatch-card-demo ${opt.value}`} />
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label="Density">
              {[
                { value: 'compact',     label: 'Compact' },
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'spacious',    label: 'Spacious' },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_density === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_density', opt.value)}>
                  <span className={`qq-swatch-density ${opt.value}`}><span /><span /><span /></span>
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label="Font size">
              {[
                { value: 'small',  label: 'Small',  abbr: 'S' },
                { value: 'medium', label: 'Medium', abbr: 'M' },
                { value: 'large',  label: 'Large',  abbr: 'L' },
              ].map(opt => (
                <button key={opt.value} className={`qq-swatch-btn${draft.appr_font_size === opt.value ? ' selected' : ''}`} title={opt.label} onClick={() => set('appr_font_size', opt.value)}>
                  {opt.abbr}
                </button>
              ))}
            </SwatchRow>

            <SwatchRow label="Font family">
              <select
                className="qq-settings-select"
                value={draft.appr_font_mode}
                onChange={e => set('appr_font_mode', e.target.value)}
                style={{ minWidth: 180 }}
              >
                <option value="inherit">Inherit from theme</option>
                <option value="system">System font</option>
                <option value="custom">Custom…</option>
              </select>
            </SwatchRow>

            {draft.appr_font_mode === 'custom' && (
              <SwatchRow label="Font stack">
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
            <div className="qq-appr-section-title">What to show</div>
            <div className="qq-appr-section-desc">Toggle elements on or off in the customer-facing widget.</div>

            <div className="qq-visibility-list">
              {[
                { key: 'appr_show_upvotes',       label: 'Upvote button on questions' },
                { key: 'appr_show_helpful',        label: '"Was this helpful?" on answers' },
                { key: 'appr_show_role_badges',    label: 'Role badges (Verified buyer, Staff)' },
                { key: 'appr_show_best_highlight', label: '"Best answer" gold highlight' },
                { key: 'appr_show_avatars',        label: 'Avatars' },
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
                <span className="qq-css-collapsible-title">Custom CSS</span>
                <span className="qq-css-collapsible-sub">For power users</span>
              </div>
              <span className="qq-css-collapsible-icon">›</span>
            </div>
            <div className="qq-css-collapsible-body">
              <div className="qq-css-collapsible-hint">
                Injected into the Q&amp;A widget on every product page. Scope selectors with{' '}
                <code className="qq-css-code-tag">.qa-widget</code>{' '}
                to avoid affecting other parts of your site.
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
                ⚠ Invalid CSS may break the widget layout. Test before saving.
              </div>
            </div>
          </div>

        </div>

        {/* ── Right: live preview ── */}
        <div className="qq-appr-sidebar">
          <div className="qq-preview-card">
            <div className="qq-preview-card-head">
              <span>Preview</span>
              <div className="qq-preview-state-tabs">
                {[
                  { key: 'logged-in',  label: 'Logged in' },
                  { key: 'logged-out', label: 'Logged out' },
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
              ℹ Your Submission settings allow guests to ask. Logged-out users can still ask questions — they just provide an email.
              Switch <b>Who can ask</b> to <b>Logged-in only</b> in Submission settings to force the login prompt above.
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
