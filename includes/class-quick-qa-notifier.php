<?php
/**
 * Notification dispatcher for Quick Q&A for WooCommerce.
 *
 * Handles all outbound notifications: admin email alerts, daily digests,
 * unanswered-question reminders, and Slack webhook posts.
 *
 * All public methods are static so they can be called from any REST
 * controller without instantiation.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * Notification dispatcher.
 *
 * Responsibilities:
 *   - Send admin email + Slack whenever a new question is submitted (instant
 *     mode) or queue it for the daily digest.
 *   - Send admin email + Slack when a community answer needs review.
 *   - Send admin email + Slack when a question's upvote count hits the
 *     configured threshold (fires once per question).
 *   - Run a daily WP Cron job that reminds the admin about unanswered questions
 *     older than the configured number of days.
 *   - Run a daily WP Cron job that sends the accumulated digest queue.
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Notifier {

	/**
	 * WP Cron hook fired once a day to send the daily digest email.
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const DIGEST_HOOK = 'quick_qa_daily_digest';

	/**
	 * WP Cron hook fired once a day to check for unanswered questions.
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const REMINDER_HOOK = 'quick_qa_unanswered_check';

	/**
	 * WP Cron hook fired once a day to send review invitations for
	 * recently-answered questions.
	 *
	 * @since 1.2.0
	 * @var   string
	 */
	const REVIEW_INVITE_HOOK = 'quick_qa_review_invitation_check';

	/**
	 * Days after a question is answered before its asker gets a review
	 * invitation. Matches the design's own "a few days" / "a week ago" copy;
	 * not currently admin-configurable.
	 *
	 * @since 1.2.0
	 * @var   int
	 */
	const REVIEW_INVITE_DELAY_DAYS = 5;

	/**
	 * WordPress option key that stores pending digest items.
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const DIGEST_QUEUE = 'quick_qa_digest_queue';

	/**
	 * WordPress option key that stores question IDs whose upvote threshold
	 * notification has already been sent (prevents duplicate alerts).
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const UPVOTE_NOTIFIED = 'quick_qa_upvote_notified_ids';

	/**
	 * WordPress option key that stores question IDs whose unanswered
	 * reminder has already been sent (prevents repeated daily alerts).
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const REMINDER_NOTIFIED = 'quick_qa_reminder_notified_ids';

	/**
	 * WordPress option key that stores question IDs whose review invitation
	 * has already been sent (prevents repeated invitations).
	 *
	 * @since 1.2.0
	 * @var   string
	 */
	const REVIEW_INVITE_NOTIFIED = 'quick_qa_review_invite_notified_ids';

	// =========================================================================
	// Cron management
	// =========================================================================

	/**
	 * Ensure the cron events are scheduled if they should be.
	 *
	 * Called on WordPress 'init' every request. Only schedules an event when it
	 * is not already in the queue; clears an event when the matching feature is
	 * disabled. Cheap: uses wp_next_scheduled() which reads the cached option.
	 *
	 * @since 1.0.0
	 */
	public static function ensure_crons() {
		$s = self::settings();

		// Daily digest cron — only when mode is 'digest' and new-question notify is on.
		$need_digest = ! empty( $s['notify_new_question'] ) && 'digest' === $s['notify_mode'];
		if ( $need_digest && ! wp_next_scheduled( self::DIGEST_HOOK ) ) {
			wp_schedule_event( self::next_utc_occurrence( $s['digest_time'] ), 'daily', self::DIGEST_HOOK );
		} elseif ( ! $need_digest ) {
			wp_clear_scheduled_hook( self::DIGEST_HOOK );
		}

		// Unanswered-reminder cron — daily at midnight site time.
		$need_reminder = ! empty( $s['notify_unanswered_reminder'] );
		if ( $need_reminder && ! wp_next_scheduled( self::REMINDER_HOOK ) ) {
			wp_schedule_event( self::next_utc_occurrence( '00:00' ), 'daily', self::REMINDER_HOOK );
		} elseif ( ! $need_reminder ) {
			wp_clear_scheduled_hook( self::REMINDER_HOOK );
		}

		// Review-invitation cron — gated on the email-templates store, not
		// quick_qa_settings, since its enabled state lives there now.
		$need_review_invite = class_exists( 'Quick_Qa_Email_Store' ) && Quick_Qa_Email_Store::is_enabled( 'e-review-invitation' );
		if ( $need_review_invite && ! wp_next_scheduled( self::REVIEW_INVITE_HOOK ) ) {
			wp_schedule_event( self::next_utc_occurrence( '00:00' ), 'daily', self::REVIEW_INVITE_HOOK );
		} elseif ( ! $need_review_invite ) {
			wp_clear_scheduled_hook( self::REVIEW_INVITE_HOOK );
		}
	}

	/**
	 * Unconditionally clear and reschedule the cron events.
	 *
	 * Called after notification settings are saved so timing and on/off state
	 * are immediately applied without waiting for the next page load.
	 *
	 * @since 1.0.0
	 */
	public static function schedule_crons() {
		$s = self::settings( true ); // bust the static cache to read fresh settings

		wp_clear_scheduled_hook( self::DIGEST_HOOK );
		if ( ! empty( $s['notify_new_question'] ) && 'digest' === $s['notify_mode'] ) {
			wp_schedule_event( self::next_utc_occurrence( $s['digest_time'] ), 'daily', self::DIGEST_HOOK );
		}

		wp_clear_scheduled_hook( self::REMINDER_HOOK );
		if ( ! empty( $s['notify_unanswered_reminder'] ) ) {
			wp_schedule_event( self::next_utc_occurrence( '00:00' ), 'daily', self::REMINDER_HOOK );
		}

		wp_clear_scheduled_hook( self::REVIEW_INVITE_HOOK );
		if ( class_exists( 'Quick_Qa_Email_Store' ) && Quick_Qa_Email_Store::is_enabled( 'e-review-invitation' ) ) {
			wp_schedule_event( self::next_utc_occurrence( '00:00' ), 'daily', self::REVIEW_INVITE_HOOK );
		}
	}

	/**
	 * Clear all cron events — called on plugin deactivation.
	 *
	 * @since 1.0.0
	 */
	public static function clear_crons() {
		wp_clear_scheduled_hook( self::DIGEST_HOOK );
		wp_clear_scheduled_hook( self::REMINDER_HOOK );
		wp_clear_scheduled_hook( self::REVIEW_INVITE_HOOK );
	}

	// =========================================================================
	// Triggers (called from REST controllers)
	// =========================================================================

	/**
	 * Fire a "new question" notification.
	 *
	 * In instant mode the email is sent immediately. In digest mode the question
	 * details are queued and sent by the daily digest cron.
	 *
	 * @since 1.0.0
	 * @param int    $question_id  Newly inserted question row ID.
	 * @param int    $product_id   WooCommerce product ID.
	 * @param string $question_text Question body.
	 * @param string $asker_name   Display name of the person who asked.
	 */
	public static function new_question( $question_id, $product_id, $question_text, $asker_name ) {
		$s = self::settings();
		if ( empty( $s['notify_new_question'] ) ) {
			return;
		}

		$product_name = self::product_name( $product_id );

		if ( 'digest' === $s['notify_mode'] ) {
			$queue   = get_option( self::DIGEST_QUEUE, array() );
			$queue[] = array(
				'product_name'  => $product_name,
				'asker_name'    => $asker_name,
				'question_text' => $question_text,
			);
			update_option( self::DIGEST_QUEUE, $queue, false );
			return;
		}

		// Instant notification: email via the "New question" template, Slack
		// via the plain-text webhook post (unaffected by template editing).
		Quick_Qa_Emails::send( 'e-new-question', array(
			'question_id'   => $question_id,
			'product_id'    => $product_id,
			'question_text' => $question_text,
			'asker_name'    => $asker_name,
		) );

		$subject = sprintf(
			/* translators: %s: first few words of the question */
			__( '[New Question] %s', 'quick-qa-for-woocommerce' ),
			wp_trim_words( $question_text, 8, '…' )
		);
		$body = self::lines( array(
			/* translators: %s: product name */
			sprintf( __( 'A customer asked a question on: %s', 'quick-qa-for-woocommerce' ), $product_name ),
			/* translators: %s: customer display name */
			sprintf( __( 'Asked by: %s', 'quick-qa-for-woocommerce' ), $asker_name ),
			'',
			__( 'Question:', 'quick-qa-for-woocommerce' ),
			$question_text,
			'',
			/* translators: %s: direct admin URL to answer this question */
			sprintf( __( 'Answer now: %s', 'quick-qa-for-woocommerce' ), admin_url( 'admin.php?page=quick-qa&qid=' . $question_id ) ),
		) );
		self::send_slack( $s, $subject, $body );
	}

	/**
	 * Fire a "community answer pending review" notification.
	 *
	 * Only triggered for non-admin community answers (status = pending).
	 *
	 * @since 1.0.0
	 * @param int    $question_id     DB row ID of the parent question.
	 * @param int    $product_id      WooCommerce product ID.
	 * @param string $question_text   Question body for context.
	 * @param string $answer_text     The submitted answer.
	 * @param string $responder_name  Display name of the community member.
	 * @param string $responder_role  e.g. 'Verified buyer' or 'Community member'.
	 */
	public static function community_answer( $question_id, $product_id, $question_text, $answer_text, $responder_name, $responder_role = '' ) {
		$s = self::settings();
		if ( empty( $s['notify_community_answer'] ) ) {
			return;
		}

		Quick_Qa_Emails::send( 'e-community-pending', array(
			'question_id'    => $question_id,
			'product_id'     => $product_id,
			'question_text'  => $question_text,
			'answer_text'    => $answer_text,
			'responder_name' => $responder_name,
			'responder_role' => $responder_role ?: __( 'Community member', 'quick-qa-for-woocommerce' ),
		) );

		$subject = __( '[Community Answer] Review required', 'quick-qa-for-woocommerce' );
		$body    = self::lines( array(
			__( 'A community member submitted an answer that needs your review.', 'quick-qa-for-woocommerce' ),
			'',
			__( 'Question:', 'quick-qa-for-woocommerce' ),
			$question_text,
			'',
			/* translators: %s: community member's display name */
			sprintf( __( 'Answer by %s:', 'quick-qa-for-woocommerce' ), $responder_name ),
			$answer_text,
			'',
			/* translators: %s: admin dashboard URL */
			sprintf( __( 'Review in your dashboard: %s', 'quick-qa-for-woocommerce' ), admin_url( 'admin.php?page=quick-qa' ) ),
		) );
		self::send_slack( $s, $subject, $body );
	}

	/**
	 * Check whether a question just hit the configured upvote threshold
	 * and send a priority notification if so.
	 *
	 * Fires only once per question (tracked in a WP option).
	 *
	 * @since 1.0.0
	 * @param int $question_id DB row ID of the question.
	 * @param int $new_count   Updated upvote count after this vote.
	 */
	public static function check_upvote_threshold( $question_id, $new_count ) {
		$s = self::settings();
		if ( empty( $s['notify_upvote_threshold'] ) ) {
			return;
		}

		$threshold = max( 1, (int) $s['upvote_threshold_value'] );
		if ( $new_count !== $threshold ) {
			return; // Only fire at the exact threshold, not every vote above it.
		}

		// Prevent duplicate notifications for the same question.
		$notified = get_option( self::UPVOTE_NOTIFIED, array() );
		if ( in_array( (int) $question_id, $notified, true ) ) {
			return;
		}
		$notified[] = (int) $question_id;
		update_option( self::UPVOTE_NOTIFIED, $notified, false );

		global $wpdb;
		$t = $wpdb->prefix . 'quick_qa_questions';
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$question = $wpdb->get_row(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT product_id, question_text FROM {$t} WHERE id = %d",
				$question_id
			)
		);
		if ( ! $question ) {
			return;
		}

		Quick_Qa_Emails::send( 'e-upvote-threshold', array(
			'question_id'   => $question_id,
			'product_id'    => $question->product_id,
			'question_text' => $question->question_text,
			'upvote_count'  => $new_count,
		) );

		$product_name = self::product_name( $question->product_id );
		$subject      = sprintf(
			/* translators: %d: upvote count that triggered the alert */
			__( '[Priority Question] %d upvotes — needs your answer', 'quick-qa-for-woocommerce' ),
			$new_count
		);
		$body = self::lines( array(
			sprintf(
				/* translators: %d: number of upvotes */
				__( 'A question has reached %d upvotes and is a customer priority.', 'quick-qa-for-woocommerce' ),
				$new_count
			),
			/* translators: %s: product name */
			sprintf( __( 'Product: %s', 'quick-qa-for-woocommerce' ), $product_name ),
			'',
			__( 'Question:', 'quick-qa-for-woocommerce' ),
			$question->question_text,
			'',
			/* translators: %s: admin dashboard URL */
			sprintf( __( 'Answer in your dashboard: %s', 'quick-qa-for-woocommerce' ), admin_url( 'admin.php?page=quick-qa' ) ),
		) );
		self::send_slack( $s, $subject, $body );
	}

	/**
	 * Fire a "content auto-hidden by flags" notification.
	 *
	 * Called once, at the exact moment an object's flag count crosses the
	 * configured auto-hide threshold (mirrors the exact-match guard used by
	 * check_upvote_threshold() so the alert fires only once per object).
	 *
	 * @since 1.2.0
	 * @param string $object_type 'question' or 'answer'.
	 * @param int    $object_id   DB row ID of the flagged object.
	 * @param int    $flag_count  Flag count at the moment the threshold was crossed.
	 * @param string $reason      Reason selected on the flag that crossed the threshold.
	 * @global wpdb $wpdb
	 */
	public static function flagged( $object_type, $object_id, $flag_count, $reason ) {
		$s = self::settings();
		if ( empty( $s['notify_flag_threshold'] ) ) {
			return;
		}

		global $wpdb;

		if ( 'answer' === $object_type ) {
			$answers_table   = $wpdb->prefix . 'quick_qa_answers';
			$questions_table = $wpdb->prefix . 'quick_qa_questions';

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$row = $wpdb->get_row(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"SELECT a.answer_text AS content_text, q.product_id
					 FROM {$answers_table} a
					 INNER JOIN {$questions_table} q ON q.id = a.question_id
					 WHERE a.id = %d",
					$object_id
				)
			);
			$content_label = __( 'Answer:', 'quick-qa-for-woocommerce' );
		} else {
			$questions_table = $wpdb->prefix . 'quick_qa_questions';

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$row = $wpdb->get_row(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"SELECT question_text AS content_text, product_id FROM {$questions_table} WHERE id = %d",
					$object_id
				)
			);
			$content_label = __( 'Question:', 'quick-qa-for-woocommerce' );
		}

		if ( ! $row ) {
			return;
		}

		$product_name = self::product_name( $row->product_id );
		$subject      = sprintf(
			/* translators: %d: flag count that triggered auto-hide */
			__( '[Auto-hidden] Content hidden after %d flags', 'quick-qa-for-woocommerce' ),
			$flag_count
		);
		$body = self::lines( array(
			sprintf(
				/* translators: %d: number of flags */
				__( 'Content was automatically hidden after receiving %d flags and needs your review.', 'quick-qa-for-woocommerce' ),
				$flag_count
			),
			/* translators: %s: product name */
			sprintf( __( 'Product: %s', 'quick-qa-for-woocommerce' ), $product_name ),
			/* translators: %s: reason selected on the flag that crossed the threshold */
			sprintf( __( 'Latest flag reason: %s', 'quick-qa-for-woocommerce' ), $reason ),
			'',
			$content_label,
			$row->content_text,
			'',
			/* translators: %s: admin dashboard URL */
			sprintf( __( 'Review in your dashboard: %s', 'quick-qa-for-woocommerce' ), admin_url( 'admin.php?page=quick-qa' ) ),
		) );

		self::send_email( $s, $subject, $body );
		self::send_slack( $s, $subject, $body );
	}

	// =========================================================================
	// Cron callbacks
	// =========================================================================

	/**
	 * WP Cron callback: send the daily digest of queued new questions.
	 *
	 * Clears the queue before sending to avoid sending duplicates if the hook
	 * fires unexpectedly more than once.
	 *
	 * @since 1.0.0
	 */
	public static function send_digest() {
		$queue = get_option( self::DIGEST_QUEUE, array() );
		if ( empty( $queue ) ) {
			return;
		}
		delete_option( self::DIGEST_QUEUE );

		$s     = self::settings();
		$count = count( $queue );

		global $wpdb;
		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$answers_table   = $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		$pending_answers_count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$answers_table} WHERE status = 'pending'" );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		$flagged_count = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$questions_table} WHERE status = 'flagged'" )
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
			+ (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$answers_table} WHERE status = 'flagged'" );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.PreparedSQL.NotPrepared
		$top_question = $wpdb->get_row(
			"SELECT q.product_id, q.question_text, q.upvotes
			 FROM {$questions_table} q
			 LEFT JOIN {$answers_table} a ON a.question_id = q.id AND a.status = 'approved'
			 WHERE q.status = 'approved' AND a.id IS NULL
			 ORDER BY q.upvotes DESC, q.created_at ASC
			 LIMIT 1"
		);

		Quick_Qa_Emails::send( 'e-daily-digest', array(
			'new_questions_count'   => $count,
			'pending_answers_count' => $pending_answers_count,
			'flagged_count'         => $flagged_count,
			'top_question_text'     => $top_question ? $top_question->question_text : '',
			'top_question_upvotes'  => $top_question ? (int) $top_question->upvotes : 0,
			'top_question_product'  => $top_question ? self::product_name( $top_question->product_id ) : '',
		) );

		$subject = sprintf(
			/* translators: %d: total new questions in this digest */
			_n(
				'[Daily Digest] %d new question awaiting your response',
				'[Daily Digest] %d new questions awaiting your response',
				$count,
				'quick-qa-for-woocommerce'
			),
			$count
		);

		$lines = array(
			sprintf(
				/* translators: %d: number of new questions pending a response */
				_n(
					'You have %d new question awaiting your response:',
					'You have %d new questions awaiting your response:',
					$count,
					'quick-qa-for-woocommerce'
				),
				$count
			),
			'',
		);
		foreach ( $queue as $q ) {
			$lines[] = sprintf( '• %s  (%s)', $q['product_name'], $q['asker_name'] );
			$lines[] = '  ' . $q['question_text'];
			$lines[] = '';
		}
		$lines[] = admin_url( 'admin.php?page=quick-qa' );

		$body = self::lines( $lines );

		self::send_slack( $s, $subject, $body );
	}

	/**
	 * WP Cron callback: send a reminder about unanswered questions.
	 *
	 * Finds approved questions with no approved answers older than
	 * `unanswered_reminder_days`, fires one "Unanswered reminder" email per
	 * question (each guarded to send exactly once via REMINDER_NOTIFIED),
	 * and posts one consolidated Slack summary.
	 *
	 * @since 1.0.0
	 * @global wpdb $wpdb
	 */
	public static function send_unanswered_reminder() {
		global $wpdb;

		$s    = self::settings();
		$days = max( 1, (int) $s['unanswered_reminder_days'] );

		$cutoff          = gmdate( 'Y-m-d H:i:s', strtotime( "-{$days} days" ) );
		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$answers_table   = $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$unanswered = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT q.id, q.product_id, q.question_text, q.created_at, q.user_id, q.guest_name, q.guest_email
				 FROM {$questions_table} q
				 LEFT JOIN {$answers_table} a
				   ON a.question_id = q.id AND a.status = 'approved'
				 WHERE q.status = 'approved'
				   AND q.created_at <= %s
				   AND a.id IS NULL
				 ORDER BY q.created_at ASC
				 LIMIT 20",
				$cutoff
			)
		);

		if ( empty( $unanswered ) ) {
			return;
		}

		// Skip questions we've already reminded about, so each one only
		// triggers a single reminder instead of firing again every day.
		$notified   = get_option( self::REMINDER_NOTIFIED, array() );
		$unanswered = array_values(
			array_filter(
				$unanswered,
				function ( $q ) use ( $notified ) {
					return ! in_array( (int) $q->id, $notified, true );
				}
			)
		);

		if ( empty( $unanswered ) ) {
			return;
		}

		$count   = count( $unanswered );
		$subject = sprintf(
			/* translators: 1: question count, 2: days threshold */
			_n(
				'[Reminder] %1$d question unanswered for %2$d+ days',
				'[Reminder] %1$d questions unanswered for %2$d+ days',
				$count,
				'quick-qa-for-woocommerce'
			),
			$count,
			$days
		);

		$lines = array(
			sprintf(
				/* translators: %d: number of days since the question was submitted */
				_n(
					'The following question has been unanswered for more than %d day:',
					'The following questions have been unanswered for more than %d days:',
					$days,
					'quick-qa-for-woocommerce'
				),
				$days
			),
			'',
		);
		foreach ( $unanswered as $q ) {
			$product_name = self::product_name( $q->product_id );
			$age          = human_time_diff( strtotime( $q->created_at ) );
			$lines[]      = sprintf( '• %s  (%s)', $product_name, $age );
			$lines[]      = '  ' . $q->question_text;
			$lines[]      = '';

			$asker        = self::resolve_asker( $q );
			$days_waiting = (int) floor( ( time() - strtotime( $q->created_at ) ) / DAY_IN_SECONDS );
			Quick_Qa_Emails::send( 'e-unanswered-reminder', array(
				'question_id'   => $q->id,
				'product_id'    => $q->product_id,
				'question_text' => $q->question_text,
				'customer_name' => $asker['name'],
				'days_waiting'  => $days_waiting,
			) );
		}
		$lines[] = admin_url( 'admin.php?page=quick-qa' );

		$body = self::lines( $lines );

		self::send_slack( $s, $subject, $body );

		foreach ( $unanswered as $q ) {
			$notified[] = (int) $q->id;
		}
		update_option( self::REMINDER_NOTIFIED, $notified, false );
	}

	/**
	 * WP Cron callback: invite askers to review the product a few days
	 * after their question was answered. Fires exactly once per question
	 * (tracked in a WP option, same pattern as the other dedup guards here).
	 *
	 * @since 1.2.0
	 * @global wpdb $wpdb
	 */
	public static function send_review_invitations() {
		if ( ! class_exists( 'Quick_Qa_Email_Store' ) || ! Quick_Qa_Email_Store::is_enabled( 'e-review-invitation' ) ) {
			return;
		}

		global $wpdb;
		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$answers_table   = $wpdb->prefix . 'quick_qa_answers';

		$cutoff = gmdate( 'Y-m-d H:i:s', strtotime( '-' . self::REVIEW_INVITE_DELAY_DAYS . ' days' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$answered = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT q.id, q.product_id, q.question_text, q.user_id, q.guest_name, q.guest_email,
				        MIN(a.created_at) AS first_answered_at
				 FROM {$questions_table} q
				 INNER JOIN {$answers_table} a ON a.question_id = q.id AND a.status = 'approved'
				 WHERE q.status = 'approved'
				 GROUP BY q.id
				 HAVING first_answered_at <= %s
				 ORDER BY first_answered_at ASC
				 LIMIT 20",
				$cutoff
			)
		);

		if ( empty( $answered ) ) {
			return;
		}

		$notified = get_option( self::REVIEW_INVITE_NOTIFIED, array() );
		$answered = array_values(
			array_filter(
				$answered,
				function ( $q ) use ( $notified ) {
					return ! in_array( (int) $q->id, $notified, true );
				}
			)
		);

		foreach ( $answered as $q ) {
			$asker = self::resolve_asker( $q );

			if ( ! empty( $asker['email'] ) ) {
				Quick_Qa_Emails::send( 'e-review-invitation', array(
					'product_id'     => $q->product_id,
					'question_text'  => $q->question_text,
					'customer_name'  => $asker['name'],
					'customer_email' => $asker['email'],
				) );
			}

			// Mark as handled even without a resolvable email so we don't
			// keep re-querying this question on every future cron run.
			$notified[] = (int) $q->id;
		}

		update_option( self::REVIEW_INVITE_NOTIFIED, $notified, false );
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	/**
	 * Load notification-relevant settings with defaults.
	 *
	 * Uses a static cache so the option is only read once per request.
	 *
	 * @since  1.0.0
	 * @param  bool $bust_cache When true, forces a fresh read (after settings save).
	 * @return array<string, mixed>
	 */
	private static function settings( $bust_cache = false ) {
		static $cache = null;
		if ( ! $bust_cache && null !== $cache ) {
			return $cache;
		}

		$defaults = array(
			'notify_new_question'        => true,
			'new_question_recipients'    => '',
			'notify_mode'                => 'instant',
			'digest_time'                => '09:00',
			'notify_community_answer'    => true,
			'notify_upvote_threshold'    => true,
			'upvote_threshold_value'     => 5,
			'notify_unanswered_reminder' => true,
			'unanswered_reminder_days'   => 3,
			'notify_flag_threshold'      => true,
			'slack_webhook'              => '',
		);

		$saved = get_option( 'quick_qa_settings', array() );
		$cache = array_merge( $defaults, is_array( $saved ) ? $saved : array() );

		return $cache;
	}

	/**
	 * Resolve a question's asker display name + email from its row.
	 *
	 * Shared by the reminder/review-invitation cron callbacks and (via
	 * public visibility) the REST controllers that fire the customer-facing
	 * "question answered" / "rejected" / "community answer approved" emails.
	 *
	 * @since  1.2.0
	 * @param  object $question  Row with at least user_id, guest_name, guest_email.
	 * @return array{name:string,email:string}
	 */
	public static function resolve_asker( $question ) {
		if ( (int) $question->user_id > 0 ) {
			$user = get_userdata( (int) $question->user_id );
			return array(
				'name'  => $user ? $user->display_name : __( 'Customer', 'quick-qa-for-woocommerce' ),
				'email' => $user ? $user->user_email : '',
			);
		}

		return array(
			'name'  => $question->guest_name ?: __( 'Guest', 'quick-qa-for-woocommerce' ),
			'email' => $question->guest_email ?: '',
		);
	}

	/**
	 * Resolve a WooCommerce product name from its ID.
	 *
	 * @since  1.0.0
	 * @param  int $product_id
	 * @return string
	 */
	private static function product_name( $product_id ) {
		$product = function_exists( 'wc_get_product' ) ? wc_get_product( (int) $product_id ) : null;
		if ( $product ) {
			return $product->get_name();
		}
		return sprintf(
			/* translators: %d: product ID */
			__( 'Product #%d', 'quick-qa-for-woocommerce' ),
			(int) $product_id
		);
	}

	/**
	 * Deliver an email to the configured recipients.
	 *
	 * Falls back to the site admin email when `new_question_recipients` is empty.
	 * The site name is prepended to the subject so the email is identifiable in
	 * a shared inbox.
	 *
	 * @since  1.0.0
	 * @param  array  $s       Plugin settings array.
	 * @param  string $subject Email subject (without site name prefix).
	 * @param  string $body    Plain-text email body.
	 */
	private static function send_email( $s, $subject, $body ) {
		$recipients = self::admin_recipients( $s );
		if ( empty( $recipients ) ) {
			return;
		}

		$blog_name = get_bloginfo( 'name' );
		$subject   = $blog_name ? "[{$blog_name}] {$subject}" : $subject;

		wp_mail( $recipients, $subject, $body );
	}

	/**
	 * Resolve the configured admin recipient list, falling back to the site
	 * admin email when `new_question_recipients` is empty.
	 *
	 * Public so the Quick_Qa_Email_* (WC_Email) subclasses can reuse the same
	 * resolution logic for the admin-facing templates.
	 *
	 * @since  1.2.0
	 * @param  array|null $s  Plugin settings array; loaded fresh when omitted.
	 * @return string[]
	 */
	public static function admin_recipients( $s = null ) {
		$s   = $s ?? self::settings();
		$raw = trim( $s['new_question_recipients'] ?? '' );

		if ( ! empty( $raw ) ) {
			$recipients = array_filter(
				array_map( 'sanitize_email', array_map( 'trim', explode( "\n", $raw ) ) ),
				'is_email'
			);
		} else {
			$recipients = array( get_option( 'admin_email' ) );
		}

		return array_values( array_filter( $recipients ) );
	}

	/**
	 * Post a message to the configured Slack incoming webhook.
	 *
	 * Non-blocking: the request is fired and forgotten. Failures are silent so
	 * a misconfigured webhook never breaks the customer's submission flow.
	 *
	 * @since  1.0.0
	 * @param  array  $s       Plugin settings array.
	 * @param  string $subject Alert title (bold in Slack mrkdwn).
	 * @param  string $body    Plain-text body appended after the title.
	 */
	private static function send_slack( $s, $subject, $body ) {
		$webhook = trim( $s['slack_webhook'] ?? '' );
		if ( empty( $webhook ) ) {
			return;
		}

		wp_remote_post(
			$webhook,
			array(
				'headers'  => array( 'Content-Type' => 'application/json' ),
				'body'     => wp_json_encode( array( 'text' => "*{$subject}*\n{$body}" ) ),
				'blocking' => false,
				'timeout'  => 5,
			)
		);
	}

	/**
	 * Join an array of strings into a single newline-delimited string.
	 *
	 * @since  1.0.0
	 * @param  string[] $lines
	 * @return string
	 */
	private static function lines( array $lines ) {
		return implode( "\n", $lines );
	}

	/**
	 * Calculate the next UTC Unix timestamp for a given HH:MM in site local time.
	 *
	 * If today's occurrence has already passed, the returned timestamp is for
	 * the same time tomorrow.
	 *
	 * @since  1.0.0
	 * @param  string $time_str 'HH:MM' string in site local time.
	 * @return int  UTC Unix timestamp.
	 */
	private static function next_utc_occurrence( $time_str ) {
		$parts = array_map( 'intval', explode( ':', (string) $time_str . ':00' ) );
		$h     = max( 0, min( 23, $parts[0] ) );
		$m     = max( 0, min( 59, $parts[1] ) );

		$tz     = wp_timezone();
		$now    = new DateTime( 'now', $tz );
		$target = new DateTime( sprintf( 'today %02d:%02d:00', $h, $m ), $tz );

		if ( $target <= $now ) {
			$target->modify( '+1 day' );
		}

		return $target->getTimestamp();
	}
}
