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
  const filterRef = useRef(null);

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
  const visibleItems    = search.trim()
    ? productFiltered.filter(q =>
        q.text.toLowerCase().includes(search.toLowerCase()) ||
        q.customer.toLowerCase().includes(search.toLowerCase()) ||
        q.product.toLowerCase().includes(search.toLowerCase())
      )
    : productFiltered;

  const selectedItem = questions.find(q => q.id === selectedId) || null;
  const products     = getProductsInTab(tabItems);

  // Close the filter popover when the user clicks anywhere outside it.
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

  function handleTabChange(tab) {
    setActiveTab(tab);
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
        <div className="qq-queue">
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
                onClick={e => { e.stopPropagation(); setFilterOpen(v => !v); }}
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
          </div>
          <QuestionList
            items={visibleItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showAllBadge={activeTab === 'all'}
          />
          <div className="qq-page-foot">
            <span>{visibleItems.length} of {counts[activeTab] ?? questions.length}</span>
          </div>
        </div>

        <QuestionDetail
          item={selectedItem}
          onAction={handleAction}
          saving={saving}
        />
      </div>
    </div>
  );
}
