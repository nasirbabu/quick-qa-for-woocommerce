import React, { useState, useEffect, useCallback, useRef } from 'react';
import './AllQA.css';
import QuestionList from './QuestionList';
import QuestionDetail from './QuestionDetail';
import { __, _n, sprintf } from '../../i18n';

const TABS = [
  { key: 'all',       label: __( 'All', 'quick-qa-for-woocommerce' ) },
  { key: 'pending-q', label: __( 'Pending questions', 'quick-qa-for-woocommerce' ) },
  { key: 'pending-a', label: __( 'Pending answers', 'quick-qa-for-woocommerce' ) },
  { key: 'flagged',   label: __( 'Flagged', 'quick-qa-for-woocommerce' ) },
  { key: 'answered',  label: __( 'Answered', 'quick-qa-for-woocommerce' ) },
  { key: 'rejected',  label: __( 'Rejected', 'quick-qa-for-woocommerce' ) },
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
    throw new Error(err.message || sprintf( __( 'Request failed (%d)', 'quick-qa-for-woocommerce' ), res.status ));
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
  if (diff < 60)     return __( 'just now', 'quick-qa-for-woocommerce' );
  if (diff < 3600)   return sprintf( __( '%dm ago', 'quick-qa-for-woocommerce' ), Math.floor(diff / 60) );
  if (diff < 86400)  return sprintf( __( '%dh ago', 'quick-qa-for-woocommerce' ), Math.floor(diff / 3600) );
  if (diff < 604800) return sprintf( __( '%dd ago', 'quick-qa-for-woocommerce' ), Math.floor(diff / 86400) );
  return sprintf( __( '%dw ago', 'quick-qa-for-woocommerce' ), Math.floor(diff / 604800) );
}

function transformItem(q) {
  const customer       = q.author_name || q.guest_name || __( 'Anonymous', 'quick-qa-for-woocommerce' );
  const pendingAnswers  = (q.answers || []).filter(a => a.status === 'pending');
  const approvedAnswers = (q.answers || []).filter(a => a.status === 'approved');
  const flaggedAnswers  = (q.answers || []).filter(a => a.status === 'flagged');

  // Follow-ups (and admin replies to them) render nested under their parent
  // answer instead of in the flat top-level answers list.
  const followupRows      = approvedAnswers.filter(a => a.answer_type === 'followup');
  const followupReplyRows = approvedAnswers.filter(a => a.answer_type !== 'followup' && parseInt(a.parent_answer_id, 10) > 0);
  const topLevelAnswers   = approvedAnswers.filter(a =>
    a.answer_type !== 'followup' && !(parseInt(a.parent_answer_id, 10) > 0)
  );

  let tab, status;
  if (q.status === 'rejected') {
    tab = 'rejected'; status = 'rejected';
  } else if (q.status === 'flagged') {
    tab = 'flagged'; status = 'flagged';
  } else if (q.status === 'pending') {
    tab = 'pending-q'; status = 'pending';
  } else if (flaggedAnswers.length > 0) {
    tab = 'flagged'; status = 'answer-flagged';
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
    product:          q.product_title || sprintf( __( 'Product #%d', 'quick-qa-for-woocommerce' ), q.product_id ),
    productId:        parseInt(q.product_id, 10),
    productPermalink: q.product_permalink || '',
    upvotes:   parseInt(q.upvotes, 10) || 0,
    createdAt: q.created_at ? new Date(q.created_at + 'Z').getTime() : 0,
    time:      timeAgo(q.created_at),
    isLocked:  parseInt(q.is_locked, 10) === 1,
    answers:   topLevelAnswers.map(a => ({
      id:        String(a.id),
      dbId:      parseInt(a.id, 10),
      author:    a.author_name || __( 'Team', 'quick-qa-for-woocommerce' ),
      avatar:    makeInitials(a.author_name || __( 'Team', 'quick-qa-for-woocommerce' )),
      role:      a.answer_type === 'admin' ? 'staff' : 'community',
      time:      timeAgo(a.created_at),
      text:      a.answer_text || '',
      helpful:   parseInt(a.upvotes, 10) || 0,
      isBest:    false,
      flagCount: parseInt(a.flag_count, 10) || 0,
      flags:     (a.flags || []).map(f => ({
        reason:   f.reason || '',
        reporter: f.reporter_name || __( 'A customer', 'quick-qa-for-woocommerce' ),
        time:     timeAgo(f.created_at),
      })),
    })),
    pendingAnswer: pa ? {
      id:     String(pa.id),
      dbId:   parseInt(pa.id, 10),
      author: pa.author_name || __( 'User', 'quick-qa-for-woocommerce' ),
      avatar: makeInitials(pa.author_name || __( 'User', 'quick-qa-for-woocommerce' )),
      role:   pa.answer_type === 'admin' ? 'staff' : 'community',
      text:   pa.answer_text || '',
      time:   timeAgo(pa.created_at),
      meta:   [pa.answer_type === 'admin'
        ? __( 'Staff answer', 'quick-qa-for-woocommerce' )
        : (pa.answer_type === 'followup'
          ? __( 'Follow-up', 'quick-qa-for-woocommerce' )
          : __( 'Community answer', 'quick-qa-for-woocommerce' ))],
    } : null,
    flagCount: parseInt(q.flag_count, 10) || 0,
    flags:     (q.flags || []).map(f => ({
      reason:   f.reason || '',
      reporter: f.reporter_name || __( 'A customer', 'quick-qa-for-woocommerce' ),
      time:     timeAgo(f.created_at),
    })),
    flaggedAnswers: flaggedAnswers.map(a => ({
      id:        String(a.id),
      dbId:      parseInt(a.id, 10),
      author:    a.author_name || __( 'Team', 'quick-qa-for-woocommerce' ),
      avatar:    makeInitials(a.author_name || __( 'Team', 'quick-qa-for-woocommerce' )),
      role:      a.answer_type === 'admin' ? 'staff' : 'community',
      time:      timeAgo(a.created_at),
      text:      a.answer_text || '',
      flagCount: parseInt(a.flag_count, 10) || 0,
      flags:     (a.flags || []).map(f => ({
        reason:   f.reason || '',
        reporter: f.reporter_name || __( 'A customer', 'quick-qa-for-woocommerce' ),
        time:     timeAgo(f.created_at),
      })),
    })),
    followups: followupRows.map(fu => {
      const replyRow = followupReplyRows.find(r => parseInt(r.parent_answer_id, 10) === parseInt(fu.id, 10)) || null;
      return {
        id:              String(fu.id),
        dbId:            parseInt(fu.id, 10),
        parentAnswerId:  parseInt(fu.parent_answer_id, 10),
        author:          fu.author_name || customer,
        avatar:          makeInitials(fu.author_name || customer),
        time:            timeAgo(fu.created_at),
        text:            fu.answer_text || '',
        reply: replyRow ? {
          id:     String(replyRow.id),
          dbId:   parseInt(replyRow.id, 10),
          author: replyRow.author_name || __( 'Team', 'quick-qa-for-woocommerce' ),
          avatar: makeInitials(replyRow.author_name || __( 'Team', 'quick-qa-for-woocommerce' )),
          time:   timeAgo(replyRow.created_at),
          text:   replyRow.answer_text || '',
        } : null,
      };
    }),
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

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { key: 'recent',  label: __( 'Most recent', 'quick-qa-for-woocommerce' ) },
  { key: 'upvoted', label: __( 'Most upvoted', 'quick-qa-for-woocommerce' ) },
  { key: 'oldest',  label: __( 'Oldest first', 'quick-qa-for-woocommerce' ) },
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
        <span className="qq-bulk-bar-count">{sprintf( __( '%d selected', 'quick-qa-for-woocommerce' ), selectedCount )}</span>
        {!allSelected && (
          <span className="qq-bulk-bar-link" onClick={onSelectAll}>
            {sprintf( __( 'Select all %d', 'quick-qa-for-woocommerce' ), totalCount )}
          </span>
        )}
        <span className="qq-bulk-bar-link" onClick={onClear}>{__( 'Clear', 'quick-qa-for-woocommerce' )}</span>
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
    'pending-q': __( 'Approve to publish them, or reject if they are spam or off-topic.', 'quick-qa-for-woocommerce' ),
    'pending-a': __( 'Approve to publish these community answers with their trust badges.', 'quick-qa-for-woocommerce' ),
    'flagged':   __( 'Dismiss flags to restore content, or delete if the flags are valid.', 'quick-qa-for-woocommerce' ),
  };
  const hint = hints[activeTab] || __( 'Choose a bulk action above.', 'quick-qa-for-woocommerce' );

  return (
    <div className="qq-bulk-summary">
      <div className="qq-bulk-summary-art">📦</div>
      <div className="qq-bulk-summary-num">{count}</div>
      <div className="qq-bulk-summary-label">{_n( 'item selected', 'items selected', count, 'quick-qa-for-woocommerce' )}</div>
      <div className="qq-bulk-summary-card">
        <div className="qq-bulk-summary-row">
          <span>{__( 'Across products', 'quick-qa-for-woocommerce' )}</span><b>{productsAffected}</b>
        </div>
        <div className="qq-bulk-summary-row">
          <span>{__( 'Total upvotes', 'quick-qa-for-woocommerce' )}</span><b>{totalUpvotes}</b>
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
  const [page,           setPage]           = useState(1);
  const [bulkResult,     setBulkResult]     = useState(null);
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
        const qid = parseInt(new URLSearchParams(window.location.search).get('qid'), 10);
        const linked = qid && items.find(q => q.id === qid);
        if (linked) {
          setActiveTab('all');
          setSelectedId(linked.id);
          return;
        }
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
  const totalPages   = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const safePage     = Math.min(page, totalPages);
  const pagedItems   = visibleItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

  // Reset to page 1 whenever the visible set changes.
  useEffect(() => { setPage(1); }, [activeTab, productFilter, sortBy, search]);

  const bulkMode    = selectedIds.length > 0;
  const pageIds     = pagedItems.map(q => q.id);
  const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const partial     = !allSelected && pageIds.some(id => selectedIds.includes(id));

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function handleToggleAll() {
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
    }
  }
  function handleSelectAllInTab() {
    setSelectedIds(visibleItems.map(q => q.id));
  }
  function handleClearSelection() { setSelectedIds([]); }

  function getBulkActions() {
    const run = action => () => handleBulkAction(action);
    if (activeTab === 'pending-q') return [
      { key: 'approve', label: __( 'Approve', 'quick-qa-for-woocommerce' ), primary: true, onClick: run('approve') },
      { key: 'reject',  label: __( 'Reject', 'quick-qa-for-woocommerce' ),  danger: true,  onClick: run('reject') },
    ];
    if (activeTab === 'pending-a') return [
      { key: 'approve-answers', label: __( 'Approve', 'quick-qa-for-woocommerce' ), primary: true, onClick: run('approve-answers') },
      { key: 'reject',          label: __( 'Reject', 'quick-qa-for-woocommerce' ),  danger: true,  onClick: run('reject') },
    ];
    if (activeTab === 'flagged') return [
      { key: 'dismiss-flags', label: __( 'Dismiss flags', 'quick-qa-for-woocommerce' ), onClick: run('dismiss-flags') },
      { key: 'delete',        label: __( 'Delete', 'quick-qa-for-woocommerce' ), danger: true, onClick: run('delete') },
    ];
    return [{ key: 'delete', label: __( 'Delete', 'quick-qa-for-woocommerce' ), danger: true, onClick: run('delete') }];
  }

  async function handleBulkAction(action) {
    const items = questions.filter(q => selectedIds.includes(q.id));
    setSaving(true);
    setBulkResult(null);
    // targetItems tracks whichever array was actually mapped into `results`,
    // since approve-answers pre-filters to items with a pending answer —
    // results[idx] must zip back against the same array it was built from.
    let targetItems = items;
    let results = null;
    try {
      if (action === 'approve') {
        results = await Promise.allSettled(items.map(i => apiFetch(`admin/questions/${i.dbId}`, { method: 'POST', body: { status: 'approved' } })));
      } else if (action === 'reject') {
        results = await Promise.allSettled(items.map(i => apiFetch(`admin/questions/${i.dbId}`, { method: 'POST', body: { status: 'rejected' } })));
      } else if (action === 'approve-answers') {
        targetItems = items.filter(i => i.pendingAnswer);
        results = await Promise.allSettled(targetItems.map(i =>
          apiFetch(`admin/answers/${i.pendingAnswer.dbId}`, { method: 'POST', body: { status: 'approved' } })
        ));
      } else if (action === 'dismiss-flags') {
        results = await Promise.allSettled(items.map(i => i.status === 'answer-flagged'
          ? Promise.all(i.flaggedAnswers.map(a => apiFetch(`admin/answers/${a.dbId}/dismiss-flags`, { method: 'POST', body: {} })))
          : apiFetch(`admin/questions/${i.dbId}/dismiss-flags`, { method: 'POST', body: {} })
        ));
      } else if (action === 'delete') {
        results = await Promise.allSettled(items.map(i => i.status === 'answer-flagged'
          ? Promise.all(i.flaggedAnswers.map(a => apiFetch(`admin/answers/${a.dbId}/delete`, { method: 'POST', body: {} })))
          : apiFetch(`admin/questions/${i.dbId}/delete`, { method: 'POST', body: {} })
        ));
      }

      const failedIds = results
        ? targetItems.filter((_, idx) => results[idx].status === 'rejected').map(i => i.id)
        : [];

      // Leave failed items selected so the moderator can retry just those;
      // a full success clears selection as before.
      setSelectedIds(failedIds);
      const refreshed = await loadQuestions();
      const remaining = filterByTab(refreshed, activeTab);
      setSelectedId(remaining[0] ? remaining[0].id : null);

      if (failedIds.length > 0) {
        setBulkResult({ succeeded: results.length - failedIds.length, failed: failedIds.length });
      }
    } catch (err) {
      console.error('Bulk action failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    setSearch('');
    setSelectedIds([]);
    setProductFilter(null);
    setFilterOpen(false);
    setBulkResult(null);
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
          body: { answer_text: payload.answer_text },
        });
        // Usage count only increments after the answer has actually been
        // published — never at template-insert time — so an inserted
        // template that's discarded without publishing never counts.
        if (payload.template_id) {
          apiFetch(`admin/templates/${payload.template_id}/use`, { method: 'POST' }).catch(() => {});
        }
        await loadQuestions();
        setActiveTab('answered');
        setSelectedId(id);

      } else if (action === 'reply-followup') {
        await apiFetch(`admin/questions/${item.dbId}/answer`, {
          method: 'POST',
          body: { answer_text: payload.answer_text, parent_answer_id: payload.parent_answer_id },
        });
        await loadQuestions();
        setSelectedId(id);

      } else if (action === 'lock-thread') {
        await apiFetch(`admin/questions/${item.dbId}/lock`, { method: 'POST', body: {} });
        await loadQuestions();
        setSelectedId(id);

      } else if (action === 'unlock-thread') {
        await apiFetch(`admin/questions/${item.dbId}/unlock`, { method: 'POST', body: {} });
        await loadQuestions();
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

      } else if (action === 'dismiss-answer-flags') {
        await apiFetch(`admin/answers/${payload}/dismiss-flags`, { method: 'POST', body: {} });
        const refreshed = await loadQuestions();
        setSelectedId(id);
        if (filterByTab(refreshed, 'flagged').length === 0) setActiveTab('answered');

      } else if (action === 'delete-flagged-answer') {
        await apiFetch(`admin/answers/${payload}/delete`, { method: 'POST', body: {} });
        const refreshed = await loadQuestions();
        setSelectedId(id);
        if (filterByTab(refreshed, 'flagged').length === 0) setActiveTab('answered');
      }
    } catch (err) {
      console.error('Askora QA action failed:', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg">{__( 'Loading Q&A data…', 'quick-qa-for-woocommerce' )}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg qq-state-msg--error">{sprintf( __( 'Failed to load: %s', 'quick-qa-for-woocommerce' ), error )}</div>
      </div>
    );
  }

  return (
    <div className="qq-page">
      <div className="qq-top">
        <div className="qq-top-left">
          <span className="qq-page-label">{__( 'All Q&A', 'quick-qa-for-woocommerce' )}</span>
          <div className="qq-search-wrap">
            <input
              type="text"
              className="qq-search"
              placeholder={__( 'Search questions…', 'quick-qa-for-woocommerce' )}
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

      {bulkResult && (
        <div className="qq-bulk-result-banner">
          <span>{sprintf(
            // translators: %1$d is the number of items that succeeded, %2$d is the number that failed
            _n(
              '%1$d succeeded, %2$d failed — failed item still selected, try again.',
              '%1$d succeeded, %2$d failed — failed items still selected, try again.',
              bulkResult.failed,
              'quick-qa-for-woocommerce'
            ),
            bulkResult.succeeded,
            bulkResult.failed
          )}</span>
          <span className="qq-bulk-result-banner-x" onClick={() => setBulkResult(null)}>×</span>
        </div>
      )}

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
                <span>{sprintf( _n( '%d item', '%d items', visibleItems.length, 'quick-qa-for-woocommerce' ), visibleItems.length )}</span>
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
                  {productFilter ? __( '✓ Filtered', 'quick-qa-for-woocommerce' ) : __( 'Filter ▾', 'quick-qa-for-woocommerce' )}
                  {filterOpen && (
                    <div className="qq-filter-popover" onClick={e => e.stopPropagation()}>
                      <div
                        className={`qq-filter-popover-item${!productFilter ? ' selected' : ''}`}
                        onClick={() => { setProductFilter(null); setFilterOpen(false); }}
                      >
                        {__( 'All products', 'quick-qa-for-woocommerce' )}
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
                {sortBy !== 'recent' ? __( '✓ Sorted', 'quick-qa-for-woocommerce' ) : __( 'Sort ▾', 'quick-qa-for-woocommerce' )}
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
            items={pagedItems}
            selectedId={selectedId}
            onSelect={id => { setSelectedId(id); setSelectedIds([]); }}
            showAllBadge={activeTab === 'all'}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            bulkMode={bulkMode}
            search={search}
          />
          <div className="qq-page-foot">
            {totalPages > 1 ? (
              <>
                <span>{sprintf(
                  // translators: %1$d is the current page number, %2$d is the total number of pages
                  __( 'Page %1$d of %2$d', 'quick-qa-for-woocommerce' ),
                  safePage,
                  totalPages
                )}</span>
                <div className="qq-page-nav">
                  <button
                    className="qq-page-btn"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >{__( 'Prev', 'quick-qa-for-woocommerce' )}</button>
                  <button
                    className="qq-page-btn"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                  >{__( 'Next', 'quick-qa-for-woocommerce' )}</button>
                </div>
              </>
            ) : (
              <span>{sprintf( _n( '%d item', '%d items', visibleItems.length, 'quick-qa-for-woocommerce' ), visibleItems.length )}</span>
            )}
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
