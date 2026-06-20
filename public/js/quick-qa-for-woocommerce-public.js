/**
 * Quick Q&A for WooCommerce — Frontend interactions.
 *
 * DOM interactions (no network):
 *   - Ask form open / close toggle
 *   - Character counter on the question textarea
 *   - Thread expand / collapse (answers panel)
 *   - Filter pills (All / Answered / Unanswered)
 *   - Client-side keyword search
 *   - Sort toggle (Most recent / Most upvoted)
 *
 * Network:
 *   - Submit question via fetch() → POST /wp-json/quick-qa/v1/questions
 *
 * Requires quickQaSettings injected by wp_localize_script():
 *   { restUrl, nonce, i18n: { askQuestion, cancel, submit, submitting,
 *                              minLength, nameRequired, errorGeneric } }
 */
/* global quickQaSettings */

( function () {
	'use strict';

	/** Root widget element. Set once on DOMContentLoaded. */
	var widget;

	/**
	 * Cached thread metadata — rebuilt once on init so sort/filter can
	 * operate without repeated querySelectorAll calls.
	 *
	 * Shape: Array<{ el: Element, upvotes: number, timestamp: number, answered: boolean }>
	 */
	var threads = [];

	// =========================================================================
	// Bootstrap
	// =========================================================================

	document.addEventListener( 'DOMContentLoaded', function () {
		widget = document.getElementById( 'quick-qa-widget' );
		if ( ! widget ) {
			return;
		}

		buildThreadCache();
		bindAskForm();
		bindCharCounter();
		bindSubmitQuestion();
		bindThreadToggle();
		bindFilterPills();
		bindSearch();
		bindSort();
	} );

	// =========================================================================
	// Thread cache
	// =========================================================================

	function buildThreadCache() {
		var list = widget.querySelectorAll( '.qa-thread' );
		threads  = [];

		list.forEach( function ( el ) {
			var voteCountEl = el.querySelector( '.qa-vote-count' );
			threads.push( {
				el:        el,
				upvotes:   voteCountEl ? parseInt( voteCountEl.textContent, 10 ) || 0 : 0,
				timestamp: el.dataset.createdAt ? parseInt( el.dataset.createdAt, 10 ) : 0,
				answered:  '1' === el.dataset.answered,
			} );
		} );
	}

	// =========================================================================
	// Ask form open / close
	// =========================================================================

	function bindAskForm() {
		var toggleBtn = document.getElementById( 'qa-toggle-ask' );
		var askForm   = document.getElementById( 'qa-ask-form' );
		var cancelBtn = document.getElementById( 'qa-cancel-ask' );

		if ( ! toggleBtn || ! askForm ) {
			return;
		}

		toggleBtn.addEventListener( 'click', function () {
			openAskForm( askForm, toggleBtn );
		} );

		if ( cancelBtn ) {
			cancelBtn.addEventListener( 'click', function () {
				closeAskForm( askForm, toggleBtn );
			} );
		}
	}

	function openAskForm( form, btn ) {
		form.style.display = 'block';
		form.setAttribute( 'aria-hidden', 'false' );
		btn.setAttribute( 'aria-expanded', 'true' );
		btn.textContent = i18n( 'cancel', 'Cancel' );

		var firstInput = form.querySelector( 'input:not([readonly]), textarea' );
		if ( firstInput ) {
			firstInput.focus();
		}
	}

	function closeAskForm( form, btn ) {
		form.style.display = 'none';
		form.setAttribute( 'aria-hidden', 'true' );
		btn.setAttribute( 'aria-expanded', 'false' );
		btn.textContent = i18n( 'askQuestion', 'Ask a question' );

		// Clear inputs so a re-open shows a blank form.
		var textarea = form.querySelector( '#qa-question-text' );
		if ( textarea ) {
			textarea.value = '';
			var counter = document.getElementById( 'qa-char-count' );
			if ( counter ) {
				counter.textContent = '0';
				counter.parentElement.classList.remove( 'warn', 'error' );
			}
		}

		clearFormError();
	}

	// =========================================================================
	// Character counter
	// =========================================================================

	function bindCharCounter() {
		var textarea  = document.getElementById( 'qa-question-text' );
		var counter   = document.getElementById( 'qa-char-count' );
		var max       = textarea ? parseInt( textarea.getAttribute( 'maxlength' ), 10 ) || 500 : 500;

		if ( ! textarea || ! counter ) {
			return;
		}

		var counterWrap = counter.parentElement;

		textarea.addEventListener( 'input', function () {
			var len = textarea.value.length;
			counter.textContent = len;

			if ( counterWrap ) {
				counterWrap.classList.remove( 'warn', 'error' );
				if ( len >= max ) {
					counterWrap.classList.add( 'error' );
				} else if ( len >= max * 0.9 ) {
					counterWrap.classList.add( 'warn' );
				}
			}
		} );
	}

	// =========================================================================
	// Submit question via REST API
	// =========================================================================

	function bindSubmitQuestion() {
		var submitBtn = document.getElementById( 'qa-submit-question' );
		if ( ! submitBtn ) {
			return;
		}

		submitBtn.addEventListener( 'click', function () {
			clearFormError();

			// Collect field references.
			var productIdEl    = document.getElementById( 'qa-product-id' );
			var questionTextEl = document.getElementById( 'qa-question-text' );
			var guestNameEl    = document.getElementById( 'qa-guest-name' );
			var guestEmailEl   = document.getElementById( 'qa-guest-email' );

			if ( ! productIdEl || ! questionTextEl ) {
				return;
			}

			var questionText = questionTextEl.value.trim();

			// ---- Client-side validation ----

			if ( guestNameEl && '' === guestNameEl.value.trim() ) {
				showFormError( i18n( 'nameRequired', 'Please enter your name.' ) );
				guestNameEl.focus();
				return;
			}

			if ( questionText.length < 10 ) {
				showFormError( i18n( 'minLength', 'Your question must be at least 10 characters.' ) );
				questionTextEl.focus();
				return;
			}

			// ---- Loading state ----

			submitBtn.disabled    = true;
			submitBtn.textContent = i18n( 'submitting', 'Submitting…' );

			// ---- Build request body ----

			var body = {
				product_id:    parseInt( productIdEl.value, 10 ),
				question_text: questionText,
			};

			if ( guestNameEl && guestNameEl.value.trim() ) {
				body.guest_name = guestNameEl.value.trim();
			}
			if ( guestEmailEl && guestEmailEl.value.trim() ) {
				body.guest_email = guestEmailEl.value.trim();
			}

			// ---- Fetch ----

			var settings = ( typeof quickQaSettings !== 'undefined' ) ? quickQaSettings : {};

			fetch( ( settings.restUrl || '' ) + 'questions', {
				method:      'POST',
				credentials: 'same-origin', // send cookies so WP can resolve the logged-in user.
				headers:     {
					'Content-Type': 'application/json',
					'X-WP-Nonce':   settings.nonce || '',
				},
				body: JSON.stringify( body ),
			} )
				.then( function ( response ) {
					// Parse the JSON regardless of HTTP status so we can surface the
					// server's error message to the user when the request fails.
					return response.json().then( function ( data ) {
						if ( ! response.ok ) {
							throw new Error(
								data.message || i18n( 'errorGeneric', 'Something went wrong. Please try again.' )
							);
						}
						return data;
					} );
				} )
				.then( function () {
					// ---- Success ----
					var askForm   = document.getElementById( 'qa-ask-form' );
					var toggleBtn = document.getElementById( 'qa-toggle-ask' );

					if ( askForm && toggleBtn ) {
						closeAskForm( askForm, toggleBtn );
					}

					// Show the pending-review confirmation banner.
					var confirmBox = document.getElementById( 'qa-confirm-box' );
					if ( confirmBox ) {
						confirmBox.style.display = 'flex';
						confirmBox.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );
					}
				} )
				.catch( function ( err ) {
					// ---- Error ----
					showFormError( err.message );

					submitBtn.disabled    = false;
					submitBtn.textContent = i18n( 'submit', 'Submit question' );
				} );
		} );
	}

	// =========================================================================
	// Thread expand / collapse
	// =========================================================================

	function bindThreadToggle() {
		var threadList = document.getElementById( 'qa-thread-list' );
		if ( ! threadList ) {
			return;
		}

		threadList.addEventListener( 'click', function ( e ) {
			var trigger = e.target.closest( '[data-action="toggle-thread"]' );
			if ( ! trigger ) {
				return;
			}

			var thread = trigger.closest( '.qa-thread' );
			if ( ! thread ) {
				return;
			}

			var answers = thread.querySelector( '.qa-answers' );
			if ( ! answers ) {
				return;
			}

			var isExpanded        = 'none' !== answers.style.display;
			answers.style.display = isExpanded ? 'none' : 'block';
			thread.classList.toggle( 'is-expanded', ! isExpanded );

			// Keep aria-expanded in sync on the footer expand button.
			var expandBtn = thread.querySelector( '[data-action="toggle-thread"][aria-expanded]' );
			if ( expandBtn ) {
				expandBtn.setAttribute( 'aria-expanded', String( ! isExpanded ) );
			}
		} );
	}

	// =========================================================================
	// Filter pills (All / Answered / Unanswered)
	// =========================================================================

	function bindFilterPills() {
		var pills = widget.querySelectorAll( '.qa-filter-pill' );
		if ( ! pills.length ) {
			return;
		}

		pills.forEach( function ( pill ) {
			pill.addEventListener( 'click', function () {
				pills.forEach( function ( p ) {
					p.classList.remove( 'active' );
				} );
				pill.classList.add( 'active' );
				applyFilter( pill.getAttribute( 'data-filter' ) || 'all' );
			} );
		} );
	}

	function applyFilter( filter ) {
		threads.forEach( function ( t ) {
			var visible;
			if ( 'answered' === filter ) {
				visible = t.answered;
			} else if ( 'unanswered' === filter ) {
				visible = ! t.answered;
			} else {
				visible = true;
			}
			t.el.style.display = visible ? '' : 'none';
		} );
	}

	// =========================================================================
	// Client-side keyword search
	// =========================================================================

	function bindSearch() {
		var input = document.getElementById( 'qa-search' );
		if ( ! input ) {
			return;
		}

		input.addEventListener( 'input', function () {
			var query = input.value.toLowerCase().trim();
			threads.forEach( function ( t ) {
				if ( ! query ) {
					t.el.style.display = '';
					return;
				}
				var text = t.el.textContent.toLowerCase();
				t.el.style.display = text.indexOf( query ) !== -1 ? '' : 'none';
			} );
		} );
	}

	// =========================================================================
	// Sort (Most recent / Most upvoted)
	// =========================================================================

	function bindSort() {
		var select     = document.getElementById( 'qa-sort' );
		var threadList = document.getElementById( 'qa-thread-list' );
		if ( ! select || ! threadList ) {
			return;
		}

		select.addEventListener( 'change', function () {
			sortThreads( select.value, threadList );
		} );
	}

	function sortThreads( order, container ) {
		threads
			.slice()
			.sort( function ( a, b ) {
				return 'upvoted' === order
					? b.upvotes - a.upvotes
					: b.timestamp - a.timestamp; // Most recent first.
			} )
			.forEach( function ( t ) {
				container.appendChild( t.el );
			} );
	}

	// =========================================================================
	// Error helpers
	// =========================================================================

	function showFormError( message ) {
		var errorEl = document.getElementById( 'qa-form-error' );
		if ( ! errorEl ) {
			return;
		}
		errorEl.textContent   = message;
		errorEl.style.display = 'block';
		errorEl.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );
	}

	function clearFormError() {
		var errorEl = document.getElementById( 'qa-form-error' );
		if ( errorEl ) {
			errorEl.style.display = 'none';
			errorEl.textContent   = '';
		}
	}

	// =========================================================================
	// i18n helper
	// =========================================================================

	/**
	 * Retrieve a translated string from quickQaSettings.i18n, falling back to
	 * the hard-coded English default if the settings object is absent (e.g.
	 * when the script is loaded outside a product page during development).
	 *
	 * @param  {string} key      Key in quickQaSettings.i18n.
	 * @param  {string} fallback English fallback string.
	 * @return {string}
	 */
	function i18n( key, fallback ) {
		var settings = ( typeof quickQaSettings !== 'undefined' ) ? quickQaSettings : {};
		return ( settings.i18n && settings.i18n[ key ] ) ? settings.i18n[ key ] : fallback;
	}

}() );
