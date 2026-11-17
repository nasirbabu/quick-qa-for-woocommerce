import React, { useEffect, useRef, useState } from 'react';
import { __, _n, sprintf } from '../../i18n';
import { TEXT_DOMAIN } from '../Analytics/api';
import { useNav } from '../../navigation';

export { TEXT_DOMAIN };

/** Back link labelled with where Back actually goes (KAN-33 criterion 2). */
export function BackLink() {
	const { origin, back } = useNav();
	const labels = {
		'all-qa':    __( '← Back to All Q&A', TEXT_DOMAIN ),
		analytics:   __( '← Back to Analytics', TEXT_DOMAIN ),
		customers:   __( '← Back to all customers', TEXT_DOMAIN ),
		products:    __( '← Back to all products', TEXT_DOMAIN ),
		templates:   __( '← Back to Reply Templates', TEXT_DOMAIN ),
		settings:    __( '← Back to Settings', TEXT_DOMAIN ),
	};
	return (
		<button type="button" className="qq-pf-back" onClick={ back }>
			{ labels[ origin ] || __( '← Back', TEXT_DOMAIN ) }
		</button>
	);
}

/** Fetch helper with abort + stale-response protection. */
export function useRemote( loader, deps ) {
	const [ state, setState ] = useState( { data: null, error: null, loading: true } );
	const seq = useRef( 0 );

	useEffect( () => {
		const id   = ++seq.current;
		const ctrl = new AbortController();
		setState( s => ( { ...s, loading: true } ) );
		loader( ctrl.signal )
			.then( data => id === seq.current && setState( { data, error: null, loading: false } ) )
			.catch( err => {
				if ( err.name !== 'AbortError' && id === seq.current ) {
					setState( s => ( { ...s, error: err, loading: false } ) );
				}
			} );
		return () => ctrl.abort();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps );

	return state;
}

export function ErrorState( { error } ) {
	if ( error.status === 403 ) {
		return <div className="qq-state-msg">{ __( 'Customer and product profiles are a Pro feature. Activate your Askora Pro license to unlock them.', TEXT_DOMAIN ) }</div>;
	}
	if ( error.status === 404 ) {
		return <div className="qq-state-msg">{ __( 'Nothing found here — it may have been deleted.', TEXT_DOMAIN ) }</div>;
	}
	/* translators: %s: error message. */
	return <div className="qq-state-msg qq-state-msg--error">{ sprintf( __( 'Failed to load: %s', TEXT_DOMAIN ), error.message ) }</div>;
}

/** Column header button that toggles sorting. */
export function SortHeader( { label, sortKey, sort, order, onSort, defaultOrder = 'desc', disabled = false, title } ) {
	const active = sort === sortKey;
	const arrow  = active ? ( 'asc' === order ? ' ▲' : ' ▼' ) : '';
	return (
		<button
			type="button"
			className={ `qq-pf-th qq-pf-th-sort${ active ? ' sorted' : '' }` }
			disabled={ disabled }
			title={ title }
			aria-sort={ active ? ( 'asc' === order ? 'ascending' : 'descending' ) : 'none' }
			onClick={ () => onSort( sortKey, active ? ( 'asc' === order ? 'desc' : 'asc' ) : defaultOrder ) }
		>
			{ label }{ arrow }
		</button>
	);
}

/** Pagination footer, matching the All Q&A queue's markup. */
export function Pager( { page, pages, total, onPage, noun } ) {
	return (
		<div className="qq-page-foot qq-pf-foot">
			<span>{ noun( total ) }</span>
			{ pages > 1 && (
				<div className="qq-page-nav">
					<button type="button" className="qq-page-btn" disabled={ page <= 1 } onClick={ () => onPage( page - 1 ) }>
						{ __( 'Prev', TEXT_DOMAIN ) }
					</button>
					<span className="qq-pf-page-of">
						{ /* translators: 1: current page, 2: total pages. */ }
						{ sprintf( __( 'Page %1$d of %2$d', TEXT_DOMAIN ), page, pages ) }
					</span>
					<button type="button" className="qq-page-btn" disabled={ page >= pages } onClick={ () => onPage( page + 1 ) }>
						{ __( 'Next', TEXT_DOMAIN ) }
					</button>
				</div>
			) }
		</div>
	);
}

/** Debounced value, for search boxes. */
export function useDebounced( value, delay = 300 ) {
	const [ debounced, setDebounced ] = useState( value );
	useEffect( () => {
		const t = setTimeout( () => setDebounced( value ), delay );
		return () => clearTimeout( t );
	}, [ value, delay ] );
	return debounced;
}

export function relativeTime( iso ) {
	if ( ! iso ) {
		return '—';
	}
	const diff = ( Date.now() - new Date( iso ).getTime() ) / 1000;
	if ( diff < 60 ) {
		return __( 'just now', TEXT_DOMAIN );
	}
	if ( diff < 3600 ) {
		/* translators: %d: minutes. */
		return sprintf( __( '%dm ago', TEXT_DOMAIN ), Math.floor( diff / 60 ) );
	}
	if ( diff < 86400 ) {
		/* translators: %d: hours. */
		return sprintf( __( '%dh ago', TEXT_DOMAIN ), Math.floor( diff / 3600 ) );
	}
	if ( diff < 86400 * 30 ) {
		/* translators: %d: days. */
		return sprintf( __( '%dd ago', TEXT_DOMAIN ), Math.floor( diff / 86400 ) );
	}
	return new Date( iso ).toLocaleDateString( undefined, { year: 'numeric', month: 'short', day: 'numeric' } );
}

export function monthYear( iso ) {
	return iso ? new Date( iso ).toLocaleDateString( undefined, { year: 'numeric', month: 'short' } ) : '';
}

export function TypePill( { type } ) {
	const labels = {
		'verified-buyer': __( 'Verified buyer', TEXT_DOMAIN ),
		customer:         __( 'Customer', TEXT_DOMAIN ),
		guest:            __( 'Guest customer', TEXT_DOMAIN ),
	};
	return <span className={ `qq-pf-type-pill ${ type }` }>{ labels[ type ] || type }</span>;
}

export function StatusPill( { status, answered } ) {
	let key   = status;
	let label = status;
	if ( 'approved' === status ) {
		key   = answered ? 'answered' : 'open';
		label = answered ? __( 'Answered', TEXT_DOMAIN ) : __( 'Unanswered', TEXT_DOMAIN );
	} else if ( 'pending' === status ) {
		label = __( 'Pending', TEXT_DOMAIN );
	} else if ( 'rejected' === status ) {
		label = __( 'Rejected', TEXT_DOMAIN );
	} else if ( 'flagged' === status ) {
		label = __( 'Hidden (flagged)', TEXT_DOMAIN );
	}
	return <span className={ `qq-pf-status ${ key }` }>{ label }</span>;
}

/** Risk signals with their documented triggers (KAN-33 criterion 3). */
export function RiskSignals( { risk } ) {
	const [ open, setOpen ] = useState( risk.count > 0 );
	return (
		<div className="qq-pf-risk">
			<button type="button" className="qq-an-link-btn" onClick={ () => setOpen( o => ! o ) } aria-expanded={ open }>
				{ open ? __( 'Hide how risk signals are defined', TEXT_DOMAIN ) : __( 'How are risk signals defined?', TEXT_DOMAIN ) }
			</button>
			{ open && (
				<ul className="qq-pf-risk-list">
					{ risk.signals.map( s => (
						<li key={ s.key } className={ s.triggered ? 'triggered' : '' }>
							<span className="qq-pf-risk-mark">{ s.triggered ? '!' : '✓' }</span>
							<div>
								<div className="qq-pf-risk-label">
									{ s.label }
									<span className="qq-an-faded">
										{ ' · ' }
										{ /* translators: 1: measured value, 2: threshold. */ }
										{ sprintf( __( '%1$d (triggers at %2$d)', TEXT_DOMAIN ), s.value, s.threshold ) }
									</span>
								</div>
								<div className="qq-pf-risk-desc">{ s.description }</div>
							</div>
						</li>
					) ) }
				</ul>
			) }
		</div>
	);
}
