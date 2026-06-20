/**
 * Quick Q&A for WooCommerce — Frontend interactions.
 *
 * DOM interactions:
 *   - Ask form open / close toggle
 *   - Character counter on the question textarea
 *   - Thread expand / collapse (button text: "N answers" ↔ "Collapse")
 *   - Filter pills (All / Answered / Unanswered) — combined with search
 *   - Keyword search — debounced 150 ms, searches question text + answer text
 *   - Sort (Most recent / Most upvoted / Oldest first)
 *   - Dynamic header question count when filter / search is active
 *   - "No matching questions" empty state when search returns 0 results
 *
 * Network:
 *   - Submit question via fetch() → POST /wp-json/quick-qa/v1/questions
 *
 * Requires quickQaSettings injected by wp_localize_script():
 *   { restUrl, nonce, i18n: { askQuestion, cancel, submit, submitting,
 *                              minLength, nameRequired, errorGeneric,
 *                              questionCount, questionsCount,
 *                              collapse, oneAnswer, answers } }
 */
/* global quickQaSettings */

( function () {
	'use strict';

	/** Root widget element — set once on DOMContentLoaded. */
	var widget;

	/**
	 * Cached thread metadata, rebuilt once on init.
	 * Shape: Array<{ el: Element, upvotes: number, timestamp: number, answered: boolean }>
	 */
	var threads = [];

	/** Currently active filter pill value: 'all' | 'answered' | 'unanswered'. */
	var currentFilter = 'all';

	/** Raw value of the search input (not lowercased). */
	var currentSearch = '';

	/** Debounce handle for the search input. */
	var searchTimer = null;

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
		threads = [];
		widget.querySelectorAll( '.qa-thread' ).forEach( function ( el ) {
			threads.push( {
				el:        el,
				upvotes:   parseInt( el.dataset.upvotes   || '0', 10 ),
				timestamp: parseInt( el.dataset.createdAt || '0', 10 ),
				answered:  '1' === el.dataset.answered,
			} );
		} );
	}

	// =========================================================================
	// Combined filter + search (single function controls all thread visibility)
	// =========================================================================

	function applyFiltersAndSearch() {
		var query        = currentSearch.toLowerCase().trim();
		var visibleCount = 0;

		threads.forEach( function ( t ) {
			var passesFilter;
			if ( 'answered' === currentFilter ) {
				passesFilter = t.answered;
			} else if ( 'unanswered' === currentFilter ) {
				passesFilter = ! t.answered;
			} else {
				passesFilter = true;
			}

			var passesSearch = true;
			if ( query ) {
				var qText = ( t.el.dataset.questionText || '' ).toLowerCase();
				var aText = ( t.el.dataset.answerTexts  || '' ).toLowerCase();
				passesSearch = qText.indexOf( query ) !== -1 || aText.indexOf( query ) !== -1;
			}

			var visible = passesFilter && passesSearch;
			t.el.style.display = visible ? '' : 'none';
			if ( visible ) {
				visibleCount++;
			}
		} );

		updateHeaderCount( visibleCount );
		toggleNoResults( 0 === visibleCount && !! query );
	}

	/** Replace the "N questions" subtitle to reflect the currently visible count. */
	function updateHeaderCount( count ) {
		var subEl = widget.querySelector( '.qa-head-sub' );
		if ( ! subEl ) {
			return;
		}
		var template = 1 === count
			? i18n( 'questionCount',  '%d question about this product' )
			: i18n( 'questionsCount', '%d questions about this product' );
		subEl.textContent = template.replace( '%d', count );
	}

	/** Show or hide the "No matching questions" empty state. */
	function toggleNoResults( show ) {
		var noResults = document.getElementById( 'qa-no-results' );
		if ( ! noResults ) {
			return;
		}
		noResults.style.display = show ? 'block' : 'none';
		noResults.setAttribute( 'aria-hidden', show ? 'false' : 'true' );
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

		// Reset the textarea and counter so a re-open shows a blank form.
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
		var textarea = document.getElementById( 'qa-question-text' );
		var counter  = document.getElementById( 'qa-char-count' );
		var max      = textarea ? parseInt( textarea.getAttribute( 'maxlength' ), 10 ) || 500 : 500;

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

			var productIdEl    = document.getElementById( 'qa-product-id' );
			var questionTextEl = document.getElementById( 'qa-question-text' );
			var guestNameEl    = document.getElementById( 'qa-guest-name' );
			var guestEmailEl   = document.getElementById( 'qa-guest-email' );

			if ( ! productIdEl || ! questionTextEl ) {
				return;
			}

			var questionText = questionTextEl.value.trim();

			// Client-side validation mirrors the server-side rules.
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

			// Loading state.
			submitBtn.disabled    = true;
			submitBtn.textContent = i18n( 'submitting', 'Submitting…' );

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

			var settings = ( typeof quickQaSettings !== 'undefined' ) ? quickQaSettings : {};

			fetch( ( settings.restUrl || '' ) + 'questions', {
				method:      'POST',
				credentials: 'same-origin',
				headers:     {
					'Content-Type': 'application/json',
					'X-WP-Nonce':   settings.nonce || '',
				},
				body: JSON.stringify( body ),
			} )
				.then( function ( response ) {
					return response.json().then( function ( data ) {
						if ( ! response.ok ) {
							throw new Error(
								data.message || i18n( 'errorGeneric', 'Something went wrong. Please try again.' )
							);
						}
						return data;
					} );
				} )
				.then( function ( data ) {
					var askForm   = document.getElementById( 'qa-ask-form' );
					var toggleBtn = document.getElementById( 'qa-toggle-ask' );

					if ( askForm && toggleBtn ) {
						closeAskForm( askForm, toggleBtn );
					}

					if ( data.status === 'approved' ) {
						// Question is live — reload so it appears in the list.
						setTimeout( function () {
							window.location.reload();
						}, 400 );
					} else {
						// Question awaits moderation — show the pending banner.
						var confirmBox = document.getElementById( 'qa-confirm-box' );
						if ( confirmBox ) {
							confirmBox.style.display = 'flex';
							confirmBox.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );
						}
					}
				} )
				.catch( function ( err ) {
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

			// Update footer button text and aria-expanded.
			var expandBtn = thread.querySelector( '.qa-foot-link[data-action="toggle-thread"]' );
			if ( expandBtn ) {
				expandBtn.setAttribute( 'aria-expanded', String( ! isExpanded ) );

				if ( isExpanded ) {
					// Was expanded → now collapsed: restore "N answers" label.
					var count = parseInt( expandBtn.dataset.answerCount, 10 ) || 0;
					expandBtn.textContent = 1 === count
						? i18n( 'oneAnswer', '1 answer' )
						: count + ' ' + i18n( 'answers', 'answers' );
				} else {
					// Was collapsed → now expanded: show "Collapse".
					expandBtn.textContent = i18n( 'collapse', 'Collapse' );
				}
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
				currentFilter = pill.getAttribute( 'data-filter' ) || 'all';
				applyFiltersAndSearch();
			} );
		} );
	}

	// =========================================================================
	// Search — debounced 150 ms, matches question text and answer text
	// =========================================================================

	function bindSearch() {
		var input    = document.getElementById( 'qa-search' );
		var clearBtn = document.getElementById( 'qa-clear-search' );

		if ( ! input ) {
			return;
		}

		input.addEventListener( 'input', function () {
			currentSearch = input.value;
			clearTimeout( searchTimer );
			searchTimer = setTimeout( applyFiltersAndSearch, 150 );
		} );

		// "clear the search" link inside the no-results empty state.
		if ( clearBtn ) {
			clearBtn.addEventListener( 'click', function () {
				currentSearch = '';
				input.value   = '';
				applyFiltersAndSearch();
				input.focus();
			} );
		}
	}

	// =========================================================================
	// Sort (Most recent / Most upvoted / Oldest first)
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
				if ( 'upvoted' === order ) {
					return b.upvotes - a.upvotes;      // highest first
				}
				if ( 'oldest' === order ) {
					return a.timestamp - b.timestamp;  // ascending — oldest first
				}
				return b.timestamp - a.timestamp;      // 'recent' — newest first
			} )
			.forEach( function ( t ) {
				container.appendChild( t.el );
			} );
	}

	// =========================================================================
	// Form error helpers
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
	 * the hard-coded English default when the settings object is absent.
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
