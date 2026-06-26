import React from 'react';
import Toggle from '../components/Toggle';

function field(draft, key, onChange) {
  return e => onChange({ ...draft, [key]: e.target.value });
}

export default function CommunityTab({ draft, onChange }) {
  const set = (key, value) => onChange({ ...draft, [key]: value });

  return (
    <>
      <h1 className="qq-settings-page-title">Community</h1>
      <p className="qq-settings-page-sub">
        Control who can answer questions and what gets your approval before going public.
      </p>

      {/* ── Who can answer ── */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Who can answer</div>
        <div className="qq-settings-card-desc">
          Beyond your team, you can let real customers answer questions on product pages.
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Allow verified buyers to answer</div>
            <div className="qq-settings-field-help">
              Customers who have purchased the specific product. Their answers earn the strongest trust badge.
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
            <div className="qq-settings-field-label">Allow other logged-in customers to answer</div>
            <div className="qq-settings-field-help">
              Any customer with an account, even if they haven't purchased this specific product. Useful when buyers know related products.
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
        <div className="qq-settings-card-title">Approval rules</div>
        <div className="qq-settings-card-desc">
          Decide which answers and replies need your manual review before going live.
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Verified buyer answers</div>
            <div className="qq-settings-field-help">
              When someone who purchased the product writes an answer.
            </div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.verified_buyer_approval}
              onChange={field(draft, 'verified_buyer_approval', onChange)}
            >
              <option value="require">Require my approval</option>
              <option value="auto">Auto-publish</option>
            </select>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Other community member answers</div>
            <div className="qq-settings-field-help">
              When a logged-in customer answers, but hasn't purchased the product.
            </div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.community_approval}
              onChange={field(draft, 'community_approval', onChange)}
            >
              <option value="always">Always require approval</option>
              <option value="auto_trusted">Auto-publish if trusted</option>
            </select>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Customer follow-ups</div>
            <div className="qq-settings-field-help">
              When the original asker replies again after your answer — same person continuing the conversation.
            </div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.followup_approval}
              onChange={field(draft, 'followup_approval', onChange)}
            >
              <option value="auto">Auto-publish (recommended)</option>
              <option value="require">Require my approval</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Trust tier ── */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Trust tier</div>
        <div className="qq-settings-card-desc">
          Reward consistently helpful customers by auto-publishing their future answers.
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Enable trust tier</div>
            <div className="qq-settings-field-help">
              After a customer's answers have been marked helpful several times, automatically trust their future answers without review.
            </div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle
              checked={draft.enable_trust_tier}
              onChange={v => set('enable_trust_tier', v)}
            />
          </div>
        </div>

        {draft.enable_trust_tier && (
          <div className="qq-settings-field">
            <div className="qq-settings-field-info">
              <div className="qq-settings-field-label">Helpful answers required</div>
              <div className="qq-settings-field-help">
                How many of a customer's answers must be approved and marked helpful before they earn trusted status.
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
                />
                <span className="qq-settings-input-unit">default 3</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
