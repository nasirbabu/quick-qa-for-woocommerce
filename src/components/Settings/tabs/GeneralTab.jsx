import React from 'react';
import Toggle          from '../components/Toggle';
import ChipMultiselect from '../components/ChipMultiselect';

const SCOPE_OPTIONS = [
  {
    val:   'all',
    title: 'All products',
    help:  'Q&A section appears on every product in your store. Recommended.',
  },
  {
    val:   'categories',
    title: 'Only specific categories',
    help:  'Show Q&A only on products in the categories you pick.',
  },
  {
    val:   'products',
    title: 'Only specific products',
    help:  'Hand-pick the products that show Q&A. Best for stores testing the feature on a few products first.',
  },
  {
    val:   'exclude',
    title: 'All products except…',
    help:  'Show on everything by default, but exclude specific products (gift cards, digital files, services).',
  },
];

export default function GeneralTab({ draft, onChange, categories, products }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  return (
    <>
      <h1 className="qq-settings-page-title">General</h1>
      <p className="qq-settings-page-sub">How questions and answers appear on your product pages.</p>

      {draft.pause_submissions && (
        <div className="qq-settings-banner qq-settings-banner--warn">
          <span className="qq-settings-banner-mark">⏸</span>
          <div className="qq-settings-banner-body">
            <b>Submissions are paused.</b> Customers cannot ask new questions until you resume below. Existing questions still display.
          </div>
        </div>
      )}

      {/* Where Q&A appears */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Where Q&amp;A appears</div>
        <div className="qq-settings-card-desc">
          Choose which products show the Q&amp;A section. Useful when some products don&apos;t need it (gift cards, digital downloads).
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
                  <div className="qq-subfield-label">Enabled categories</div>
                  <ChipMultiselect
                    value={draft.enabled_categories}
                    options={categories}
                    onChange={v => set('enabled_categories', v)}
                    placeholder="Pick a category"
                  />
                </div>
              )}

              {opt.val === 'products' && draft.enable_scope === 'products' && (
                <div className="qq-subfield">
                  <div className="qq-subfield-label">Enabled products</div>
                  <ChipMultiselect
                    value={draft.enabled_products}
                    options={products}
                    onChange={v => set('enabled_products', v)}
                    placeholder="Pick a product"
                  />
                </div>
              )}

              {opt.val === 'exclude' && draft.enable_scope === 'exclude' && (
                <div className="qq-subfield">
                  <div className="qq-subfield-label">Excluded products</div>
                  <ChipMultiselect
                    value={draft.excluded_products}
                    options={products}
                    onChange={v => set('excluded_products', v)}
                    placeholder="Pick a product"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Display */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Display</div>
        <div className="qq-settings-card-desc">Where the Q&amp;A section appears on a product page and how it is laid out.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Position on product page</div>
            <div className="qq-settings-field-help">Show inside a tab next to Description and Reviews, or as a section below the reviews.</div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.position}
              onChange={e => set('position', e.target.value)}
            >
              <option value="tab">Inside a product tab</option>
              <option value="below_reviews">Below the reviews section</option>
            </select>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Tab name</div>
            <div className="qq-settings-field-help">The label shown on the Q&amp;A tab.</div>
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
            <div className="qq-settings-field-label">Questions per page</div>
            <div className="qq-settings-field-help">How many questions show before pagination kicks in.</div>
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
              <span className="qq-settings-input-unit">default 10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sorting & filters */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Sorting &amp; filters</div>
        <div className="qq-settings-card-desc">How customers can browse questions on your product pages.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Default sort order</div>
            <div className="qq-settings-field-help">Which order new visitors see first. They can change it themselves.</div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.default_sort}
              onChange={e => set('default_sort', e.target.value)}
            >
              <option value="recent">Most recent</option>
              <option value="upvoted">Most upvoted</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Show search box</div>
            <div className="qq-settings-field-help">Live search above the question list. Helps customers self-serve.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.show_search} onChange={v => set('show_search', v)} />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Show answered/unanswered filter</div>
            <div className="qq-settings-field-help">Let customers filter to only see answered questions.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.show_filter} onChange={v => set('show_filter', v)} />
          </div>
        </div>
      </div>

      {/* Question limits */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Question limits</div>
        <div className="qq-settings-card-desc">Keep questions readable and prevent abuse.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Maximum question length</div>
            <div className="qq-settings-field-help">Characters allowed per question. Live counter shown to customer.</div>
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
              <span className="qq-settings-input-unit">default 500</span>
            </div>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Minimum question length</div>
            <div className="qq-settings-field-help">Anything shorter is auto-rejected as low quality.</div>
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
              <span className="qq-settings-input-unit">default 10</span>
            </div>
          </div>
        </div>
      </div>

      {/* When a question is answered */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">When a question is answered</div>
        <div className="qq-settings-card-desc">What happens after the first answer is published.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Allow more answers from the community</div>
            <div className="qq-settings-field-help">
              After your team answers, verified buyers and community members can still add their experience. Recommended for richer Q&amp;A.
            </div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.allow_community} onChange={v => set('allow_community', v)} />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Auto-lock threads after</div>
            <div className="qq-settings-field-help">Stop accepting new answers after a period of inactivity. Set to &ldquo;Never&rdquo; to keep threads always open.</div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.auto_lock}
              onChange={e => set('auto_lock', e.target.value)}
            >
              <option value="never">Never (recommended)</option>
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Operations</div>
        <div className="qq-settings-card-desc">Temporarily control whether customers can submit new questions.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Pause new submissions</div>
            <div className="qq-settings-field-help">
              Hide the &ldquo;Ask a question&rdquo; form on all product pages. Useful when you have a backlog or are away. Existing Q&amp;A still displays.
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
