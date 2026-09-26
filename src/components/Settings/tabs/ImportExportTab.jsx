import React, { useState, useRef, useEffect } from 'react';
import './ImportExportTab.css';
import { __, _n, sprintf } from '../../../i18n';

const admin = window.quickQaAdmin || { restUrl: '', nonce: '', ajaxUrl: '', exportNonce: '' };

async function apiFetch(path, options = {}) {
  const res = await fetch(admin.restUrl + path, {
    credentials: 'same-origin',
    headers: { 'X-WP-Nonce': admin.nonce, ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // translators: %d is the HTTP status code returned by the server
    throw new Error(data?.message || sprintf(__('Request failed (%d)', 'quick-qa-for-woocommerce'), res.status));
  }
  return data;
}

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return <div className="qq-import-toast">{message}</div>;
}

const ProBadge = () => <span className="qq-badge-pro">{__('Pro', 'quick-qa-for-woocommerce')}</span>;

export default function ImportExportTab({ categories, isPro }) {
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
      if (!res.ok) throw new Error(data?.message || __('Upload failed', 'quick-qa-for-woocommerce'));
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
      const importedText = sprintf(
        // translators: %d is the number of Q&A pairs successfully imported
        _n('Imported %d Q&A pair', 'Imported %d Q&A pairs', result.imported, 'quick-qa-for-woocommerce'),
        result.imported
      );
      const toastMessage = result.skipped
        ? sprintf(
            // translators: 1: import summary text, 2: number of rows skipped
            __('%1$s (%2$d skipped)', 'quick-qa-for-woocommerce'),
            importedText,
            result.skipped
          )
        : importedText;
      setToast(toastMessage);
      setView('form');
      setPreview(null);
    } catch (err) {
      // translators: %s is the error message
      setToast(sprintf(__('Error: %s', 'quick-qa-for-woocommerce'), err.message));
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
          <div className="qq-settings-card-title">{__('Review before importing', 'quick-qa-for-woocommerce')}</div>
          <div className="qq-settings-card-desc">
            {sprintf(
              _n(
                // translators: %d is the number of rows detected in the uploaded CSV
                '%d row detected. Nothing has been imported yet.',
                '%d rows detected. Nothing has been imported yet.',
                preview.total,
                'quick-qa-for-woocommerce'
              ),
              preview.total
            )}
          </div>

          <div className="qq-import-summary">
            <div className="qq-import-summary-cell">
              <div className="qq-import-summary-label">{__('Total rows', 'quick-qa-for-woocommerce')}</div>
              <div className="qq-import-summary-num">{preview.total}</div>
            </div>
            <div className="qq-import-summary-cell">
              <div className="qq-import-summary-label">{__('Ready to import', 'quick-qa-for-woocommerce')}</div>
              <div className="qq-import-summary-num good">{preview.ready}</div>
            </div>
            <div className="qq-import-summary-cell">
              <div className="qq-import-summary-label">{__('Needs attention', 'quick-qa-for-woocommerce')}</div>
              <div className="qq-import-summary-num warn">{preview.needs_attention}</div>
            </div>
          </div>

          <div className="qq-import-tabs">
            <div className={`qq-import-tab${activeFilter === 'all' ? ' active' : ''}`} onClick={() => setActiveFilter('all')}>
              {__('All', 'quick-qa-for-woocommerce')} <span className="qq-import-tab-num">{preview.total}</span>
            </div>
            <div className={`qq-import-tab${activeFilter === 'ready' ? ' active' : ''}`} onClick={() => setActiveFilter('ready')}>
              {__('Ready', 'quick-qa-for-woocommerce')} <span className="qq-import-tab-num">{preview.ready}</span>
            </div>
            <div className={`qq-import-tab errors${activeFilter === 'errors' ? ' active' : ''}`} onClick={() => setActiveFilter('errors')}>
              {__('Errors', 'quick-qa-for-woocommerce')} <span className="qq-import-tab-num">{preview.needs_attention}</span>
            </div>
          </div>

          <div className="qq-import-table">
            <div className="qq-import-row head">
              <div></div>
              <div>{__('Row · Product', 'quick-qa-for-woocommerce')}</div>
              <div>{__('Question', 'quick-qa-for-woocommerce')}</div>
              <div>{__('Status', 'quick-qa-for-woocommerce')}</div>
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
            <div className="qq-import-foot-left">
              {sprintf(
                // translators: 1: number of rows currently shown, 2: total number of rows
                __('Showing %1$d of %2$d rows', 'quick-qa-for-woocommerce'),
                filteredRows.length,
                preview.total
              )}
            </div>
            <div className="qq-import-foot-actions">
              <button className="btn btn-ghost" onClick={handleBackToUpload} disabled={committing}>{__('Cancel', 'quick-qa-for-woocommerce')}</button>
              {preview.needs_attention > 0 && (
                <button
                  className="btn btn-secondary"
                  disabled={committing || preview.ready === 0}
                  onClick={() => handleCommit(rows.filter(r => r.valid))}
                >
                  {committing ? __('Importing…', 'quick-qa-for-woocommerce') : sprintf(
                    _n(
                      // translators: 1: number of rows with errors that will be skipped, 2: number of rows that will be imported
                      'Skip %1$d error and import %2$d',
                      'Skip %1$d errors and import %2$d',
                      preview.needs_attention,
                      'quick-qa-for-woocommerce'
                    ),
                    preview.needs_attention,
                    preview.ready
                  )}
                </button>
              )}
              <button
                className="btn btn-primary"
                disabled={committing || preview.needs_attention > 0}
                onClick={() => handleCommit(rows)}
              >
                {committing
                  ? __('Importing…', 'quick-qa-for-woocommerce')
                  : preview.needs_attention > 0
                    ? sprintf(__('Import %d (fix errors first)', 'quick-qa-for-woocommerce'), preview.total)
                    : sprintf(__('Import %d', 'quick-qa-for-woocommerce'), preview.total)}
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
      <h1 className="qq-settings-page-title">{__('Import / Export', 'quick-qa-for-woocommerce')}</h1>
      <p className="qq-settings-page-sub">
        {__('Move Q&A data in or out of your store. Useful for migrations, backups, and reports.', 'quick-qa-for-woocommerce')}
        {!isPro && (
          <>
            {' '}
            {__('Import and export are part of Askora Pro.', 'quick-qa-for-woocommerce')}
          </>
        )}
      </p>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('Export Q&A', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
        <div className="qq-settings-card-desc">{__('Generate a CSV download of your Q&A. Pick a date range, status, and product category to filter what gets included.', 'quick-qa-for-woocommerce')}</div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">{__('Date range', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
          <div className="qq-settings-field-help">{__('Only Q&A created within this range will be exported. Leave blank for all time.', 'quick-qa-for-woocommerce')}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input className="qq-settings-input qq-settings-input--md" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} disabled={!isPro} />
            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{__('to', 'quick-qa-for-woocommerce')}</span>
            <input className="qq-settings-input qq-settings-input--md" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} disabled={!isPro} />
          </div>
        </div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">{__('Status', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
          <div className="qq-settings-field-help">{__('Choose which question states are included.', 'quick-qa-for-woocommerce')}</div>
          <select className="qq-settings-select" value={status} onChange={e => setStatus(e.target.value)} disabled={!isPro}>
            <option value="all">{__('All statuses', 'quick-qa-for-woocommerce')}</option>
            <option value="approved">{__('Answered / approved only', 'quick-qa-for-woocommerce')}</option>
            <option value="pending">{__('Pending only', 'quick-qa-for-woocommerce')}</option>
            <option value="rejected">{__('Rejected only', 'quick-qa-for-woocommerce')}</option>
          </select>
        </div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">{__('Product category', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
          <div className="qq-settings-field-help">{__('Limit the export to one category, or include all products.', 'quick-qa-for-woocommerce')}</div>
          <select className="qq-settings-select" value={category} onChange={e => setCategory(e.target.value)} disabled={!isPro}>
            <option value="">{__('All categories', 'quick-qa-for-woocommerce')}</option>
            {(categories || []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 20 }}>
          {isPro
            ? <a className="btn btn-primary" href={buildExportHref()}>{__('Generate download', 'quick-qa-for-woocommerce')}</a>
            : <button type="button" className="btn btn-primary" disabled>{__('Generate download', 'quick-qa-for-woocommerce')}</button>}
        </div>
      </div>

      <div className="qq-settings-card">
        <div className="qq-settings-card-title">{__('Import Q&A', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
        <div className="qq-settings-card-desc">{__("Bring in existing Q&A from another store, a previous export, or a content team's spreadsheet. You'll preview every row before anything is imported.", 'quick-qa-for-woocommerce')}</div>

        <div className="qq-settings-field-stacked">
          <div className="qq-settings-field-label">{__('Upload a CSV', 'quick-qa-for-woocommerce')}{!isPro && <ProBadge />}</div>
          <div className="qq-settings-field-help">
            {__('Need a starter file?', 'quick-qa-for-woocommerce')}{' '}
            <button type="button" className="qq-import-template-link" onClick={handleTemplateDownload} disabled={!isPro}>{__('Download CSV template', 'quick-qa-for-woocommerce')}</button>{' '}
            {__('with the correct column headers.', 'quick-qa-for-woocommerce')}
          </div>
          <div
            className={`qq-import-dropzone${isPro ? '' : ' disabled'}`}
            onClick={() => isPro && fileRef.current && fileRef.current.click()}
          >
            <div className="qq-import-dropzone-icon">⬆</div>
            <div className="qq-import-dropzone-title">{uploading ? __('Uploading…', 'quick-qa-for-woocommerce') : __('Click to browse for a CSV', 'quick-qa-for-woocommerce')}</div>
            <div className="qq-import-dropzone-sub">{__('UTF-8 encoding · CSV format', 'quick-qa-for-woocommerce')}</div>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} disabled={!isPro} />
          </div>
          {uploadError && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>{uploadError}</div>}
        </div>

        <div className="qq-settings-banner" style={{ marginTop: 16, marginBottom: 0 }}>
          <span className="qq-settings-banner-mark">ℹ</span>
          <div className="qq-settings-banner-body">
            {__("You'll review every row in a preview screen and can skip rows with errors before anything is committed. Nothing imports until you confirm.", 'quick-qa-for-woocommerce')}
          </div>
        </div>
      </div>
    </>
  );
}
