import React from 'react';
import Toggle from '../components/Toggle';
import { __ } from '../../../i18n';

function field(draft, key, onChange) {
  return e => onChange({ ...draft, [key]: e.target.value });
}

export default function CommunityTab({ draft, onChange }) {
  const set = (key, value) => onChange({ ...draft, [key]: value });

  return (
    <>
      <h1 className="qq-settings-page-title">{ __( 'Community', 'quick-qa-for-woocommerce' ) }</h1>
      <p className="qq-settings-page-sub">
        { __( 'Control who can answer questions and what gets your approval before going public.', 'quick-qa-for-woocommerce' ) }
      </p>

      {/* ── Who can answer ── */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Who can answer', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">
          { __( 'Beyond your team, you can let real customers answer questions on product pages.', 'quick-qa-for-woocommerce' ) }
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Allow verified buyers to answer', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">
              { __( 'Customers who have purchased the specific product. Their answers earn the strongest trust badge.', 'quick-qa-for-woocommerce' ) }
            </div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle
              checked={draft.allow_verified_buyers}
              onChange={v => set('allow_verified_buyers', v)}
            />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Allow other logged-in customers to answer', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">
              { __( "Any customer with an account, even if they haven't purchased this specific product. Useful when buyers know related products.", 'quick-qa-for-woocommerce' ) }
            </div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle
              checked={draft.allow_logged_in_customers}
              onChange={v => set('allow_logged_in_customers', v)}
            />
          </div>
        </div>
      </div>

      {/* ── Approval rules ── */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Approval rules', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">
          { __( 'Decide which answers and replies need your manual review before going live.', 'quick-qa-for-woocommerce' ) }
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Verified buyer answers', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">
              { __( 'When someone who purchased the product writes an answer.', 'quick-qa-for-woocommerce' ) }
            </div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.verified_buyer_approval}
              onChange={field(draft, 'verified_buyer_approval', onChange)}
            >
              <option value="require">{ __( 'Require my approval', 'quick-qa-for-woocommerce' ) }</option>
              <option value="auto">{ __( 'Auto-publish', 'quick-qa-for-woocommerce' ) }</option>
            </select>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">{ __( 'Other community member answers', 'quick-qa-for-woocommerce' ) }</div>
            <div className="qq-settings-field-help">
              { __( "When a logged-in customer answers, but hasn't purchased the product.", 'quick-qa-for-woocommerce' ) }
            </div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.community_approval}
              onChange={field(draft, 'community_approval', onChange)}
            >
              <option value="always">{ __( 'Always require approval', 'quick-qa-for-woocommerce' ) }</option>
              <option value="auto_trusted">{ __( 'Auto-publish if trusted', 'quick-qa-for-woocommerce' ) }</option>
            </select>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              { __( 'Customer follow-ups', 'quick-qa-for-woocommerce' ) }
            </div>
            <div className="qq-settings-field-help">
              { __( 'When the original asker replies again after your answer — same person continuing the conversation.', 'quick-qa-for-woocommerce' ) }
            </div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.followup_approval}
              onChange={field(draft, 'followup_approval', onChange)}
            >
              <option value="auto">{ __( 'Auto-publish (recommended)', 'quick-qa-for-woocommerce' ) }</option>
              <option value="require">{ __( 'Require my approval', 'quick-qa-for-woocommerce' ) }</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Trust tier ── */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{ __( 'Trust tier', 'quick-qa-for-woocommerce' ) }</div>
        <div className="qq-settings-card-desc">
          { __( 'Reward consistently helpful customers by auto-publishing their future answers.', 'quick-qa-for-woocommerce' ) }
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              { __( 'Enable trust tier', 'quick-qa-for-woocommerce' ) }
              <span className="qq-badge-soon">{ __( 'Coming soon', 'quick-qa-for-woocommerce' ) }</span>
            </div>
            <div className="qq-settings-field-help">
              { __( "After a customer's answers have been marked helpful several times, automatically trust their future answers without review.", 'quick-qa-for-woocommerce' ) }
            </div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle
              checked={draft.enable_trust_tier}
              onChange={v => set('enable_trust_tier', v)}
              disabled
            />
          </div>
        </div>

        {draft.enable_trust_tier && (
          <div className="qq-settings-field">
            <div className="qq-settings-field-info">
              <div className="qq-settings-field-label">{ __( 'Helpful answers required', 'quick-qa-for-woocommerce' ) }</div>
              <div className="qq-settings-field-help">
                { __( "How many of a customer's answers must be approved and marked helpful before they earn trusted status.", 'quick-qa-for-woocommerce' ) }
              </div>
            </div>
            <div className="qq-settings-field-control">
              <div className="qq-settings-input-wrap">
                <input
                  type="number"
                  className="qq-settings-input qq-settings-input--short"
                  min="1"
                  max="50"
                  value={draft.trust_helpful_threshold}
                  onChange={e => set('trust_helpful_threshold', Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)))}
                  disabled
                />
                <span className="qq-settings-input-unit">{ __( 'default 3', 'quick-qa-for-woocommerce' ) }</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
