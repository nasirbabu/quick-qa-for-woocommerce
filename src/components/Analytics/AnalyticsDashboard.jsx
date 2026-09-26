import React, { useState, useEffect } from 'react';
import { __, sprintf } from '../../i18n';
import './Analytics.css';

const TEXT_DOMAIN = 'quick-qa-for-woocommerce';

async function proApiFetch( path ) {
  const base = window.quickQaAdmin?.proRestUrl || '';
  const res = await fetch( base + path, {
    headers: { 'X-WP-Nonce': window.quickQaAdmin?.nonce || '' },
  } );
  let data = null;
  try {
    data = await res.json();
  } catch ( e ) {
    data = null;
  }
  if ( ! res.ok ) {
    const err = new Error( data?.message || __( 'Request failed', TEXT_DOMAIN ) );
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * Analytics page. The data comes from the Pro plugin's REST routes
 * (quick-qa-pro/v1); this component only renders when the Pro plugin is
 * active and licensed (see App.jsx).
 */
export default function AnalyticsDashboard() {
  const [ summary, setSummary ]           = useState( null );
  const [ topQuestions, setTopQuestions ] = useState( null );
  const [ error, setError ]               = useState( null );

  useEffect( () => {
    Promise.all( [
      proApiFetch( 'analytics/summary?days=30' ),
      proApiFetch( 'analytics/top-questions?limit=10' ),
    ] )
      .then( ( [ summaryData, topQuestionsData ] ) => {
        setSummary( summaryData );
        setTopQuestions( topQuestionsData );
      } )
      .catch( err => setError( err ) );
  }, [] );

  if ( error ) {
    if ( error.status === 403 ) {
      return (
        <div className="qq-page">
          <div className="qq-state-msg">
            { __( 'Analytics is a Pro feature. Activate your Askora Pro license to unlock it.', TEXT_DOMAIN ) }
          </div>
        </div>
      );
    }
    return (
      <div className="qq-page">
        <div className="qq-state-msg qq-state-msg--error">
          { sprintf( __( 'Failed to load analytics: %s', TEXT_DOMAIN ), error.message ) }
        </div>
      </div>
    );
  }

  if ( ! summary || ! topQuestions ) {
    return (
      <div className="qq-page">
        <div className="qq-state-msg">{ __( 'Loading analytics…', TEXT_DOMAIN ) }</div>
      </div>
    );
  }

  const totals = summary.reduce(
    ( acc, day ) => ( {
      questions: acc.questions + day.questions_count,
      answers:   acc.answers   + day.answers_count,
      upvotes:   acc.upvotes   + day.upvotes_count,
    } ),
    { questions: 0, answers: 0, upvotes: 0 }
  );

  const stats = [
    { label: __( 'Questions', TEXT_DOMAIN ), value: totals.questions },
    { label: __( 'Answers', TEXT_DOMAIN ),   value: totals.answers },
    { label: __( 'Upvotes', TEXT_DOMAIN ),   value: totals.upvotes },
  ];

  return (
    <div className="qq-analytics">
      <h1 className="qq-analytics-title">{ __( 'Analytics', TEXT_DOMAIN ) }</h1>
      <p className="qq-analytics-sub">{ __( 'Last 30 days across your store.', TEXT_DOMAIN ) }</p>

      <div className="qq-analytics-stats">
        { stats.map( stat => (
          <div key={ stat.label } className="qq-analytics-stat">
            <div className="qq-analytics-stat-value">{ stat.value }</div>
            <div className="qq-analytics-stat-label">{ stat.label }</div>
          </div>
        ) ) }
      </div>

      <h2 className="qq-analytics-heading">{ __( 'Top questions', TEXT_DOMAIN ) }</h2>
      <table className="qq-analytics-table">
        <thead>
          <tr>
            <th>{ __( 'Question', TEXT_DOMAIN ) }</th>
            <th>{ __( 'Product', TEXT_DOMAIN ) }</th>
            <th className="qq-analytics-num">{ __( 'Upvotes', TEXT_DOMAIN ) }</th>
          </tr>
        </thead>
        <tbody>
          { topQuestions.length === 0 && (
            <tr>
              <td colSpan={ 3 } className="qq-analytics-empty">
                { __( 'No approved questions yet.', TEXT_DOMAIN ) }
              </td>
            </tr>
          ) }
          { topQuestions.map( q => (
            <tr key={ q.id }>
              <td>{ q.question_text }</td>
              <td className="qq-analytics-muted">{ q.product_title }</td>
              <td className="qq-analytics-num">{ q.upvotes }</td>
            </tr>
          ) ) }
        </tbody>
      </table>
    </div>
  );
}
