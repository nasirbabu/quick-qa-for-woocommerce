<?php
/**
 * Renders .qa-thread items for a batch of approved questions.
 *
 * Shared by quick-qa-tab.php (initial page load) and the REST pagination
 * endpoint (GET /quick-qa/v1/questions).  All variables below must be set
 * by the including scope before this file is included.
 *
 * Required variables:
 *   $questions        (object[]) — approved question rows; each has ->answers.
 *   $is_logged_in     (bool)
 *   $user_voted_ids   (int[])    — question IDs already upvoted by current user.
 *   $user_helpful_ids (int[])    — answer IDs already marked helpful.
 *
 * @since   1.0.0
 * @package Quick_Qa_For_Woocommerce
 */

defined( 'ABSPATH' ) || exit;

foreach ( $questions as $question ) :
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
		data-upvotes="<?php echo esc_attr( $question->upvotes ); ?>"
		data-question-text="<?php echo esc_attr( $question->question_text ); ?>"
		data-answer-texts="<?php echo esc_attr( implode( ' ', wp_list_pluck( $question->answers, 'answer_text' ) ) ); ?>"
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
					<?php if ( $is_logged_in ) : ?>
						<?php $user_has_voted = in_array( (int) $question->id, $user_voted_ids, true ); ?>
						<button class="qa-vote-btn<?php echo $user_has_voted ? ' is-voted' : ''; ?>"
							type="button"
							data-action="upvote-question"
							data-id="<?php echo esc_attr( $question->id ); ?>"
							aria-label="<?php esc_attr_e( 'Upvote this question', 'quick-qa-for-woocommerce' ); ?>"
							aria-pressed="<?php echo $user_has_voted ? 'true' : 'false'; ?>"
						>
							▲ <span class="qa-vote-count"><?php echo esc_html( $question->upvotes ); ?></span>
						</button>
					<?php endif; ?>

					<button class="qa-foot-link"
						type="button"
						data-action="toggle-thread"
						data-answer-count="<?php echo esc_attr( $answer_count ); ?>"
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

					<?php if ( $is_logged_in ) : ?>
						<button class="qa-foot-link qa-flag-link"
							type="button"
							data-action="open-flag"
							data-flag-type="question"
							data-flag-id="<?php echo esc_attr( $question->id ); ?>"
						>⚐ <?php esc_html_e( 'Flag', 'quick-qa-for-woocommerce' ); ?></button>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<?php // Answers panel: always render for logged-in users (so the form is accessible). ?>
		<?php if ( ! empty( $question->answers ) || $is_logged_in ) : ?>
			<div class="qa-answers" style="display:none;">

				<?php if ( ! empty( $question->answers ) ) : ?>
					<div class="qa-answer-label">
						<?php
						echo esc_html(
							sprintf(
								/* translators: %d: number of answers to this question */
								_n( '%d answer', '%d answers', $answer_count, 'quick-qa-for-woocommerce' ),
								$answer_count
							)
						);
						?>
					</div>

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

						$is_best          = ( 0 === $index && $is_staff );
						$is_helpful_voted = in_array( (int) $answer->id, $user_helpful_ids, true );
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
											<?php esc_html_e( 'Store staff', 'quick-qa-for-woocommerce' ); ?>
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

								<?php if ( $is_logged_in ) : ?>
									<div class="qa-q-foot">
										<button class="qa-helpful<?php echo $is_helpful_voted ? ' is-voted' : ''; ?>"
											type="button"
											data-action="helpful-vote"
											data-id="<?php echo esc_attr( $answer->id ); ?>"
											aria-pressed="<?php echo $is_helpful_voted ? 'true' : 'false'; ?>"
											aria-label="<?php esc_attr_e( 'Mark answer as helpful', 'quick-qa-for-woocommerce' ); ?>"
										>
											<span class="qa-helpful-arrow" aria-hidden="true">↑</span>
											<?php esc_html_e( 'Helpful', 'quick-qa-for-woocommerce' ); ?>
											<span class="qa-helpful-count">(<?php echo esc_html( $answer->upvotes ); ?>)</span>
										</button>
										<button class="qa-foot-link qa-flag-link"
											type="button"
											data-action="open-flag"
											data-flag-type="answer"
											data-flag-id="<?php echo esc_attr( $answer->id ); ?>"
										>⚐ <?php esc_html_e( 'Flag', 'quick-qa-for-woocommerce' ); ?></button>
									</div>
								<?php endif; ?>
							</div>
						</div>
					<?php endforeach; ?>
				<?php endif; ?>

				<?php if ( $is_logged_in ) : ?>

					<?php // Confirmation shown by JS after a community answer is submitted (pending review). ?>
					<div class="qa-confirm qa-confirm--pending qa-answer-confirm"
						id="qa-answer-confirm-<?php echo esc_attr( $question->id ); ?>"
						style="display:none;"
						role="status"
						aria-live="polite"
					>
						<div class="qa-confirm-mark" aria-hidden="true">⌛</div>
						<div class="qa-confirm-body">
							<div class="qa-confirm-title">
								<?php esc_html_e( 'Your answer is being reviewed', 'quick-qa-for-woocommerce' ); ?>
							</div>
							<div class="qa-confirm-text">
								<?php esc_html_e( 'It will appear here once our team approves it.', 'quick-qa-for-woocommerce' ); ?>
							</div>
						</div>
					</div>

					<?php // "Add your answer" button — hidden while the inline form is open. ?>
					<div class="qa-add-answer-cta">
						<button class="qa-ask-btn qa-ask-btn--secondary"
							type="button"
							data-action="open-answer-form"
							data-question-id="<?php echo esc_attr( $question->id ); ?>"
						>
							<?php esc_html_e( 'Add your answer', 'quick-qa-for-woocommerce' ); ?>
						</button>
					</div>

					<?php // Inline answer form — hidden by default, opened by the button above. ?>
					<div class="qa-answer-form"
						id="qa-answer-form-<?php echo esc_attr( $question->id ); ?>"
						style="display:none;"
						aria-hidden="true"
					>
						<textarea
							class="qa-answer-textarea"
							data-question-id="<?php echo esc_attr( $question->id ); ?>"
							rows="3"
							maxlength="2000"
							placeholder="<?php esc_attr_e( 'Share your experience with this product…', 'quick-qa-for-woocommerce' ); ?>"
						></textarea>
						<div class="qa-form-counter">
							<span class="qa-answer-char-count">0</span> / 2000
						</div>
						<div class="qa-form-error qa-answer-error"
							role="alert"
							style="display:none;"
						></div>
						<div class="qa-form-actions">
							<button type="button"
								class="qa-form-cancel"
								data-action="cancel-answer"
								data-question-id="<?php echo esc_attr( $question->id ); ?>"
							>
								<?php esc_html_e( 'Cancel', 'quick-qa-for-woocommerce' ); ?>
							</button>
							<button type="button"
								class="qa-form-submit"
								data-action="submit-answer"
								data-question-id="<?php echo esc_attr( $question->id ); ?>"
							>
								<?php esc_html_e( 'Submit answer', 'quick-qa-for-woocommerce' ); ?>
							</button>
						</div>
					</div>

				<?php endif; ?>

			</div>
		<?php endif; ?>

	</div>
<?php endforeach; ?>
