<?php
/**
 * Q&A tab template for the WooCommerce product page.
 *
 * Variables injected by Quick_Qa_For_Woocommerce_Public::render_qa_tab():
 *
 *   $product_id   (int)      Current WooCommerce product ID.
 *   $questions    (object[]) Approved question rows; each has an ->answers property.
 *   $current_user (WP_User)  Current visitor's WordPress user object.
 *   $is_logged_in (bool)     Whether the visitor is authenticated.
 *   $is_verified  (bool)     Whether they have a completed purchase of this product.
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
							$question_count,
							'quick-qa-for-woocommerce'
						),
						$question_count
					)
				);
				?>
			</div>
		</div>

		<button class="qa-ask-btn"
			id="qa-toggle-ask"
			type="button"
			aria-expanded="false"
			aria-controls="qa-ask-form"
		>
			<?php esc_html_e( 'Ask a question', 'quick-qa-for-woocommerce' ); ?>
		</button>
	</div>

	<?php // ================================================================ ?>
	<?php // Ask form — hidden by default, toggled by JS                     ?>
	<?php // ================================================================ ?>
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
				maxlength="500"
			></textarea>
			<div class="qa-form-counter">
				<span id="qa-char-count">0</span> / 500
			</div>
			<div class="qa-form-error" id="qa-form-error" role="alert" style="display:none;"></div>
		</div>

		<input type="hidden" id="qa-product-id" value="<?php echo esc_attr( $product_id ); ?>" />

		<div class="qa-form-actions">
			<button type="button" class="qa-form-cancel" id="qa-cancel-ask">
				<?php esc_html_e( 'Cancel', 'quick-qa-for-woocommerce' ); ?>
			</button>
			<button type="button" class="qa-form-submit" id="qa-submit-question">
				<?php esc_html_e( 'Submit question', 'quick-qa-for-woocommerce' ); ?>
			</button>
		</div>
	</div>

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
			<div class="qa-search-frontend">
				<span class="qa-search-icon-frontend" aria-hidden="true">⌕</span>
				<input
					type="search"
					id="qa-search"
					placeholder="<?php esc_attr_e( 'Search questions', 'quick-qa-for-woocommerce' ); ?>"
					aria-label="<?php esc_attr_e( 'Search questions', 'quick-qa-for-woocommerce' ); ?>"
				/>
			</div>

			<div class="qa-controls-right">
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

				<select
					class="qa-sort-select"
					id="qa-sort"
					aria-label="<?php esc_attr_e( 'Sort questions', 'quick-qa-for-woocommerce' ); ?>"
				>
					<option value="recent">
						<?php esc_html_e( 'Most recent', 'quick-qa-for-woocommerce' ); ?>
					</option>
					<option value="upvoted">
						<?php esc_html_e( 'Most upvoted', 'quick-qa-for-woocommerce' ); ?>
					</option>
				</select>
			</div>
		</div>

		<?php // ============================================================ ?>
		<?php // Question list                                                ?>
		<?php // ============================================================ ?>
		<div id="qa-thread-list">

			<?php foreach ( $questions as $question ) : ?>
				<?php
				$answer_count = count( $question->answers );
				$is_answered  = $answer_count > 0;

				// Resolve display name: logged-in user or guest fallback.
				if ( $question->user_id ) {
					$user_data  = get_userdata( absint( $question->user_id ) );
					$asker_name = $user_data
						? $user_data->display_name
						: __( 'Customer', 'quick-qa-for-woocommerce' );
				} else {
					$asker_name = $question->guest_name
						? $question->guest_name
						: __( 'Guest', 'quick-qa-for-woocommerce' );
				}

				// Build 2-character initials for the avatar.
				$initials = '';
				$words    = preg_split( '/\s+/', trim( $asker_name ) );
				foreach ( $words as $word ) {
					$initials .= mb_strtoupper( mb_substr( $word, 0, 1 ) );
					if ( mb_strlen( $initials ) >= 2 ) {
						break;
					}
				}

				$time_ago = sprintf(
					/* translators: %s: human-readable time difference, e.g. "2 days" */
					__( '%s ago', 'quick-qa-for-woocommerce' ),
					human_time_diff( strtotime( $question->created_at ), current_time( 'timestamp', true ) )
				);
				?>
				<div class="qa-thread"
					data-question-id="<?php echo esc_attr( $question->id ); ?>"
					data-answered="<?php echo $is_answered ? '1' : '0'; ?>"
					data-created-at="<?php echo esc_attr( strtotime( $question->created_at ) ); ?>"
				>
					<?php // Question row — click to expand answers. ?>
					<div class="qa-q-row" data-action="toggle-thread">
						<div class="qa-av qa-av--circle" aria-hidden="true">
							<?php echo esc_html( $initials ); ?>
						</div>

						<div class="qa-q-body">
							<div class="qa-q-meta">
								<b><?php echo esc_html( $asker_name ); ?></b>

								<?php if ( $question->is_verified_buyer ) : ?>
									<span class="qa-role qa-role--verified">
										<?php esc_html_e( 'Verified buyer', 'quick-qa-for-woocommerce' ); ?>
									</span>
								<?php else : ?>
									<span class="qa-role">
										<?php esc_html_e( 'Customer', 'quick-qa-for-woocommerce' ); ?>
									</span>
								<?php endif; ?>

								<span>· <?php echo esc_html( $time_ago ); ?></span>

								<?php if ( ! $is_answered ) : ?>
									<span class="qa-awaiting">
										<?php esc_html_e( '· Awaiting answer', 'quick-qa-for-woocommerce' ); ?>
									</span>
								<?php endif; ?>
							</div>

							<div class="qa-q-text">
								<?php echo esc_html( $question->question_text ); ?>
							</div>

							<div class="qa-q-foot">
								<button class="qa-vote-btn"
									type="button"
									data-action="upvote-question"
									data-id="<?php echo esc_attr( $question->id ); ?>"
									aria-label="<?php esc_attr_e( 'Upvote this question', 'quick-qa-for-woocommerce' ); ?>"
								>
									▲ <span class="qa-vote-count"><?php echo esc_html( $question->upvotes ); ?></span>
								</button>

								<button class="qa-foot-link"
									type="button"
									data-action="toggle-thread"
									aria-expanded="false"
								>
									<?php if ( $is_answered ) : ?>
										<?php
										echo esc_html(
											sprintf(
												/* translators: %d: number of answers */
												_n(
													'%d answer',
													'%d answers',
													$answer_count,
													'quick-qa-for-woocommerce'
												),
												$answer_count
											)
										);
										?>
									<?php else : ?>
										<?php esc_html_e( 'No answers yet', 'quick-qa-for-woocommerce' ); ?>
									<?php endif; ?>
								</button>
							</div>
						</div>
					</div>

					<?php if ( ! empty( $question->answers ) ) : ?>
						<?php // Answers panel — collapsed by default. ?>
						<div class="qa-answers" style="display:none;">

							<?php foreach ( $question->answers as $index => $answer ) : ?>
								<?php
								$is_staff = 'admin' === $answer->answer_type;

								if ( $answer->user_id ) {
									$ans_user = get_userdata( absint( $answer->user_id ) );
									$ans_name = $ans_user
										? $ans_user->display_name
										: __( 'Team', 'quick-qa-for-woocommerce' );
								} else {
									$ans_name = __( 'Team', 'quick-qa-for-woocommerce' );
								}

								$ans_initials = mb_strtoupper( mb_substr( $ans_name, 0, 2 ) );

								$ans_time = sprintf(
									/* translators: %s: human-readable time difference */
									__( '%s ago', 'quick-qa-for-woocommerce' ),
									human_time_diff( strtotime( $answer->created_at ), current_time( 'timestamp', true ) )
								);

								$is_best = ( 0 === $index && $is_staff );
								?>
								<div class="qa-answer <?php echo $is_staff ? 'qa-answer--staff' : ''; ?>">
									<div class="qa-av qa-av--circle <?php echo $is_staff ? 'qa-av--staff' : 'qa-av--verified'; ?>" aria-hidden="true">
										<?php echo esc_html( $ans_initials ); ?>
									</div>

									<div class="qa-answer-body">
										<?php if ( $is_best ) : ?>
											<span class="qa-best-tag">
												<?php esc_html_e( 'Best answer', 'quick-qa-for-woocommerce' ); ?>
											</span>
										<?php endif; ?>

										<div class="qa-q-meta">
											<b><?php echo esc_html( $ans_name ); ?></b>
											<?php if ( $is_staff ) : ?>
												<span class="qa-role qa-role--staff">
													<?php esc_html_e( 'Staff', 'quick-qa-for-woocommerce' ); ?>
												</span>
											<?php else : ?>
												<span class="qa-role qa-role--verified">
													<?php esc_html_e( 'Verified buyer', 'quick-qa-for-woocommerce' ); ?>
												</span>
											<?php endif; ?>
											<span>· <?php echo esc_html( $ans_time ); ?></span>
										</div>

										<div class="qa-q-text">
											<?php echo esc_html( $answer->answer_text ); ?>
										</div>
									</div>
								</div>
							<?php endforeach; ?>

						</div>
					<?php endif; ?>

				</div>
			<?php endforeach; ?>

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
