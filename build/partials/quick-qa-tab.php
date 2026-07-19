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
 *   $allow_community            (bool)   Master toggle — false means only admins can answer.
 *   $allow_verified_buyers     (bool)   Allow buyers of this product to submit community answers.
 *   $allow_logged_in_customers (bool)   Allow any logged-in user to submit community answers.
 *   $pause_submissions         (bool)   When true, the Ask button and form are hidden.
 *   $who_can_ask               (string) Submission scope: 'both' | 'logged-in' | 'guests'.
 *   $user_can_ask              (bool)   Whether the current visitor is allowed by who_can_ask setting.
 *   $require_email_for_guests  (bool)   Whether guests must provide an email address.
 *   $enable_honeypot           (bool)   Whether an invisible honeypot field should be rendered.
 *   $appr_show_upvotes         (bool)   Whether the upvote button is visible on questions.
 *   $appr_show_role_badges     (bool)   Whether role badges (Customer / Verified buyer / Staff) are shown.
 *   $current_user_id           (int)    WP user ID of the logged-in visitor, or 0 for guests.
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
	data-card-style="<?php echo esc_attr( $appr_card_style ?? 'bordered' ); ?>"
	data-avatar-style="<?php echo esc_attr( $appr_avatar_style ?? 'circle' ); ?>"
>

	<?php // ================================================================ ?>
	<?php // Widget header: title, question count, Ask button               ?>
	<?php // ================================================================ ?>
	<div class="qa-head">
		<div class="qa-head-info">
			<h3 class="qa-head-title">
				<?php esc_html_e( 'Questions &amp; answers', 'askora-product-qa-for-woocommerce' ); ?>
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
							'askora-product-qa-for-woocommerce'
						),
						$total_count
					)
				);
				?>
			</div>
		</div>

		<?php if ( ! $pause_submissions && $user_can_ask ) : ?>
		<button class="qa-ask-btn"
			id="qa-toggle-ask"
			type="button"
			aria-expanded="false"
			aria-controls="qa-ask-form"
		>
			<?php esc_html_e( 'Ask a question', 'askora-product-qa-for-woocommerce' ); ?>
		</button>
	<?php endif; ?>
	</div>

	<?php // ================================================================ ?>
	<?php // Pause-submissions banner — shown instead of the ask form        ?>
	<?php // ================================================================ ?>
	<?php if ( $pause_submissions ) : ?>
	<div class="qa-banner" role="status">
		<span aria-hidden="true">ℹ</span>
		<div>
			<b><?php esc_html_e( "We're not accepting new questions right now.", 'askora-product-qa-for-woocommerce' ); ?></b>
			<?php esc_html_e( 'Please check back later. You can still browse existing Q&amp;A below.', 'askora-product-qa-for-woocommerce' ); ?>
		</div>
	</div>
	<?php endif; ?>

	<?php // ================================================================ ?>
	<?php // Login prompt — shown when who_can_ask=logged-in, visitor is out ?>
	<?php // ================================================================ ?>
	<?php if ( ! $pause_submissions && ! $is_logged_in && 'logged-in' === $who_can_ask ) : ?>
	<div class="qa-login-prompt">
		<div class="qa-login-mark" aria-hidden="true">💬</div>
		<div class="qa-login-title">
			<?php esc_html_e( 'Have a question about this product?', 'askora-product-qa-for-woocommerce' ); ?>
		</div>
		<div class="qa-login-text">
			<?php esc_html_e( 'Log in or create a free account to ask. It only takes a minute.', 'askora-product-qa-for-woocommerce' ); ?>
		</div>
		<div class="qa-login-actions">
			<a href="<?php echo esc_url( wp_login_url( get_permalink() . '#quick-qa-widget' ) ); ?>"
				class="qa-login-btn qa-login-btn--primary">
				<?php esc_html_e( 'Log in', 'askora-product-qa-for-woocommerce' ); ?>
			</a>
			<a href="<?php echo esc_url( wp_registration_url() ); ?>"
				class="qa-login-btn qa-login-btn--secondary">
				<?php esc_html_e( 'Create account', 'askora-product-qa-for-woocommerce' ); ?>
			</a>
		</div>
		<div class="qa-login-note">
			<?php esc_html_e( 'Already a customer? Your purchase history makes your answers more useful to other buyers.', 'askora-product-qa-for-woocommerce' ); ?>
		</div>
	</div>
	<?php endif; ?>

	<?php // ================================================================ ?>
	<?php // Ask form — hidden by default, toggled by JS                     ?>
	<?php // ================================================================ ?>
	<?php if ( ! $pause_submissions && $user_can_ask ) : ?>
	<div class="qa-ask-form"
		id="qa-ask-form"
		style="display:none;"
		aria-hidden="true"
	>
		<div class="qa-ask-form-title">
			<?php esc_html_e( 'Ask a question', 'askora-product-qa-for-woocommerce' ); ?>
		</div>
		<div class="qa-ask-form-sub">
			<?php esc_html_e( 'Our team and other customers will be notified. Most questions are answered within 24 hours.', 'askora-product-qa-for-woocommerce' ); ?>
		</div>

		<?php if ( $is_logged_in ) : ?>
			<?php
			$display_label = $current_user->display_name;
			if ( $is_verified ) {
				$display_label .= ' — ' . __( 'Verified buyer', 'askora-product-qa-for-woocommerce' );
			}
			?>
			<div class="qa-ask-form-field">
				<label for="qa-asking-as">
					<?php esc_html_e( 'Asking as', 'askora-product-qa-for-woocommerce' ); ?>
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
					<?php esc_html_e( 'Your name', 'askora-product-qa-for-woocommerce' ); ?>
				</label>
				<input
					type="text"
					id="qa-guest-name"
					name="qa_guest_name"
					placeholder="<?php esc_attr_e( 'e.g. Sarah K.', 'askora-product-qa-for-woocommerce' ); ?>"
					autocomplete="name"
				/>
			</div>
			<div class="qa-ask-form-field">
				<label for="qa-guest-email">
					<?php esc_html_e( 'Email', 'askora-product-qa-for-woocommerce' ); ?>
					<?php if ( $require_email_for_guests ) : ?>
						<span class="qa-label-required" aria-hidden="true"> *</span>
					<?php else : ?>
						<span class="qa-label-note">
							<?php esc_html_e( "(we'll notify you when answered)", 'askora-product-qa-for-woocommerce' ); ?>
						</span>
					<?php endif; ?>
				</label>
				<input
					type="email"
					id="qa-guest-email"
					name="qa_guest_email"
					placeholder="<?php esc_attr_e( 'you@example.com', 'askora-product-qa-for-woocommerce' ); ?>"
					autocomplete="email"
					<?php if ( $require_email_for_guests ) : ?>required aria-required="true"<?php endif; ?>
				/>
			</div>
		<?php endif; ?>

		<div class="qa-ask-form-field">
			<label for="qa-question-text">
				<?php esc_html_e( 'Your question', 'askora-product-qa-for-woocommerce' ); ?>
			</label>
			<textarea
				id="qa-question-text"
				name="qa_question_text"
				rows="4"
				placeholder="<?php esc_attr_e( 'What would you like to know?', 'askora-product-qa-for-woocommerce' ); ?>"
				maxlength="<?php echo esc_attr( $max_length ); ?>"
			></textarea>
			<div class="qa-form-counter">
				<span id="qa-char-count">0</span> / <?php echo esc_html( $max_length ); ?>
			</div>
			<div class="qa-form-error" id="qa-form-error" role="alert" style="display:none;"></div>
		</div>

		<input type="hidden" id="qa-product-id" value="<?php echo esc_attr( $product_id ); ?>" />

		<?php if ( $enable_honeypot ) : ?>
		<?php // Honeypot: invisible to humans, filled by bots. Must remain empty on submit. ?>
		<div class="qa-hp" aria-hidden="true" style="position:absolute;left:-9999px;overflow:hidden;width:1px;height:1px;" tabindex="-1">
			<label for="qa-website"><?php esc_html_e( 'Leave this field empty', 'askora-product-qa-for-woocommerce' ); ?></label>
			<input type="text" id="qa-website" name="qa_website" value="" autocomplete="off" tabindex="-1" />
		</div>
		<?php endif; ?>

		<?php if ( $show_recaptcha ) : ?>
		<div class="qa-recaptcha-wrap">
			<div class="g-recaptcha"
				data-sitekey="<?php echo esc_attr( $recaptcha_site_key ); ?>">
			</div>
		</div>
		<?php endif; ?>

		<div class="qa-form-actions">
			<button type="button" class="qa-form-cancel" id="qa-cancel-ask">
				<?php esc_html_e( 'Cancel', 'askora-product-qa-for-woocommerce' ); ?>
			</button>
			<button type="button" class="qa-form-submit" id="qa-submit-question">
				<?php esc_html_e( 'Submit question', 'askora-product-qa-for-woocommerce' ); ?>
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
				<?php esc_html_e( 'Your question is being reviewed', 'askora-product-qa-for-woocommerce' ); ?>
			</div>
			<div class="qa-confirm-text">
				<?php esc_html_e( "It will appear here once approved. We'll notify you when it's answered.", 'askora-product-qa-for-woocommerce' ); ?>
			</div>
		</div>
	</div>

	<?php if ( ! empty( $questions ) ) : ?>

		<?php // ============================================================ ?>
		<?php // Controls: search + filter pills + sort                       ?>
		<?php // Hidden when anonymous visitor is blocked by login-required.  ?>
		<?php // ============================================================ ?>
		<?php if ( $is_logged_in || 'logged-in' !== $who_can_ask ) : ?>
		<div class="qa-controls">
			<?php if ( $show_search ) : ?>
			<div class="qa-search-frontend">
				<span class="qa-search-icon-frontend" aria-hidden="true">⌕</span>
				<input
					type="search"
					id="qa-search"
					placeholder="<?php esc_attr_e( 'Search questions', 'askora-product-qa-for-woocommerce' ); ?>"
					aria-label="<?php esc_attr_e( 'Search questions', 'askora-product-qa-for-woocommerce' ); ?>"
				/>
			</div>
			<?php endif; ?>

			<div class="qa-controls-right">
				<?php if ( $show_filter ) : ?>
				<div class="qa-filter-pills"
					role="group"
					aria-label="<?php esc_attr_e( 'Filter questions', 'askora-product-qa-for-woocommerce' ); ?>"
				>
					<button class="qa-filter-pill active" data-filter="all" type="button">
						<?php esc_html_e( 'All', 'askora-product-qa-for-woocommerce' ); ?>
					</button>
					<button class="qa-filter-pill" data-filter="answered" type="button">
						<?php esc_html_e( 'Answered', 'askora-product-qa-for-woocommerce' ); ?>
					</button>
					<button class="qa-filter-pill" data-filter="unanswered" type="button">
						<?php esc_html_e( 'Unanswered', 'askora-product-qa-for-woocommerce' ); ?>
					</button>
				</div>
				<?php endif; ?>

				<select
					class="qa-sort-select"
					id="qa-sort"
					aria-label="<?php esc_attr_e( 'Sort questions', 'askora-product-qa-for-woocommerce' ); ?>"
				>
					<option value="recent"<?php selected( $default_sort, 'recent' ); ?>>
						<?php esc_html_e( 'Most recent', 'askora-product-qa-for-woocommerce' ); ?>
					</option>
					<option value="upvoted"<?php selected( $default_sort, 'upvoted' ); ?>>
						<?php esc_html_e( 'Most upvoted', 'askora-product-qa-for-woocommerce' ); ?>
					</option>
					<option value="oldest"<?php selected( $default_sort, 'oldest' ); ?>>
						<?php esc_html_e( 'Oldest first', 'askora-product-qa-for-woocommerce' ); ?>
					</option>
				</select>
			</div>
		</div>
		<?php endif; // logged-in check for controls ?>

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
					<?php esc_html_e( 'Show more questions', 'askora-product-qa-for-woocommerce' ); ?>
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
				<?php esc_html_e( 'No matching questions', 'askora-product-qa-for-woocommerce' ); ?>
			</div>
			<p>
				<?php esc_html_e( 'Try a different keyword, or', 'askora-product-qa-for-woocommerce' ); ?>
				<button type="button" class="qa-link" id="qa-clear-search">
					<?php esc_html_e( 'clear the search', 'askora-product-qa-for-woocommerce' ); ?>
				</button>
				<?php esc_html_e( 'to see all.', 'askora-product-qa-for-woocommerce' ); ?>
			</p>
		</div>

	<?php else : ?>

		<?php // ============================================================ ?>
		<?php // Empty state — no approved questions yet                      ?>
		<?php // ============================================================ ?>
		<div class="qa-empty">
			<div class="qa-empty-mark" aria-hidden="true">💬</div>
			<div class="qa-empty-title">
				<?php esc_html_e( 'No questions yet', 'askora-product-qa-for-woocommerce' ); ?>
			</div>
			<p>
				<?php esc_html_e( 'Be the first to ask about this product. Our team typically responds within 24 hours.', 'askora-product-qa-for-woocommerce' ); ?>
			</p>
		</div>

	<?php endif; ?>

</div>
