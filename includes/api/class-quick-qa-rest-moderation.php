<?php
/**
 * Moderation REST API controller (votes, flags, admin dismiss-flags).
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Handles all REST routes related to content moderation:
 *
 *   Admin routes
 *     POST /admin/questions/{id}/dismiss-flags — restore flagged question to approved
 *
 *   Public routes (login required)
 *     POST /flags  — flag a question or answer for review
 *     POST /votes  — toggle an upvote on a question or answer
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Rest_Moderation extends Quick_Qa_Rest_Controller {

	/**
	 * Register all moderation routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {

		// ── Admin: dismiss flags and restore question ──────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/questions/(?P<id>\d+)/dismiss-flags',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_dismiss_flags' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'id' => array( 'required' => true, 'type' => 'integer', 'minimum' => 1, 'sanitize_callback' => 'absint' ),
				),
			)
		);

		// ── Public: flag a question or answer ──────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/flags',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'submit_flag' ),
				'permission_callback' => array( $this, 'require_login' ),
				'args'                => array(
					'object_type' => array(
						'required'          => true,
						'type'              => 'string',
						'enum'              => array( 'question', 'answer' ),
						'sanitize_callback' => 'sanitize_key',
					),
					'object_id'   => array(
						'required'          => true,
						'type'              => 'integer',
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
					),
					'reason'      => array(
						'required'          => false,
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					),
				),
			)
		);

		// ── Public: toggle an upvote ───────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/votes',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'submit_vote' ),
				'permission_callback' => array( $this, 'require_login' ),
				'args'                => array(
					'object_type' => array(
						'required'          => true,
						'type'              => 'string',
						'enum'              => array( 'question', 'answer' ),
						'sanitize_callback' => 'sanitize_key',
						/* translators: REST API parameter description. */
						'description'       => __( 'What is being voted on.', 'quick-qa-for-woocommerce' ),
					),
					'object_id'   => array(
						'required'          => true,
						'type'              => 'integer',
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
						/* translators: REST API parameter description. */
						'description'       => __( 'ID of the question or answer.', 'quick-qa-for-woocommerce' ),
					),
				),
			)
		);
	}

	// =========================================================================
	// Admin callbacks
	// =========================================================================

	/**
	 * POST /wp-json/quick-qa/v1/admin/questions/{id}/dismiss-flags
	 *
	 * Restores a flagged question to 'approved' and deletes its flag records.
	 *
	 * @since  1.1.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function admin_dismiss_flags( WP_REST_Request $request ) {
		global $wpdb;

		$id              = (int) $request->get_param( 'id' );
		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$flags_table     = $wpdb->prefix . 'quick_qa_flags';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->update(
			$questions_table,
			array(
				'status'     => 'approved',
				'updated_at' => current_time( 'mysql', true ),
			),
			array( 'id' => $id ),
			array( '%s', '%s' ),
			array( '%d' )
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->delete(
			$flags_table,
			array(
				'object_type' => 'question',
				'object_id'   => $id,
			),
			array( '%s', '%d' )
		);

		return rest_ensure_response( array( 'id' => $id, 'status' => 'approved' ) );
	}

	// =========================================================================
	// Public callbacks
	// =========================================================================

	/**
	 * POST /wp-json/quick-qa/v1/flags
	 *
	 * Records a flag from the current user. Duplicate flags (same user, same
	 * item) are silently accepted so the "Thanks" confirmation always shows.
	 * When an item accumulates FLAG_THRESHOLD flags its status is changed to
	 * 'flagged', removing it from the approved thread list.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function submit_flag( WP_REST_Request $request ) {
		global $wpdb;

		$flag_threshold = 3;

		$user_id     = get_current_user_id();
		$object_type = $request->get_param( 'object_type' );
		$object_id   = $request->get_param( 'object_id' );
		$reason      = $request->get_param( 'reason' );

		$obj_table = 'question' === $object_type
			? $wpdb->prefix . 'quick_qa_questions'
			: $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$exists = $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id FROM {$obj_table} WHERE id = %d AND status = 'approved'",
				$object_id
			)
		);

		if ( ! $exists ) {
			return new WP_Error(
				'quick_qa_not_found',
				__( 'The item you are trying to flag does not exist.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		$flags_table = $wpdb->prefix . 'quick_qa_flags';

		// INSERT IGNORE rejects duplicates silently (UNIQUE KEY on table).
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->query(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"INSERT IGNORE INTO {$flags_table} (object_type, object_id, user_id, reason, created_at)
				 VALUES (%s, %d, %d, %s, %s)",
				$object_type,
				$object_id,
				$user_id,
				$reason,
				current_time( 'mysql', true )
			)
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$flag_count = (int) $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT COUNT(*) FROM {$flags_table} WHERE object_type = %s AND object_id = %d",
				$object_type,
				$object_id
			)
		);

		if ( $flag_count >= $flag_threshold ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->update(
				$obj_table,
				array(
					'status'     => 'flagged',
					'updated_at' => current_time( 'mysql', true ),
				),
				array( 'id' => $object_id ),
				array( '%s', '%s' ),
				array( '%d' )
			);
		}

		return rest_ensure_response(
			array(
				'flagged'     => true,
				'flag_count'  => $flag_count,
				'auto_hidden' => $flag_count >= $flag_threshold,
			)
		);
	}

	/**
	 * POST /wp-json/quick-qa/v1/votes
	 *
	 * Toggles a vote: if the user has already voted on this object the vote
	 * is removed (un-vote); otherwise a new vote is recorded.
	 * The `upvotes` counter on the parent table is kept in sync atomically.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function submit_vote( WP_REST_Request $request ) {
		global $wpdb;

		$user_id     = get_current_user_id();
		$object_type = $request->get_param( 'object_type' );
		$object_id   = $request->get_param( 'object_id' );

		$obj_table = 'question' === $object_type
			? $wpdb->prefix . 'quick_qa_questions'
			: $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$exists = $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id FROM {$obj_table} WHERE id = %d AND status = 'approved'",
				$object_id
			)
		);

		if ( ! $exists ) {
			return new WP_Error(
				'quick_qa_not_found',
				__( 'The item you are trying to vote on does not exist.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		$votes_table = $wpdb->prefix . 'quick_qa_votes';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$existing_vote_id = $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id FROM {$votes_table} WHERE object_type = %s AND object_id = %d AND user_id = %d",
				$object_type,
				$object_id,
				$user_id
			)
		);

		if ( $existing_vote_id ) {
			// Un-vote: remove the record and decrement the counter.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->delete(
				$votes_table,
				array( 'id' => (int) $existing_vote_id ),
				array( '%d' )
			);
			$this->adjust_upvotes( $obj_table, $object_id, -1 );
			$voted = false;
		} else {
			// Vote: insert a new record and increment the counter.
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->insert(
				$votes_table,
				array(
					'object_type' => $object_type,
					'object_id'   => $object_id,
					'user_id'     => $user_id,
					'created_at'  => current_time( 'mysql', true ),
				),
				array( '%s', '%d', '%d', '%s' )
			);
			$this->adjust_upvotes( $obj_table, $object_id, 1 );
			$voted = true;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$count = (int) $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT upvotes FROM {$obj_table} WHERE id = %d",
				$object_id
			)
		);

		return rest_ensure_response(
			array(
				'voted' => $voted,
				'count' => $count,
			)
		);
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	/**
	 * Increment or decrement the `upvotes` column on a question or answer row.
	 *
	 * GREATEST(0, upvotes - 1) prevents the counter going negative if rows
	 * are deleted or counts drift due to concurrent requests.
	 *
	 * @since  1.0.0
	 * @param  string $table     Full prefixed table name.
	 * @param  int    $object_id Row to update.
	 * @param  int    $delta     +1 to increment, -1 to decrement.
	 * @global wpdb $wpdb
	 */
	private function adjust_upvotes( $table, $object_id, $delta ) {
		global $wpdb;

		if ( $delta > 0 ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->query(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"UPDATE {$table} SET upvotes = upvotes + 1 WHERE id = %d",
					$object_id
				)
			);
		} else {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->query(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"UPDATE {$table} SET upvotes = GREATEST( 0, upvotes - 1 ) WHERE id = %d",
					$object_id
				)
			);
		}
	}
}
