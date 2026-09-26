import React, { useState } from 'react';
import './UpgradePro.css';
import { __, sprintf } from '../../i18n';

/**
 * Pricing per billing period. `licenses` is the site count each plan
 * unlocks; `featured` marks the "Most Popular" card.
 */
const PLANS = {
  yearly: [
    { id: 'yearly-1',  planId: '68579', name: __('Single Site', 'quick-qa-for-woocommerce'), licenses: 1,  price: '$49.00' },
    { id: 'yearly-5',  planId: '68580', name: __('Five Sites', 'quick-qa-for-woocommerce'),  licenses: 5,  price: '$99.00', featured: true },
    { id: 'yearly-10', planId: '68581', name: __('Ten Sites', 'quick-qa-for-woocommerce'),   licenses: 10, price: '$149.00' },
  ],
  lifetime: [
    { id: 'lifetime-1',  planId: '68583', name: __('Single Site', 'quick-qa-for-woocommerce'), licenses: 1,  price: '$149.00' },
    { id: 'lifetime-5',  planId: '68585', name: __('Five Sites', 'quick-qa-for-woocommerce'),  licenses: 5,  price: '$199.00', featured: true },
    { id: 'lifetime-10', planId: '68587', name: __('Ten Sites', 'quick-qa-for-woocommerce'),   licenses: 10, price: '$299.00' },
  ],
};

/** Freemius checkout settings for Askora Pro (same product as the Pro plugin's SDK config). */
const FREEMIUS = {
  scriptUrl:  'https://checkout.freemius.com/js/v1/',
  product_id: '39886',
  public_key: 'pk_a85566a02a17f86f659785a8727ff',
  image:      'https://ps.w.org/quick-qa-for-woocommerce/assets/icon-256x256.png',
  name:       'Askora Pro',
};

/** Pro features listed on every card (after the license line). */
const CARD_FEATURES = [
  __('Unlimited staff answers', 'quick-qa-for-woocommerce'),
  __('Email & Slack notifications', 'quick-qa-for-woocommerce'),
  __('Custom email templates', 'quick-qa-for-woocommerce'),
  __('SEO rich results (JSON-LD)', 'quick-qa-for-woocommerce'),
  __('CSV import & export', 'quick-qa-for-woocommerce'),
  __('Full appearance customization', 'quick-qa-for-woocommerce'),
  __('Spam protection', 'quick-qa-for-woocommerce'),
  __('Analytics dashboard', 'quick-qa-for-woocommerce'),
];

/** "Everything you get with Pro" grid. */
const HIGHLIGHTS = [
  { icon: 'dashicons-format-chat',   title: __('Unlimited staff answers', 'quick-qa-for-woocommerce'),     desc: __('No cap on answers per product', 'quick-qa-for-woocommerce') },
  { icon: 'dashicons-email-alt',     title: __('Notifications', 'quick-qa-for-woocommerce'),               desc: __('Instant alerts, daily digest, reminders and Slack', 'quick-qa-for-woocommerce') },
  { icon: 'dashicons-edit-page',     title: __('Custom email templates', 'quick-qa-for-woocommerce'),      desc: __('Your wording, sender and footer on all 10 emails', 'quick-qa-for-woocommerce') },
  { icon: 'dashicons-search',        title: __('SEO rich results', 'quick-qa-for-woocommerce'),            desc: __('QAPage / FAQPage JSON-LD for Google', 'quick-qa-for-woocommerce') },
  { icon: 'dashicons-database-export', title: __('CSV import & export', 'quick-qa-for-woocommerce'),       desc: __('Migrate, back up and report on your Q&A', 'quick-qa-for-woocommerce') },
  { icon: 'dashicons-art',           title: __('Appearance customization', 'quick-qa-for-woocommerce'),    desc: __('Colours, layout, visibility and custom CSS', 'quick-qa-for-woocommerce') },
  { icon: 'dashicons-shield',        title: __('Spam protection', 'quick-qa-for-woocommerce'),             desc: __('Honeypot, reCAPTCHA and rate limiting', 'quick-qa-for-woocommerce') },
  { icon: 'dashicons-chart-bar',     title: __('Analytics dashboard', 'quick-qa-for-woocommerce'),         desc: __('Response times, top questions and trends', 'quick-qa-for-woocommerce') },
];

let freemiusScript = null;

/**
 * Load the Freemius checkout script once (it defines window.FS).
 *
 * @return {Promise<void>}
 */
function loadFreemiusCheckout() {
  if (window.FS && window.FS.Checkout) {
    return Promise.resolve();
  }
  if (!freemiusScript) {
    freemiusScript = new Promise((resolve, reject) => {
      const script   = document.createElement('script');
      script.src     = FREEMIUS.scriptUrl;
      script.async   = true;
      script.onload  = () => resolve();
      script.onerror = () => {
        freemiusScript = null; // allow a retry on the next click
        reject(new Error('Freemius checkout failed to load'));
      };
      document.body.appendChild(script);
    });
  }
  return freemiusScript;
}

/**
 * Open the Freemius checkout for a plan (same setup as the Easy Map Pro
 * pricing page).
 */
function handleBuy(billing, plan) {
  loadFreemiusCheckout()
    .then(() => {
      const handler = new window.FS.Checkout({
        product_id: FREEMIUS.product_id,
        plan_id:    plan.planId,
        public_key: FREEMIUS.public_key,
        image:      FREEMIUS.image,
      });

      // No `licenses` here: each card is its own Freemius plan, so the plan's
      // own pricing decides the licence count. Forcing a count the plan has
      // no price for makes Freemius reject the checkout ("Invalid pricing").
      handler.open({
        name: FREEMIUS.name,
        purchaseCompleted: (response) => {
          // The logic here will be executed immediately after the purchase confirmation
          console.log('Purchase completed:', response);
          console.log('User email:', response.user.email);
          console.log('License key:', response.license.key);
        },
        success: (response) => {
          // The logic here will be executed after the customer closes the checkout,
          // after a successful purchase
          console.log('Checkout closed after successful purchase:', response);
          console.log('User email:', response.user.email);
          console.log('License key:', response.license.key);
        },
      });
    })
    .catch(err => {
      console.error(err);
    });
}

export default function UpgradePro() {
  const [billing, setBilling] = useState('yearly');
  const isLifetime = billing === 'lifetime';

  return (
    <div className="qq-upgrade-page">
      <div className="qq-upgrade-container">

        {/* Hero */}
        <div className="qq-upgrade-hero">
          <h2>{__('Unlock the Full Power of Askora Pro', 'quick-qa-for-woocommerce')}</h2>
          <p>{__('Get notifications, custom emails, SEO rich results, import/export, full design control and priority support.', 'quick-qa-for-woocommerce')}</p>
        </div>

        {/* Trust badges */}
        <div className="qq-upgrade-trust">
          <div className="qq-upgrade-trust-badge">
            <span className="dashicons dashicons-shield" />
            <span>{__('30-Day Money Back Guarantee', 'quick-qa-for-woocommerce')}</span>
          </div>
          <div className="qq-upgrade-trust-badge">
            <span className="dashicons dashicons-lock" />
            <span>{__('Secure Checkout', 'quick-qa-for-woocommerce')}</span>
          </div>
          <div className="qq-upgrade-trust-badge">
            <span className="dashicons dashicons-update" />
            <span>{__('Regular Updates', 'quick-qa-for-woocommerce')}</span>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="qq-upgrade-tabs" role="tablist">
          {[
            { key: 'yearly',   label: __('Yearly', 'quick-qa-for-woocommerce') },
            { key: 'lifetime', label: __('Lifetime', 'quick-qa-for-woocommerce') },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={billing === tab.key}
              className={`qq-upgrade-tab${billing === tab.key ? ' active' : ''}`}
              onClick={() => setBilling(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="qq-upgrade-pricing">
          {PLANS[billing].map(plan => (
            <div key={plan.id} className={`qq-upgrade-card${plan.featured ? ' featured' : ''}`}>
              {plan.featured && <span className="qq-upgrade-popular">{__('Most Popular', 'quick-qa-for-woocommerce')}</span>}
              <h3>{plan.name}</h3>
              <div className="qq-upgrade-price">
                {plan.price}{' '}
                <span>{isLifetime ? __('lifetime', 'quick-qa-for-woocommerce') : __('/year', 'quick-qa-for-woocommerce')}</span>
              </div>
              <ul className="qq-upgrade-features">
                <li>
                  <span className="dashicons dashicons-yes-alt" />
                  {plan.licenses === 1
                    ? __('1 Site License', 'quick-qa-for-woocommerce')
                    : sprintf(
                      // translators: %d: number of sites the license covers.
                      __('%d Site Licenses', 'quick-qa-for-woocommerce'),
                      plan.licenses
                    )}
                </li>
                {CARD_FEATURES.map(feature => (
                  <li key={feature}><span className="dashicons dashicons-yes-alt" />{feature}</li>
                ))}
                <li>
                  <span className="dashicons dashicons-yes-alt" />
                  {isLifetime ? __('Lifetime Premium Support', 'quick-qa-for-woocommerce') : __('Priority Email Support', 'quick-qa-for-woocommerce')}
                </li>
                <li>
                  <span className="dashicons dashicons-yes-alt" />
                  {isLifetime ? __('Lifetime Updates', 'quick-qa-for-woocommerce') : __('1 Year of Updates', 'quick-qa-for-woocommerce')}
                </li>
              </ul>
              <button
                type="button"
                id={`qq-buy-${plan.id}`}
                className={`qq-upgrade-btn${plan.featured ? ' featured' : ''}`}
                data-billing={billing}
                data-licenses={plan.licenses}
                onClick={() => handleBuy(billing, plan)}
              >
                {__('Buy Now', 'quick-qa-for-woocommerce')}
              </button>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="qq-upgrade-guarantee">
          <span className="dashicons dashicons-yes-alt" />
          <div className="qq-upgrade-guarantee-text">
            <strong>{__('30-Day Money Back Guarantee', 'quick-qa-for-woocommerce')}</strong>
            <p>{__('Try Askora Pro risk-free. If you\'re not satisfied, get a full refund within 30 days.', 'quick-qa-for-woocommerce')}</p>
          </div>
        </div>

        {/* Everything you get */}
        <div className="qq-upgrade-highlights">
          <h3>{__('Everything You Get With Pro', 'quick-qa-for-woocommerce')}</h3>
          <div className="qq-upgrade-highlights-grid">
            {HIGHLIGHTS.map(item => (
              <div key={item.title} className="qq-upgrade-highlight">
                <span className={`dashicons ${item.icon}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
