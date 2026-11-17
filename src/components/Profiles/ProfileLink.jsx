import React from 'react';
import { __ } from '../../i18n';
import { useNav } from '../../navigation';

const TEXT_DOMAIN = 'quick-qa-for-woocommerce';
const isPro = () => !! window.quickQaAdmin?.isPro;

/**
 * Customer name that opens the (Pro) customer profile (KAN-33).
 * Falls back to plain text on the free tier or when the author can't be
 * identified (staff, or a guest who left no email).
 */
export function CustomerLink( { identity, name, children, className = '', as = 'b' } ) {
	const { navigate } = useNav();
	const label        = children || name;
	const Tag          = as;

	if ( ! isPro() || ! identity ) {
		return <Tag className={ className }>{ label }</Tag>;
	}

	return (
		<button
			type="button"
			className={ `qq-pf-link ${ 'b' === as ? 'qq-pf-link-strong ' : '' }${ className }` }
			title={ __( 'View customer profile', TEXT_DOMAIN ) }
			onClick={ e => {
				e.stopPropagation();
				navigate( 'customer-profile', { key: identity } );
			} }
		>
			{ label }
		</button>
	);
}

/** Product name that opens the (Pro) product profile. */
export function ProductLink( { id, name, children, className = '', as = 'b' } ) {
	const { navigate } = useNav();
	const label        = children || name;
	const Tag          = as;

	if ( ! isPro() || ! id ) {
		return <Tag className={ className }>{ label }</Tag>;
	}

	return (
		<button
			type="button"
			className={ `qq-pf-link ${ 'b' === as ? 'qq-pf-link-strong ' : '' }${ className }` }
			title={ __( 'View product profile', TEXT_DOMAIN ) }
			onClick={ e => {
				e.stopPropagation();
				navigate( 'product-profile', { id } );
			} }
		>
			{ label }
		</button>
	);
}
