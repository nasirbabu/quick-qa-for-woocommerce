import React, { useState, useRef, useEffect } from 'react';
import './ImportExportTab.css';

const admin = window.quickQaAdmin || { restUrl: '', nonce: '', ajaxUrl: '', exportNonce: '' };

async function apiFetch(path, options = {}) {
  const res = await fetch(admin.restUrl + path, {
    credentials: 'same-origin',
    headers: { 'X-WP-Nonce': admin.nonce, ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="qq-import-toast">{message}</div>;
}

export default function ImportExportTab({ categories }) {
  const [view, setView] = useState('form'); // 'form' | 'preview'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [preview, setPreview] = useState(null); // { total, ready, needs_attention, rows }
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'ready' | 'errors'
  const [committing, setCommitting] = useState(false);
  const [toast, setToast] = useState(null);

  const fileRef = useRef(null);

  function buildExportHref() {
    const params = new URLSearchParams({
      action: 'quick_qa_export_csv',
      _wpnonce: admin.exportNonce,
    });
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (status && status !== 'all') params.set('status', status);
    if (category) params.set('category', category);
    return `${admin.ajaxUrl}?${params.toString()}`;
  }

  function handleTemplateDownload() {
    const header = 'product_id or SKU,question_text,answer_text,question_date,answer_date,author_name\n';
    const example = '123,"Does this run on batteries?","Yes, includes 2 AA batteries.",2023-01-15,2023-01-16,Jane D.\n';
    const bom = String.fromCharCode(0xFEFF);
    const blob = new Blob([bom + header + example], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'quick-qa-import-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (file) handleUploadForPreview(file);
  }

  async function handleUploadForPreview(file) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('csv_file', file);
      const res = await fetch(admin.restUrl + 'admin/import/preview', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-WP-Nonce': admin.nonce },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || 'Upload failed');
      setPreview(data);
      setActiveFilter('all');
      setView('preview');
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleCommit(rowsToSend) {
    setCommitting(true);
    try {
      const result = await apiFetch('admin/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: rowsToSend }),
      });
      setToast(`Imported ${result.imported} Q&A pair${result.imported === 1 ? '' : 's'}${result.skipped ? ` (${result.skipped} skipped)` : ''}`);
      setView('form');
      setPreview(null);
    } catch (err) {
      setToast(`Error: ${err.message}`);
    } finally {
      setCommitting(false);
    }
  }

  function handleBackToUpload() {
    setView('form');
    setPreview(null);
    setUploadError(null);
  }

  if (view === 'preview' && preview) {
    const rows = preview.rows || [];
    const filteredRows =
      activeFilter === 'ready' ? rows.filter(r => r.valid) :
      activeFilter === 'errors' ? rows.filter(r => !r.valid) :
      rows;

    return (
      <>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
        <div className="qq-settings-card">
          <div className="qq-settings-card-title">Review before importing</div>
          <div className="qq-settings-card-desc">
            {preview.total} row{preview.total === 1 ? '' : 's'} detected. Nothing has been imported yet.
          </div>

          <div className="qq-import-summary">
            <div className="qq-import-summary-cell">
              <div className="qq-import-summary-label">Total rows</div>
              <div className="qq-import-summary-num">{preview.total}</div>
            </div>
            <div className="qq-import-summary-cell">
              <div className="qq-import-summary-label">Ready to import</div>
              <div className="qq-import-summary-num good">{preview.ready}</div>
            </div>
            <div className="qq-import-summary-cell">
              <div className="qq-import-summary-label">Needs attention</div>
              <div className="qq-import-summary-num warn">{preview.needs_attention}</div>
            </div>
          </div>

          <div className="qq-import-tabs">
            <div className={`qq-import-tab${activeFilter === 'all' ? ' active' : ''}`} onClick={() => setActiveFilter('all')}>
              All <span className="qq-import-tab-num">{preview.total}</span>
            </div>
            <div className={`qq-import-tab${activeFilter === 'ready' ? ' active' : ''}`} onClick={() => setActiveFilter('ready')}>
              Ready <span className="qq-import-tab-num">{preview.ready}</span>
            </div>
            <div className={`qq-import-tab errors${activeFilter === 'errors' ? ' active' : ''}`} onClick={() => setActiveFilter('errors')}>
              Errors <span className="qq-import-tab-num">{preview.needs_attention}</span>
            </div>
          </div>

          <div className="qq-import-table">
            <div className="qq-import-row head">
              <div></div>
              <div>Row · Product</div>
              <div>Question</div>
              <div>Status</div>
            </div>
            {filteredRows.map(row => (
              <div key={row.row_number} className={`qq-import-row${row.valid ? '' : ' error'}`}>
                <div>
                  {row.valid
                    ? <span className="qq-import-status-ok">✓</span>
                    : <span className="qq-import-status-err">!</span>}
                </div>
                <div>{row.row_number} · {row.product_id_or_sku || '—'}</div>
                <div className="qq-import-cell-text">{row.question_text || '—'}</div>
                <div className="qq-import-error-text">{row.valid ? '' : row.errors.join('; ')}</div>
              </div>
            ))}
          </div>

          <div className="qq-import-foot">
            <div className="qq-import-foot-left">Showing {filteredRows.length} of {preview.total} rows</div>
            <div className="qq-import-foot-actions">
              <button className="btn btn-ghost" onClick={handleBackToUpload} disabled={committing}>Cancel</button>
              {preview.needs_attention > 0 && (
                <button
                  className="btn btn-secondary"
                  disabled={committing || preview.ready === 0}
                  onClick={() => handleCommit(rows.filter(r => r.valid))}
                >
                  {committing ? 'Importing…' : `Skip ${preview.needs_attention} error${preview.needs_attention === 1 ? '' : 's'} and import ${preview.ready}`}
                </button>
              )}
              <button
                className="btn btn-primary"
                disabled={committing || preview.needs_attention > 0}
                onClick={() => handleCommit(rows)}
              >
                {committing ? 'Importing…' : preview.needs_attention > 0 ? `Import ${preview.total} (fix errors first)` : `Import ${preview.total}`}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      <h1 className="qq-settings-page-title">Import / Export</h1>
      <p className="qq-settings-page-sub">Move Q&amp;A data in or out of your store. Useful for migrations, backups, and reports.</p>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Export Q&amp;A</div>
        <div className="qq-settings-card-desc">Generate a CSV download of your Q&amp;A. Pick a date range, status, and product category to filter what gets included.</div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">Date range</div>
          <div className="qq-settings-field-help">Only Q&amp;A created within this range will be exported. Leave blank for all time.</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="qq-settings-input qq-settings-input--md" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>to</span>
            <input className="qq-settings-input qq-settings-input--md" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">Status</div>
          <div className="qq-settings-field-help">Choose which question states are included.</div>
          <select className="qq-settings-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="approved">Answered / approved only</option>
            <option value="pending">Pending only</option>
            <option value="rejected">Rejected only</option>
          </select>
        </div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">Product category</div>
          <div className="qq-settings-field-help">Limit the export to one category, or include all products.</div>
          <select className="qq-settings-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {(categories || []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 20 }}>
          <a className="btn btn-primary" href={buildExportHref()}>Generate download</a>
        </div>
      </div>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">Import Q&amp;A</div>
        <div className="qq-settings-card-desc">Bring in existing Q&amp;A from another store, a previous export, or a content team's spreadsheet. You'll preview every row before anything is imported.</div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">Upload a CSV</div>
          <div className="qq-settings-field-help">
            Need a starter file?{' '}
            <button type="button" className="qq-import-template-link" onClick={handleTemplateDownload}>Download CSV template</button>{' '}
            with the correct column headers.
          </div>
          <div className="qq-import-dropzone" onClick={() => fileRef.current && fileRef.current.click()}>
            <div className="qq-import-dropzone-icon">⬆</div>
            <div className="qq-import-dropzone-title">{uploading ? 'Uploading…' : 'Click to browse for a CSV'}</div>
            <div className="qq-import-dropzone-sub">UTF-8 encoding · CSV format</div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>
          {uploadError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{uploadError}</div>}
        </div>

        <div className="qq-settings-banner" style={{ marginTop: 16, marginBottom: 0 }}>
          <span className="qq-settings-banner-mark">ℹ</span>
          <div className="qq-settings-banner-body">
            You'll review every row in a preview screen and can skip rows with errors before anything is committed. Nothing imports until you confirm.
          </div>
        </div>
      </div>
    </>
  );
}
