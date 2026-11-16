/**
 * Display formatting shared by the dashboard and the CSV export, so the
 * exported file shows exactly the strings rendered on screen (KAN-32).
 */
import { __, _n, sprintf } from '../../i18n';
import { TEXT_DOMAIN } from './api';

export const RANGES = [
	{ key: '7d', label: __( 'Last 7 days', TEXT_DOMAIN ) },
	{ key: '30d', label: __( 'Last 30 days', TEXT_DOMAIN ) },
	{ key: '90d', label: __( 'Last 90 days', TEXT_DOMAIN ) },
	{ key: 'year', label: __( 'This year', TEXT_DOMAIN ) },
];

export function rangeLabel( key ) {
	return ( RANGES.find( r => r.key === key ) || RANGES[ 1 ] ).label;
}

export function formatNumber( n ) {
	return Number( n || 0 ).toLocaleString();
}

/** Parse a site-timezone Y-m-d as a local calendar date (no UTC shift). */
export function parseDay( ymd ) {
	const [ y, m, d ] = String( ymd ).split( '-' ).map( Number );
	return new Date( y, ( m || 1 ) - 1, d || 1 );
}

export function formatDay( ymd ) {
	return parseDay( ymd ).toLocaleDateString( undefined, { month: 'short', day: 'numeric' } );
}

export function formatLongDay( ymd ) {
	return parseDay( ymd ).toLocaleDateString( undefined, { weekday: 'long', month: 'long', day: 'numeric' } );
}

function trimDecimal( n ) {
	return String( Math.round( n * 10 ) / 10 ).replace( /\.0$/, '' );
}

/** Compact duration: 45m, 6h, 2.5h, 3d. */
export function formatDuration( secs ) {
	if ( secs === null || secs === undefined ) {
		return '—';
	}
	const s = Math.abs( secs );
	if ( s < 60 ) {
		/* translators: duration shorter than one minute. */
		return __( '<1m', TEXT_DOMAIN );
	}
	if ( s < 3600 ) {
		/* translators: %s: number of minutes. */
		return sprintf( __( '%sm', TEXT_DOMAIN ), String( Math.round( s / 60 ) ) );
	}
	if ( s < 86400 ) {
		const h = s / 3600;
		/* translators: %s: number of hours. */
		return sprintf( __( '%sh', TEXT_DOMAIN ), h < 10 ? trimDecimal( h ) : String( Math.round( h ) ) );
	}
	/* translators: %s: number of days. */
	return sprintf( __( '%sd', TEXT_DOMAIN ), trimDecimal( s / 86400 ) );
}

/** Long duration for prose: "45 minutes", "6 hours", "2.5 days". */
export function formatDurationLong( secs ) {
	if ( secs === null || secs === undefined ) {
		return '—';
	}
	const s = Math.abs( secs );
	if ( s < 3600 ) {
		const m = Math.max( 1, Math.round( s / 60 ) );
		/* translators: %d: number of minutes. */
		return sprintf( _n( '%d minute', '%d minutes', m, TEXT_DOMAIN ), m );
	}
	if ( s < 86400 ) {
		const h = s / 3600;
		const v = h < 10 ? trimDecimal( h ) : String( Math.round( h ) );
		/* translators: %s: number of hours. */
		return sprintf( _n( '%s hour', '%s hours', Number( v ) === 1 ? 1 : 2, TEXT_DOMAIN ), v );
	}
	const v = trimDecimal( s / 86400 );
	/* translators: %s: number of days. */
	return sprintf( _n( '%s day', '%s days', Number( v ) === 1 ? 1 : 2, TEXT_DOMAIN ), v );
}

/**
 * Overview tiles as display strings: { key, label, value, trend, tone, warm }.
 * tone: good | bad | flat.
 */
export function describeTiles( report ) {
	const byKey = Object.fromEntries( ( report.tiles || [] ).map( t => [ t.key, t ] ) );
	const tiles = [];

	const q = byKey.questions;
	if ( q ) {
		let trend;
		if ( q.delta === null ) {
			trend = q.value > 0
				? __( 'No questions in the previous period', TEXT_DOMAIN )
				: __( 'No change', TEXT_DOMAIN );
		} else if ( q.delta === 0 ) {
			trend = __( '— same as previous period', TEXT_DOMAIN );
		} else {
			/* translators: 1: arrow, 2: percentage change. */
			trend = sprintf( __( '%1$s %2$s%% vs previous period', TEXT_DOMAIN ), q.delta > 0 ? '↑' : '↓', String( Math.abs( q.delta ) ) );
		}
		tiles.push( { key: 'questions', label: __( 'Questions', TEXT_DOMAIN ), value: formatNumber( q.value ), trend, tone: q.direction } );
	}

	const r = byKey.avg_response;
	if ( r ) {
		let trend;
		if ( r.value === null ) {
			trend = __( 'No answers yet', TEXT_DOMAIN );
		} else if ( r.delta === null ) {
			trend = __( 'No earlier data to compare', TEXT_DOMAIN );
		} else if ( r.direction === 'flat' ) {
			trend = __( '— about the same as before', TEXT_DOMAIN );
		} else if ( r.delta < 0 ) {
			/* translators: %s: duration, e.g. 2h. */
			trend = sprintf( __( '↓ %s faster', TEXT_DOMAIN ), formatDuration( r.delta ) );
		} else {
			/* translators: %s: duration, e.g. 2h. */
			trend = sprintf( __( '↑ %s slower', TEXT_DOMAIN ), formatDuration( r.delta ) );
		}
		tiles.push( { key: 'avg_response', label: __( 'Avg response time', TEXT_DOMAIN ), value: formatDuration( r.value ), trend, tone: r.direction } );
	}

	const a = byKey.answer_rate;
	if ( a ) {
		let trend;
		if ( a.value === null ) {
			trend = __( 'No questions in this period', TEXT_DOMAIN );
		} else if ( a.delta === null ) {
			trend = __( 'No earlier data to compare', TEXT_DOMAIN );
		} else if ( a.delta === 0 ) {
			trend = __( '— same as previous period', TEXT_DOMAIN );
		} else {
			/* translators: 1: arrow, 2: percentage points. */
			trend = sprintf( __( '%1$s %2$s pts vs previous period', TEXT_DOMAIN ), a.delta > 0 ? '↑' : '↓', String( Math.abs( a.delta ) ) );
		}
		tiles.push( {
			key: 'answer_rate',
			label: __( 'Answer rate', TEXT_DOMAIN ),
			value: a.value === null ? '—' : `${ a.value }%`,
			trend,
			tone: a.direction,
		} );
	}

	const u = byKey.unanswered;
	if ( u ) {
		const trend = u.overdue > 0
			/* translators: 1: number of questions, 2: number of days. */
			? sprintf( _n( '%1$d over %2$d days old', '%1$d over %2$d days old', u.overdue, TEXT_DOMAIN ), u.overdue, u.overdue_days )
			: __( 'None overdue', TEXT_DOMAIN );
		tiles.push( {
			key: 'unanswered',
			label: __( 'Unanswered', TEXT_DOMAIN ),
			value: formatNumber( u.value ),
			trend,
			tone: u.direction,
			warm: u.value > 0,
		} );
	}

	return tiles;
}

/** Plain-text version of the outlier callout (shared by UI + CSV). */
export function describeOutlier( outlier ) {
	if ( ! outlier ) {
		return null;
	}
	return {
		/* translators: %s: ratio, e.g. 5.2 */
		title: sprintf( __( 'One product is generating %s× more questions than your average', TEXT_DOMAIN ), String( outlier.ratio ) ),
		/* translators: 1: product name, 2: number of questions, 3: store average per product. */
		desc: sprintf(
			__( '%1$s received %2$s questions in this period, against a store average of %3$s per product.', TEXT_DOMAIN ),
			outlier.product.name,
			formatNumber( outlier.questions ),
			String( outlier.store_average )
		),
	};
}

export function customerDetail( c ) {
	/* translators: 1: questions asked, 2: answers given. */
	return sprintf( __( '%1$d asked · %2$d answered', TEXT_DOMAIN ), c.asked, c.answered );
}

export function upvotesLabel( n ) {
	/* translators: %s: number of upvotes. */
	return sprintf( _n( '%s upvote', '%s upvotes', n, TEXT_DOMAIN ), formatNumber( n ) );
}
