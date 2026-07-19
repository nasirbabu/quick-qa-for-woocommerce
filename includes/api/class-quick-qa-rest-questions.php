<?php
/**
 * Questions and answers REST API controller.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Handles all REST routes related to questions and answers:
 *
 *   Admin routes
 *     GET  /admin/questions
 *     POST /admin/questions/{id}
 *     POST /admin/questions/{id}/answer
 *     POST /admin/questions/{id}/delete
 *     POST /admin/answers/{id}
 *
 *   Public routes
 *     GET  /questions           — paginated approved-question list (frontend "Show more")
 *     POST /questions           — customer submits a new question
 *     POST /answers             — logged-in user submits a community answer
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Rest_Questions extends Quick_Qa_Rest_Controller {

	/**
	 * Register all question and answer routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {

		// ── Admin: list all questions ──────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/questions',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'admin_get_questions' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);

		// ── Admin: update question status ──────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/questions/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_update_question' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'id'     => array( 'required' => true, 'type' => 'integer', 'minimum' => 1, 'sanitize_callback' => 'absint' ),
					'status' => array( 'required' => true, 'type' => 'string', 'enum' => array( 'approved', 'rejected', 'pending' ) ),
				),
			)
		);

		// ── Admin: publish an admin-written answer (auto-approves question) ────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/questions/(?P<id>\d+)/answer',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_publish_answer' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'id'          => array( 'required' => true, 'type' => 'integer', 'minimum' => 1, 'sanitize_callback' => 'absint' ),
					'answer_text' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
						'validate_callback' => static function ( $value ) {
							$len = mb_strlen( trim( $value ) );
							return $len >= 1 && $len <= 5000;
						},
					),
				),
			)
		);

		// ── Admin: update answer status ────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/answers/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_update_answer' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'id'     => array( 'required' => true, 'type' => 'integer', 'minimum' => 1, 'sanitize_callback' => 'absint' ),
					'status' => array( 'required' => true, 'type' => 'string', 'enum' => array( 'approved', 'rejected', 'pending' ) ),
				),
			)
		);

		// ── Admin: hard-delete a question ──────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/questions/(?P<id>\d+)/delete',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_delete_question' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'id' => array( 'required' => true, 'type' => 'integer', 'minimum' => 1, 'sanitize_callback' => 'absint' ),
				),
			)
		);

		// ── Public: paginated approved-question list ───────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/questions',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_questions_page' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'product_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
					),
					'offset'     => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 0,
						'minimum'           => 0,
						'sanitize_callback' => 'absint',
					),
					'limit'      => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 10,
						'minimum'           => 1,
						'maximum'           => 100,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		// ── Public: customer submits a question ────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/questions',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'submit_question' ),
				/**
				 * Intentionally public — guests may ask questions.
				 * CSRF protection: X-WP-Nonce header sent by JS.
				 * Flood protection: rate limiting applied inside the callback.
				 */
				'permission_callback' => '__return_true',
				'args'                => $this->get_question_args(),
			)
		);

		// ── Public: logged-in user submits a community answer ─────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/answers',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'submit_answer' ),
				'permission_callback' => array( $this, 'require_login' ),
				'args'                => array(
					'question_id' => array(
						'required'          => true,
						'type'              => 'integer',
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
						/* translators: REST API parameter description. */
						'description'       => __( 'ID of the question being answered.', 'askora-product-qa-for-woocommerce' ),
					),
					'answer_text' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_textarea_field',
						'validate_callback' => static function ( $value ) {
							$len = mb_strlen( trim( $value ) );
							return $len >= 10 && $len <= 2000;
						},
						/* translators: REST API parameter description. */
						'description'       => __( 'The answer text (10–2000 characters).', 'askora-product-qa-for-woocommerce' ),
					),
				),
			)
		);
	}

	// =========================================================================
	// Admin callbacks
	// =========================================================================

	/**
	 * GET /wp-json/quick-qa/v1/admin/questions
	 *
	 * Returns all questions (all statuses) with enriched product titles,
	 * author names, all answers, and flag records for flagged questions.
	 *
	 * @since  1.0.0
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function admin_get_questions() {
		global $wpdb;

		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$answers_table   = $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$questions = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			"SELECT * FROM {$questions_table} ORDER BY created_at DESC LIMIT 500"
		);

		if ( empty( $questions ) ) {
			return rest_ensure_response( array() );
		}

		// Enrich with product titles and author display names.
		foreach ( $questions as $q ) {
			$q->product_title = get_the_title( (int) $q->product_id ) ?: "Product #{$q->product_id}";
			if ( (int) $q->user_id > 0 ) {
				$user           = get_userdata( (int) $q->user_id );
				$q->author_name = $user ? $user->display_name : 'Customer';
			} else {
				$q->author_name = $q->guest_name ?: 'Guest';
			}
		}

		$question_ids = array_map( 'absint', wp_list_pluck( $questions, 'id' ) );
		$placeholders = implode( ', ', array_fill( 0, count( $question_ids ), '%d' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$answers = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$answers_table} WHERE question_id IN ({$placeholders}) ORDER BY created_at ASC",
				...$question_ids
			)
		);

		foreach ( $answers as $a ) {
			if ( (int) $a->user_id > 0 ) {
				$user           = get_userdata( (int) $a->user_id );
				$a->author_name = $user ? $user->display_name : 'Team';
			} else {
				$a->author_name = 'Team';
			}
		}

		$answers_map = array();
		foreach ( $answers as $a ) {
			$answers_map[ (int) $a->question_id ][] = $a;
		}

		foreach ( $questions as $q ) {
			$q->answers    = $answers_map[ (int) $q->id ] ?? array();
			$q->flag_count = 0;
			$q->flags      = array();
		}

		// Attach flag records for auto-hidden (flagged) questions.
		$flagged_q_ids = array_values( array_filter(
			$question_ids,
			function ( $id ) use ( $questions ) {
				foreach ( $questions as $q ) {
					if ( (int) $q->id === $id && $q->status === 'flagged' ) {
						return true;
					}
				}
				return false;
			}
		) );

		if ( ! empty( $flagged_q_ids ) ) {
			$flags_table = $wpdb->prefix . 'quick_qa_flags';
			$ph_f        = implode( ', ', array_fill( 0, count( $flagged_q_ids ), '%d' ) );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$flags = $wpdb->get_results(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"SELECT f.object_id, f.reason, f.created_at,
					        COALESCE(u.display_name, 'A customer') AS reporter_name
					 FROM {$flags_table} f
					 LEFT JOIN {$wpdb->users} u ON u.ID = f.user_id
					 WHERE f.object_type = 'question' AND f.object_id IN ({$ph_f})
					 ORDER BY f.created_at ASC",
					...$flagged_q_ids
				)
			);

			$flags_map = array();
			foreach ( $flags as $flag ) {
				$flags_map[ (int) $flag->object_id ][] = $flag;
			}

			foreach ( $questions as $q ) {
				if ( isset( $flags_map[ (int) $q->id ] ) ) {
					$q->flag_count = count( $flags_map[ (int) $q->id ] );
					$q->flags      = $flags_map[ (int) $q->id ];
				}
			}
		}

		return rest_ensure_response( $questions );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/questions/{id}
	 *
	 * Update question status (approved, rejected, pending).
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function admin_update_question( WP_REST_Request $request ) {
		global $wpdb;

		$id     = (int) $request->get_param( 'id' );
		$status = $request->get_param( 'status' );
		$table  = $wpdb->prefix . 'quick_qa_questions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->update(
			$table,
			array(
				'status'     => $status,
				'updated_at' => current_time( 'mysql', true ),
			),
			array( 'id' => $id ),
			array( '%s', '%s' ),
			array( '%d' )
		);

		return rest_ensure_response( array( 'id' => $id, 'status' => $status ) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/answers/{id}
	 *
	 * Update answer status (approved, rejected, pending).
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function admin_update_answer( WP_REST_Request $request ) {
		global $wpdb;

		$id     = (int) $request->get_param( 'id' );
		$status = $request->get_param( 'status' );
		$table  = $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->update(
			$table,
			array(
				'status'     => $status,
				'updated_at' => current_time( 'mysql', true ),
			),
			array( 'id' => $id ),
			array( '%s', '%s' ),
			array( '%d' )
		);

		return rest_ensure_response( array( 'id' => $id, 'status' => $status ) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/questions/{id}/answer
	 *
	 * Publishes an admin-written answer. Automatically approves the question
	 * if it is still pending, then inserts the answer as approved/admin type.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function admin_publish_answer( WP_REST_Request $request ) {
		global $wpdb;

		$question_id     = (int) $request->get_param( 'id' );
		$answer_text     = $request->get_param( 'answer_text' );
		$user_id         = get_current_user_id();
		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$answers_table   = $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$question = $wpdb->get_row(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id, status FROM {$questions_table} WHERE id = %d",
				$question_id
			)
		);

		if ( ! $question ) {
			return new WP_Error( 'quick_qa_not_found', 'Question not found.', array( 'status' => 404 ) );
		}

		// Auto-approve the question when an admin publishes a reply to it.
		if ( 'approved' !== $question->status ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->update(
				$questions_table,
				array( 'status' => 'approved', 'updated_at' => current_time( 'mysql', true ) ),
				array( 'id' => $question_id ),
				array( '%s', '%s' ),
				array( '%d' )
			);
		}

		$now = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->insert(
			$answers_table,
			array(
				'question_id' => $question_id,
				'user_id'     => $user_id,
				'answer_type' => 'admin',
				'answer_text' => $answer_text,
				'status'      => 'approved',
				'upvotes'     => 0,
				'created_at'  => $now,
				'updated_at'  => $now,
			),
			array( '%d', '%d', '%s', '%s', '%s', '%d', '%s', '%s' )
		);

		return rest_ensure_response(
			array(
				'question_id' => $question_id,
				'answer_id'   => (int) $wpdb->insert_id,
			)
		);
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/questions/{id}/delete
	 *
	 * Hard-deletes a question and all its answers, votes, and flag records.
	 *
	 * @since  1.1.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function admin_delete_question( WP_REST_Request $request ) {
		global $wpdb;

		$id              = (int) $request->get_param( 'id' );
		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$answers_table   = $wpdb->prefix . 'quick_qa_answers';
		$flags_table     = $wpdb->prefix . 'quick_qa_flags';
		$votes_table     = $wpdb->prefix . 'quick_qa_votes';

		// Delete answer-level flags before removing the answers themselves.
		$answer_ids = $wpdb->get_col(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id FROM {$answers_table} WHERE question_id = %d",
				$id
			)
		);
		foreach ( $answer_ids as $aid ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->delete(
				$flags_table,
				array( 'object_type' => 'answer', 'object_id' => (int) $aid ),
				array( '%s', '%d' )
			);
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->delete( $flags_table,     array( 'object_type' => 'question', 'object_id' => $id ), array( '%s', '%d' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->delete( $votes_table,     array( 'object_type' => 'question', 'object_id' => $id ), array( '%s', '%d' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->delete( $answers_table,   array( 'question_id' => $id ), array( '%d' ) );
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->delete( $questions_table, array( 'id'          => $id ), array( '%d' ) );

		return rest_ensure_response( array( 'id' => $id, 'deleted' => true ) );
	}

	// =========================================================================
	// Public callbacks
	// =========================================================================

	/**
	 * GET /wp-json/quick-qa/v1/questions
	 *
	 * Returns rendered HTML for a page of approved questions, plus pagination
	 * metadata used by the "Show more" button on the product page.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function get_questions_page( WP_REST_Request $request ) {
		global $wpdb;

		$product_id = $request->get_param( 'product_id' );
		$offset     = $request->get_param( 'offset' );
		$limit      = $request->get_param( 'limit' );

		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$answers_table   = $wpdb->prefix . 'quick_qa_answers';
		$votes_table     = $wpdb->prefix . 'quick_qa_votes';

		// Total approved questions for has_more check.
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$total = (int) $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT COUNT(*) FROM {$questions_table} WHERE product_id = %d AND status = 'approved'",
				$product_id
			)
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$questions = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$questions_table} WHERE product_id = %d AND status = 'approved' ORDER BY created_at DESC LIMIT %d OFFSET %d",
				$product_id,
				$limit,
				$offset
			)
		);

		if ( empty( $questions ) ) {
			return rest_ensure_response(
				array(
					'html'     => '',
					'has_more' => false,
					'offset'   => $offset,
					'total'    => $total,
				)
			);
		}

		$question_ids = array_map( 'absint', wp_list_pluck( $questions, 'id' ) );
		$placeholders = implode( ', ', array_fill( 0, count( $question_ids ), '%d' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$answers = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$answers_table} WHERE question_id IN ( {$placeholders} ) AND status = 'approved' ORDER BY answer_type DESC, upvotes DESC, created_at ASC",
				...$question_ids
			)
		);

		$answers_map = array();
		foreach ( $answers as $answer ) {
			$answers_map[ (int) $answer->question_id ][] = $answer;
		}
		foreach ( $questions as $question ) {
			$question->answers = $answers_map[ (int) $question->id ] ?? array();
		}

		// Resolve current-user vote state for upvote/helpful buttons.
		$is_logged_in     = is_user_logged_in();
		$user_voted_ids   = array();
		$user_helpful_ids = array();

		if ( $is_logged_in ) {
			$user_id = get_current_user_id();
			$q_args  = array_merge( array( $user_id ), $question_ids );

			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$voted = $wpdb->get_col(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"SELECT object_id FROM {$votes_table} WHERE user_id = %d AND object_type = 'question' AND object_id IN ( {$placeholders} )",
					...$q_args
				)
			);
			$user_voted_ids = array_map( 'absint', $voted ?: array() );

			if ( ! empty( $answers ) ) {
				$answer_ids       = array_map( function ( $a ) { return (int) $a->id; }, $answers );
				$ans_placeholders = implode( ', ', array_fill( 0, count( $answer_ids ), '%d' ) );
				$a_args           = array_merge( array( $user_id ), $answer_ids );

				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$helpful = $wpdb->get_col(
					$wpdb->prepare(
						// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						"SELECT object_id FROM {$votes_table} WHERE user_id = %d AND object_type = 'answer' AND object_id IN ( {$ans_placeholders} )",
						...$a_args
					)
				);
				$user_helpful_ids = array_map( 'absint', $helpful ?: array() );
			}
		}

		// Load settings so the partial can respect community and appearance settings.
		$qq_s                      = get_option( 'quick_qa_settings', array() );
		$allow_community           = isset( $qq_s['allow_community'] )           ? (bool) $qq_s['allow_community']           : true;
		$allow_verified_buyers     = isset( $qq_s['allow_verified_buyers'] )     ? (bool) $qq_s['allow_verified_buyers']     : true;
		$allow_logged_in_customers = isset( $qq_s['allow_logged_in_customers'] ) ? (bool) $qq_s['allow_logged_in_customers'] : true;
		$appr_show_upvotes         = isset( $qq_s['appr_show_upvotes'] )         ? (bool) $qq_s['appr_show_upvotes']         : true;
		$appr_show_role_badges     = isset( $qq_s['appr_show_role_badges'] )     ? (bool) $qq_s['appr_show_role_badges']     : true;
		$is_admin          = current_user_can( 'manage_options' ) || current_user_can( 'manage_woocommerce' );
		$appr_avatar_style = ( isset( $qq_s['appr_avatar_style'] ) && in_array( $qq_s['appr_avatar_style'], array( 'circle', 'square', 'hidden' ), true ) )
			? $qq_s['appr_avatar_style']
			: 'circle';

		// Determine if the current user is a verified buyer of this product (affects CTA visibility).
		$is_verified = false;
		if ( $is_logged_in && ! $is_admin ) {
			$current_uid = get_current_user_id();
			$orders      = wc_get_orders(
				array(
					'customer_id' => $current_uid,
					'status'      => array( 'wc-completed' ),
					'limit'       => -1,
					'return'      => 'ids',
				)
			);
			foreach ( $orders as $order_id ) {
				$order = wc_get_order( $order_id );
				if ( $order ) {
					foreach ( $order->get_items() as $item ) {
						if ( (int) $item->get_product_id() === (int) $product_id ) {
							$is_verified = true;
							break 2;
						}
					}
				}
			}
		}

		// Render question items HTML using the shared partial template.
		ob_start();
		$partial = trailingslashit( dirname( dirname( dirname( __FILE__ ) ) ) ) . 'public/partials/quick-qa-question-items.php';
		include $partial;
		$html = ob_get_clean();

		return rest_ensure_response(
			array(
				'html'     => $html,
				'has_more' => ( $offset + $limit ) < $total,
				'offset'   => $offset + $limit,
				'total'    => $total,
			)
		);
	}

	/**
	 * POST /wp-json/quick-qa/v1/questions
	 *
	 * Handle a customer question submission.
	 *
	 * Processing order:
	 *  1. reCAPTCHA verification (when enabled and configured).
	 *  2. Rate-limit check.
	 *  3. Guest-field validation (name required; email optional).
	 *  4. Verified-buyer lookup for authenticated users.
	 *  5. DB insert.
	 *  6. Rate-limit counter increment.
	 *  7. Return JSON confirmation.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function submit_question( WP_REST_Request $request ) {

		// Load all relevant submission settings from the single option key.
		$qq_s                    = get_option( 'quick_qa_settings', array() );
		$recaptcha_enabled       = (bool) ( $qq_s['recaptcha_enabled']       ?? false );
		$recaptcha_secret_key    = (string) ( $qq_s['recaptcha_secret_key']  ?? '' );
		$who_can_ask             = (string) ( $qq_s['who_can_ask']            ?? 'both' );
		$req_email               = (bool) ( $qq_s['require_email_for_guests'] ?? true );
		$honeypot_enabled        = (bool) ( $qq_s['enable_honeypot']          ?? false );
		$pause_submissions       = (bool) ( $qq_s['pause_submissions']        ?? false );

		// 0. Pause-submissions gate — reject before any other processing.
		if ( $pause_submissions ) {
			return new WP_Error(
				'quick_qa_submissions_paused',
				__( 'New question submissions are temporarily paused. Please check back later.', 'askora-product-qa-for-woocommerce' ),
				array( 'status' => 503 )
			);
		}

		// 0. Honeypot check — must be empty; non-empty means bot submission.
		if ( $honeypot_enabled ) {
			$honeypot_value = $request->get_param( 'honeypot' );
			if ( ! empty( $honeypot_value ) ) {
				// Return a plausible success to avoid giving bots feedback.
				return rest_ensure_response(
					array( 'id' => 0, 'status' => 'pending', 'message' => '' )
				);
			}
		}

		// 0b. who_can_ask enforcement.
		$is_currently_logged_in = is_user_logged_in();
		if ( 'logged-in' === $who_can_ask && ! $is_currently_logged_in ) {
			return new WP_Error(
				'quick_qa_login_required',
				__( 'You must be logged in to ask a question.', 'askora-product-qa-for-woocommerce' ),
				array( 'status' => 401 )
			);
		}
		if ( 'guests' === $who_can_ask && $is_currently_logged_in ) {
			return new WP_Error(
				'quick_qa_guests_only',
				__( 'Only guest visitors can submit questions.', 'askora-product-qa-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		// 1. reCAPTCHA verification (when enabled and configured).
		if ( $recaptcha_enabled && $recaptcha_secret_key ) {
			$token = $request->get_param( 'recaptcha_token' );
			if ( empty( $token ) ) {
				return new WP_Error(
					'quick_qa_recaptcha_missing',
					__( 'Please complete the reCAPTCHA check.', 'askora-product-qa-for-woocommerce' ),
					array( 'status' => 422 )
				);
			}

			$verify = wp_remote_post(
				'https://www.google.com/recaptcha/api/siteverify',
				array(
					'body'    => array(
						'secret'   => $recaptcha_secret_key,
						'response' => $token,
						'remoteip' => isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '',
					),
					'timeout' => 10,
				)
			);

			if ( is_wp_error( $verify ) ) {
				return new WP_Error(
					'quick_qa_recaptcha_error',
					__( 'reCAPTCHA verification failed. Please try again.', 'askora-product-qa-for-woocommerce' ),
					array( 'status' => 503 )
				);
			}

			$result = json_decode( wp_remote_retrieve_body( $verify ), true );
			if ( empty( $result['success'] ) ) {
				return new WP_Error(
					'quick_qa_recaptcha_failed',
					__( 'reCAPTCHA verification failed. Please try again.', 'askora-product-qa-for-woocommerce' ),
					array( 'status' => 422 )
				);
			}
		}

		// 2. Rate limit.
		$rate_check = $this->check_rate_limit();
		if ( is_wp_error( $rate_check ) ) {
			return $rate_check;
		}

		$product_id    = $request->get_param( 'product_id' );
		$question_text = $request->get_param( 'question_text' );
		$user_id       = get_current_user_id();
		$is_logged_in  = (bool) $user_id;

		// 3. Guest field validation — only required when not logged in.
		$guest_name  = '';
		$guest_email = '';

		if ( ! $is_logged_in ) {
			$guest_name  = $request->get_param( 'guest_name' );
			$guest_email = $request->get_param( 'guest_email' );

			if ( empty( $guest_name ) ) {
				return new WP_Error(
					'quick_qa_name_required',
					__( 'Please enter your name.', 'askora-product-qa-for-woocommerce' ),
					array( 'status' => 422 )
				);
			}

			if ( $req_email && empty( $guest_email ) ) {
				return new WP_Error(
					'quick_qa_email_required',
					__( 'Please enter your email address.', 'askora-product-qa-for-woocommerce' ),
					array( 'status' => 422 )
				);
			}

			if ( ! empty( $guest_email ) && ! is_email( $guest_email ) ) {
				return new WP_Error(
					'quick_qa_invalid_email',
					__( 'Please enter a valid email address.', 'askora-product-qa-for-woocommerce' ),
					array( 'status' => 422 )
				);
			}
		}

		// 4. Verified-buyer check — determines the badge shown on the saved question.
		$is_verified = false;
		$user_data   = $is_logged_in ? get_userdata( $user_id ) : null;
		if ( $is_logged_in && $user_data ) {
			$is_verified = (bool) wc_customer_bought_product( $user_data->user_email, $user_id, $product_id );
		}

		// 5. Moderation checks (all settings from $qq_s loaded at the top of this method).
		$approval_mode     = (string) ( $qq_s['question_approval_mode'] ?? 'manual' );
		$profanity_enabled = (bool)   ( $qq_s['profanity_filter']       ?? true );
		$profanity_words   = (string) ( $qq_s['profanity_words']        ?? 'spam, scam, fake' );
		$auto_reject_short = (bool)   ( $qq_s['auto_reject_short']      ?? true );
		$min_length        = max( 1, (int) ( $qq_s['min_length']        ?? 10 ) );
		$email_blocklist   = (string) ( $qq_s['email_blocklist']        ?? '' );
		$email_allowlist   = (string) ( $qq_s['email_allowlist']        ?? '' );

		// Resolve the submitter's email for list checks.
		if ( $is_logged_in && $user_data ) {
			$submitter_email = strtolower( trim( $user_data->user_email ) );
		} else {
			$submitter_email = strtolower( trim( $guest_email ) );
		}

		// 5a. Email blocklist — silently generic error (no useful info to the sender).
		if ( ! empty( $email_blocklist ) && $this->email_matches_list( $submitter_email, $email_blocklist ) ) {
			return new WP_Error(
				'quick_qa_submission_error',
				__( 'Unable to process your submission.', 'askora-product-qa-for-woocommerce' ),
				array( 'status' => 422 )
			);
		}

		// 5b. Email allowlist — overrides approval mode; allowlisted senders auto-publish.
		$on_allowlist = ! empty( $email_allowlist )
			&& $this->email_matches_list( $submitter_email, $email_allowlist );

		if ( ! $on_allowlist ) {
			// 5c. Profanity filter — auto-reject questions containing blocklist words.
			if ( $profanity_enabled && ! empty( $profanity_words ) ) {
				$words = array_filter( array_map( 'trim', explode( ',', $profanity_words ) ) );
				foreach ( $words as $word ) {
					if ( ! empty( $word ) && false !== stripos( $question_text, $word ) ) {
						return new WP_Error(
							'quick_qa_profanity',
							__( 'Your question contains content that is not allowed.', 'askora-product-qa-for-woocommerce' ),
							array( 'status' => 422 )
						);
					}
				}
			}

			// 5d. Auto-reject short questions silently (no error exposed to the sender).
			if ( $auto_reject_short && mb_strlen( $question_text ) < $min_length ) {
				$this->insert_question( $product_id, $user_id, $guest_name, $guest_email, $question_text, $is_verified, 'rejected' );
				$this->increment_rate_limit();
				return rest_ensure_response( array(
					'id'      => 0,
					'status'  => 'pending',
					/* translators: Shown when the question requires manual approval. */
					'message' => __( 'Your question has been submitted and is pending review.', 'askora-product-qa-for-woocommerce' ),
				) );
			}
		}

		// 6. Determine final approval status.
		if ( $on_allowlist ) {
			$status = 'approved'; // Trusted senders bypass the queue.
		} elseif ( 'auto' === $approval_mode ) {
			$status = 'approved';
		} elseif ( 'trust-tiered' === $approval_mode ) {
			// Verified buyers and logged-in customers auto-publish; guests need approval.
			$status = ( $is_verified || $is_logged_in ) ? 'approved' : 'pending';
		} else { // 'manual'
			$status = 'pending';
		}

		// 7. Persist.
		$question_id = $this->insert_question(
			$product_id,
			$user_id,
			$guest_name,
			$guest_email,
			$question_text,
			$is_verified,
			$status
		);

		if ( is_wp_error( $question_id ) ) {
			return $question_id;
		}

		// 8. Bump the rate-limit counter.
		$this->increment_rate_limit();

		// 9. Notify admin of the new question.
		$asker_name = $is_logged_in
			? ( $user_data ? $user_data->display_name : __( 'Customer', 'askora-product-qa-for-woocommerce' ) )
			: ( $guest_name ?: __( 'Guest', 'askora-product-qa-for-woocommerce' ) );
		Quick_Qa_Notifier::new_question( $question_id, $product_id, $question_text, $asker_name );

		// 10. Respond.
		$message = ( 'approved' === $status )
			? __( 'Your question has been published.', 'askora-product-qa-for-woocommerce' )
			: __( 'Your question has been submitted and is pending review.', 'askora-product-qa-for-woocommerce' );

		return rest_ensure_response(
			array(
				'id'      => $question_id,
				'status'  => $status,
				'message' => $message,
			)
		);
	}

	/**
	 * POST /wp-json/quick-qa/v1/answers
	 *
	 * Handle a community answer submission from a logged-in user.
	 * Admin/staff answers are auto-approved; community answers go to pending.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function submit_answer( WP_REST_Request $request ) {
		global $wpdb;

		$user_id         = get_current_user_id();
		$question_id     = $request->get_param( 'question_id' );
		$answer_text     = $request->get_param( 'answer_text' );
		$questions_table = $wpdb->prefix . 'quick_qa_questions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$question_exists = $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id FROM {$questions_table} WHERE id = %d AND status = 'approved'",
				$question_id
			)
		);

		if ( ! $question_exists ) {
			return new WP_Error(
				'quick_qa_not_found',
				__( 'Question not found.', 'askora-product-qa-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		$is_admin = user_can( $user_id, 'manage_woocommerce' ) || user_can( $user_id, 'manage_options' );

		if ( ! $is_admin ) {
			$qq_s = get_option( 'quick_qa_settings', array() );

			$allow_community           = isset( $qq_s['allow_community'] )           ? (bool) $qq_s['allow_community']           : true;
			$allow_verified_buyers     = isset( $qq_s['allow_verified_buyers'] )     ? (bool) $qq_s['allow_verified_buyers']     : true;
			$allow_logged_in_customers = isset( $qq_s['allow_logged_in_customers'] ) ? (bool) $qq_s['allow_logged_in_customers'] : true;

			if ( ! $allow_community ) {
				return new WP_Error(
					'quick_qa_community_disabled',
					__( 'Community answers are currently closed for this product.', 'askora-product-qa-for-woocommerce' ),
					array( 'status' => 403 )
				);
			}

			// Determine if the current user is a verified buyer of this product.
			$is_verified = false;
			if ( $allow_verified_buyers ) {
				// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
				$q_row = $wpdb->get_row(
					$wpdb->prepare(
						// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
						"SELECT product_id FROM {$questions_table} WHERE id = %d",
						$question_id
					)
				);
				if ( $q_row ) {
					$orders = wc_get_orders(
						array(
							'customer_id' => $user_id,
							'status'      => array( 'wc-completed' ),
							'limit'       => 1,
							'return'      => 'ids',
						)
					);
					foreach ( $orders as $order_id ) {
						$order = wc_get_order( $order_id );
						if ( $order ) {
							foreach ( $order->get_items() as $item ) {
								if ( (int) $item->get_product_id() === (int) $q_row->product_id ) {
									$is_verified = true;
									break 2;
								}
							}
						}
					}
				}
			}

			if ( ! $is_verified && ! $allow_logged_in_customers ) {
				return new WP_Error(
					'quick_qa_not_permitted',
					__( 'You are not permitted to submit an answer for this product.', 'askora-product-qa-for-woocommerce' ),
					array( 'status' => 403 )
				);
			}
		}

		$answer_type = $is_admin ? 'admin' : 'community';
		$status      = 'pending';

		$now           = current_time( 'mysql', true );
		$answers_table = $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$rows = $wpdb->insert(
			$answers_table,
			array(
				'question_id' => $question_id,
				'user_id'     => $user_id,
				'answer_type' => $answer_type,
				'answer_text' => $answer_text,
				'status'      => $status,
				'upvotes'     => 0,
				'created_at'  => $now,
				'updated_at'  => $now,
			),
			array( '%d', '%d', '%s', '%s', '%s', '%d', '%s', '%s' )
		);

		if ( false === $rows ) {
			return new WP_Error(
				'quick_qa_db_error',
				__( 'Unable to save your answer. Please try again.', 'askora-product-qa-for-woocommerce' ),
				array( 'status' => 500 )
			);
		}

		// Notify admin when a community answer is waiting for review.
		if ( 'community' === $answer_type ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
			$q_row = $wpdb->get_row(
				$wpdb->prepare(
					// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
					"SELECT question_text FROM {$questions_table} WHERE id = %d",
					$question_id
				)
			);
			$responder    = get_userdata( $user_id );
			$responder_name = $responder ? $responder->display_name : __( 'Customer', 'askora-product-qa-for-woocommerce' );
			Quick_Qa_Notifier::community_answer(
				$q_row ? $q_row->question_text : '',
				$answer_text,
				$responder_name
			);
		}

		$message = 'approved' === $status
			? __( 'Your answer has been posted.', 'askora-product-qa-for-woocommerce' )
			: __( 'Your answer has been submitted for review.', 'askora-product-qa-for-woocommerce' );

		return rest_ensure_response(
			array(
				'id'      => (int) $wpdb->insert_id,
				'status'  => $status,
				'message' => $message,
			)
		);
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	/**
	 * Insert a new question row.
	 *
	 * All column values are sanitized by the REST arg schema before this
	 * method is called. The format array passed to $wpdb->insert() is the
	 * final line of defence for correct type binding.
	 *
	 * @since  1.0.0
	 * @param  int    $product_id
	 * @param  int    $user_id        0 for guests.
	 * @param  string $guest_name
	 * @param  string $guest_email
	 * @param  string $question_text
	 * @param  bool   $is_verified
	 * @param  string $status         'approved' or 'pending'.
	 * @return int|WP_Error  Inserted row ID, or WP_Error on DB failure.
	 * @global wpdb $wpdb
	 */
	private function insert_question( $product_id, $user_id, $guest_name, $guest_email, $question_text, $is_verified, $status ) {
		global $wpdb;

		$now   = current_time( 'mysql', true );
		$table = $wpdb->prefix . 'quick_qa_questions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$rows = $wpdb->insert(
			$table,
			array(
				'product_id'        => $product_id,
				'user_id'           => $user_id,
				'guest_name'        => $guest_name,
				'guest_email'       => $guest_email,
				'question_text'     => $question_text,
				'status'            => $status,
				'upvotes'           => 0,
				'is_verified_buyer' => $is_verified ? 1 : 0,
				'created_at'        => $now,
				'updated_at'        => $now,
			),
			array( '%d', '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s' )
		);

		if ( false === $rows ) {
			return new WP_Error(
				'quick_qa_db_error',
				__( 'Unable to save your question. Please try again.', 'askora-product-qa-for-woocommerce' ),
				array( 'status' => 500 )
			);
		}

		return (int) $wpdb->insert_id;
	}

	/**
	 * REST argument schema for POST /questions.
	 *
	 * @since  1.0.0
	 * @return array[]
	 */
	private function get_question_args() {
		return array(
			'product_id'      => array(
				'required'          => true,
				'type'              => 'integer',
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
				'validate_callback' => array( $this, 'validate_product_id' ),
				/* translators: REST API parameter description. */
				'description'       => __( 'The WooCommerce product ID the question belongs to.', 'askora-product-qa-for-woocommerce' ),
			),
			'question_text'   => array(
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
				'validate_callback' => array( $this, 'validate_question_text' ),
				/* translators: REST API parameter description. */
				'description'       => __( 'The question body (10–500 characters).', 'askora-product-qa-for-woocommerce' ),
			),
			'guest_name'      => array(
				'required'          => false,
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
				/* translators: REST API parameter description. */
				'description'       => __( 'Display name for guest (non-logged-in) submitters.', 'askora-product-qa-for-woocommerce' ),
			),
			'guest_email'     => array(
				'required'          => false,
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_email',
				/* translators: REST API parameter description. */
				'description'       => __( 'Email for guest submitters (optional; used for answer notifications).', 'askora-product-qa-for-woocommerce' ),
			),
			'recaptcha_token' => array(
				'required'          => false,
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'honeypot'        => array(
				'required'          => false,
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
			),
		);
	}

	// =========================================================================
	// Validators (called by WP REST before the callback)
	// =========================================================================

	/**
	 * Confirm that product_id maps to a real WooCommerce product.
	 *
	 * @since  1.0.0
	 * @param  mixed           $value
	 * @param  WP_REST_Request $request
	 * @param  string          $param
	 * @return true|WP_Error
	 */
	public function validate_product_id( $value, $request, $param ) {
		$product = wc_get_product( absint( $value ) );

		if ( ! $product instanceof WC_Product ) {
			return new WP_Error(
				'quick_qa_invalid_product',
				__( 'Invalid product.', 'askora-product-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		return true;
	}

	/**
	 * Enforce minimum and maximum question length.
	 *
	 * Sanitization runs before validation so $value is already stripped of
	 * tags and extra whitespace.
	 *
	 * @since  1.0.0
	 * @param  mixed           $value
	 * @param  WP_REST_Request $request
	 * @param  string          $param
	 * @return true|WP_Error
	 */
	public function validate_question_text( $value, $request, $param ) {
		$length   = mb_strlen( sanitize_textarea_field( (string) $value ) );
		$settings = get_option( 'quick_qa_settings', array() );
		$min      = max( 1, (int) ( $settings['min_length']      ?? 10 ) );
		$max      = max( 1, (int) ( $settings['max_length']      ?? 500 ) );
		$silent   = (bool) ( $settings['auto_reject_short']       ?? true );

		if ( $length < $min ) {
			if ( $silent ) {
				// When auto_reject_short is on, let it reach submit_question() for silent rejection.
				return true;
			}
			return new WP_Error(
				'quick_qa_too_short',
				sprintf(
					/* translators: %d: minimum character count */
					__( 'Your question must be at least %d characters.', 'askora-product-qa-for-woocommerce' ),
					$min
				),
				array( 'status' => 422 )
			);
		}

		if ( $length > $max ) {
			return new WP_Error(
				'quick_qa_too_long',
				sprintf(
					/* translators: %d: maximum character count */
					__( 'Your question must be %d characters or fewer.', 'askora-product-qa-for-woocommerce' ),
					$max
				),
				array( 'status' => 422 )
			);
		}

		return true;
	}

	/**
	 * Check whether an email address matches any entry in a newline-delimited list.
	 *
	 * Each line may be:
	 *   - A full address: sam@example.com  (exact match, case-insensitive)
	 *   - A domain:       @spamdomain.net  (any address ending in that domain)
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  string $email     Lowercase trimmed email to test.
	 * @param  string $list_text Raw textarea value — one entry per line.
	 * @return bool
	 */
	private function email_matches_list( $email, $list_text ) {
		if ( '' === $email || '' === $list_text ) {
			return false;
		}

		$lines = array_filter( array_map( 'trim', explode( "\n", $list_text ) ) );

		foreach ( $lines as $entry ) {
			$entry = strtolower( $entry );
			if ( '' === $entry ) {
				continue;
			}

			if ( '@' === $entry[0] ) {
				// Domain match: entry is "@domain.com", check email ends with it.
				if ( substr( $email, -strlen( $entry ) ) === $entry ) {
					return true;
				}
			} elseif ( $email === $entry ) {
				return true;
			}
		}

		return false;
	}
}
