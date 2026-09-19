import React from 'react';
import Toggle from '../components/Toggle';
import { __ } from '../../../i18n';

export default function NotificationsTab({ draft, onChange }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  return (
    <>
      <h1 className="qq-settings-page-title">{__('Notifications', 'quick-qa-for-woocommerce')}</h1>
      <p className="qq-settings-page-sub">{__('Stay informed about new questions and answers without checking the dashboard constantly.', 'quick-qa-for-woocommerce')}</p>

      {/* New question alerts */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('New question alerts', 'quick-qa-for-woocommerce')}</div>
        <div className="qq-settings-card-desc">{__('When a customer asks a new question on any product page.', 'quick-qa-for-woocommerce')}</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              {__('Email me on new questions', 'quick-qa-for-woocommerce')}
              <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
            </div>
            <div className="qq-settings-field-help">{__('Sends an email containing the question, customer info, and a direct link to answer.', 'quick-qa-for-woocommerce')}</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_new_question} onChange={v => set('notify_new_question', v)} disabled />
          </div>
        </div>

        {draft.notify_new_question && (
          <>
            <div className="qq-settings-field-stacked">
              <div className="qq-settings-field-label">
                {__('Send to', 'quick-qa-for-woocommerce')}
                <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
              </div>
              <div className="qq-settings-field-help">{__('One email per line. Send to multiple team members for shared moderation duty.', 'quick-qa-for-woocommerce')}</div>
              <textarea
                className="qq-settings-textarea"
                value={draft.new_question_recipients}
                onChange={e => set('new_question_recipients', e.target.value)}
                placeholder="admin@store.com"
                rows={3}
                disabled
              />
            </div>

            <div className="qq-settings-field">
              <div className="qq-settings-field-info">
                <div className="qq-settings-field-label">
                  {__('Delivery', 'quick-qa-for-woocommerce')}
                  <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
                </div>
                <div className="qq-settings-field-help">{__('Instant alerts feel responsive but interrupt focus. Daily digest groups everything into one morning email.', 'quick-qa-for-woocommerce')}</div>
              </div>
              <div className="qq-settings-field-control">
                <select
                  className="qq-settings-select"
                  value={draft.notify_mode}
                  onChange={e => set('notify_mode', e.target.value)}
                  disabled
                >
                  <option value="instant">{__('Instant — every question', 'quick-qa-for-woocommerce')}</option>
                  <option value="digest">{__('Daily digest — one email per day', 'quick-qa-for-woocommerce')}</option>
                </select>
              </div>
            </div>

            {draft.notify_mode === 'digest' && (
              <div className="qq-settings-field">
                <div className="qq-settings-field-info">
                  <div className="qq-settings-field-label">
                    {__('Send digest at', 'quick-qa-for-woocommerce')}
                    <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
                  </div>
                  <div className="qq-settings-field-help">{__('Local store time. Choose when your team usually starts answering.', 'quick-qa-for-woocommerce')}</div>
                </div>
                <div className="qq-settings-field-control">
                  <input
                    className="qq-settings-input qq-settings-input--time"
                    type="time"
                    value={draft.digest_time}
                    onChange={e => set('digest_time', e.target.value)}
                    disabled
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Other alerts */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('Other alerts', 'quick-qa-for-woocommerce')}</div>
        <div className="qq-settings-card-desc">{__('Other moments when your attention is genuinely useful.', 'quick-qa-for-woocommerce')}</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              {__('Community answer pending review', 'quick-qa-for-woocommerce')}
              <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
            </div>
            <div className="qq-settings-field-help">{__('When a verified buyer or community member submits an answer that needs your approval.', 'quick-qa-for-woocommerce')}</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_community_answer} onChange={v => set('notify_community_answer', v)} disabled />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              {__('Question hits upvote threshold', 'quick-qa-for-woocommerce')}
              <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
            </div>
            <div className="qq-settings-field-help">{__("When many customers upvote the same unanswered question, it's a priority.", 'quick-qa-for-woocommerce')}</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_upvote_threshold} onChange={v => set('notify_upvote_threshold', v)} disabled />
          </div>
        </div>

        {draft.notify_upvote_threshold && (
          <div className="qq-settings-field">
            <div className="qq-settings-field-info">
              <div className="qq-settings-field-label">
                {__('Threshold', 'quick-qa-for-woocommerce')}
                <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
              </div>
              <div className="qq-settings-field-help">{__('Upvote count that triggers the priority alert.', 'quick-qa-for-woocommerce')}</div>
            </div>
            <div className="qq-settings-field-control">
              <div className="qq-settings-input-wrap">
                <input
                  className="qq-settings-input qq-settings-input--short"
                  type="number"
                  min="1"
                  max="999"
                  value={draft.upvote_threshold_value}
                  onChange={e => set('upvote_threshold_value', Math.max(1, parseInt(e.target.value, 10) || 5))}
                  disabled
                />
                <span className="qq-settings-input-unit">{__('upvotes', 'quick-qa-for-woocommerce')}</span>
              </div>
            </div>
          </div>
        )}

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              {__('Content auto-hidden by flags', 'quick-qa-for-woocommerce')}
              <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
            </div>
            <div className="qq-settings-field-help">{__('When a question or answer is automatically hidden after crossing your flag threshold.', 'quick-qa-for-woocommerce')}</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_flag_threshold} onChange={v => set('notify_flag_threshold', v)} disabled />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              {__('Unanswered reminder', 'quick-qa-for-woocommerce')}
              <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
            </div>
            <div className="qq-settings-field-help">{__('Nudge yourself when a question has been waiting too long.', 'quick-qa-for-woocommerce')}</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_unanswered_reminder} onChange={v => set('notify_unanswered_reminder', v)} disabled />
          </div>
        </div>

        {draft.notify_unanswered_reminder && (
          <div className="qq-settings-field">
            <div className="qq-settings-field-info">
              <div className="qq-settings-field-label">
                {__('Remind me after', 'quick-qa-for-woocommerce')}
                <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
              </div>
              <div className="qq-settings-field-help">{__('Days a question can sit unanswered before you get a reminder.', 'quick-qa-for-woocommerce')}</div>
            </div>
            <div className="qq-settings-field-control">
              <div className="qq-settings-input-wrap">
                <input
                  className="qq-settings-input qq-settings-input--short"
                  type="number"
                  min="1"
                  max="365"
                  value={draft.unanswered_reminder_days}
                  onChange={e => set('unanswered_reminder_days', Math.max(1, parseInt(e.target.value, 10) || 3))}
                  disabled
                />
                <span className="qq-settings-input-unit">{__('days', 'quick-qa-for-woocommerce')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slack integration */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('Slack integration', 'quick-qa-for-woocommerce')}</div>
        <div className="qq-settings-card-desc">{__('Pipe notifications into a Slack channel instead of (or alongside) email.', 'quick-qa-for-woocommerce')}</div>

        <div className="qq-settings-field-stacked qq-settings-field-stacked--solo">
          <div className="qq-settings-field-label">
            {__('Slack webhook URL', 'quick-qa-for-woocommerce')}
            <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>
          </div>
          <div className="qq-settings-field-help">{__('Paste your Slack incoming webhook URL. Notifications will post to that channel using your alert preferences above.', 'quick-qa-for-woocommerce')}</div>
          <input
            className="qq-settings-input qq-settings-input--full"
            type="url"
            value={draft.slack_webhook}
            onChange={e => set('slack_webhook', e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            spellCheck={false}
            disabled
          />
        </div>
      </div>
    </>
  );
}
