import React from 'react';
import Toggle from '../components/Toggle';

export default function NotificationsTab({ draft, onChange }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  return (
    <>
      <h1 className="qq-settings-page-title">Notifications</h1>
      <p className="qq-settings-page-sub">Stay informed about new questions and answers without checking the dashboard constantly.</p>

      {/* New question alerts */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">New question alerts</div>
        <div className="qq-settings-card-desc">When a customer asks a new question on any product page.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              Email me on new questions
              <span className="qq-badge-pro">Pro</span>
            </div>
            <div className="qq-settings-field-help">Sends an email containing the question, customer info, and a direct link to answer.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_new_question} onChange={v => set('notify_new_question', v)} disabled />
          </div>
        </div>

        {draft.notify_new_question && (
          <>
            <div className="qq-settings-field-stacked">
              <div className="qq-settings-field-label">
                Send to
                <span className="qq-badge-pro">Pro</span>
              </div>
              <div className="qq-settings-field-help">One email per line. Send to multiple team members for shared moderation duty.</div>
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
                  Delivery
                  <span className="qq-badge-pro">Pro</span>
                </div>
                <div className="qq-settings-field-help">Instant alerts feel responsive but interrupt focus. Daily digest groups everything into one morning email.</div>
              </div>
              <div className="qq-settings-field-control">
                <select
                  className="qq-settings-select"
                  value={draft.notify_mode}
                  onChange={e => set('notify_mode', e.target.value)}
                  disabled
                >
                  <option value="instant">Instant — every question</option>
                  <option value="digest">Daily digest — one email per day</option>
                </select>
              </div>
            </div>

            {draft.notify_mode === 'digest' && (
              <div className="qq-settings-field">
                <div className="qq-settings-field-info">
                  <div className="qq-settings-field-label">
                    Send digest at
                    <span className="qq-badge-pro">Pro</span>
                  </div>
                  <div className="qq-settings-field-help">Local store time. Choose when your team usually starts answering.</div>
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
        <div className="qq-settings-card-title">Other alerts</div>
        <div className="qq-settings-card-desc">Other moments when your attention is genuinely useful.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              Community answer pending review
              <span className="qq-badge-pro">Pro</span>
            </div>
            <div className="qq-settings-field-help">When a verified buyer or community member submits an answer that needs your approval.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_community_answer} onChange={v => set('notify_community_answer', v)} disabled />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              Question hits upvote threshold
              <span className="qq-badge-pro">Pro</span>
            </div>
            <div className="qq-settings-field-help">When many customers upvote the same unanswered question, it&apos;s a priority.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_upvote_threshold} onChange={v => set('notify_upvote_threshold', v)} disabled />
          </div>
        </div>

        {draft.notify_upvote_threshold && (
          <div className="qq-settings-field">
            <div className="qq-settings-field-info">
              <div className="qq-settings-field-label">
                Threshold
                <span className="qq-badge-pro">Pro</span>
              </div>
              <div className="qq-settings-field-help">Upvote count that triggers the priority alert.</div>
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
                <span className="qq-settings-input-unit">upvotes</span>
              </div>
            </div>
          </div>
        )}

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              Content auto-hidden by flags
              <span className="qq-badge-pro">Pro</span>
            </div>
            <div className="qq-settings-field-help">When a question or answer is automatically hidden after crossing your flag threshold.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_flag_threshold} onChange={v => set('notify_flag_threshold', v)} disabled />
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">
              Unanswered reminder
              <span className="qq-badge-pro">Pro</span>
            </div>
            <div className="qq-settings-field-help">Nudge yourself when a question has been waiting too long.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.notify_unanswered_reminder} onChange={v => set('notify_unanswered_reminder', v)} disabled />
          </div>
        </div>

        {draft.notify_unanswered_reminder && (
          <div className="qq-settings-field">
            <div className="qq-settings-field-info">
              <div className="qq-settings-field-label">
                Remind me after
                <span className="qq-badge-pro">Pro</span>
              </div>
              <div className="qq-settings-field-help">Days a question can sit unanswered before you get a reminder.</div>
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
                <span className="qq-settings-input-unit">days</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Slack integration */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Slack integration</div>
        <div className="qq-settings-card-desc">Pipe notifications into a Slack channel instead of (or alongside) email.</div>

        <div className="qq-settings-field-stacked qq-settings-field-stacked--solo">
          <div className="qq-settings-field-label">
            Slack webhook URL
            <span className="qq-badge-pro">Pro</span>
          </div>
          <div className="qq-settings-field-help">Paste your Slack incoming webhook URL. Notifications will post to that channel using your alert preferences above.</div>
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
