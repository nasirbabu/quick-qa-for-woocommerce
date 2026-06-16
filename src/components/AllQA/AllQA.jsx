import React, { useState } from 'react';
import { questions as initialData } from '../../data/staticData';
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

function filterByTab(questions, tab) {
  if (tab === 'all') return questions;
  return questions.filter(q => q.tab === tab);
}

function getCounts(questions) {
  return {
    all: questions.length,
    'pending-q': questions.filter(q => q.tab === 'pending-q').length,
    'pending-a': questions.filter(q => q.tab === 'pending-a').length,
    flagged:     questions.filter(q => q.tab === 'flagged').length,
    answered:    questions.filter(q => q.tab === 'answered').length,
    rejected:    questions.filter(q => q.tab === 'rejected').length,
  };
}

export default function AllQA() {
  const [questions, setQuestions] = useState(initialData);
  const [activeTab, setActiveTab] = useState('pending-q');
  const [selectedId, setSelectedId] = useState('q-sarah-jacket');
  const [search, setSearch] = useState('');

  const counts = getCounts(questions);
  const tabItems = filterByTab(questions, activeTab);
  const visibleItems = search.trim()
    ? tabItems.filter(q =>
        q.text.toLowerCase().includes(search.toLowerCase()) ||
        q.customer.toLowerCase().includes(search.toLowerCase()) ||
        q.product.toLowerCase().includes(search.toLowerCase())
      )
    : tabItems;

  const selectedItem = questions.find(q => q.id === selectedId) || null;

  function handleTabChange(tab) {
    setActiveTab(tab);
    const first = filterByTab(questions, tab)[0];
    setSelectedId(first ? first.id : null);
  }

  function handleAction(action, id, payload) {
    if (action === 'publish') {
      setQuestions(prev => prev.map(q =>
        q.id === id
          ? { ...q, tab: 'answered', status: 'answered', answers: [
              { id: `a-new-${Date.now()}`, author: 'Store team', avatar: 'ST', role: 'staff',
                time: 'Just now', text: payload, helpful: 0, isBest: true },
            ] }
          : q
      ));
      setActiveTab('answered');
      setSelectedId(id);
    }
    if (action === 'approve-answer') {
      setQuestions(prev => prev.map(q =>
        q.id === id
          ? { ...q, tab: 'answered', status: 'answered',
              answers: [{ id: `a-new-${Date.now()}`, author: q.pendingAnswer.author,
                avatar: q.pendingAnswer.avatar, role: q.pendingAnswer.role,
                time: 'Just now', text: q.pendingAnswer.text, helpful: 0, isBest: false }] }
          : q
      ));
      setActiveTab('answered');
      setSelectedId(id);
    }
    if (action === 'reject') {
      setQuestions(prev => prev.map(q =>
        q.id === id ? { ...q, tab: 'rejected', status: 'rejected' } : q
      ));
      const next = tabItems.find(q => q.id !== id);
      setSelectedId(next ? next.id : null);
    }
    if (action === 'delete') {
      setQuestions(prev => prev.filter(q => q.id !== id));
      const next = tabItems.find(q => q.id !== id);
      setSelectedId(next ? next.id : null);
    }
    if (action === 'keep') {
      setQuestions(prev => prev.map(q =>
        q.id === id ? { ...q, tab: 'answered', status: 'answered', flagCount: 0, flags: [] } : q
      ));
      setActiveTab('answered');
      setSelectedId(id);
    }
  }

  return (
    <div className="qq-page">
      {/* Top bar */}
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

      {/* Sub-tabs */}
      <div className="qq-tabs">
        {TABS.map(tab => (
          <div
            key={tab.key}
            className={`qq-tab ${activeTab === tab.key ? 'active' : ''} ${tab.key === 'flagged' && counts.flagged > 0 ? 'qq-tab-warn' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
            <span className="qq-tab-num">{counts[tab.key]}</span>
          </div>
        ))}
      </div>

      {/* Two-pane body */}
      <div className="qq-body">
        {/* Left: queue */}
        <div className="qq-queue">
          <div className="qq-queue-head">
            <span>{visibleItems.length} item{visibleItems.length !== 1 ? 's' : ''}</span>
          </div>
          <QuestionList
            items={visibleItems}
            selectedId={selectedId}
            onSelect={setSelectedId}
            showAllBadge={activeTab === 'all'}
          />
          <div className="qq-page-foot">
            <span>{visibleItems.length} of {counts[activeTab]}</span>
          </div>
        </div>

        {/* Right: detail */}
        <QuestionDetail
          item={selectedItem}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}
