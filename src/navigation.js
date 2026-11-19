/**
 * Admin page navigation with a "navigation origin" (KAN-33).
 *
 * Ports the prototype's navigateToCustomer / navigateToProduct /
 * navigateBack pattern:
 *  - Opening a directory or profile remembers where the admin came from
 *    (All Q&A, Analytics or a directory) and Back returns there.
 *  - Hopping from one profile to another keeps the original origin, so
 *    Back doesn't walk through every profile visited.
 *  - Analytics → All customers → Sandra → Back → All customers → Back → Analytics.
 *
 * The current page (and its origin) is mirrored to location.hash, e.g.
 * #customer-profile/u:12~analytics, so a refresh keeps the page.
 *
 * Each navigation pushes a history entry carrying the full state, and
 * popstate/hashchange bring the screen back in line with the URL, so
 * browser Back/Forward and hand-edited hashes work (KAN-69).
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const NavContext = createContext( null );

/** Pages reached from another page; they show a Back link. */
export const DETAIL_PAGES = [ 'customers', 'products', 'customer-profile', 'product-profile' ];
const PROFILE_PAGES = [ 'customer-profile', 'product-profile' ];

function idOf( page, params ) {
	if ( 'customer-profile' === page ) {
		return params?.key;
	}
	if ( 'product-profile' === page ) {
		return params?.id;
	}
	if ( 'all-qa' === page ) {
		return params?.questionId;
	}
	return null;
}

function paramsFor( page, id ) {
	if ( id === undefined || id === null || id === '' ) {
		return {};
	}
	if ( 'customer-profile' === page ) {
		return { key: String( id ) };
	}
	if ( 'product-profile' === page ) {
		return { id: parseInt( id, 10 ) };
	}
	if ( 'all-qa' === page ) {
		return { questionId: parseInt( id, 10 ) };
	}
	return {};
}

function encodeHash( state ) {
	const id     = idOf( state.page, state.params );
	const origin = state.stack.length ? state.stack[ state.stack.length - 1 ].page : '';
	return '#' + state.page + ( id ? '/' + encodeURIComponent( String( id ) ) : '' ) + ( origin ? '~' + origin : '' );
}

function decodeHash( hash, validPages ) {
	const raw = String( hash || '' ).replace( /^#/, '' );
	if ( ! raw ) {
		return null;
	}
	const [ path, origin ]   = raw.split( '~' );
	const [ page, rawId ]    = path.split( '/' );
	if ( ! validPages.includes( page ) ) {
		return null;
	}
	const params = paramsFor( page, rawId ? decodeURIComponent( rawId ) : null );
	if ( DETAIL_PAGES.includes( page ) && ( ( 'customer-profile' === page && ! params.key ) || ( 'product-profile' === page && ! params.id ) ) ) {
		return null;
	}
	const stack = [];
	if ( DETAIL_PAGES.includes( page ) ) {
		// After a refresh only the immediate origin is known; directories go back to Analytics.
		if ( [ 'customers', 'products' ].includes( origin ) ) {
			stack.push( { page: 'analytics', params: {} } );
		}
		if ( origin && validPages.includes( origin ) ) {
			stack.push( { page: origin, params: {} } );
		}
	}
	return { page, params, stack };
}

/**
 * Pure navigation state transitions: { page, params, stack[] }.
 *  - top-level page: clears the stack
 *  - profile → profile: keeps the stack (original origin)
 *  - any other detail page: pushes the current page as its origin
 *  - back: pops to the origin (All Q&A if there is none)
 */
export function navReducer( prev, action ) {
	if ( 'back' === action.type ) {
		if ( ! prev.stack.length ) {
			return { page: 'all-qa', params: {}, stack: [] };
		}
		const top = prev.stack[ prev.stack.length - 1 ];
		return { page: top.page, params: top.params || {}, stack: prev.stack.slice( 0, -1 ) };
	}

	const { page, params = {} } = action;
	if ( ! DETAIL_PAGES.includes( page ) ) {
		return { page, params, stack: [] };
	}
	if ( PROFILE_PAGES.includes( page ) && PROFILE_PAGES.includes( prev.page ) ) {
		return { page, params, stack: prev.stack };
	}
	if ( page === prev.page ) {
		return prev;
	}
	return { page, params, stack: [ ...prev.stack, { page: prev.page, params: prev.params } ] };
}

export function NavProvider( { initialPage = 'all-qa', validPages, children } ) {
	const [ state, setState ] = useState(
		() => decodeHash( window.location.hash, validPages ) || { page: initialPage, params: {}, stack: [] }
	);
	// Current state, readable synchronously from callbacks and listeners.
	const stateRef = useRef( state );

	/**
	 * Move to `next`. mode: 'push' adds a history entry (user navigation),
	 * 'none' leaves history alone (the browser already moved, e.g. popstate).
	 */
	const go = useCallback( ( next, mode ) => {
		const hash = encodeHash( next );
		if ( 'push' === mode ) {
			if ( hash === encodeHash( stateRef.current ) ) {
				return;
			}
			window.history.pushState( { qqNav: next }, '', hash );
		}
		stateRef.current = next;
		setState( next );
		const scroller = document.querySelector( '.qq-pf-scroll, .qq-an-scroll' );
		if ( scroller ) {
			scroller.scrollTop = 0;
		}
	}, [] );

	// Two-way sync (KAN-69): the URL follows the screen via pushState above,
	// and the screen follows the URL on Back/Forward or a hand-edited hash.
	useEffect( () => {
		const fallback = { page: initialPage, params: {}, stack: [] };
		window.history.replaceState( { ...( window.history.state || {} ), qqNav: stateRef.current }, '', encodeHash( stateRef.current ) );

		const syncFromLocation = event => {
			const saved = event && event.state && event.state.qqNav;
			const next  = ( saved && validPages.includes( saved.page ) && Array.isArray( saved.stack ) )
				? saved
				: ( decodeHash( window.location.hash, validPages ) || fallback );
			const hash  = encodeHash( next );
			if ( hash === encodeHash( stateRef.current ) && hash === window.location.hash ) {
				return;
			}
			go( next, 'none' );
			// Store the state on hand-typed entries and tidy the hash.
			window.history.replaceState( { ...( window.history.state || {} ), qqNav: next }, '', hash );
		};

		window.addEventListener( 'popstate', syncFromLocation );
		window.addEventListener( 'hashchange', syncFromLocation );
		return () => {
			window.removeEventListener( 'popstate', syncFromLocation );
			window.removeEventListener( 'hashchange', syncFromLocation );
		};
	// validPages / initialPage are fixed for the app's lifetime.
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ go ] );

	/** Open a page. Detail pages remember where they were opened from. */
	const navigate = useCallback( ( page, params = {} ) => {
		go( navReducer( stateRef.current, { type: 'navigate', page, params } ), 'push' );
	}, [ go ] );

	/** In-app "← Back to …": goes to the origin, as a new history entry. */
	const back = useCallback( () => {
		go( navReducer( stateRef.current, { type: 'back' } ), 'push' );
	}, [ go ] );

	const value = useMemo( () => {
		const origin = state.stack.length ? state.stack[ state.stack.length - 1 ].page : null;
		const root   = state.stack.length ? state.stack[ 0 ].page : state.page;
		return { page: state.page, params: state.params, origin, root, navigate, back };
	}, [ state, navigate, back ] );

	return React.createElement( NavContext.Provider, { value }, children );
}

export function useNav() {
	const ctx = useContext( NavContext );
	if ( ! ctx ) {
		// Outside the provider: inert navigation.
		return { page: null, params: {}, origin: null, root: null, navigate: () => {}, back: () => {} };
	}
	return ctx;
}

/** Nav item to highlight: detail pages highlight the top-level page they came from. */
export function activeNavKey( nav ) {
	return nav.root || nav.page;
}
