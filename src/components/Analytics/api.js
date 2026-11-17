import { __ } from '../../i18n';

export const TEXT_DOMAIN = 'quick-qa-for-woocommerce';

/**
 * Fetch from the Pro plugin's REST namespace (`quick-qa-pro/v1`).
 *
 * Errors carry the HTTP status so callers can tell "not licensed" (403)
 * apart from other failures.
 *
 * @param {string} path    Route relative to the Pro namespace, e.g. 'analytics/report?range=7d'.
 * @param {Object} options fetch() options; `body` objects are JSON-encoded.
 */
export async function proFetch( path, options = {} ) {
	const base = window.quickQaAdmin?.proRestUrl || '';
	const init = {
		...options,
		headers: {
			'X-WP-Nonce': window.quickQaAdmin?.nonce || '',
			...( options.body ? { 'Content-Type': 'application/json' } : {} ),
			...( options.headers || {} ),
		},
	};
	if ( options.body && typeof options.body !== 'string' ) {
		init.body = JSON.stringify( options.body );
	}

	const res = await fetch( base + path, init );
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

export function fetchReport( range, productId, signal ) {
	const params = new URLSearchParams( { range, product_id: String( productId || 0 ) } );
	return proFetch( `analytics/report?${ params.toString() }`, { signal } );
}

export function searchProducts( search, signal ) {
	const params = new URLSearchParams( { search: search || '' } );
	return proFetch( `analytics/products?${ params.toString() }`, { signal } );
}

export function saveSettings( settings ) {
	return proFetch( 'analytics/settings', { method: 'POST', body: settings } );
}
