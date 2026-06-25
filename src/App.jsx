import React, { useState } from 'react';
import AllQA          from './components/AllQA/AllQA';
import Settings       from './components/Settings/Settings';
import ReplyTemplates from './components/ReplyTemplates/ReplyTemplates';

const NAV_ITEMS = [
  { key: 'all-qa',    label: 'All Q&A' },
  { key: 'templates', label: 'Reply Templates' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'settings',  label: 'Settings' },
  { key: 'docs',      label: 'Documentation' },
];

function ComingSoon({ label }) {
  return (
    <div className="qq-coming-soon">
      <h2>{label}</h2>
      <p>This section is coming soon.</p>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('all-qa');

  return (
    <div className="qq-app-shell">
      {/* Plugin nav */}
      <div className="qq-nav">
        <div className="qq-nav-brand">
          <span className="qq-nav-mark">Q</span>
          Quick QA
        </div>
        {NAV_ITEMS.map(item => (
          <div
            key={item.key}
            className={`qq-nav-item ${page === item.key ? 'active' : ''}`}
            onClick={() => setPage(item.key)}
          >
            {item.label}
          </div>
        ))}
        <div className="qq-nav-spacer" />
        <button className="qq-nav-pro">✨ Go Pro</button>
      </div>

      {/* Page content */}
      {page === 'all-qa'    && <AllQA />}
      {page === 'templates' && <ReplyTemplates />}
      {page === 'analytics' && <ComingSoon label="Analytics" />}
      {page === 'settings'  && <Settings />}
      {page === 'docs'      && <ComingSoon label="Documentation" />}
    </div>
  );
}
