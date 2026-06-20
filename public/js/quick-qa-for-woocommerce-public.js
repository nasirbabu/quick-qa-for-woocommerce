/**
 * Quick Q&A for WooCommerce — Frontend interactions (DOM only, no AJAX).
 *
 * Handles:
 *   - Ask form open / close toggle
 *   - Character counter on the question textarea
 *   - Thread expand / collapse (shows the answers panel)
 *   - Filter pills (All / Answered / Unanswered)
 *   - Client-side keyword search across visible threads
 *   - Sort toggle (Most recent / Most upvoted) — re-orders threads in the DOM
 *
 * AJAX submission and upvoting are wired in later steps.
 */
( function () {
	'use strict';

	var widget;

	/**
	 * Cache of all thread elements — rebuilt once on init so sort/filter
	 * can quickly operate on them without repeated querySelectorAll calls.
	 *
	 * Each item: { el, upvotes, timestamp, answered }
	 */
	var threads = [];

	// -----------------------------------------------------------------------
	// Bootstrap
	// -----------------------------------------------------------------------

	document.addEventListener( 'DOMContentLoaded', function () {
		widget = document.getElementById( 'quick-qa-widget' );
		if ( ! widget ) {
			return;
		}

		buildThreadCache();
		bindAskForm();
		bindCharCounter();
		bindThreadToggle();
		bindFilterPills();
		bindSearch();
		bindSort();
	} );

	// -----------------------------------------------------------------------
	// Thread cache
	// -----------------------------------------------------------------------

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

	// -----------------------------------------------------------------------
	// Ask form open / close
	// -----------------------------------------------------------------------

	function bindAskForm() {
		var toggleBtn  = document.getElementById( 'qa-toggle-ask' );
		var askForm    = document.getElementById( 'qa-ask-form' );
		var cancelBtn  = document.getElementById( 'qa-cancel-ask' );

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
		btn.textContent = quickQaL10n
			? quickQaL10n.cancel
			: 'Cancel';

		var firstInput = form.querySelector( 'input:not([readonly]), textarea' );
		if ( firstInput ) {
			firstInput.focus();
		}
	}

	function closeAskForm( form, btn ) {
		form.style.display = 'none';
		form.setAttribute( 'aria-hidden', 'true' );
		btn.setAttribute( 'aria-expanded', 'false' );
		btn.textContent = quickQaL10n
			? quickQaL10n.askQuestion
			: 'Ask a question';

		clearFormError();
	}

	// -----------------------------------------------------------------------
	// Character counter
	// -----------------------------------------------------------------------

	function bindCharCounter() {
		var textarea  = document.getElementById( 'qa-question-text' );
		var counter   = document.getElementById( 'qa-char-count' );
		var counterEl = counter ? counter.parentElement : null;
		var max       = textarea ? parseInt( textarea.getAttribute( 'maxlength' ), 10 ) || 500 : 500;

		if ( ! textarea || ! counter ) {
			return;
		}

		textarea.addEventListener( 'input', function () {
			var len = textarea.value.length;
			counter.textContent = len;

			if ( counterEl ) {
				counterEl.classList.remove( 'warn', 'error' );
				if ( len >= max ) {
					counterEl.classList.add( 'error' );
				} else if ( len >= max * 0.9 ) {
					counterEl.classList.add( 'warn' );
				}
			}
		} );
	}

	// -----------------------------------------------------------------------
	// Thread expand / collapse
	// -----------------------------------------------------------------------

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

			var thread  = trigger.closest( '.qa-thread' );
			if ( ! thread ) {
				return;
			}

			var answers = thread.querySelector( '.qa-answers' );
			if ( ! answers ) {
				return;
			}

			var isExpanded = 'none' !== answers.style.display;

			answers.style.display = isExpanded ? 'none' : 'block';
			thread.classList.toggle( 'is-expanded', ! isExpanded );

			var expandBtn = thread.querySelector( '[data-action="toggle-thread"][aria-expanded]' );
			if ( expandBtn ) {
				expandBtn.setAttribute( 'aria-expanded', String( ! isExpanded ) );
			}
		} );
	}

	// -----------------------------------------------------------------------
	// Filter pills (All / Answered / Unanswered)
	// -----------------------------------------------------------------------

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

	// -----------------------------------------------------------------------
	// Client-side search
	// -----------------------------------------------------------------------

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

	// -----------------------------------------------------------------------
	// Sort (Most recent / Most upvoted)
	// -----------------------------------------------------------------------

	function bindSort() {
		var select    = document.getElementById( 'qa-sort' );
		var threadList = document.getElementById( 'qa-thread-list' );
		if ( ! select || ! threadList ) {
			return;
		}

		select.addEventListener( 'change', function () {
			sortThreads( select.value, threadList );
		} );
	}

	function sortThreads( order, container ) {
		var sorted = threads.slice().sort( function ( a, b ) {
			if ( 'upvoted' === order ) {
				return b.upvotes - a.upvotes;
			}
			// Default: most recent (higher timestamp first).
			return b.timestamp - a.timestamp;
		} );

		sorted.forEach( function ( t ) {
			container.appendChild( t.el );
		} );
	}

	// -----------------------------------------------------------------------
	// Helpers
	// -----------------------------------------------------------------------

	function clearFormError() {
		var errorEl = document.getElementById( 'qa-form-error' );
		if ( errorEl ) {
			errorEl.style.display = 'none';
			errorEl.textContent   = '';
		}
	}

	/**
	 * quickQaL10n is an optional object injected via wp_localize_script()
	 * in a future step (REST API endpoint registration).  The JS guards
	 * against it being absent so this file is safe to ship stand-alone.
	 */
	/* global quickQaL10n */

}() );
