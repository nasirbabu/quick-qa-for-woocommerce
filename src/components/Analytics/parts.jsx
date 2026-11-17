import React, { useEffect, useRef, useState } from 'react';
import { __, sprintf, _n } from '../../i18n';
import { TEXT_DOMAIN, searchProducts } from './api';
import { useNav } from '../../navigation';
import {
	describeTiles,
	describeOutlier,
	formatDay,
	formatNumber,
	customerDetail,
	upvotesLabel,
} from './format';

/**
 * Render a translatable sentence whose %1$s, %2$s… placeholders become
 * bold values, without dangerouslySetInnerHTML.
 */
export function Interpolate( { format, values } ) {
	const parts = String( format ).split( /(%\d+\$s)/ );
	return (
		<>
			{ parts.map( ( part, i ) => {
				const m = part.match( /^%(\d+)\$s$/ );
				return m ? <b key={ i }>{ values[ Number( m[ 1 ] ) - 1 ] }</b> : <React.Fragment key={ i }>{ part }</React.Fragment>;
			} ) }
		</>
	);
}

/* ------------------------------------------------------------------ */
/* Product filter                                                     */
/* ------------------------------------------------------------------ */

export function ProductFilter( { product, onChange } ) {
	const [ open, setOpen ]       = useState( false );
	const [ search, setSearch ]   = useState( '' );
	const [ results, setResults ] = useState( [] );
	const [ loading, setLoading ] = useState( false );
	const wrapRef = useRef( null );

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		const ctrl  = new AbortController();
		const timer = setTimeout( () => {
			setLoading( true );
			searchProducts( search, ctrl.signal )
				.then( rows => setResults( Array.isArray( rows ) ? rows : [] ) )
				.catch( () => {} )
				.finally( () => setLoading( false ) );
		}, 250 );
		return () => {
			clearTimeout( timer );
			ctrl.abort();
		};
	}, [ open, search ] );

	useEffect( () => {
		if ( ! open ) {
			return undefined;
		}
		const onDoc = e => {
			if ( wrapRef.current && ! wrapRef.current.contains( e.target ) ) {
				setOpen( false );
			}
		};
		document.addEventListener( 'mousedown', onDoc );
		return () => document.removeEventListener( 'mousedown', onDoc );
	}, [ open ] );

	if ( product ) {
		return (
			<span className="qq-an-chip">
				{ product.name }
				<button
					type="button"
					className="qq-an-chip-x"
					aria-label={ __( 'Show all products', TEXT_DOMAIN ) }
					onClick={ () => onChange( null ) }
				>
					×
				</button>
			</span>
		);
	}

	return (
		<div className="qq-an-filter" ref={ wrapRef }>
			<input
				type="search"
				className="qq-an-input qq-an-filter-input"
				placeholder={ __( 'All products', TEXT_DOMAIN ) }
				value={ search }
				onFocus={ () => setOpen( true ) }
				onChange={ e => {
					setSearch( e.target.value );
					setOpen( true );
				} }
				onKeyDown={ e => e.key === 'Escape' && setOpen( false ) }
				aria-label={ __( 'Filter by product', TEXT_DOMAIN ) }
			/>
			{ open && (
				<div className="qq-an-filter-menu" role="listbox">
					{ loading && results.length === 0 && (
						<div className="qq-an-filter-empty">{ __( 'Searching…', TEXT_DOMAIN ) }</div>
					) }
					{ ! loading && results.length === 0 && (
						<div className="qq-an-filter-empty">{ __( 'No products with questions found.', TEXT_DOMAIN ) }</div>
					) }
					{ results.map( p => (
						<button
							type="button"
							role="option"
							aria-selected="false"
							key={ p.id }
							className="qq-an-filter-option"
							onClick={ () => {
								onChange( { id: p.id, name: p.name } );
								setOpen( false );
								setSearch( '' );
							} }
						>
							<span>{ p.name }</span>
							<span className="qq-an-faded">{ formatNumber( p.questions ) }</span>
						</button>
					) ) }
				</div>
			) }
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Overview                                                           */
/* ------------------------------------------------------------------ */

export function StatTiles( { report } ) {
	return (
		<div className="qq-an-stat-row">
			{ describeTiles( report ).map( t => (
				<div className="qq-an-stat" key={ t.key }>
					<div className="qq-an-stat-label">{ t.label }</div>
					<div className={ `qq-an-stat-num${ t.warm ? ' warm' : '' }` }>{ t.value }</div>
					<div className={ `qq-an-stat-trend qq-an-tone-${ t.tone }` }>{ t.trend }</div>
				</div>
			) ) }
		</div>
	);
}

export function ThresholdSettings( { settings, onSave } ) {
	const [ open, setOpen ]     = useState( false );
	const [ draft, setDraft ]   = useState( settings );
	const [ saving, setSaving ] = useState( false );
	const [ error, setError ]   = useState( null );

	useEffect( () => {
		if ( ! open ) {
			setDraft( settings );
			setError( null );
		}
	}, [ open, settings ] );

	const submit = async e => {
		e.preventDefault();
		setSaving( true );
		setError( null );
		try {
			await onSave( {
				outlier_multiplier: Number( draft.outlier_multiplier ),
				outlier_min_questions: parseInt( draft.outlier_min_questions, 10 ),
			} );
			setOpen( false );
		} catch ( err ) {
			setError( err.message );
		} finally {
			setSaving( false );
		}
	};

	return (
		<div className="qq-an-threshold">
			<button type="button" className="qq-an-link-btn" onClick={ () => setOpen( o => ! o ) } aria-expanded={ open }>
				{ sprintf(
					/* translators: 1: multiplier, 2: minimum number of questions. */
					__( 'High-volume alert: %1$s× average, min %2$s questions · Edit', TEXT_DOMAIN ),
					String( settings.outlier_multiplier ),
					String( settings.outlier_min_questions )
				) }
			</button>
			{ open && (
				<form className="qq-an-popover" onSubmit={ submit }>
					<div className="qq-an-popover-title">{ __( 'High-volume product alert', TEXT_DOMAIN ) }</div>
					<p className="qq-an-popover-help">
						{ __( 'Flag a product when it receives this many times more questions than your store average per product.', TEXT_DOMAIN ) }
					</p>
					<label className="qq-an-field">
						<span>{ __( 'Multiplier (×)', TEXT_DOMAIN ) }</span>
						<input
							type="number"
							className="qq-an-input qq-an-input-num"
							min="1.5"
							max="100"
							step="0.5"
							required
							value={ draft.outlier_multiplier }
							onChange={ e => setDraft( d => ( { ...d, outlier_multiplier: e.target.value } ) ) }
						/>
					</label>
					<label className="qq-an-field">
						<span>{ __( 'Minimum questions', TEXT_DOMAIN ) }</span>
						<input
							type="number"
							className="qq-an-input qq-an-input-num"
							min="1"
							step="1"
							required
							value={ draft.outlier_min_questions }
							onChange={ e => setDraft( d => ( { ...d, outlier_min_questions: e.target.value } ) ) }
						/>
					</label>
					{ error && <div className="qq-an-popover-error">{ error }</div> }
					<div className="qq-an-popover-actions">
						<button type="button" className="qq-an-btn" onClick={ () => setOpen( false ) }>
							{ __( 'Cancel', TEXT_DOMAIN ) }
						</button>
						<button type="submit" className="qq-an-btn qq-an-btn-primary" disabled={ saving }>
							{ saving ? __( 'Saving…', TEXT_DOMAIN ) : __( 'Save', TEXT_DOMAIN ) }
						</button>
					</div>
				</form>
			) }
		</div>
	);
}

export function OutlierCallout( { outlier, onFilter } ) {
	const { navigate } = useNav();
	const text = describeOutlier( outlier );
	if ( ! text ) {
		return null;
	}

	return (
		<div className="qq-an-callout">
			<div className="qq-an-callout-mark">!</div>
			<div className="qq-an-callout-body">
				<div className="qq-an-callout-title">{ text.title }</div>
				<div className="qq-an-callout-desc">
					<Interpolate
						/* translators: 1: product name, 2: number of questions, 3: store average per product. */
						format={ __( '%1$s received %2$s questions in this period, against a store average of %3$s per product.', TEXT_DOMAIN ) }
						values={ [ outlier.product.name, formatNumber( outlier.questions ), String( outlier.store_average ) ] }
					/>
					{ outlier.top_questions.length > 0 && (
						<>
							{ ' ' }
							{ __( 'Its top questions — answers a richer product description could provide directly:', TEXT_DOMAIN ) }
							<ul className="qq-an-callout-list">
								{ outlier.top_questions.map( ( q, i ) => <li key={ i }>{ q }</li> ) }
							</ul>
						</>
					) }
				</div>
				<div className="qq-an-callout-links">
					{ outlier.product.edit_url && (
						<a className="qq-an-callout-link" href={ outlier.product.edit_url } target="_blank" rel="noopener noreferrer">
							{ __( 'Edit product description →', TEXT_DOMAIN ) }
						</a>
					) }
					<button type="button" className="qq-an-link-btn" onClick={ () => navigate( 'product-profile', { id: outlier.product.id } ) }>
						{ __( 'View product profile', TEXT_DOMAIN ) }
					</button>
					<button type="button" className="qq-an-link-btn" onClick={ () => onFilter( outlier.product ) }>
						{ __( 'Show only this product', TEXT_DOMAIN ) }
					</button>
				</div>
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Activity chart                                                     */
/* ------------------------------------------------------------------ */

export function DailyChart( { daily, rangeLabel } ) {
	const max     = daily.reduce( ( m, d ) => Math.max( m, d.questions ), 0 );
	const peakIdx = max > 0 ? daily.findIndex( d => d.questions === max ) : -1;
	const gap     = daily.length > 120 ? 1 : daily.length > 45 ? 2 : 6;

	// Five evenly spaced x-axis labels (first and last always included).
	const tickCount = Math.min( 5, daily.length );
	const ticks     = [];
	for ( let i = 0; i < tickCount; i++ ) {
		const idx = tickCount === 1 ? 0 : Math.round( i * ( daily.length - 1 ) / ( tickCount - 1 ) );
		ticks.push( daily[ idx ] );
	}

	return (
		<div className="qq-an-card">
			<div className="qq-an-card-head">
				<div className="qq-an-card-title">{ __( 'Questions per day', TEXT_DOMAIN ) }</div>
				<div className="qq-an-card-sub">
					{ max > 0
						/* translators: 1: range label, 2: busiest day's count. */
						? sprintf( __( '%1$s · peak %2$s', TEXT_DOMAIN ), rangeLabel, formatNumber( max ) )
						: rangeLabel }
				</div>
			</div>
			<div className="qq-an-chart" style={ { gap: `${ gap }px` } } role="img" aria-label={ __( 'Questions per day', TEXT_DOMAIN ) }>
				{ daily.map( ( d, i ) => (
					<div
						key={ d.date }
						className={ `qq-an-bar-col${ i === peakIdx ? ' peak' : '' }${ d.questions === 0 ? ' empty' : '' }` }
						style={ { height: max > 0 ? `${ ( d.questions / max ) * 100 }%` : 0 } }
						/* translators: 1: date, 2: number of questions. */
						title={ sprintf( _n( '%1$s: %2$d question', '%1$s: %2$d questions', d.questions, TEXT_DOMAIN ), formatDay( d.date ), d.questions ) }
					/>
				) ) }
			</div>
			<div className="qq-an-chart-x">
				{ ticks.map( t => <span key={ t.date }>{ formatDay( t.date ) }</span> ) }
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Lists                                                              */
/* ------------------------------------------------------------------ */

export function Card( { title, sub, children } ) {
	return (
		<div className="qq-an-card">
			<div className="qq-an-card-head">
				<div className="qq-an-card-title">{ title }</div>
				{ sub && <div className="qq-an-card-sub">{ sub }</div> }
			</div>
			{ children }
		</div>
	);
}

export function Empty( { children } ) {
	return <div className="qq-an-empty">{ children || __( 'No activity in this period.', TEXT_DOMAIN ) }</div>;
}

function topSub( n, onViewAll ) {
	/* translators: %d: number of rows shown. */
	const label = sprintf( __( 'Top %d', TEXT_DOMAIN ), n );
	if ( ! onViewAll ) {
		return label;
	}
	return (
		<>
			{ label } ·{ ' ' }
			<button type="button" className="qq-an-view-all" onClick={ onViewAll }>
				{ __( 'View all →', TEXT_DOMAIN ) }
			</button>
		</>
	);
}

export function TopProducts( { rows, onFilter } ) {
	const { navigate } = useNav();
	const max = rows.reduce( ( m, r ) => Math.max( m, r.questions ), 0 );
	return (
		<Card title={ __( 'Products with most questions', TEXT_DOMAIN ) } sub={ topSub( 5, () => navigate( 'products' ) ) }>
			{ rows.length === 0 ? <Empty /> : (
				<div className="qq-an-list">
					{ rows.map( ( p, i ) => (
						<div className="qq-an-list-row" key={ p.id }>
							<span className="qq-an-list-rank">{ i + 1 }</span>
							<button
								type="button"
								className="qq-an-list-name qq-an-clickable"
								title={ __( 'View product profile', TEXT_DOMAIN ) }
								onClick={ () => navigate( 'product-profile', { id: p.id } ) }
							>
								{ p.name }
							</button>
							<button
								type="button"
								className="qq-an-filter-btn"
								title={ __( 'Show only this product on the dashboard', TEXT_DOMAIN ) }
								aria-label={ __( 'Show only this product on the dashboard', TEXT_DOMAIN ) }
								onClick={ () => onFilter( p ) }
							>
								{ __( 'Filter', TEXT_DOMAIN ) }
							</button>
							<div className="qq-an-list-bar-wrap">
								<div className="qq-an-list-bar" style={ { width: `${ max ? ( p.questions / max ) * 100 : 0 }%` } } />
							</div>
							<span className="qq-an-list-num">{ formatNumber( p.questions ) }</span>
						</div>
					) ) }
				</div>
			) }
		</Card>
	);
}

export function TopCustomers( { rows } ) {
	const { navigate } = useNav();
	return (
		<Card title={ __( 'Most active customers', TEXT_DOMAIN ) } sub={ topSub( 5, () => navigate( 'customers' ) ) }>
			{ rows.length === 0 ? <Empty /> : (
				<div className="qq-an-list">
					{ rows.map( ( c, i ) => (
						<div className="qq-an-list-row" key={ c.user_id }>
							<span className="qq-an-list-rank">{ i + 1 }</span>
							<span className="qq-an-list-name">
								<button
									type="button"
									className="qq-an-clickable"
									title={ __( 'View customer profile', TEXT_DOMAIN ) }
									onClick={ () => navigate( 'customer-profile', { key: c.key || `u:${ c.user_id }` } ) }
								>
									{ c.name }
								</button>
								{ c.verified_buyer && <span className="qq-an-faded"> · { __( 'Verified buyer', TEXT_DOMAIN ) }</span> }
							</span>
							<span className="qq-an-faded qq-an-list-detail">{ customerDetail( c ) }</span>
							<span className="qq-an-list-num">{ formatNumber( c.total ) }</span>
						</div>
					) ) }
				</div>
			) }
		</Card>
	);
}

export function TopQuestions( { rows, onFilter } ) {
	return (
		<Card title={ __( 'Most upvoted questions', TEXT_DOMAIN ) } sub={ topSub( 4 ) }>
			{ rows.length === 0 ? <Empty /> : (
				<div>
					{ rows.map( q => (
						<div className="qq-an-q-item" key={ q.id }>
							<div className="qq-an-q-text">{ q.text }</div>
							<div className="qq-an-q-meta">
								<button type="button" className="qq-an-clickable qq-an-q-product" onClick={ () => onFilter( q.product ) }>
									{ q.product.name }
								</button>
								<span>{ upvotesLabel( q.upvotes ) }</span>
							</div>
						</div>
					) ) }
				</div>
			) }
		</Card>
	);
}

export function AnswerSources( { rows, rangeLabel } ) {
	const total = rows.reduce( ( s, r ) => s + r.count, 0 );
	return (
		<Card title={ __( 'Where answers come from', TEXT_DOMAIN ) } sub={ rangeLabel }>
			{ total === 0 ? <Empty /> : (
				<div className="qq-an-list">
					{ rows.map( ( s, i ) => (
						<div className="qq-an-list-row" key={ s.key }>
							<span className="qq-an-list-name">{ s.label }</span>
							<div className="qq-an-list-bar-wrap">
								<div className={ `qq-an-list-bar${ i > 0 ? ' muted' : '' }` } style={ { width: `${ ( s.count / total ) * 100 }%` } } />
							</div>
							<span className="qq-an-list-num">{ formatNumber( s.count ) }</span>
						</div>
					) ) }
				</div>
			) }
		</Card>
	);
}
