import React from 'react';
import AllQA          from './components/AllQA/AllQA';
import Settings       from './components/Settings/Settings';
import ReplyTemplates from './components/ReplyTemplates/ReplyTemplates';
import AnalyticsDashboard from './components/Analytics/AnalyticsDashboard';
import UpgradePro     from './components/UpgradePro/UpgradePro';
import CustomersDirectory from './components/Profiles/CustomersDirectory';
import ProductsDirectory  from './components/Profiles/ProductsDirectory';
import CustomerProfile    from './components/Profiles/CustomerProfile';
import ProductProfile     from './components/Profiles/ProductProfile';
import { NavProvider, useNav, activeNavKey } from './navigation';
import { __ } from './i18n';

const NAV_ITEMS = [
  { key: 'all-qa',    label: __( 'All Q&A', 'quick-qa-for-woocommerce' ) },
  { key: 'templates', label: __( 'Reply Templates', 'quick-qa-for-woocommerce' ) },
  { key: 'settings',  label: __( 'Settings', 'quick-qa-for-woocommerce' ) },
];

const ANALYTICS_NAV_ITEM = { key: 'analytics', label: __( 'Analytics', 'quick-qa-for-woocommerce' ) };

// Analytics, directories and profiles read from the Pro plugin's REST routes,
// so they are only offered when the Pro plugin is active and licensed.
const isPro = !! window.quickQaAdmin?.isPro;

const PRO_PAGES  = [ 'analytics', 'customers', 'products', 'customer-profile', 'product-profile' ];
const BASE_PAGES = [ 'all-qa', 'templates', 'settings' ];
const VALID_PAGES = isPro ? [ ...BASE_PAGES, ...PRO_PAGES ] : [ ...BASE_PAGES, 'upgrade' ];

function Shell() {
  const nav = useNav();
  const { page, params } = nav;
  const active = activeNavKey( nav );
  const allNavItems = isPro ? [ ...NAV_ITEMS, ANALYTICS_NAV_ITEM ] : NAV_ITEMS;

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
            className={`qq-nav-item ${active === item.key ? 'active' : ''}`}
            onClick={() => nav.navigate(item.key)}
          >
            {item.label}
          </div>
        ))}

        {/* "Get Pro" tab — only offered while Pro is not active. */}
        {!isPro && (
          <>
            <div className="qq-nav-spacer" />
            <button
              type="button"
              className={`qq-nav-pro qq-nav-pro-tab${page === 'upgrade' ? ' active' : ''}`}
              onClick={() => nav.navigate('upgrade')}
            >
              {__( 'Get Pro', 'quick-qa-for-woocommerce' )}
            </button>
          </>
        )}
      </div>

      {/* Page content */}
      {page === 'all-qa'    && <AllQA key={params.questionId || 'all'} initialQuestionId={params.questionId || null} />}
      {page === 'templates' && <ReplyTemplates />}
      {page === 'settings'  && <Settings />}
      {isPro && page === 'analytics'        && <AnalyticsDashboard />}
      {isPro && page === 'customers'        && <CustomersDirectory />}
      {isPro && page === 'products'         && <ProductsDirectory />}
      {isPro && page === 'customer-profile' && <CustomerProfile key={params.key} customerKey={params.key} />}
      {isPro && page === 'product-profile'  && <ProductProfile key={params.id} productId={params.id} />}
      {!isPro && page === 'upgrade' && <UpgradePro />}
    </div>
  );
}

export default function App() {
  return (
    <NavProvider validPages={VALID_PAGES}>
      <Shell />
    </NavProvider>
  );
}
