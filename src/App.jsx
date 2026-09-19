import React, { useState } from 'react';
import AllQA          from './components/AllQA/AllQA';
import Settings       from './components/Settings/Settings';
import ReplyTemplates from './components/ReplyTemplates/ReplyTemplates';
import { __ } from './i18n';

const NAV_ITEMS = [
  { key: 'all-qa',    label: __( 'All Q&A', 'quick-qa-for-woocommerce' ) },
  { key: 'templates', label: __( 'Reply Templates', 'quick-qa-for-woocommerce' ) },
  { key: 'settings',  label: __( 'Settings', 'quick-qa-for-woocommerce' ) },
];

export default function App() {
  const [page, setPage] = useState('all-qa');

  return (
    <div className="qq-app-shell">
      {/* Plugin nav */}
      <div className="qq-nav">
        <div className="qq-nav-brand">
          <span className="qq-nav-mark">Q</span>
          Askora QA
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
      </div>

      {/* Page content */}
      {page === 'all-qa'    && <AllQA />}
      {page === 'templates' && <ReplyTemplates />}
      {page === 'settings'  && <Settings />}
    </div>
  );
}
