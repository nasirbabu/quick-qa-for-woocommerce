import React from 'react';
import { __ } from '../../../i18n';

const RADIUS_MAP = { sharp: '0px', rounded: '8px', pill: '999px' };

export default function AppearancePreview({ draft, previewState }) {
  const isLoggedOut    = previewState === 'logged-out';
  const requiresLogin  = isLoggedOut && draft.who_can_ask === 'logged-in';
  const showUpvotes    = draft.appr_show_upvotes && !isLoggedOut;
  const showHelpful    = draft.appr_show_helpful && !isLoggedOut;

  const fontStack =
    draft.appr_font_mode === 'system'
      ? '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
      : draft.appr_font_mode === 'custom'
        ? (draft.appr_font_custom || 'inherit')
        : 'inherit';

  const widgetStyle = {
    '--pw-color':  draft.appr_color,
    '--pw-radius': RADIUS_MAP[draft.appr_radius] ?? '8px',
    '--pw-font':   fontStack,
  };

  const widgetCls = [
    'qq-pw',
    `density-${draft.appr_density}`,
    `fs-${draft.appr_font_size}`,
    `card-${draft.appr_card_style}`,
  ].join(' ');

  const avatarCls = draft.appr_show_avatars
    ? `qq-pw-av shape-${draft.appr_avatar_style}`
    : 'qq-pw-av shape-hidden';

  function RoleBadge({ role, label }) {
    if (!draft.appr_show_role_badges) return null;
    return <span className={`qq-pw-role${role ? ` ${role}` : ''}`}>{label}</span>;
  }

  return (
    <div className={widgetCls} style={widgetStyle}>

      <div className="qq-pw-q-bar">
        <span>{ __( '3 questions', 'quick-qa-for-woocommerce' ) }</span>
        <button className="qq-pw-ask-btn">
          {requiresLogin ? __( 'Log in to ask', 'quick-qa-for-woocommerce' ) : __( 'Ask a question', 'quick-qa-for-woocommerce' )}
        </button>
      </div>

      {requiresLogin && (
        <div className="qq-pw-login-prompt">
          <div className="qq-pw-login-mark">💬</div>
          <div className="qq-pw-login-title">{ __( 'Have a question?', 'quick-qa-for-woocommerce' ) }</div>
          <div className="qq-pw-login-text">{ __( 'Log in or create a free account to ask. It only takes a minute.', 'quick-qa-for-woocommerce' ) }</div>
          <div className="qq-pw-login-actions">
            <button className="qq-pw-login-btn">{ __( 'Log in', 'quick-qa-for-woocommerce' ) }</button>
            <button className="qq-pw-login-btn secondary">{ __( 'Create account', 'quick-qa-for-woocommerce' ) }</button>
          </div>
          <div className="qq-pw-login-note">
            { __( 'Already a customer? Your purchase history makes your answers more useful to other buyers.', 'quick-qa-for-woocommerce' ) }
          </div>
        </div>
      )}

      <div className="qq-pw-thread">
        <div className="qq-pw-msg">
          <div className={avatarCls}>SK</div>
          <div className="qq-pw-msg-body">
            <div className="qq-pw-msg-meta">
              <b>Sarah K.</b>
              <RoleBadge role="" label={ __( 'Customer', 'quick-qa-for-woocommerce' ) } />
              <span>· { __( '2 days ago', 'quick-qa-for-woocommerce' ) }</span>
            </div>
            <div className="qq-pw-msg-text">{ __( 'Does this bag fit a 15-inch laptop with room for accessories?', 'quick-qa-for-woocommerce' ) }</div>
            {showUpvotes && (
              <div className="qq-pw-msg-foot">
                <span className="qq-pw-vote">
                  <span className="qq-pw-vote-btn">▲</span>
                  <span>8</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="qq-pw-divider">{ __( '2 answers', 'quick-qa-for-woocommerce' ) }</div>

        <div className={`qq-pw-msg${draft.appr_show_best_highlight ? ' best' : ''}`}>
          <div className={avatarCls}>QA</div>
          <div className="qq-pw-msg-body">
            <div className="qq-pw-msg-meta">
              <b>Acme Goods</b>
              <RoleBadge role="staff" label={ __( 'Store staff', 'quick-qa-for-woocommerce' ) } />
              {draft.appr_show_best_highlight && (
                <span className="qq-pw-best-tag">{ __( '★ Best answer', 'quick-qa-for-woocommerce' ) }</span>
              )}
              <span>· { __( '1 day ago', 'quick-qa-for-woocommerce' ) }</span>
            </div>
            <div className="qq-pw-msg-text">{ __( "Yes, the main compartment fits up to a 16-inch laptop. You'll still have room for the charger and a small notebook.", 'quick-qa-for-woocommerce' ) }</div>
            {showHelpful && (
              <div className="qq-pw-msg-foot">
                <span className="qq-pw-helpful">{ __( '↑ 12 found this helpful', 'quick-qa-for-woocommerce' ) }</span>
              </div>
            )}
          </div>
        </div>

        <div className="qq-pw-msg">
          <div className={avatarCls}>SM</div>
          <div className="qq-pw-msg-body">
            <div className="qq-pw-msg-meta">
              <b>Sandra M.</b>
              <RoleBadge role="" label={ __( 'Verified buyer', 'quick-qa-for-woocommerce' ) } />
              <span>· { __( '18 hours ago', 'quick-qa-for-woocommerce' ) }</span>
            </div>
            <div className="qq-pw-msg-text">{ __( 'Can confirm — my 15-inch MacBook Pro fits easily with the charger.', 'quick-qa-for-woocommerce' ) }</div>
            {showHelpful && (
              <div className="qq-pw-msg-foot">
                <span className="qq-pw-helpful">{ __( '↑ 4 found this helpful', 'quick-qa-for-woocommerce' ) }</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
