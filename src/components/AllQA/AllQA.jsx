import React, { useState, useEffect, useCallback, useRef } from 'react';
import QuestionList from './QuestionList';
import QuestionDetail from './QuestionDetail';

const TABS = [
  { key: 'all',       label: 'All' },
  { key: 'pending-q', label: 'Pending questions' },
  { key: 'pending-a', label: 'Pending answers' },
  { key: 'flagged',   label: 'Flagged' },
  { key: 'answered',  label: 'Answered' },
  { key: 'rejected',  label: 'Rejected' },
];

// ── API helpers ──────────────────────────────────────────────────────────────

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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  return res.json();
}

// ── Data transformation ──────────────────────────────────────────────────────

function makeInitials(name) {
  return (name || 'U').trim().split(/\s+/).map(w => w[0] || '').join('').substring(0, 2).toUpperCase();
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = (Date.now() - new Date(dateStr + 'Z').getTime()) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function transformItem(q) {
  const customer       = q.author_name || q.guest_name || 'Anonymous';
  const pendingAnswers  = (q.answers || []).filter(a => a.status === 'pending');
  const approvedAnswers = (q.answers || []).filter(a => a.status === 'approved');

  let tab, status;
  if (q.status === 'rejected') {
    tab = 'rejected'; status = 'rejected';
  } else if (q.status === 'flagged') {
    tab = 'flagged'; status = 'flagged';
  } else if (q.status === 'pending') {
    tab = 'pending-q'; status = 'pending';
  } else {
    if (pendingAnswers.length > 0) {
      tab = 'pending-a'; status = 'pending-answer';
    } else {
      tab = 'answered'; status = 'answered';
    }
  }

  const pa = pendingAnswers[0] || null;

  return {
    id:        String(q.id),
    dbId:      parseInt(q.id, 10),
    tab,
    status,
    text:      q.question_text || '',
    customer,
    avatar:    makeInitials(customer),
    role:      q.is_verified_buyer == '1' ? 'verified-buyer' : (parseInt(q.user_id) > 0 ? 'customer' : 'guest'),
    product:   q.product_title || `Product #${q.product_id}`,
    productId: parseInt(q.product_id, 10),
    upvotes:   parseInt(q.upvotes, 10) || 0,
    createdAt: q.created_at ? new Date(q.created_at + 'Z').getTime() : 0,
    time:      timeAgo(q.created_at),
    answers:   approvedAnswers.map(a => ({
      id:      String(a.id),
      dbId:    parseInt(a.id, 10),
      author:  a.author_name || 'Team',
      avatar:  makeInitials(a.author_name || 'Team'),
      role:    a.answer_type === 'admin' ? 'staff' : 'community',
      time:    timeAgo(a.created_at),
      text:    a.answer_text || '',
      helpful: parseInt(a.upvotes, 10) || 0,
      isBest:  false,
    })),
    pendingAnswer: pa ? {
      id:     String(pa.id),
      dbId:   parseInt(pa.id, 10),
      author: pa.author_name || 'User',
      avatar: makeInitials(pa.author_name || 'User'),
      role:   pa.answer_type === 'admin' ? 'staff' : 'community',
      text:   pa.answer_text || '',
      time:   timeAgo(pa.created_at),
      meta:   [pa.answer_type === 'admin' ? 'Staff answer' : 'Community answer'],
    } : null,
    flagCount: parseInt(q.flag_count, 10) || 0,
    flags:     (q.flags || []).map(f => ({
      reason:   f.reason || '',
      reporter: f.reporter_name || 'A customer',
      time:     timeAgo(f.created_at),
    })),
    followups: [],
  };
}

// ── Tab helpers ──────────────────────────────────────────────────────────────

function filterByTab(questions, tab) {
  if (tab === 'all') return questions;
  return questions.filter(q => q.tab === tab);
}

// Returns [[productName, count], …] sorted by count desc for the given items.
function getProductsInTab(items) {
  const map = {};
  items.forEach(q => { map[q.product] = (map[q.product] || 0) + 1; });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

const SORT_OPTIONS = [
  { key: 'recent',  label: 'Most recent' },
  { key: 'upvoted', label: 'Most upvoted' },
  { key: 'oldest',  label: 'Oldest first' },
];

function applySortToItems(items, sortBy) {
  const copy = [...items];
  if (sortBy === 'upvoted') copy.sort((a, b) => b.upvotes - a.upvotes);
  if (sortBy === 'oldest')  copy.sort((a, b) => a.createdAt - b.createdAt);
  // 'recent' keeps the API order (created_at DESC), so no sort needed.
  return copy;
}

function getCounts(questions) {
  return {
    all:         questions.length,
    'pending-q': questions.filter(q => q.tab === 'pending-q').length,
    'pending-a': questions.filter(q => q.tab === 'pending-a').length,
    flagged:     questions.filter(q => q.tab === 'flagged').length,
    answered:    questions.filter(q => q.tab === 'answered').length,
    rejected:    questions.filter(q => q.tab === 'rejected').length,
  };
}

// ── Bulk bar (replaces queue head when ≥1 item selected) ─────────────────────

function BulkBar({ selectedCount, totalCount, allSelected, partial, onToggleAll, onSelectAll, onClear, actions, saving }) {
  const masterCls = allSelected ? '' : partial ? 'partial' : 'empty';
  return (
    <div className="qq-bulk-bar">
      <div className="qq-bulk-bar-left">
        <div className={`qq-bulk-bar-master ${masterCls}`} onClick={onToggleAll}>
          {allSelected ? '✓' : partial ? '−' : ''}
        </div>
        <span className="qq-bulk-bar-count">{selectedCount} selected</span>
        {!allSelected && (
          <span className="qq-bulk-bar-link" onClick={onSelectAll}>
            Select all {totalCount}
          </span>
        )}
        <span className="qq-bulk-bar-link" onClick={onClear}>Clear</span>
      </div>
      <div className="qq-bulk-bar-actions">
        {actions.map(a => (
          <button
            key={a.key}
            className={`qq-bulk-action-btn${a.primary ? ' primary' : ''}${a.danger ? ' danger' : ''}`}
            onClick={a.onClick}
            disabled={saving}
          >
            {saving ? '…' : a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Bulk summary (replaces conversation panel when ≥1 item selected) ──────────

function BulkSummary({ selectedItems, activeTab }) {
  const count             = selectedItems.length;
  const productsAffected  = new Set(selectedItems.map(q => q.product)).size;
  const totalUpvotes      = selectedItems.reduce((s, q) => s + q.upvotes, 0);
  const hints = {
    'pending-q': 'Approve to publish them, or reject if they are spam or off-topic.',
    'pending-a': 'Approve to publish these community answers with their trust badges.',
    'flagged':   'Dismiss flags to restore content, or delete if the flags are valid.',
  };
  const hint = hints[activeTab] || 'Choose a bulk action above.';

  return (
    <div className="qq-bulk-summary">
      <div className="qq-bulk-summary-art">📦</div>
      <div className="qq-bulk-summary-num">{count}</div>
      <div className="qq-bulk-summary-label">{count === 1 ? 'item' : 'items'} selected</div>
      <div className="qq-bulk-summary-card">
        <div className="qq-bulk-summary-row">
          <span>Across products</span><b>{productsAffected}</b>
        </div>
        <div className="qq-bulk-summary-row">
          <span>Total upvotes</span><b>{totalUpvotes}</b>
        </div>
      </div>
      <div className="qq-bulk-summary-tip">{hint}</div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AllQA() {
  const [questions,      setQuestions]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [activeTab,      setActiveTab]      = useState('pending-q');
  const [selectedId,     setSelectedId]     = useState(null);
  const [search,         setSearch]         = useState('');
  const [saving,         setSaving]         = useState(false);
  const [productFilter,  setProductFilter]  = useState(null);
  const [filterOpen,     setFilterOpen]     = useState(false);
  const [sortBy,         setSortBy]         = useState('recent');
  const [sortOpen,       setSortOpen]       = useState(false);
  const [selectedIds,    setSelectedIds]    = useState([]);
  const filterRef = useRef(null);
  const sortRef   = useRef(null);

  const loadQuestions = useCallback(async () => {
    const data  = await apiFetch('admin/questions');
    const items = data.map(transformItem);
    setQuestions(items);
    return items;
  }, []);

  useEffect(() => {
    loadQuestions()
      .then(items => {
        setLoading(false);
        const first = items.find(q => q.tab === 'pending-q');
        setSelectedId(first ? first.id : (items[0] ? items[0].id : null));
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [loadQuestions]);

  const counts          = getCounts(questions);
  const tabItems        = filterByTab(questions, activeTab);
  const productFiltered = productFilter
    ? tabItems.filter(q => q.product === productFilter)
    : tabItems;
  const sortedItems     = applySortToItems(productFiltered, sortBy);
  const visibleItems    = search.trim()
    ? sortedItems.filter(q =>
        q.text.toLowerCase().includes(search.toLowerCase()) ||
        q.customer.toLowerCase().includes(search.toLowerCase()) ||
        q.product.toLowerCase().includes(search.toLowerCase())
      )
    : sortedItems;

  const selectedItem = questions.find(q => q.id === selectedId) || null;
  const products     = getProductsInTab(tabItems);

  // Close filter popover on outside click.
  useEffect(() => {
    if (!filterOpen) return;
    function handleOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [filterOpen]);

  // Close sort popover on outside click.
  useEffect(() => {
    if (!sortOpen) return;
    function handleOutside(e) {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [sortOpen]);

  const bulkMode   = selectedIds.length > 0;
  const allSelected = selectedIds.length === visibleItems.length && visibleItems.length > 0;
  const partial     = selectedIds.length > 0 && selectedIds.length < visibleItems.length;

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function handleToggleAll() {
    const ids = visibleItems.map(q => q.id);
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  }
  function handleSelectAllInTab() {
    setSelectedIds(visibleItems.map(q => q.id));
  }
  function handleClearSelection() { setSelectedIds([]); }

  function getBulkActions() {
    const run = action => () => handleBulkAction(action);
    if (activeTab === 'pending-q') return [
      { key: 'approve', label: 'Approve', primary: true, onClick: run('approve') },
      { key: 'reject',  label: 'Reject',  danger: true,  onClick: run('reject') },
    ];
    if (activeTab === 'pending-a') return [
      { key: 'approve-answers', label: 'Approve', primary: true, onClick: run('approve-answers') },
      { key: 'reject',          label: 'Reject',  danger: true,  onClick: run('reject') },
    ];
    if (activeTab === 'flagged') return [
      { key: 'dismiss-flags', label: 'Dismiss flags', onClick: run('dismiss-flags') },
      { key: 'delete',        label: 'Delete', danger: true, onClick: run('delete') },
    ];
    return [{ key: 'delete', label: 'Delete', danger: true, onClick: run('delete') }];
  }

  async function handleBulkAction(action) {
    const items = questions.filter(q => selectedIds.includes(q.id));
    setSaving(true);
    try {
      if (action === 'approve') {
        await Promise.all(items.map(i => apiFetch(`admin/questions/${i.dbId}`, { method: 'POST', body: { status: 'approved' } })));
      } else if (action === 'reject') {
        await Promise.all(items.map(i => apiFetch(`admin/questions/${i.dbId}`, { method: 'POST', body: { status: 'rejected' } })));
      } else if (action === 'approve-answers') {
        await Promise.all(items.filter(i => i.pendingAnswer).map(i =>
          apiFetch(`admin/answers/${i.pendingAnswer.dbId}`, { method: 'POST', body: { status: 'approved' } })
        ));
      } else if (action === 'dismiss-flags') {
        await Promise.all(items.map(i => apiFetch(`admin/questions/${i.dbId}/dismiss-flags`, { method: 'POST', body: {} })));
      } else if (action === 'delete') {
        await Promise.all(items.map(i => apiFetch(`admin/questions/${i.dbId}/delete`, { method: 'POST', body: {} })));
      }
      setSelectedIds([]);
      const refreshed = await loadQuestions();
      const remaining = filterByTab(refreshed, activeTab);
      setSelectedId(remaining[0] ? remaining[0].id : null);
    } catch (err) {
      console.error('Bulk action failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSelectedIds([]);
    setProductFilter(null);
    setFilterOpen(false);
    const first = filterByTab(questions, tab)[0];
    setSelectedId(first ? first.id : null);
  }

  async function handleAction(action, id, payload) {
    const item = questions.find(q => q.id === id);
    if (!item) return;

    setSaving(true);
    try {
      if (action === 'approve-question') {
        await apiFetch(`admin/questions/${item.dbId}`, { method: 'POST', body: { status: 'approved' } });
        await loadQuestions();
        setActiveTab('answered');
        setSelectedId(id);

      } else if (action === 'reject') {
        await apiFetch(`admin/questions/${item.dbId}`, { method: 'POST', body: { status: 'rejected' } });
        const refreshed = await loadQuestions();
        const next = filterByTab(refreshed, activeTab).find(q => q.id !== id);
        setSelectedId(next ? next.id : null);

      } else if (action === 'approve-answer') {
        const pa = item.pendingAnswer;
        if (!pa) return;
        await apiFetch(`admin/answers/${pa.dbId}`, { method: 'POST', body: { status: 'approved' } });
        await loadQuestions();
        setActiveTab('answered');
        setSelectedId(id);

      } else if (action === 'reject-answer') {
        const pa = item.pendingAnswer;
        if (!pa) return;
        await apiFetch(`admin/answers/${pa.dbId}`, { method: 'POST', body: { status: 'rejected' } });
        const refreshed = await loadQuestions();
        const next = filterByTab(refreshed, 'pending-a').find(q => q.id !== id);
        setSelectedId(next ? next.id : (refreshed[0] ? refreshed[0].id : null));

      } else if (action === 'publish') {
        await apiFetch(`admin/questions/${item.dbId}/answer`, {
          method: 'POST',
          body: { answer_text: payload },
        });
        await loadQuestions();
        setActiveTab('answered');
        setSelectedId(id);

      } else if (action === 'dismiss-flags') {
        await apiFetch(`admin/questions/${item.dbId}/dismiss-flags`, { method: 'POST', body: {} });
        const refreshed = await loadQuestions();
        const remaining = filterByTab(refreshed, 'flagged').filter(q => q.id !== id);
        setSelectedId(remaining[0] ? remaining[0].id : null);
        if (filterByTab(refreshed, 'flagged').length === 0) setActiveTab('answered');

      } else if (action === 'delete-flagged') {
        await apiFetch(`admin/questions/${item.dbId}/delete`, { method: 'POST', body: {} });
        const refreshed = await loadQuestions();
        const remaining = filterByTab(refreshed, 'flagged');
        setSelectedId(remaining[0] ? remaining[0].id : null);
        if (remaining.length === 0) setActiveTab('all');
      }
    } catch (err) {
      console.error('Quick QA action failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg">Loading Q&amp;A data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg qq-state-msg--error">Failed to load: {error}</div>
      </div>
    );
  }

  return (
    <div className="qq-page">
      <div className="qq-top">
        <div className="qq-top-left">
          <span className="qq-page-label">All Q&amp;A</span>
          <div className="qq-search-wrap">
            <input
              type="text"
              className="qq-search"
              placeholder="Search questions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="qq-tabs">
        {TABS.map(tab => (
          <div
            key={tab.key}
            className={[
              'qq-tab',
              activeTab === tab.key ? 'active' : '',
              tab.key === 'flagged' && counts.flagged > 0 ? 'qq-tab-warn' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
            <span className="qq-tab-num">{counts[tab.key]}</span>
          </div>
        ))}
      </div>

      <div className="qq-body">
        <div className={`qq-queue${bulkMode ? ' qq-bulk-mode' : ''}`}>
          {bulkMode ? (
            <BulkBar
              selectedCount={selectedIds.length}
              totalCount={visibleItems.length}
              allSelected={allSelected}
              partial={partial}
              onToggleAll={handleToggleAll}
              onSelectAll={handleSelectAllInTab}
              onClear={handleClearSelection}
              actions={getBulkActions()}
              saving={saving}
            />
          ) : (
            <div className="qq-queue-head">
              <div className="qq-queue-head-left">
                <span>{visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}</span>
                {productFilter && (
                  <span className="qq-active-filter">
                    {productFilter}
                    <span
                      className="qq-active-filter-x"
                      onClick={e => { e.stopPropagation(); setProductFilter(null); }}
                    >×</span>
                  </span>
                )}
              </div>
              {products.length > 1 && (
                <div
                  ref={filterRef}
                  className={`qq-filter-dropdown${productFilter ? ' active' : ''}`}
                  onClick={e => { e.stopPropagation(); setFilterOpen(v => !v); setSortOpen(false); }}
                >
                  {productFilter ? '✓ Filtered' : 'Filter ▾'}
                  {filterOpen && (
                    <div className="qq-filter-popover" onClick={e => e.stopPropagation()}>
                      <div
                        className={`qq-filter-popover-item${!productFilter ? ' selected' : ''}`}
                        onClick={() => { setProductFilter(null); setFilterOpen(false); }}
                      >
                        All products
                        <span className="qq-filter-popover-count">{tabItems.length}</span>
                      </div>
                      {products.map(([name, count]) => (
                        <div
                          key={name}
                          className={`qq-filter-popover-item${productFilter === name ? ' selected' : ''}`}
                          onClick={() => { setProductFilter(name); setFilterOpen(false); }}
                        >
                          {name}
                          <span className="qq-filter-popover-count">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div
                ref={sortRef}
                className={`qq-filter-dropdown${sortBy !== 'recent' ? ' active' : ''}`}
                onClick={e => { e.stopPropagation(); setSortOpen(v => !v); setFilterOpen(false); }}
              >
                {sortBy !== 'recent' ? '✓ Sorted' : 'Sort ▾'}
                {sortOpen && (
                  <div className="qq-filter-popover" onClick={e => e.stopPropagation()}>
                    {SORT_OPTIONS.map(opt => (
                      <div
                        key={opt.key}
                        className={`qq-filter-popover-item${sortBy === opt.key ? ' selected' : ''}`}
                        onClick={() => { setSortBy(opt.key); setSortOpen(false); }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <QuestionList
            items={visibleItems}
            selectedId={selectedId}
            onSelect={id => { setSelectedId(id); setSelectedIds([]); }}
            showAllBadge={activeTab === 'all'}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            bulkMode={bulkMode}
          />
          <div className="qq-page-foot">
            <span>{visibleItems.length} of {counts[activeTab] ?? questions.length}</span>
          </div>
        </div>

        {bulkMode ? (
          <BulkSummary
            selectedItems={questions.filter(q => selectedIds.includes(q.id))}
            activeTab={activeTab}
          />
        ) : (
          <QuestionDetail
            item={selectedItem}
            onAction={handleAction}
            saving={saving}
          />
        )}
      </div>
    </div>
  );
}
