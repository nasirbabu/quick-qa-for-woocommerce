import React, { useState, useEffect, useCallback } from 'react';
import './AdvancedTab.css';
import Toggle from '../components/Toggle';

const admin = window.quickQaAdmin || { restUrl: '', nonce: '', logDownloadUrl: '' };

async function apiFetch(path, options = {}) {
  const res = await fetch(admin.restUrl + path, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': admin.nonce,
    },
    method: options.method || 'GET',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
}

function timeAgo(iso) {
  if (!iso) return null;
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function AdvancedTab({ draft, onChange }) {
  function set(key, val) {
    onChange({ ...draft, [key]: val });
  }

  const [info, setInfo]           = useState(null); // { table_prefix, action_scheduler_available }
  const [infoError, setInfoError] = useState(null);

  const [log, setLog]             = useState(null); // { content, size, updated }
  const [logLoading, setLogLoading] = useState(true);
  const [logError, setLogError]   = useState(null);
  const [logBusy, setLogBusy]     = useState(false);

  const [cacheStatus, setCacheStatus] = useState(null); // { type: 'ok'|'error', message }
  const [cacheBusy, setCacheBusy]     = useState(false);

  useEffect(() => {
    apiFetch('admin/advanced').then(setInfo).catch(err => setInfoError(err.message));
  }, []);

  const loadLog = useCallback(() => {
    setLogLoading(true);
    setLogError(null);
    return apiFetch('admin/advanced/log')
      .then(data => { setLog(data); setLogLoading(false); })
      .catch(err => { setLogError(err.message); setLogLoading(false); });
  }, []);

  useEffect(() => { loadLog(); }, [loadLog]);

  function handleClearCache() {
    setCacheBusy(true);
    setCacheStatus(null);
    apiFetch('admin/advanced/cache/clear', { method: 'POST' })
      .then(data => setCacheStatus({ type: 'ok', message: `Cleared ${data.cleared} cached item${data.cleared === 1 ? '' : 's'}.` }))
      .catch(err => setCacheStatus({ type: 'error', message: err.message }))
      .finally(() => setCacheBusy(false));
  }

  function handleClearLog() {
    setLogBusy(true);
    apiFetch('admin/advanced/log/clear', { method: 'POST' })
      .then(setLog)
      .catch(err => setLogError(err.message))
      .finally(() => setLogBusy(false));
  }

  return (
    <>
      <h1 className="qq-settings-page-title">Advanced</h1>
      <p className="qq-settings-page-sub">Technical settings most stores never need to touch — for developers debugging an issue or reducing the site's attack surface.</p>

      {/* Database */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Database</div>
        <div className="qq-settings-card-desc">Askora stores questions, answers, votes, and flags in their own tables.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Table prefix</div>
            <div className="qq-settings-field-help">Useful when reporting a bug or writing a custom query directly against the database.</div>
          </div>
          <div className="qq-settings-field-control">
            <code className="qq-adv-code">
              {infoError ? '—' : (info ? info.table_prefix : '…')}
            </code>
          </div>
        </div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Clear cache</div>
            <div className="qq-settings-field-help">
              Clears cached data Askora has stored (such as submission rate-limit counters). Doesn&apos;t affect your questions, answers, or settings.
              {cacheStatus && (
                <span className={`qq-adv-inline-status qq-adv-inline-status--${cacheStatus.type}`}> {cacheStatus.message}</span>
              )}
            </div>
          </div>
          <div className="qq-settings-field-control">
            <button className="btn btn-secondary" onClick={handleClearCache} disabled={cacheBusy}>
              {cacheBusy ? 'Clearing…' : 'Clear cache'}
            </button>
          </div>
        </div>
      </div>

      {/* Background jobs */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Background jobs</div>
        <div className="qq-settings-card-desc">How the daily digest, unanswered-question reminder, and review-invitation emails are scheduled to run.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Job scheduler</div>
            <div className="qq-settings-field-help">
              WP-Cron only fires on a page load, so it can lag on low-traffic sites. Action Scheduler (bundled with WooCommerce) runs jobs more reliably in the background.
              {info && !info.action_scheduler_available && (
                <><br />Action Scheduler isn&apos;t available right now — WooCommerce may not be active. Askora will keep using WP-Cron until it is.</>
              )}
            </div>
          </div>
          <div className="qq-settings-field-control">
            <select
              className="qq-settings-select"
              value={draft.adv_cron_engine}
              onChange={e => set('adv_cron_engine', e.target.value)}
            >
              <option value="wp_cron">WP-Cron (default)</option>
              <option value="action_scheduler">Action Scheduler</option>
            </select>
          </div>
        </div>
      </div>

      {/* REST API */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">REST API</div>
        <div className="qq-settings-card-desc">Controls the public endpoints that power the Q&amp;A widget on your product pages (submitting questions, answers, votes, and flags).</div>

        {!draft.adv_rest_api_enabled && (
          <div className="qq-settings-banner qq-settings-banner--warn">
            <span className="qq-settings-banner-mark">⚠</span>
            <div className="qq-settings-banner-body">
              <b>Public REST API is off.</b> Customers cannot submit questions, answers, votes, or flags until you turn this back on. Your admin dashboard keeps working either way.
            </div>
          </div>
        )}

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Public REST API</div>
            <div className="qq-settings-field-help">
              Turn this off to reduce your site&apos;s attack surface if you don&apos;t use any headless or external integration. Requests to Askora&apos;s public endpoints are rejected once this is off — not just hidden from this screen.
            </div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.adv_rest_api_enabled} onChange={v => set('adv_rest_api_enabled', v)} />
          </div>
        </div>
      </div>

      {/* Debug log */}
      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Debug log</div>
        <div className="qq-settings-card-desc">A log of Askora&apos;s own notification and REST API events — no server file access needed to see why, say, a digest email didn&apos;t go out.</div>

        <div className="qq-settings-field">
          <div className="qq-settings-field-info">
            <div className="qq-settings-field-label">Enable debug logging</div>
            <div className="qq-settings-field-help">When off, new events stop being recorded. Existing log entries are kept until you clear them.</div>
          </div>
          <div className="qq-settings-field-control">
            <Toggle checked={draft.adv_debug_log_enabled} onChange={v => set('adv_debug_log_enabled', v)} />
          </div>
        </div>

        <div className="qq-adv-log">
          <div className="qq-adv-log-toolbar">
            <div className="qq-adv-log-meta">
              {log && (log.size > 0
                ? <>{formatBytes(log.size)} · updated {timeAgo(log.updated)}</>
                : 'No log entries yet.')}
            </div>
            <div className="qq-adv-log-actions">
              <button className="btn btn-ghost" onClick={loadLog} disabled={logLoading}>Refresh</button>
              <a
                className={`btn btn-secondary${!log || !log.size ? ' qq-adv-btn-disabled' : ''}`}
                href={admin.logDownloadUrl}
                onClick={e => { if (!log || !log.size) e.preventDefault(); }}
              >
                Download
              </a>
              <button className="btn btn-danger-ghost" onClick={handleClearLog} disabled={logBusy || !log || !log.size}>
                {logBusy ? 'Clearing…' : 'Clear log'}
              </button>
            </div>
          </div>

          <pre className="qq-adv-log-viewer">
            {logLoading
              ? 'Loading…'
              : logError
                ? `Failed to load log: ${logError}`
                : (log && log.content ? log.content : 'Nothing logged yet.')}
          </pre>
        </div>
      </div>
    </>
  );
}
