import React from 'react';

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
        <span>3 questions</span>
        <button className="qq-pw-ask-btn">
          {requiresLogin ? 'Log in to ask' : 'Ask a question'}
        </button>
      </div>

      {requiresLogin && (
        <div className="qq-pw-login-prompt">
          <div className="qq-pw-login-mark">💬</div>
          <div className="qq-pw-login-title">Have a question?</div>
          <div className="qq-pw-login-text">Log in or create a free account to ask. It only takes a minute.</div>
          <div className="qq-pw-login-actions">
            <button className="qq-pw-login-btn">Log in</button>
            <button className="qq-pw-login-btn secondary">Create account</button>
          </div>
          <div className="qq-pw-login-note">
            Already a customer? Your purchase history makes your answers more useful to other buyers.
          </div>
        </div>
      )}

      <div className="qq-pw-thread">
        <div className="qq-pw-msg">
          <div className={avatarCls}>SK</div>
          <div className="qq-pw-msg-body">
            <div className="qq-pw-msg-meta">
              <b>Sarah K.</b>
              <RoleBadge role="" label="Customer" />
              <span>· 2 days ago</span>
            </div>
            <div className="qq-pw-msg-text">Does this bag fit a 15-inch laptop with room for accessories?</div>
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

        <div className="qq-pw-divider">2 answers</div>

        <div className={`qq-pw-msg${draft.appr_show_best_highlight ? ' best' : ''}`}>
          <div className={avatarCls}>QA</div>
          <div className="qq-pw-msg-body">
            <div className="qq-pw-msg-meta">
              <b>Acme Goods</b>
              <RoleBadge role="staff" label="Store staff" />
              {draft.appr_show_best_highlight && (
                <span className="qq-pw-best-tag">★ Best answer</span>
              )}
              <span>· 1 day ago</span>
            </div>
            <div className="qq-pw-msg-text">Yes, the main compartment fits up to a 16-inch laptop. You'll still have room for the charger and a small notebook.</div>
            {showHelpful && (
              <div className="qq-pw-msg-foot">
                <span className="qq-pw-helpful">↑ 12 found this helpful</span>
              </div>
            )}
          </div>
        </div>

        <div className="qq-pw-msg">
          <div className={avatarCls}>SM</div>
          <div className="qq-pw-msg-body">
            <div className="qq-pw-msg-meta">
              <b>Sandra M.</b>
              <RoleBadge role="" label="Verified buyer" />
              <span>· 18 hours ago</span>
            </div>
            <div className="qq-pw-msg-text">Can confirm — my 15-inch MacBook Pro fits easily with the charger.</div>
            {showHelpful && (
              <div className="qq-pw-msg-foot">
                <span className="qq-pw-helpful">↑ 4 found this helpful</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
