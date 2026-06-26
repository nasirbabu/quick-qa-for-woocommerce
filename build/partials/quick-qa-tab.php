<?php
/**
 * Q&A tab template for the WooCommerce product page.
 *
 * Variables injected by Quick_Qa_For_Woocommerce_Public::render_qa_tab():
 *
 *   $product_id        (int)      Current WooCommerce product ID.
 *   $questions         (object[]) Approved question rows; each has an ->answers property.
 *   $current_user      (WP_User)  Current visitor's WordPress user object.
 *   $is_logged_in      (bool)     Whether the visitor is authenticated.
 *   $is_verified       (bool)     Whether they have a completed purchase of this product.
 *   $is_admin          (bool)     Whether the visitor has manage_options / manage_woocommerce.
 *   $user_voted_ids    (int[])    Question IDs the current user has already upvoted.
 *   $user_helpful_ids  (int[])    Answer IDs the current user has marked as helpful.
 *   $total_count       (int)      Total approved questions in DB (may exceed count($questions)).
 *   $has_more          (bool)     Whether more questions exist beyond the initial batch.
 *   $show_search       (bool)     Whether to render the keyword search input.
 *   $show_filter       (bool)     Whether to render the filter pills (All / Answered / Unanswered).
 *   $default_sort      (string)   Initial sort order: 'recent' | 'upvoted' | 'oldest'.
 *   $max_length        (int)      Maximum question character length.
 *   $min_length        (int)      Minimum question character length.
 *   $allow_community   (bool)     Whether logged-in customers can submit answers.
 *   $pause_submissions (bool)     When true, the Ask button and form are hidden.
 *
 * @since   1.0.0
 * @package Quick_Qa_For_Woocommerce
 */

defined( 'ABSPATH' ) || exit;

$question_count = count( $questions );
?>
<div class="qa-widget"
	id="quick-qa-widget"
	data-product-id="<?php echo esc_attr( $product_id ); ?>"
	data-total="<?php echo esc_attr( $total_count ); ?>"
>

	<?php // ================================================================ ?>
	<?php // Widget header: title, question count, Ask button               ?>
	<?php // ================================================================ ?>
	<div class="qa-head">
		<div class="qa-head-info">
			<h3 class="qa-head-title">
				<?php esc_html_e( 'Questions &amp; answers', 'quick-qa-for-woocommerce' ); ?>
			</h3>
			<div class="qa-head-sub">
				<?php
				echo esc_html(
					sprintf(
						/* translators: %d: number of approved questions on this product */
						_n(
							'%d question about this product',
							'%d questions about this product',
							$total_count,
							'quick-qa-for-woocommerce'
						),
						$total_count
					)
				);
				?>
			</div>
		</div>

		<?php if ( ! $pause_submissions ) : ?>
		<button class="qa-ask-btn"
			id="qa-toggle-ask"
			type="button"
			aria-expanded="false"
			aria-controls="qa-ask-form"
		>
			<?php esc_html_e( 'Ask a question', 'quick-qa-for-woocommerce' ); ?>
		</button>
	<?php endif; ?>
	</div>

	<?php // ================================================================ ?>
	<?php // Ask form — hidden by default, toggled by JS                     ?>
	<?php // ================================================================ ?>
	<?php if ( ! $pause_submissions ) : ?>
	<div class="qa-ask-form"
		id="qa-ask-form"
		style="display:none;"
		aria-hidden="true"
	>
		<div class="qa-ask-form-title">
			<?php esc_html_e( 'Ask a question', 'quick-qa-for-woocommerce' ); ?>
		</div>
		<div class="qa-ask-form-sub">
			<?php esc_html_e( 'Our team and other customers will be notified. Most questions are answered within 24 hours.', 'quick-qa-for-woocommerce' ); ?>
		</div>

		<?php if ( $is_logged_in ) : ?>
			<?php
			$display_label = $current_user->display_name;
			if ( $is_verified ) {
				$display_label .= ' — ' . __( 'Verified buyer', 'quick-qa-for-woocommerce' );
			}
			?>
			<div class="qa-ask-form-field">
				<label for="qa-asking-as">
					<?php esc_html_e( 'Asking as', 'quick-qa-for-woocommerce' ); ?>
				</label>
				<input
					type="text"
					id="qa-asking-as"
					class="qa-asking-as"
					value="<?php echo esc_attr( $display_label ); ?>"
					readonly
					aria-readonly="true"
				/>
			</div>
		<?php else : ?>
			<div class="qa-ask-form-field">
				<label for="qa-guest-name">
					<?php esc_html_e( 'Your name', 'quick-qa-for-woocommerce' ); ?>
				</label>
				<input
					type="text"
					id="qa-guest-name"
					name="qa_guest_name"
					placeholder="<?php esc_attr_e( 'e.g. Sarah K.', 'quick-qa-for-woocommerce' ); ?>"
					autocomplete="name"
				/>
			</div>
			<div class="qa-ask-form-field">
				<label for="qa-guest-email">
					<?php esc_html_e( 'Email', 'quick-qa-for-woocommerce' ); ?>
					<span class="qa-label-note">
						<?php esc_html_e( "(we'll notify you when answered)", 'quick-qa-for-woocommerce' ); ?>
					</span>
				</label>
				<input
					type="email"
					id="qa-guest-email"
					name="qa_guest_email"
					placeholder="<?php esc_attr_e( 'you@example.com', 'quick-qa-for-woocommerce' ); ?>"
					autocomplete="email"
				/>
			</div>
		<?php endif; ?>

		<div class="qa-ask-form-field">
			<label for="qa-question-text">
				<?php esc_html_e( 'Your question', 'quick-qa-for-woocommerce' ); ?>
			</label>
			<textarea
				id="qa-question-text"
				name="qa_question_text"
				rows="4"
				placeholder="<?php esc_attr_e( 'What would you like to know?', 'quick-qa-for-woocommerce' ); ?>"
				maxlength="<?php echo esc_attr( $max_length ); ?>"
			></textarea>
			<div class="qa-form-counter">
				<span id="qa-char-count">0</span> / <?php echo esc_html( $max_length ); ?>
			</div>
			<div class="qa-form-error" id="qa-form-error" role="alert" style="display:none;"></div>
		</div>

		<input type="hidden" id="qa-product-id" value="<?php echo esc_attr( $product_id ); ?>" />

		<?php if ( $show_recaptcha ) : ?>
		<div class="qa-recaptcha-wrap">
			<div class="g-recaptcha"
				data-sitekey="<?php echo esc_attr( $recaptcha_site_key ); ?>">
			</div>
		</div>
		<?php endif; ?>

		<div class="qa-form-actions">
			<button type="button" class="qa-form-cancel" id="qa-cancel-ask">
				<?php esc_html_e( 'Cancel', 'quick-qa-for-woocommerce' ); ?>
			</button>
			<button type="button" class="qa-form-submit" id="qa-submit-question">
				<?php esc_html_e( 'Submit question', 'quick-qa-for-woocommerce' ); ?>
			</button>
		</div>
	</div>
	<?php endif; // pause_submissions ?>

	<?php // ================================================================ ?>
	<?php // Submission confirmation — hidden, shown by JS after submit      ?>
	<?php // ================================================================ ?>
	<div class="qa-confirm qa-confirm--pending"
		id="qa-confirm-box"
		style="display:none;"
		role="status"
		aria-live="polite"
	>
		<div class="qa-confirm-mark" aria-hidden="true">⌛</div>
		<div class="qa-confirm-body">
			<div class="qa-confirm-title">
				<?php esc_html_e( 'Your question is being reviewed', 'quick-qa-for-woocommerce' ); ?>
			</div>
			<div class="qa-confirm-text">
				<?php esc_html_e( "It will appear here once approved. We'll notify you when it's answered.", 'quick-qa-for-woocommerce' ); ?>
			</div>
		</div>
	</div>

	<?php if ( ! empty( $questions ) ) : ?>

		<?php // ============================================================ ?>
		<?php // Controls: search + filter pills + sort                       ?>
		<?php // ============================================================ ?>
		<div class="qa-controls">
			<?php if ( $show_search ) : ?>
			<div class="qa-search-frontend">
				<span class="qa-search-icon-frontend" aria-hidden="true">⌕</span>
				<input
					type="search"
					id="qa-search"
					placeholder="<?php esc_attr_e( 'Search questions', 'quick-qa-for-woocommerce' ); ?>"
					aria-label="<?php esc_attr_e( 'Search questions', 'quick-qa-for-woocommerce' ); ?>"
				/>
			</div>
			<?php endif; ?>

			<div class="qa-controls-right">
				<?php if ( $show_filter ) : ?>
				<div class="qa-filter-pills"
					role="group"
					aria-label="<?php esc_attr_e( 'Filter questions', 'quick-qa-for-woocommerce' ); ?>"
				>
					<button class="qa-filter-pill active" data-filter="all" type="button">
						<?php esc_html_e( 'All', 'quick-qa-for-woocommerce' ); ?>
					</button>
					<button class="qa-filter-pill" data-filter="answered" type="button">
						<?php esc_html_e( 'Answered', 'quick-qa-for-woocommerce' ); ?>
					</button>
					<button class="qa-filter-pill" data-filter="unanswered" type="button">
						<?php esc_html_e( 'Unanswered', 'quick-qa-for-woocommerce' ); ?>
					</button>
				</div>
				<?php endif; ?>

				<select
					class="qa-sort-select"
					id="qa-sort"
					aria-label="<?php esc_attr_e( 'Sort questions', 'quick-qa-for-woocommerce' ); ?>"
				>
					<option value="recent"<?php selected( $default_sort, 'recent' ); ?>>
						<?php esc_html_e( 'Most recent', 'quick-qa-for-woocommerce' ); ?>
					</option>
					<option value="upvoted"<?php selected( $default_sort, 'upvoted' ); ?>>
						<?php esc_html_e( 'Most upvoted', 'quick-qa-for-woocommerce' ); ?>
					</option>
					<option value="oldest"<?php selected( $default_sort, 'oldest' ); ?>>
						<?php esc_html_e( 'Oldest first', 'quick-qa-for-woocommerce' ); ?>
					</option>
				</select>
			</div>
		</div>

		<?php // ============================================================ ?>
		<?php // Question list                                                ?>
		<?php // ============================================================ ?>
		<div id="qa-thread-list">
			<?php include __DIR__ . '/quick-qa-question-items.php'; ?>
		</div>

		<?php if ( $has_more ) : ?>
			<div class="qa-load-more">
				<button
					type="button"
					class="qa-load-more-btn"
					id="qa-show-more"
					data-offset="<?php echo esc_attr( count( $questions ) ); ?>"
				>
					<?php esc_html_e( 'Show more questions', 'quick-qa-for-woocommerce' ); ?>
				</button>
			</div>
		<?php endif; ?>

		<?php // Search-returned-nothing empty state (JS shows/hides this). ?>
		<div class="qa-empty qa-no-results"
			id="qa-no-results"
			style="display:none;"
			aria-hidden="true"
			role="status"
		>
			<div class="qa-empty-mark" aria-hidden="true">⌕</div>
			<div class="qa-empty-title">
				<?php esc_html_e( 'No matching questions', 'quick-qa-for-woocommerce' ); ?>
			</div>
			<p>
				<?php esc_html_e( 'Try a different keyword, or', 'quick-qa-for-woocommerce' ); ?>
				<button type="button" class="qa-link" id="qa-clear-search">
					<?php esc_html_e( 'clear the search', 'quick-qa-for-woocommerce' ); ?>
				</button>
				<?php esc_html_e( 'to see all.', 'quick-qa-for-woocommerce' ); ?>
			</p>
		</div>

	<?php else : ?>

		<?php // ============================================================ ?>
		<?php // Empty state — no approved questions yet                      ?>
		<?php // ============================================================ ?>
		<div class="qa-empty">
			<div class="qa-empty-mark" aria-hidden="true">💬</div>
			<div class="qa-empty-title">
				<?php esc_html_e( 'No questions yet', 'quick-qa-for-woocommerce' ); ?>
			</div>
			<p>
				<?php esc_html_e( 'Be the first to ask about this product. Our team typically responds within 24 hours.', 'quick-qa-for-woocommerce' ); ?>
			</p>
		</div>

	<?php endif; ?>

</div>
