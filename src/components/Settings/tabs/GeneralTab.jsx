import React from 'react';
import Toggle          from '../components/Toggle';
import ChipMultiselect from '../components/ChipMultiselect';
import { __ } from '../../../i18n';

export default function GeneralTab({ draft, onChange, categories, products }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  const SCOPE_OPTIONS = [
    {
      val:   'all',
      title: __( 'All products', 'quick-qa-for-woocommerce' ),
      help:  __( 'Q&A section appears on every product in your store. Recommended.', 'quick-qa-for-woocommerce' ),
    },
    {
      val:   'categories',
      title: __( 'Only specific categories', 'quick-qa-for-woocommerce' ),
      help:  __( 'Show Q&A only on products in the categories you pick.', 'quick-qa-for-woocommerce' ),
    },
    {
      val:   'products',
      title: __( 'Only specific products', 'quick-qa-for-woocommerce' ),
      help:  __( 'Hand-pick the products that show Q&A. Best for stores testing the feature on a few products first.', 'quick-qa-for-woocommerce' ),
    },
    {
      val:   'exclude',
      title: __( 'All products except…', 'quick-qa-for-woocommerce' ),
      help:  __( 'Show on everything by default, but exclude specific products (gift cards, digital files, services).', 'quick-qa-for-woocommerce' ),
    },
  ];

  return (
    <>
      <h1 className="qq-settings-page-title">{ __( 'General', 'quick-qa-for-woocommerce' ) }</h1>
      <p className="qq-settings-page-sub">{ __( 'How questions and answers appear on your product pages.', 'quick-qa-for-woocommerce' ) }</p>

      {draft.pause_submissions && (
        <div className="qq-settings-banner qq-settings-banner--warn">
          <span className="qq-settings-banner-mark">⏸</span>
          <div className="qq-settings-banner-body">
            <b>{ __( 'Submissions are paused.', 'quick-qa-for-woocommerce' ) }</b> { __( 'Customers cannot ask new questions until you resume below. Existing questions still display.', 'quick-qa-for-woocommerce' ) }
          </div>
        </div>
      )}

      {/* Where Q&A appears */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Where Q&A appears', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">
          { __( "Choose which products show the Q&A section. Useful when some products don't need it (gift cards, digital downloads).", 'quick-qa-for-woocommerce' ) }
        </div>

        <div className="qq-radio-group">
          {SCOPE_OPTIONS.map(opt => (
            <div key={opt.val}>
              <div
                className={`qq-radio-card${draft.enable_scope === opt.val ? ' selected' : ''}`}
                onClick={() => set('enable_scope', opt.val)}
              >
                <div className="qq-radio-circle" />
                <div className="qq-radio-text">
                  <div className="qq-radio-title">{opt.title}</div>
                  <div className="qq-radio-help">{opt.help}</div>
                </div>
              </div>

              {opt.val === 'categories' && draft.enable_scope === 'categories' && (
                <div className="qq-subfield">
                  <div className="qq-subfield-label">{ __( 'Enabled categories', 'quick-qa-for-woocommerce' ) }</div>
                  <ChipMultiselect
                    value={draft.enabled_categories}
                    options={categories}
                    onChange={v => set('enabled_categories', v)}
                    placeholder={ __( 'Pick a category', 'quick-qa-for-woocommerce' ) }
                  />
                </div>
              )}

              {opt.val === 'products' && draft.enable_scope === 'products' && (
                <div className="qq-subfield">
                  <div className="qq-subfield-label">{ __( 'Enabled products', 'quick-qa-for-woocommerce' ) }</div>
                  <ChipMultiselect
                    value={draft.enabled_products}
                    options={products}
                    onChange={v => set('enabled_products', v)}
                    placeholder={ __( 'Pick a product', 'quick-qa-for-woocommerce' ) }
                  />
                </div>
              )}

              {opt.val === 'exclude' && draft.enable_scope === 'exclude' && (
                <div className="qq-subfield">
                  <div className="qq-subfield-label">{ __( 'Excluded products', 'quick-qa-for-woocommerce' ) }</div>
                  <ChipMultiselect
                    value={draft.excluded_products}
                    options={products}
                    onChange={v => set('excluded_products', v)}
                    placeholder={ __( 'Pick a product', 'quick-qa-for-woocommerce' ) }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Display */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Display', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'Where the Q&A section appears on a product page and how it is laid out.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Position on product page', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Show inside a tab next to Description and Reviews, or as a section below the reviews.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.position}
              onChange={e => set('position', e.target.value)}
            >
              <option value="tab">{ __( 'Inside a product tab', 'quick-qa-for-woocommerce' ) }</option>
              <option value="below_reviews">{ __( 'Below the reviews section', 'quick-qa-for-woocommerce' ) }</option>
            </select>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Tab name', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'The label shown on the Q&A tab.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <input
              className="qq-settings-input qq-settings-input--md"
              type="text"
              value={draft.tab_name}
              onChange={e => set('tab_name', e.target.value)}
            />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Questions per page', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'How many questions show before pagination kicks in.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <div className="qq-settings-input-wrap">
              <input
                className="qq-settings-input qq-settings-input--short"
                type="number"
                min="1"
                max="100"
                value={draft.per_page}
                onChange={e => set('per_page', Math.max(1, parseInt(e.target.value, 10) || 10))}
              />
              <span className="qq-settings-input-unit">{ __( 'default 10', 'quick-qa-for-woocommerce' ) }</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sorting & filters */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Sorting & filters', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'How customers can browse questions on your product pages.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Default sort order', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Which order new visitors see first. They can change it themselves.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.default_sort}
              onChange={e => set('default_sort', e.target.value)}
            >
              <option value="recent">{ __( 'Most recent', 'quick-qa-for-woocommerce' ) }</option>
              <option value="upvoted">{ __( 'Most upvoted', 'quick-qa-for-woocommerce' ) }</option>
              <option value="oldest">{ __( 'Oldest first', 'quick-qa-for-woocommerce' ) }</option>
            </select>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Show search box', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Live search above the question list. Helps customers self-serve.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.show_search} onChange={v => set('show_search', v)} />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Show answered/unanswered filter', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Let customers filter to only see answered questions.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.show_filter} onChange={v => set('show_filter', v)} />
          </div>
        </div>
      </div>

      {/* Question limits */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Question limits', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'Keep questions readable and prevent abuse.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Maximum question length', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Characters allowed per question. Live counter shown to customer.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <div className="qq-settings-input-wrap">
              <input
                className="qq-settings-input qq-settings-input--short"
                type="number"
                min="50"
                max="2000"
                value={draft.max_length}
                onChange={e => set('max_length', Math.max(50, parseInt(e.target.value, 10) || 500))}
              />
              <span className="qq-settings-input-unit">{ __( 'default 500', 'quick-qa-for-woocommerce' ) }</span>
            </div>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Minimum question length', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Anything shorter is auto-rejected as low quality.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <div className="qq-settings-input-wrap">
              <input
                className="qq-settings-input qq-settings-input--short"
                type="number"
                min="1"
                max="200"
                value={draft.min_length}
                onChange={e => set('min_length', Math.max(1, parseInt(e.target.value, 10) || 10))}
              />
              <span className="qq-settings-input-unit">{ __( 'default 10', 'quick-qa-for-woocommerce' ) }</span>
            </div>
          </div>
        </div>
      </div>

      {/* When a question is answered */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'When a question is answered', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'What happens after the first answer is published.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Allow more answers from the community', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">
              { __( 'After your team answers, verified buyers and community members can still add their experience. Recommended for richer Q&A.', 'quick-qa-for-woocommerce' ) }
            </div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.allow_community} onChange={v => set('allow_community', v)} />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Auto-lock threads after', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">{ __( 'Stop accepting new answers after a period of inactivity. Set to “Never” to keep threads always open.', 'quick-qa-for-woocommerce' ) }</div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.auto_lock}
              onChange={e => set('auto_lock', e.target.value)}
            >
              <option value="never">{ __( 'Never (recommended)', 'quick-qa-for-woocommerce' ) }</option>
              <option value="30">{ __( '30 days', 'quick-qa-for-woocommerce' ) }</option>
              <option value="60">{ __( '60 days', 'quick-qa-for-woocommerce' ) }</option>
              <option value="90">{ __( '90 days', 'quick-qa-for-woocommerce' ) }</option>
            </select>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Operations', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">{ __( 'Temporarily control whether customers can submit new questions.', 'quick-qa-for-woocommerce' ) }</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Pause new submissions', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">
              { __( 'Hide the “Ask a question” form on all product pages. Useful when you have a backlog or are away. Existing Q&A still displays.', 'quick-qa-for-woocommerce' ) }
            </div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.pause_submissions} onChange={v => set('pause_submissions', v)} />
          </div>
        </div>
      </div>
    </>
  );
}
