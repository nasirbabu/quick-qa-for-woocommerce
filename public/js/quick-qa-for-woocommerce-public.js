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
		bindVoteButtons();
		bindAnswerForm();
		bindHelpfulVote();
		bindShowMore();
		bindFlagButtons();
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
		var activeFilter = currentFilter !== 'all';
		var isFiltering  = query || activeFilter;
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

		if ( isFiltering ) {
			updateHeaderCount( visibleCount );
		} else {
			// No active filter/search: show the real total from the server.
			var total = parseInt( widget.getAttribute( 'data-total' ) || '0', 10 );
			updateHeaderCount( total );
		}
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
					// Was expanded → now collapsed: restore original label.
					var count = parseInt( expandBtn.dataset.answerCount, 10 ) || 0;
					if ( 0 === count ) {
						expandBtn.textContent = i18n( 'noAnswersYet', 'No answers yet' );
					} else if ( 1 === count ) {
						expandBtn.textContent = i18n( 'oneAnswer', '1 answer' );
					} else {
						expandBtn.textContent = count + ' ' + i18n( 'answers', 'answers' );
					}
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
	// Answer form (open / cancel / submit / char counter)
	// =========================================================================

	/**
	 * Delegate click + input events inside #qa-thread-list for the inline
	 * community answer form: open, cancel, char counter, and fetch submit.
	 */
	function bindAnswerForm() {
		var threadList = document.getElementById( 'qa-thread-list' );
		if ( ! threadList ) {
			return;
		}

		// Click events: open, cancel, submit.
		threadList.addEventListener( 'click', function ( e ) {
			// Open the form.
			var openBtn = e.target.closest( '[data-action="open-answer-form"]' );
			if ( openBtn ) {
				var qid  = openBtn.dataset.questionId;
				var form = document.getElementById( 'qa-answer-form-' + qid );
				var cta  = openBtn.closest( '.qa-add-answer-cta' );
				if ( form ) {
					form.style.display = 'block';
					form.setAttribute( 'aria-hidden', 'false' );
					if ( cta ) cta.style.display = 'none';
					var textarea = form.querySelector( '.qa-answer-textarea' );
					if ( textarea ) textarea.focus();
				}
				return;
			}

			// Cancel.
			var cancelBtn = e.target.closest( '[data-action="cancel-answer"]' );
			if ( cancelBtn ) {
				closeAnswerForm( cancelBtn.dataset.questionId );
				return;
			}

			// Submit.
			var submitBtn = e.target.closest( '[data-action="submit-answer"]' );
			if ( submitBtn && ! submitBtn.disabled ) {
				handleAnswerSubmit( submitBtn );
			}
		} );

		// Char counter — delegated input listener.
		threadList.addEventListener( 'input', function ( e ) {
			if ( ! e.target.classList.contains( 'qa-answer-textarea' ) ) {
				return;
			}
			var form = e.target.closest( '.qa-answer-form' );
			if ( form ) {
				var counter = form.querySelector( '.qa-answer-char-count' );
				if ( counter ) {
					counter.textContent = e.target.value.length;
				}
			}
		} );
	}

	function closeAnswerForm( questionId ) {
		var form = document.getElementById( 'qa-answer-form-' + questionId );
		var cta  = document.querySelector(
			'[data-action="open-answer-form"][data-question-id="' + questionId + '"]'
		);

		if ( form ) {
			form.style.display = 'none';
			form.setAttribute( 'aria-hidden', 'true' );
			var textarea = form.querySelector( '.qa-answer-textarea' );
			if ( textarea ) {
				textarea.value = '';
			}
			var counter = form.querySelector( '.qa-answer-char-count' );
			if ( counter ) {
				counter.textContent = '0';
			}
			var errorEl = form.querySelector( '.qa-answer-error' );
			if ( errorEl ) {
				errorEl.style.display = 'none';
				errorEl.textContent   = '';
			}
		}
		if ( cta ) {
			var ctaWrap = cta.closest( '.qa-add-answer-cta' );
			if ( ctaWrap ) ctaWrap.style.display = '';
		}
	}

	function handleAnswerSubmit( submitBtn ) {
		var questionId = parseInt( submitBtn.dataset.questionId, 10 );
		var form       = document.getElementById( 'qa-answer-form-' + questionId );
		if ( ! form ) {
			return;
		}

		var textarea = form.querySelector( '.qa-answer-textarea' );
		var errorEl  = form.querySelector( '.qa-answer-error' );

		if ( errorEl ) {
			errorEl.style.display = 'none';
			errorEl.textContent   = '';
		}

		var text = textarea ? textarea.value.trim() : '';
		if ( text.length < 10 ) {
			if ( errorEl ) {
				errorEl.textContent   = i18n( 'answerMinLength', 'Your answer must be at least 10 characters.' );
				errorEl.style.display = 'block';
			}
			if ( textarea ) textarea.focus();
			return;
		}

		// Loading state.
		submitBtn.disabled    = true;
		submitBtn.textContent = i18n( 'submitting', 'Submitting…' );

		var settings = ( typeof quickQaSettings !== 'undefined' ) ? quickQaSettings : {};

		fetch( ( settings.restUrl || '' ) + 'answers', {
			method:      'POST',
			credentials: 'same-origin',
			headers:     {
				'Content-Type': 'application/json',
				'X-WP-Nonce':   settings.nonce || '',
			},
			body: JSON.stringify( {
				question_id: questionId,
				answer_text: text,
			} ),
		} )
			.then( function ( response ) {
				return response.json().then( function ( data ) {
					if ( ! response.ok ) {
						throw new Error(
							data.message ||
							i18n( 'errorGeneric', 'Something went wrong. Please try again.' )
						);
					}
					return data;
				} );
			} )
			.then( function ( data ) {
				closeAnswerForm( String( questionId ) );

				if ( 'approved' === data.status ) {
					// Admin answer auto-approved: reload to show it in the list.
					setTimeout( function () {
						window.location.reload();
					}, 400 );
				} else {
					// Community answer pending review: show inline confirmation.
					var confirmEl = document.getElementById( 'qa-answer-confirm-' + questionId );
					if ( confirmEl ) {
						confirmEl.style.display = 'flex';
						confirmEl.scrollIntoView( { behavior: 'smooth', block: 'nearest' } );
					}
					// Hide the "Add your answer" button so the user can't double-submit.
					var ctaWrap = document.querySelector(
						'.qa-add-answer-cta:has([data-question-id="' + questionId + '"])'
					);
					if ( ctaWrap ) ctaWrap.style.display = 'none';
				}
			} )
			.catch( function ( err ) {
				if ( errorEl ) {
					errorEl.textContent   = err.message;
					errorEl.style.display = 'block';
				}
				submitBtn.disabled    = false;
				submitBtn.textContent = i18n( 'submitAnswer', 'Submit answer' );
			} );
	}

	// =========================================================================
	// Helpful votes on answers
	// =========================================================================

	/**
	 * Delegate "↑ Helpful" button clicks from the thread list.
	 *
	 * Calls POST /votes with object_type=answer. Mirrors the optimistic
	 * update pattern used by the question upvote handler.
	 */
	function bindHelpfulVote() {
		var threadList = document.getElementById( 'qa-thread-list' );
		if ( ! threadList ) {
			return;
		}

		threadList.addEventListener( 'click', function ( e ) {
			var btn = e.target.closest( '.qa-helpful[data-action="helpful-vote"]' );
			if ( ! btn || btn.disabled ) {
				return;
			}

			var answerId = parseInt( btn.dataset.id, 10 );
			if ( ! answerId ) {
				return;
			}

			var isVoted   = btn.classList.contains( 'is-voted' );
			var countEl   = btn.querySelector( '.qa-helpful-count' );
			var oldCount  = countEl
				? ( parseInt( countEl.textContent.replace( /[()]/g, '' ), 10 ) || 0 )
				: 0;
			var newCount  = isVoted ? Math.max( 0, oldCount - 1 ) : oldCount + 1;

			// Optimistic UI update.
			btn.classList.toggle( 'is-voted', ! isVoted );
			btn.setAttribute( 'aria-pressed', String( ! isVoted ) );
			if ( countEl ) {
				countEl.textContent = '(' + newCount + ')';
			}
			btn.disabled = true;

			var settings = ( typeof quickQaSettings !== 'undefined' ) ? quickQaSettings : {};

			fetch( ( settings.restUrl || '' ) + 'votes', {
				method:      'POST',
				credentials: 'same-origin',
				headers:     {
					'Content-Type': 'application/json',
					'X-WP-Nonce':   settings.nonce || '',
				},
				body: JSON.stringify( {
					object_type: 'answer',
					object_id:   answerId,
				} ),
			} )
				.then( function ( response ) {
					return response.json().then( function ( data ) {
						if ( ! response.ok ) {
							throw new Error(
								data.message ||
								i18n( 'errorGeneric', 'Something went wrong. Please try again.' )
							);
						}
						return data;
					} );
				} )
				.then( function ( data ) {
					if ( countEl ) {
						countEl.textContent = '(' + data.count + ')';
					}
					btn.classList.toggle( 'is-voted', data.voted );
					btn.setAttribute( 'aria-pressed', String( data.voted ) );
				} )
				.catch( function () {
					// Revert on failure.
					btn.classList.toggle( 'is-voted', isVoted );
					btn.setAttribute( 'aria-pressed', String( isVoted ) );
					if ( countEl ) {
						countEl.textContent = '(' + oldCount + ')';
					}
				} )
				.finally( function () {
					btn.disabled = false;
				} );
		} );
	}

	// =========================================================================
	// Upvote questions
	// =========================================================================

	/**
	 * Delegate vote-button clicks from the thread list.
	 *
	 * Applies an optimistic UI update (toggle class + count) immediately, then
	 * confirms with the server and corrects to the authoritative count on
	 * success, or reverts on error. The button is disabled while the request
	 * is in flight to prevent double-submits.
	 */
	function bindVoteButtons() {
		var threadList = document.getElementById( 'qa-thread-list' );
		if ( ! threadList ) {
			return;
		}

		threadList.addEventListener( 'click', function ( e ) {
			var btn = e.target.closest( '.qa-vote-btn[data-action="upvote-question"]' );
			if ( ! btn || btn.disabled ) {
				return;
			}

			var questionId = parseInt( btn.dataset.id, 10 );
			if ( ! questionId ) {
				return;
			}

			var isVoted  = btn.classList.contains( 'is-voted' );
			var countEl  = btn.querySelector( '.qa-vote-count' );
			var oldCount = countEl ? ( parseInt( countEl.textContent, 10 ) || 0 ) : 0;
			var newCount = isVoted ? Math.max( 0, oldCount - 1 ) : oldCount + 1;

			// Optimistic UI update.
			btn.classList.toggle( 'is-voted', ! isVoted );
			btn.setAttribute( 'aria-pressed', String( ! isVoted ) );
			if ( countEl ) {
				countEl.textContent = newCount;
			}
			btn.disabled = true;

			// Keep thread cache upvotes in sync so sort-by-upvoted is accurate.
			var threadEntry = null;
			for ( var i = 0; i < threads.length; i++ ) {
				if ( parseInt( threads[ i ].el.dataset.questionId, 10 ) === questionId ) {
					threadEntry         = threads[ i ];
					threadEntry.upvotes = newCount;
					break;
				}
			}

			var settings = ( typeof quickQaSettings !== 'undefined' ) ? quickQaSettings : {};

			fetch( ( settings.restUrl || '' ) + 'votes', {
				method:      'POST',
				credentials: 'same-origin',
				headers:     {
					'Content-Type': 'application/json',
					'X-WP-Nonce':   settings.nonce || '',
				},
				body: JSON.stringify( {
					object_type: 'question',
					object_id:   questionId,
				} ),
			} )
				.then( function ( response ) {
					return response.json().then( function ( data ) {
						if ( ! response.ok ) {
							throw new Error(
								data.message ||
								i18n( 'errorGeneric', 'Something went wrong. Please try again.' )
							);
						}
						return data;
					} );
				} )
				.then( function ( data ) {
					// Confirm with the server's authoritative count.
					if ( countEl ) {
						countEl.textContent = data.count;
					}
					btn.classList.toggle( 'is-voted', data.voted );
					btn.setAttribute( 'aria-pressed', String( data.voted ) );
					if ( threadEntry ) {
						threadEntry.upvotes = data.count;
					}
				} )
				.catch( function () {
					// Revert the optimistic update.
					btn.classList.toggle( 'is-voted', isVoted );
					btn.setAttribute( 'aria-pressed', String( isVoted ) );
					if ( countEl ) {
						countEl.textContent = oldCount;
					}
					if ( threadEntry ) {
						threadEntry.upvotes = oldCount;
					}
				} )
				.finally( function () {
					btn.disabled = false;
				} );
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
	// Flag modal
	// =========================================================================

	var FLAG_REASONS = [
		'Spam or promotional',
		'Incorrect information',
		'Offensive language',
		'Duplicate question',
		'Other',
	];

	/**
	 * Delegate "⚐ Flag" button clicks from the thread list and open the modal.
	 */
	function bindFlagButtons() {
		var threadList = document.getElementById( 'qa-thread-list' );
		if ( ! threadList ) {
			return;
		}

		threadList.addEventListener( 'click', function ( e ) {
			var btn = e.target.closest( '[data-action="open-flag"]' );
			if ( ! btn ) {
				return;
			}
			e.stopPropagation();
			openFlagModal( btn.dataset.flagType, parseInt( btn.dataset.flagId, 10 ) );
		} );
	}

	function openFlagModal( objectType, objectId ) {
		// Build reason buttons HTML.
		var reasonsHtml = '';
		for ( var i = 0; i < FLAG_REASONS.length; i++ ) {
			reasonsHtml +=
				'<button type="button" class="qa-flag-reason-btn" data-reason="' +
				FLAG_REASONS[ i ] +
				'">' +
				FLAG_REASONS[ i ] +
				'</button>';
		}

		var backdrop = document.createElement( 'div' );
		backdrop.className = 'qa-flag-modal-backdrop';
		backdrop.id        = 'qa-flag-modal-backdrop';
		backdrop.innerHTML =
			'<div class="qa-flag-modal">' +
				'<h3 class="qa-flag-modal-title">Report this content</h3>' +
				'<p class="qa-flag-modal-sub">Help us keep Q&amp;A useful. Reports are reviewed by our team.</p>' +
				'<div class="qa-flag-reasons">' + reasonsHtml + '</div>' +
				'<div class="qa-flag-actions">' +
					'<button type="button" class="qa-form-cancel" id="qa-flag-cancel">Cancel</button>' +
				'</div>' +
			'</div>';

		widget.style.position = 'relative';
		widget.appendChild( backdrop );

		// Close on backdrop click (not on modal click).
		backdrop.addEventListener( 'click', function ( e ) {
			if ( e.target === backdrop ) {
				closeFlagModal();
			}
		} );

		document.getElementById( 'qa-flag-cancel' ).addEventListener( 'click', closeFlagModal );

		backdrop.querySelectorAll( '.qa-flag-reason-btn' ).forEach( function ( btn ) {
			btn.addEventListener( 'click', function () {
				submitFlag( objectType, objectId, btn.dataset.reason );
			} );
		} );
	}

	function closeFlagModal() {
		var backdrop = document.getElementById( 'qa-flag-modal-backdrop' );
		if ( backdrop && backdrop.parentNode ) {
			backdrop.parentNode.removeChild( backdrop );
		}
	}

	function submitFlag( objectType, objectId, reason ) {
		closeFlagModal();

		var settings = ( typeof quickQaSettings !== 'undefined' ) ? quickQaSettings : {};

		fetch( ( settings.restUrl || '' ) + 'flags', {
			method:      'POST',
			credentials: 'same-origin',
			headers:     {
				'Content-Type': 'application/json',
				'X-WP-Nonce':   settings.nonce || '',
			},
			body: JSON.stringify( {
				object_type: objectType,
				object_id:   objectId,
				reason:      reason,
			} ),
		} )
			.then( function ( r ) {
				return r.json();
			} )
			.then( function ( data ) {
				showFlagToast( 'Thanks for letting us know' );

				// Auto-hidden: remove the flagged question thread from the DOM so it
				// disappears without a page reload. For flagged answers we let the
				// server handle it — the answer will be gone on the next page load.
				if ( data.auto_hidden && 'question' === objectType ) {
					var thread = widget.querySelector(
						'.qa-thread[data-question-id="' + objectId + '"]'
					);
					if ( thread && thread.parentNode ) {
						thread.parentNode.removeChild( thread );
						buildThreadCache();
						applyFiltersAndSearch();
					}
				}
			} )
			.catch( function () {
				showFlagToast( 'Thanks for letting us know' );
			} );
	}

	function showFlagToast( message ) {
		var existing = document.getElementById( 'qa-flag-toast' );
		if ( existing && existing.parentNode ) {
			existing.parentNode.removeChild( existing );
		}

		var toast        = document.createElement( 'div' );
		toast.id         = 'qa-flag-toast';
		toast.className  = 'qa-toast';
		toast.textContent = message;
		document.body.appendChild( toast );

		// Trigger enter transition on next frame.
		setTimeout( function () {
			toast.classList.add( 'qa-toast--visible' );
		}, 16 );

		// Remove after 3 s.
		setTimeout( function () {
			toast.classList.remove( 'qa-toast--visible' );
			setTimeout( function () {
				if ( toast.parentNode ) {
					toast.parentNode.removeChild( toast );
				}
			}, 300 );
		}, 3000 );
	}

	// =========================================================================
	// Show more (pagination)
	// =========================================================================

	/**
	 * Attach the "Show more questions" button click handler.
	 *
	 * On click: fetches the next page of questions from the REST API, appends the
	 * returned HTML to #qa-thread-list, rebuilds the thread cache so filtering /
	 * sorting includes the new items, and hides the button when all questions are
	 * loaded.
	 */
	function bindShowMore() {
		var btn = document.getElementById( 'qa-show-more' );
		if ( ! btn ) {
			return;
		}

		btn.addEventListener( 'click', function () {
			var offset    = parseInt( btn.getAttribute( 'data-offset' ) || '0', 10 );
			var productId = parseInt( widget.getAttribute( 'data-product-id' ) || '0', 10 );
			var settings  = ( typeof quickQaSettings !== 'undefined' ) ? quickQaSettings : {};

			btn.disabled    = true;
			btn.textContent = i18n( 'loadingMore', 'Loading…' );

			fetch(
				( settings.restUrl || '' ) + 'questions?product_id=' + productId + '&offset=' + offset + '&limit=3',
				{
					credentials: 'same-origin',
					headers:     { 'X-WP-Nonce': settings.nonce || '' },
				}
			)
				.then( function ( r ) {
					return r.json();
				} )
				.then( function ( data ) {
					if ( data.html ) {
						var threadList = document.getElementById( 'qa-thread-list' );
						var tmp        = document.createElement( 'div' );
						tmp.innerHTML  = data.html;
						while ( tmp.firstChild ) {
							threadList.appendChild( tmp.firstChild );
						}
						// Rebuild cache so new threads participate in filter / sort.
						buildThreadCache();
						applyFiltersAndSearch();
					}

					if ( data.has_more ) {
						btn.setAttribute( 'data-offset', String( data.offset ) );
						btn.disabled    = false;
						btn.textContent = i18n( 'showMore', 'Show more questions' );
					} else {
						var wrap = btn.closest( '.qa-load-more' );
						if ( wrap ) {
							wrap.style.display = 'none';
						} else {
							btn.style.display = 'none';
						}
					}
				} )
				.catch( function () {
					btn.disabled    = false;
					btn.textContent = i18n( 'showMore', 'Show more questions' );
				} );
		} );
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
