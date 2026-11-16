/**
 * Askora deactivation feedback popup (KAN-68).
 *
 * Intercepts the "Deactivate" link on Askora's row in Plugins, asks for a
 * reason, posts it via admin-ajax, then follows the original link. The
 * admin is never stuck: Skip deactivates immediately, and Submit moves on
 * after FALLBACK_MS even if the request hangs.
 */
( function ( $ ) {
	'use strict';

	var cfg = window.quickQaDeactivate;
	if ( ! cfg || ! cfg.basename ) {
		return;
	}

	var FALLBACK_MS = 5000;

	var $overlay = $( '#qq-dfb-overlay' );
	if ( ! $overlay.length ) {
		return;
	}

	var $form     = $( '#qq-dfb-form' );
	var $details  = $( '#qq-dfb-details' );
	var $submit   = $( '#qq-dfb-submit' );
	var $skip     = $( '#qq-dfb-skip' );
	var defaultPh = $details.attr( 'placeholder' );
	var submitTxt = $submit.text();

	var deactivateUrl = '';
	var $trigger      = null;
	var leaving       = false;

	function isOpen() {
		return ! $overlay.prop( 'hidden' );
	}

	function open( $link ) {
		$trigger      = $link;
		deactivateUrl = $link.attr( 'href' );
		leaving       = false;
		$form[ 0 ].reset();
		$details.attr( 'placeholder', defaultPh );
		$submit.prop( 'disabled', true ).text( submitTxt );
		$skip.prop( 'disabled', false );
		$overlay.prop( 'hidden', false );
		$( 'body' ).addClass( 'qq-dfb-open' );
		$overlay.find( 'input[name="qq_dfb_reason"]' ).first().trigger( 'focus' );
	}

	function close() {
		if ( leaving ) {
			return;
		}
		$overlay.prop( 'hidden', true );
		$( 'body' ).removeClass( 'qq-dfb-open' );
		if ( $trigger ) {
			$trigger.trigger( 'focus' );
		}
	}

	function leave() {
		if ( deactivateUrl ) {
			window.location.href = deactivateUrl;
		}
	}

	// Intercept Askora's Deactivate link (only this plugin's row).
	$( document ).on(
		'click',
		'#the-list tr[data-plugin="' + cfg.basename + '"] .deactivate a',
		function ( e ) {
			e.preventDefault();
			open( $( this ) );
		}
	);

	// Pick a reason: enable Submit and tailor the details prompt.
	$overlay.on( 'change', 'input[name="qq_dfb_reason"]', function () {
		var key = $( this ).val();
		$submit.prop( 'disabled', false );
		$details.attr( 'placeholder', ( cfg.placeholders && cfg.placeholders[ key ] ) || defaultPh );
		$overlay.find( '.qq-dfb-reason' ).removeClass( 'is-selected' );
		$( this ).closest( '.qq-dfb-reason' ).addClass( 'is-selected' );
	} );

	// Submit & Deactivate.
	$form.on( 'submit', function ( e ) {
		e.preventDefault();
		var reason = $overlay.find( 'input[name="qq_dfb_reason"]:checked' ).val() || '';
		if ( ! reason || leaving ) {
			return;
		}
		leaving = true;
		$submit.prop( 'disabled', true ).text( cfg.sending || submitTxt );
		$skip.prop( 'disabled', true );

		var fallback = setTimeout( leave, FALLBACK_MS );
		$.post( cfg.ajaxUrl, {
			action: cfg.action,
			nonce: cfg.nonce,
			reason: reason,
			details: $details.val()
		} ).always( function () {
			clearTimeout( fallback );
			leave();
		} );
	} );

	// Skip & Deactivate.
	$skip.on( 'click', function () {
		leaving = true;
		leave();
	} );

	// Cancel, backdrop click, Esc.
	$( '#qq-dfb-cancel' ).on( 'click', close );
	$overlay.on( 'mousedown', function ( e ) {
		if ( e.target === this ) {
			close();
		}
	} );
	$( document ).on( 'keydown', function ( e ) {
		if ( ! isOpen() ) {
			return;
		}
		if ( 'Escape' === e.key ) {
			e.preventDefault();
			close();
			return;
		}
		// Keep keyboard focus inside the dialog.
		if ( 'Tab' === e.key ) {
			var $f = $overlay.find( 'input, textarea, button' ).filter( ':visible:not(:disabled)' );
			if ( ! $f.length ) {
				return;
			}
			var first = $f.get( 0 );
			var last  = $f.get( $f.length - 1 );
			if ( e.shiftKey && document.activeElement === first ) {
				e.preventDefault();
				last.focus();
			} else if ( ! e.shiftKey && document.activeElement === last ) {
				e.preventDefault();
				first.focus();
			}
		}
	} );
}( jQuery ) );
