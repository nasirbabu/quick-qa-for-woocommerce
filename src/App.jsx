import React, { useState, useEffect } from 'react';
import AllQA          from './components/AllQA/AllQA';
import Settings       from './components/Settings/Settings';
import ReplyTemplates from './components/ReplyTemplates/ReplyTemplates';
import { __ } from './i18n';

const NAV_ITEMS = [
  { key: 'all-qa',    label: __( 'All Q&A', 'quick-qa-for-woocommerce' ) },
  { key: 'templates', label: __( 'Reply Templates', 'quick-qa-for-woocommerce' ) },
  { key: 'settings',  label: __( 'Settings', 'quick-qa-for-woocommerce' ) },
];

const EMPTY_PRO_COMPONENTS = { navItems: [], renderPage: () => null };

/**
 * Extension point for a companion Pro plugin's own JS bundle to contribute
 * extra nav items/pages (e.g. an "Analytics" section) into this same admin
 * SPA without forking or re-mounting it.
 *
 * Read reactively (via state + an event listener) rather than once at
 * module-import time, because whether the free or the Pro script tag
 * finishes executing first isn't guaranteed — Pro's script dispatches a
 * `quickQaProComponentsReady` event on window after populating
 * window.quickQaProComponents, which this component listens for; an
 * immediate check on mount also covers the case where Pro already ran
 * first. Absent a Pro plugin, navItems stays empty and nothing changes.
 *
 * Contract: { navItems: [{ key, label }], renderPage(key): ReactNode }
 *
 * @since 1.5.0
 */
function readProComponents() {
  return window.quickQaProComponents || EMPTY_PRO_COMPONENTS;
}

export default function App() {
  const [page, setPage] = useState('all-qa');
  const [proComponents, setProComponents] = useState(readProComponents);

  useEffect(() => {
    function onReady() {
      setProComponents(readProComponents());
    }
    window.addEventListener('quickQaProComponentsReady', onReady);
    return () => window.removeEventListener('quickQaProComponentsReady', onReady);
  }, []);

  const proNavItems = Array.isArray(proComponents.navItems) ? proComponents.navItems : [];
  const allNavItems = [ ...NAV_ITEMS, ...proNavItems ];

  return (
    <div className="qq-app-shell">
      {/* Plugin nav */}
      <div className="qq-nav">
        <div className="qq-nav-brand">
          <span className="qq-nav-mark">Q</span>
          Askora QA
        </div>
        {allNavItems.map(item => (
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
      {proNavItems.some(item => item.key === page) && proComponents.renderPage(page)}
    </div>
  );
}
