import React, { useState, useEffect, useCallback } from 'react';
import './SEOTab.css';
import Toggle from '../components/Toggle';

const SCHEMA_TYPE_OPTIONS = [
  {
    val:   'QAPage',
    title: 'QAPage (recommended for community Q&A)',
    help:  'Use when your Q&A is community-driven — customers ask questions, your team and other buyers answer. This is the honest choice for most product Q&A.',
  },
  {
    val:   'FAQPage',
    title: 'FAQPage (higher visibility, stricter rules)',
    help:  'Use only if your Q&A reads like genuine FAQs — store-authored questions with definitive answers. Google may show these as expanded rich results, but penalizes pages that misuse the type.',
  },
];

const INCLUDE_RULE_OPTIONS = [
  {
    val:   'all-answered',
    title: 'All answered questions (maximum reach)',
    help:  'Anything with at least one approved answer becomes searchable.',
  },
  {
    val:   'staff-only',
    title: 'Only Q&A with staff answers (highest authority)',
    help:  "Skip community-only answers. Slower to build a Q&A footprint but every entry has your team's stamp.",
  },
  {
    val:   'upvoted',
    title: 'Only Q&A above an upvote threshold',
    help:  "Use community signal to filter quality. Below the threshold, schema isn't generated.",
  },
];

async function fetchSeoPreview() {
  const base = window.quickQaAdmin?.restUrl || '';
  const res = await fetch(base + 'admin/settings/seo-preview', {
    headers: { 'X-WP-Nonce': window.quickQaAdmin?.nonce || '' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

export default function SEOTab({ draft, onChange, settings }) {
  const [preview,      setPreview]      = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [loading,      setLoading]      = useState(true);

  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  const loadPreview = useCallback(() => {
    setLoading(true);
    setPreviewError(null);
    fetchSeoPreview()
      .then(data => setPreview(data.schema))
      .catch(err => setPreviewError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const detectedSeoPlugin = settings?.detected_seo_plugin;
  const showDetectBanner  = !draft.seo_delegate_to_seo_plugin && !!detectedSeoPlugin;
  const schemaIsOff       = !draft.seo_enabled || draft.seo_delegate_to_seo_plugin;

  return (
    <>
      <h1 className="qq-settings-page-title">SEO</h1>
      <p className="qq-settings-page-sub">
        Make your Q&amp;A discoverable on Google. Q&amp;A pages are some of the highest-converting SEO content you can publish — real customer questions match real search queries.
      </p>

      {showDetectBanner && (
        <div className="qq-settings-banner qq-settings-banner--warn">
          <span className="qq-settings-banner-mark">⚠</span>
          <div className="qq-settings-banner-body">
            We detected <b>{detectedSeoPlugin}</b> on your site. If both plugins output schema for the same Q&amp;A, Google may penalize your site for duplicate structured data.{' '}
            <a onClick={() => set('seo_delegate_to_seo_plugin', true)}>Let {detectedSeoPlugin} handle schema instead →</a>
          </div>
        </div>
      )}

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Schema output</div>
        <div className="qq-settings-card-desc">
          Schema is structured data that helps search engines display your Q&amp;A as rich snippets — those expanded results that show questions and answers directly in Google.
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Output JSON-LD schema</div>
            <div className="qq-settings-field-help">Required for Q&amp;A to appear as rich snippets in Google. Recommended on.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.seo_enabled} onChange={v => set('seo_enabled', v)} />
          </div>
        </div>

        {draft.seo_enabled && (
          <div className="qq-settings-field-stacked">
            <div className="qq-settings-field-label">Schema type</div>
            <div className="qq-settings-field-help">Pick the type that best matches your content. This affects how Google interprets and displays your Q&amp;A.</div>
            <div className="qq-radio-group">
              {SCHEMA_TYPE_OPTIONS.map(opt => (
                <div
                  key={opt.val}
                  className={`qq-radio-card${draft.seo_schema_type === opt.val ? ' selected' : ''}`}
                  onClick={() => set('seo_schema_type', opt.val)}
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
        )}

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Let my SEO plugin handle schema instead</div>
            <div className="qq-settings-field-help">Turn this on if your SEO plugin (Yoast, RankMath, AIOSEO) already outputs Q&amp;A schema. Two plugins outputting schema for the same content can hurt SEO.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.seo_delegate_to_seo_plugin} onChange={v => set('seo_delegate_to_seo_plugin', v)} />
          </div>
        </div>
      </div>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">What gets included</div>
        <div className="qq-settings-card-desc">Not every Q&amp;A should go into schema. Quality matters — Google ranks rich snippets based on content depth and authority.</div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">Which questions appear in schema</div>
          <div className="qq-settings-field-help">Choose the rule that matches your moderation philosophy.</div>
          <div className="qq-radio-group">
            {INCLUDE_RULE_OPTIONS.map(opt => (
              <div key={opt.val}>
                <div
                  className={`qq-radio-card${draft.seo_include_rule === opt.val ? ' selected' : ''}`}
                  onClick={() => set('seo_include_rule', opt.val)}
                >
                  <div className="qq-radio-circle" />
                  <div className="qq-radio-text">
                    <div className="qq-radio-title">{opt.title}</div>
                    <div className="qq-radio-help">{opt.help}</div>
                  </div>
                </div>

                {opt.val === 'upvoted' && draft.seo_include_rule === 'upvoted' && (
                  <div className="qq-subfield">
                    <div className="qq-subfield-label">Minimum upvotes</div>
                    <div className="qq-settings-input-wrap">
                      <input
                        className="qq-settings-input qq-settings-input--short"
                        type="number"
                        min="0"
                        max="999"
                        value={draft.seo_upvote_min}
                        onChange={e => set('seo_upvote_min', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      />
                      <span className="qq-settings-input-unit">upvotes required</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Maximum questions per product</div>
            <div className="qq-settings-field-help">Google ignores schema beyond ~10 questions per page anyway, and large schema blocks slow page load. The most upvoted answered questions are picked.</div>
          </div>
          <div className="qq-settings-field-control">
            <div className="qq-settings-input-wrap">
              <input
                className="qq-settings-input qq-settings-input--short"
                type="number"
                min="1"
                max="20"
                value={draft.seo_max_per_product}
                onChange={e => set('seo_max_per_product', Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 10)))}
              />
              <span className="qq-settings-input-unit">default 10</span>
            </div>
          </div>
        </div>
      </div>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Schema preview</div>
        <div className="qq-settings-card-desc">
          The actual JSON-LD currently being injected into a product page's <code>&lt;head&gt;</code>, based on your last-saved settings. Save changes above, then refresh to see them reflected here. Verify it in Google's Rich Results Test before publishing.
        </div>

        {schemaIsOff ? (
          <div className="qq-settings-empty">
            <div className="qq-settings-empty-mark">∅</div>
            <div className="qq-settings-empty-title">No schema is being output</div>
            <div>{!draft.seo_enabled ? 'JSON-LD output is turned off above.' : 'Your SEO plugin is handling schema instead.'}</div>
          </div>
        ) : loading ? (
          <div className="qq-settings-empty">Loading preview…</div>
        ) : previewError ? (
          <div className="qq-settings-empty">Couldn't load preview: {previewError}</div>
        ) : !preview ? (
          <div className="qq-settings-empty">
            <div className="qq-settings-empty-mark">∅</div>
            <div className="qq-settings-empty-title">No qualifying Q&amp;A yet</div>
            <div>Once a question in scope has an approved answer matching your rules above, its schema will preview here.</div>
          </div>
        ) : (
          <div className="qq-schema-preview-wrap">
            <div className="qq-schema-preview-head">
              <span>{preview['@type']} sample</span>
              <div className="qq-schema-preview-actions">
                <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer">↗ Test in Google Rich Results</a>
                <button type="button" className="btn btn-ghost btn-sm" onClick={loadPreview}>Refresh</button>
              </div>
            </div>
            <pre className="qq-schema-preview-body">{JSON.stringify(preview, null, 2)}</pre>
          </div>
        )}
      </div>
    </>
  );
}
