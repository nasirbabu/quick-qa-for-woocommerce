import React, { useState, useEffect, useCallback } from 'react';
import './SEOTab.css';
import Toggle from '../components/Toggle';
import { __, sprintf } from '../../../i18n';

const SCHEMA_TYPE_OPTIONS = [
  {
    val:   'QAPage',
    title: __('QAPage (recommended for community Q&A)', 'quick-qa-for-woocommerce'),
    help:  __('Use when your Q&A is community-driven — customers ask questions, your team and other buyers answer. This is the honest choice for most product Q&A.', 'quick-qa-for-woocommerce'),
  },
  {
    val:   'FAQPage',
    title: __('FAQPage (higher visibility, stricter rules)', 'quick-qa-for-woocommerce'),
    help:  __('Use only if your Q&A reads like genuine FAQs — store-authored questions with definitive answers. Google may show these as expanded rich results, but penalizes pages that misuse the type.', 'quick-qa-for-woocommerce'),
  },
];

const INCLUDE_RULE_OPTIONS = [
  {
    val:   'all-answered',
    title: __('All answered questions (maximum reach)', 'quick-qa-for-woocommerce'),
    help:  __('Anything with at least one approved answer becomes searchable.', 'quick-qa-for-woocommerce'),
  },
  {
    val:   'staff-only',
    title: __('Only Q&A with staff answers (highest authority)', 'quick-qa-for-woocommerce'),
    help:  __("Skip community-only answers. Slower to build a Q&A footprint but every entry has your team's stamp.", 'quick-qa-for-woocommerce'),
  },
  {
    val:   'upvoted',
    title: __('Only Q&A above an upvote threshold', 'quick-qa-for-woocommerce'),
    help:  __("Use community signal to filter quality. Below the threshold, schema isn't generated.", 'quick-qa-for-woocommerce'),
  },
];

async function fetchSeoPreview() {
  const base = window.quickQaAdmin?.restUrl || '';
  const res = await fetch(base + 'admin/settings/seo-preview', {
    headers: { 'X-WP-Nonce': window.quickQaAdmin?.nonce || '' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || __('Request failed', 'quick-qa-for-woocommerce'));
  return data;
}

const ProBadge = () => <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>;

export default function SEOTab({ draft, onChange, settings, isPro }) {
  const [preview,      setPreview]      = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [loading,      setLoading]      = useState(true);

  // Free tier: no schema is output server-side, so show it as off (the
  // saved value is kept in the draft and applies again once Pro is active).
  function on(key) {
    return Boolean(isPro && draft[key]);
  }

  function set(key, val) {
    if (!isPro) return;
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

  useEffect(() => { if (isPro) loadPreview(); }, [isPro, loadPreview]);

  const detectedSeoPlugin = settings?.detected_seo_plugin;
  const showDetectBanner  = isPro && !draft.seo_delegate_to_seo_plugin && !!detectedSeoPlugin;
  const schemaIsOff       = !on('seo_enabled') || on('seo_delegate_to_seo_plugin');
  const radioClass        = selected => `qq-radio-card${selected ? ' selected' : ''}${isPro ? '' : ' disabled'}`;

  return (
    <>
      <h1 className="qq-settings-page-title">{__('SEO', 'quick-qa-for-woocommerce')}</h1>
      <p className="qq-settings-page-sub">
        {__('Make your Q&A discoverable on Google. Q&A pages are some of the highest-converting SEO content you can publish — real customer questions match real search queries.', 'quick-qa-for-woocommerce')}
      </p>

      {showDetectBanner && (
        <div className="qq-settings-banner qq-settings-banner--warn">
          <span className="qq-settings-banner-mark">⚠</span>
          <div className="qq-settings-banner-body">
            {__('We detected', 'quick-qa-for-woocommerce')} <b>{detectedSeoPlugin}</b> {__('on your site. If both plugins output schema for the same Q&A, Google may penalize your site for duplicate structured data.', 'quick-qa-for-woocommerce')}{' '}
            <a onClick={() => set('seo_delegate_to_seo_plugin', true)}>
              {/* translators: %s is the name of the detected SEO plugin (e.g. Yoast, RankMath) */}
              {sprintf(__('Let %s handle schema instead →', 'quick-qa-for-woocommerce'), detectedSeoPlugin)}
            </a>
          </div>
        </div>
      )}

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('Schema output', 'quick-qa-for-woocommerce')}</div>
        <div className="qq-settings-card-desc">
          {__('Schema is structured data that helps search engines display your Q&A as rich snippets — those expanded results that show questions and answers directly in Google.', 'quick-qa-for-woocommerce')}
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{__('Output JSON-LD schema', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
            <div className="qq-settings-field-help">{__('Required for Q&A to appear as rich snippets in Google. Recommended on.', 'quick-qa-for-woocommerce')}</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={on('seo_enabled')} onChange={v => set('seo_enabled', v)} disabled={!isPro} />
          </div>
        </div>

        {on('seo_enabled') && (
          <div className="qq-settings-field-stacked">
            <div className="qq-settings-field-label">{__('Schema type', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
            <div className="qq-settings-field-help">{__('Pick the type that best matches your content. This affects how Google interprets and displays your Q&A.', 'quick-qa-for-woocommerce')}</div>
            <div className="qq-radio-group">
              {SCHEMA_TYPE_OPTIONS.map(opt => (
                <div
                  key={opt.val}
                  className={radioClass(draft.seo_schema_type === opt.val)}
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
            <div className="qq-settings-field-label">{__('Let my SEO plugin handle schema instead', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
            <div className="qq-settings-field-help">{__('Turn this on if your SEO plugin (Yoast, RankMath, AIOSEO) already outputs Q&A schema. Two plugins outputting schema for the same content can hurt SEO.', 'quick-qa-for-woocommerce')}</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={on('seo_delegate_to_seo_plugin')} onChange={v => set('seo_delegate_to_seo_plugin', v)} disabled={!isPro} />
          </div>
        </div>
      </div>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('What gets included', 'quick-qa-for-woocommerce')}</div>
        <div className="qq-settings-card-desc">{__('Not every Q&A should go into schema. Quality matters — Google ranks rich snippets based on content depth and authority.', 'quick-qa-for-woocommerce')}</div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">{__('Which questions appear in schema', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
          <div className="qq-settings-field-help">{__('Choose the rule that matches your moderation philosophy.', 'quick-qa-for-woocommerce')}</div>
          <div className="qq-radio-group">
            {INCLUDE_RULE_OPTIONS.map(opt => (
              <div key={opt.val}>
                <div
                  className={radioClass(draft.seo_include_rule === opt.val)}
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
                    <div className="qq-subfield-label">{__('Minimum upvotes', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
                    <div className="qq-settings-input-wrap">
                      <input
                        className="qq-settings-input qq-settings-input--short"
                        type="number"
                        min="0"
                        max="999"
                        value={draft.seo_upvote_min}
                        onChange={e => set('seo_upvote_min', Math.max(0, parseInt(e.target.value, 10) || 0))}
                        disabled={!isPro}
                      />
                      <span className="qq-settings-input-unit">{__('upvotes required', 'quick-qa-for-woocommerce')}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{__('Maximum questions per product', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
            <div className="qq-settings-field-help">{__('Google ignores schema beyond ~10 questions per page anyway, and large schema blocks slow page load. The most upvoted answered questions are picked.', 'quick-qa-for-woocommerce')}</div>
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
                disabled={!isPro}
              />
              <span className="qq-settings-input-unit">{__('default 10', 'quick-qa-for-woocommerce')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('Schema preview', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
        <div className="qq-settings-card-desc">
          {__("The actual JSON-LD currently being injected into a product page's", 'quick-qa-for-woocommerce')} <code>&lt;head&gt;</code>{__(", based on your last-saved settings. Save changes above, then refresh to see them reflected here. Verify it in Google's Rich Results Test before publishing.", 'quick-qa-for-woocommerce')}
        </div>

        {!isPro ? (
          <div className="qq-settings-empty">
            <div className="qq-settings-empty-mark">∅</div>
            <div className="qq-settings-empty-title">{__('No schema is being output', 'quick-qa-for-woocommerce')}</div>
            <div>{__('Schema output and preview are part of Askora Pro.', 'quick-qa-for-woocommerce')}</div>
          </div>
        ) : schemaIsOff ? (
          <div className="qq-settings-empty">
            <div className="qq-settings-empty-mark">∅</div>
            <div className="qq-settings-empty-title">{__('No schema is being output', 'quick-qa-for-woocommerce')}</div>
            <div>{!draft.seo_enabled ? __('JSON-LD output is turned off above.', 'quick-qa-for-woocommerce') : __('Your SEO plugin is handling schema instead.', 'quick-qa-for-woocommerce')}</div>
          </div>
        ) : loading ? (
          <div className="qq-settings-empty">{__('Loading preview…', 'quick-qa-for-woocommerce')}</div>
        ) : previewError ? (
          <div className="qq-settings-empty">
            {/* translators: %s is the error message returned by the server */}
            {sprintf(__("Couldn't load preview: %s", 'quick-qa-for-woocommerce'), previewError)}
          </div>
        ) : !preview ? (
          <div className="qq-settings-empty">
            <div className="qq-settings-empty-mark">∅</div>
            <div className="qq-settings-empty-title">{__('No qualifying Q&A yet', 'quick-qa-for-woocommerce')}</div>
            <div>{__('Once a question in scope has an approved answer matching your rules above, its schema will preview here.', 'quick-qa-for-woocommerce')}</div>
          </div>
        ) : (
          <div className="qq-schema-preview-wrap">
            <div className="qq-schema-preview-head">
              {/* translators: %s is the schema type, e.g. QAPage or FAQPage */}
              <span>{sprintf(__('%s sample', 'quick-qa-for-woocommerce'), preview['@type'])}</span>
              <div className="qq-schema-preview-actions">
                <a href="https://search.google.com/test/rich-results" target="_blank" rel="noreferrer">{__('↗ Test in Google Rich Results', 'quick-qa-for-woocommerce')}</a>
                <button type="button" className="btn btn-ghost btn-sm" onClick={loadPreview}>{__('Refresh', 'quick-qa-for-woocommerce')}</button>
              </div>
            </div>
            <pre className="qq-schema-preview-body">{JSON.stringify(preview, null, 2)}</pre>
          </div>
        )}
      </div>
    </>
  );
}
