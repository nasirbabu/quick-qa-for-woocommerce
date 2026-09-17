/**
 * Thin wrapper around the WordPress core `wp-i18n` global.
 *
 * This app is built with Vite, not `@wordpress/scripts`, and is loaded as a
 * plain ES module (`<script type="module">`) — so a bundled copy of
 * `@wordpress/i18n` would keep its own private translation state, separate
 * from the one `wp_set_script_translations()` populates on `window.wp.i18n`.
 * Reading the global directly at call time (rather than bundling the
 * package) lets this app pick up the same translations WordPress core
 * already loads for every other admin script (KAN-29).
 *
 * Falls back to the untranslated string when `wp.i18n` isn't present (e.g.
 * `npm run dev` outside of wp-admin), so the app still renders in local dev.
 */

function wpI18n() {
	return typeof window !== 'undefined' && window.wp && window.wp.i18n ? window.wp.i18n : null;
}

export function __( text, domain ) {
	const i18n = wpI18n();
	return i18n ? i18n.__( text, domain ) : text;
}

export function _n( single, plural, number, domain ) {
	const i18n = wpI18n();
	if ( i18n ) {
		return i18n._n( single, plural, number, domain );
	}
	return 1 === number ? single : plural;
}

export function _x( text, context, domain ) {
	const i18n = wpI18n();
	return i18n ? i18n._x( text, context, domain ) : text;
}

export function sprintf( format, ...args ) {
	const i18n = wpI18n();
	if ( i18n ) {
		return i18n.sprintf( format, ...args );
	}
	// Minimal fallback: substitute %s/%d placeholders in order.
	let i = 0;
	return format.replace( /%[sd]/g, () => ( i < args.length ? args[ i++ ] : '' ) );
}
