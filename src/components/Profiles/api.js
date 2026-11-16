import { proFetch } from '../Analytics/api';

function query( params ) {
	const clean = {};
	Object.keys( params ).forEach( k => {
		if ( params[ k ] !== undefined && params[ k ] !== null && params[ k ] !== '' ) {
			clean[ k ] = String( params[ k ] );
		}
	} );
	return new URLSearchParams( clean ).toString();
}

export function fetchCustomers( params, signal ) {
	return proFetch( `customers?${ query( params ) }`, { signal } );
}

/** key is "u:{id}" or "g:{hash}"; the route is /customers/{u|g}/{id}. */
export function fetchCustomer( key, signal ) {
	const [ type, id ] = String( key ).split( ':' );
	return proFetch( `customers/${ encodeURIComponent( type ) }/${ encodeURIComponent( id || '' ) }`, { signal } );
}

export function fetchProducts( params, signal ) {
	return proFetch( `products?${ query( params ) }`, { signal } );
}

export function fetchProduct( id, range, signal ) {
	return proFetch( `products/${ parseInt( id, 10 ) }?${ query( { range } ) }`, { signal } );
}
