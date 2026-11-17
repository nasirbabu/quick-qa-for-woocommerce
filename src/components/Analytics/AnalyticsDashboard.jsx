import React, { useCallback, useEffect, useRef, useState } from 'react';
import { __, _n, sprintf } from '../../i18n';
import { TEXT_DOMAIN, fetchReport, saveSettings } from './api';
import { RANGES, formatLongDay, formatNumber, formatDurationLong } from './format';
import { downloadCsv } from './csv';
import {
	Interpolate,
	ProductFilter,
	StatTiles,
	ThresholdSettings,
	OutlierCallout,
	DailyChart,
	TopProducts,
	TopCustomers,
	TopQuestions,
	AnswerSources,
} from './parts';
import './Analytics.css';

/** Poll interval while the tab is visible, so the dashboard stays live. */
const REFRESH_MS = 60000;


function headline( report ) {
	const s       = report.summary;
	const overdue = ( report.tiles.find( t => t.key === 'unanswered' ) || {} ).overdue || 0;

	if ( s.questions === 0 ) {
		return __( 'No questions in this period yet.', TEXT_DOMAIN );
	}
	if ( overdue > 0 ) {
		return __( 'A few questions need your attention.', TEXT_DOMAIN );
	}
	return __( 'Things are looking good.', TEXT_DOMAIN );
}

/** Summary paragraph built only from the report's real numbers. */
function SummarySentence( { report } ) {
	const s = report.summary;

	if ( s.questions === 0 ) {
		return __( 'Once customers start asking questions, you will see response times, answer rates and your busiest products here.', TEXT_DOMAIN );
	}

	return (
		<>
			{ s.avg_response_secs === null ? (
				<Interpolate
					/* translators: 1: number of questions received. */
					format={ __( 'Customers asked %1$s in this period, and none have been answered yet.', TEXT_DOMAIN ) }
					values={ [ sprintf( _n( '%s question', '%s questions', s.questions, TEXT_DOMAIN ), formatNumber( s.questions ) ) ] }
				/>
			) : (
				<Interpolate
					/* translators: 1: number of answered questions, 2: average response time. */
					format={ __( 'You answered %1$s in this period with an average response time of %2$s.', TEXT_DOMAIN ) }
					values={ [
						sprintf( _n( '%s question', '%s questions', s.answered_questions, TEXT_DOMAIN ), formatNumber( s.answered_questions ) ),
						formatDurationLong( s.avg_response_secs ),
					] }
				/>
			) }
			{ ' ' }
			<Interpolate
				/* translators: 1: number of upvotes, 2: number of community answers from verified buyers. */
				format={ __( 'Customers cast %1$s and verified buyers chipped in with %2$s.', TEXT_DOMAIN ) }
				values={ [
					sprintf( _n( '%s upvote', '%s upvotes', s.upvotes, TEXT_DOMAIN ), formatNumber( s.upvotes ) ),
					sprintf( _n( '%s community answer', '%s community answers', s.verified_answers, TEXT_DOMAIN ), formatNumber( s.verified_answers ) ),
				] }
			/>
		</>
	);
}

/**
 * Analytics page (KAN-32). Data comes from the Pro plugin's REST routes
 * (`quick-qa-pro/v1/analytics/*`); App.jsx only offers this page when the
 * Pro plugin is active and licensed.
 */
export default function AnalyticsDashboard() {
	const [ range, setRange ]     = useState( '30d' );
	const [ product, setProduct ] = useState( null );
	const [ report, setReport ]   = useState( null );
	const [ error, setError ]     = useState( null );
	const [ loading, setLoading ] = useState( true );

	const requestId = useRef( 0 );
	const abortRef  = useRef( null );

	const load = useCallback( () => {
		const id = ++requestId.current;
		if ( abortRef.current ) {
			abortRef.current.abort();
		}
		const ctrl       = new AbortController();
		abortRef.current = ctrl;
		setLoading( true );

		return fetchReport( range, product ? product.id : 0, ctrl.signal )
			.then( data => {
				if ( id === requestId.current ) {
					setReport( data );
					setError( null );
				}
			} )
			.catch( err => {
				if ( err.name !== 'AbortError' && id === requestId.current ) {
					setError( err );
				}
			} )
			.finally( () => {
				if ( id === requestId.current ) {
					setLoading( false );
				}
			} );
	}, [ range, product ] );

	// Load on mount and whenever the range/product changes.
	useEffect( () => {
		load();
	}, [ load ] );

	// Live refresh: poll while visible, refresh immediately on return.
	useEffect( () => {
		const tick = () => {
			if ( document.visibilityState === 'visible' ) {
				load();
			}
		};
		const timer   = setInterval( tick, REFRESH_MS );
		const onVisible = () => document.visibilityState === 'visible' && load();
		document.addEventListener( 'visibilitychange', onVisible );
		return () => {
			clearInterval( timer );
			document.removeEventListener( 'visibilitychange', onVisible );
		};
	}, [ load ] );

	useEffect( () => () => abortRef.current && abortRef.current.abort(), [] );

	const handleSaveSettings = async settings => {
		await saveSettings( settings );
		await load();
	};

	const filterTo = p => setProduct( p ? { id: p.id, name: p.name } : null );

	const header = (
		<div className="qq-top">
			<div className="qq-top-left">
				<span className="qq-page-label">{ __( 'Analytics', TEXT_DOMAIN ) }</span>
				<ProductFilter product={ product } onChange={ filterTo } />
			</div>
			<div className="qq-an-top-right">
				{ loading && report && <span className="qq-an-faded qq-an-refreshing">{ __( 'Updating…', TEXT_DOMAIN ) }</span> }
				<select
					className="qq-an-select"
					value={ range }
					onChange={ e => setRange( e.target.value ) }
					aria-label={ __( 'Date range', TEXT_DOMAIN ) }
				>
					{ RANGES.map( r => <option key={ r.key } value={ r.key }>{ r.label }</option> ) }
				</select>
				<button
					type="button"
					className="qq-an-btn"
					disabled={ ! report }
					title={ __( 'Download exactly what is shown below as a CSV file', TEXT_DOMAIN ) }
					onClick={ () => report && downloadCsv( report ) }
				>
					{ __( 'Export CSV', TEXT_DOMAIN ) }
				</button>
			</div>
		</div>
	);

	if ( error && ! report ) {
		return (
			<div className="qq-page qq-an">
				{ header }
				<div className={ `qq-state-msg${ error.status === 403 ? '' : ' qq-state-msg--error' }` }>
					{ error.status === 403
						? __( 'Analytics is a Pro feature. Activate your Askora Pro license to unlock it.', TEXT_DOMAIN )
						: sprintf( __( 'Failed to load analytics: %s', TEXT_DOMAIN ), error.message ) }
				</div>
			</div>
		);
	}

	if ( ! report ) {
		return (
			<div className="qq-page qq-an">
				{ header }
				<div className="qq-state-msg">{ __( 'Loading analytics…', TEXT_DOMAIN ) }</div>
			</div>
		);
	}

	const label = report.range.label;

	return (
		<div className="qq-page qq-an">
			{ header }
			<div className="qq-an-scroll">
				<div className={ `qq-an-content${ loading ? ' is-loading' : '' }` }>
					{ error && (
						<div className="qq-state-msg qq-state-msg--error qq-an-inline-error">
							{ sprintf( __( 'Could not refresh analytics: %s', TEXT_DOMAIN ), error.message ) }
						</div>
					) }

					<div className="qq-an-greeting">
						{ formatLongDay( report.range.end ) } · { label }
						{ report.product && <> · { report.product.name }</> }
					</div>
					<h1 className="qq-an-title">{ headline( report ) }</h1>
					<p className="qq-an-sub"><SummarySentence report={ report } /></p>

					<div className="qq-an-section-head">
						<div className="qq-an-section-label">{ __( 'Overview', TEXT_DOMAIN ) }</div>
						{ ! report.product && (
							<ThresholdSettings settings={ report.settings } onSave={ handleSaveSettings } />
						) }
					</div>
					<StatTiles report={ report } />

					<OutlierCallout outlier={ report.outlier } onFilter={ filterTo } />

					<div className="qq-an-section">
						<div className="qq-an-section-label">{ __( 'Activity', TEXT_DOMAIN ) }</div>
						<DailyChart daily={ report.daily } rangeLabel={ label } />
					</div>

					<div className="qq-an-grid-2">
						<TopProducts rows={ report.top_products } onFilter={ filterTo } />
						<TopCustomers rows={ report.top_customers } />
					</div>

					<div className="qq-an-grid-2">
						<TopQuestions rows={ report.top_questions } onFilter={ filterTo } />
						<AnswerSources rows={ report.answer_sources } rangeLabel={ label } />
					</div>
				</div>
			</div>
		</div>
	);
}
