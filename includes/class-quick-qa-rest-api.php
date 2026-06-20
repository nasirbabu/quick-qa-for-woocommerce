<?php
/**
 * REST API endpoints for Quick Q&A for WooCommerce.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

/**
 * Registers and handles all REST API routes for the plugin.
 *
 * Routes registered:
 *   POST /wp-json/quick-qa/v1/questions  — customer submits a question.
 *
 * Authentication uses the standard WordPress REST nonce (X-WP-Nonce header).
 * WordPress resolves the current user from that header automatically, so
 * callbacks receive a fully-authenticated `get_current_user_id()` context.
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_For_Woocommerce_Rest_Api {

	/**
	 * REST API namespace shared by all plugin routes.
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const REST_NAMESPACE = 'quick-qa/v1';

	/**
	 * Maximum questions a single user or IP may submit per hour.
	 *
	 * Stored as a class constant so it can easily be replaced by a
	 * settings-driven value in a future version.
	 *
	 * @since 1.0.0
	 * @var   int
	 */
	const RATE_LIMIT = 3;

	/**
	 * Register all REST API routes.
	 *
	 * Hooked onto `rest_api_init`.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		// ── Admin routes ──────────────────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/questions',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'admin_get_questions' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);

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

		// ── Public / customer routes ───────────────────────────────────────────

		// Paginated question list (used by the "Show more" button on the frontend).
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
						'default'           => 3,
						'minimum'           => 1,
						'maximum'           => 10,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/questions',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'submit_question' ),
				/**
				 * The endpoint is intentionally public (guests may ask questions).
				 * CSRF protection is provided by the X-WP-Nonce header that the
				 * JS sends with every request. Rate limiting is applied inside the
				 * callback as an additional layer of protection.
				 */
				'permission_callback' => '__return_true',
				'args'                => $this->get_question_args(),
			)
		);

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
						'description'       => __( 'ID of the question being answered.', 'quick-qa-for-woocommerce' ),
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
						'description'       => __( 'The answer text (10–2000 characters).', 'quick-qa-for-woocommerce' ),
					),
				),
			)
		);

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

	/**
	 * Permission callback for endpoints that require an authenticated user.
	 *
	 * @since  1.0.0
	 * @return true|WP_Error
	 */
	public function require_login() {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'quick_qa_login_required',
				__( 'You must be logged in to vote.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 401 )
			);
		}

		return true;
	}

	/**
	 * Permission callback for admin-only endpoints.
	 *
	 * @since  1.0.0
	 * @return true|WP_Error
	 */
	public function require_admin() {
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_options' ) ) {
			return new WP_Error(
				'quick_qa_forbidden',
				__( 'You do not have permission to perform this action.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	// =========================================================================
	// Admin endpoint callbacks
	// =========================================================================

	/**
	 * GET /wp-json/quick-qa/v1/admin/questions
	 *
	 * Returns all questions (all statuses) with enriched product titles,
	 * author names, and all answers attached.
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

		// Fetch all answers for these questions in one query.
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

		// Map answers onto their parent questions.
		$answers_map = array();
		foreach ( $answers as $a ) {
			$answers_map[ (int) $a->question_id ][] = $a;
		}

		foreach ( $questions as $q ) {
			$q->answers = $answers_map[ (int) $q->id ] ?? array();
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

		$id    = (int) $request->get_param( 'id' );
		$status = $request->get_param( 'status' );
		$table = $wpdb->prefix . 'quick_qa_questions';

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

		$id    = (int) $request->get_param( 'id' );
		$status = $request->get_param( 'status' );
		$table = $wpdb->prefix . 'quick_qa_answers';

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
	 * Publish an admin-written answer. Automatically approves the question
	 * if it is still pending, then inserts the answer as approved/admin type.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function admin_publish_answer( WP_REST_Request $request ) {
		global $wpdb;

		$question_id = (int) $request->get_param( 'id' );
		$answer_text = $request->get_param( 'answer_text' );
		$user_id     = get_current_user_id();

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

	// =========================================================================
	// Argument schema
	// =========================================================================

	/**
	 * Define, sanitize, and validate the arguments accepted by POST /questions.
	 *
	 * WordPress processes these before the callback runs, so the callback can
	 * trust that all values are already clean and within allowed ranges.
	 *
	 * @since  1.0.0
	 * @return array[]
	 */
	private function get_question_args() {
		return array(
			'product_id'    => array(
				'required'          => true,
				'type'              => 'integer',
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
				'validate_callback' => array( $this, 'validate_product_id' ),
				/* translators: REST API parameter description. */
				'description'       => __( 'The WooCommerce product ID the question belongs to.', 'quick-qa-for-woocommerce' ),
			),
			'question_text' => array(
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
				'validate_callback' => array( $this, 'validate_question_text' ),
				/* translators: REST API parameter description. */
				'description'       => __( 'The question body (10–500 characters).', 'quick-qa-for-woocommerce' ),
			),
			'guest_name'    => array(
				'required'          => false,
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_text_field',
				/* translators: REST API parameter description. */
				'description'       => __( 'Display name for guest (non-logged-in) submitters.', 'quick-qa-for-woocommerce' ),
			),
			'guest_email'   => array(
				'required'          => false,
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'sanitize_email',
				/* translators: REST API parameter description. */
				'description'       => __( 'Email for guest submitters (optional; used for answer notifications).', 'quick-qa-for-woocommerce' ),
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
	 * @param  mixed           $value   Raw parameter value.
	 * @param  WP_REST_Request $request Full request object.
	 * @param  string          $param   Parameter name.
	 * @return true|WP_Error
	 */
	public function validate_product_id( $value, $request, $param ) {
		$product = wc_get_product( absint( $value ) );

		if ( ! $product instanceof WC_Product ) {
			return new WP_Error(
				'quick_qa_invalid_product',
				__( 'Invalid product.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		return true;
	}

	/**
	 * Enforce minimum and maximum question length.
	 *
	 * Sanitization (sanitize_textarea_field) runs before validation, so $value
	 * here is already stripped of tags and extra whitespace.
	 *
	 * @since  1.0.0
	 * @param  mixed           $value   Raw (but sanitized) parameter value.
	 * @param  WP_REST_Request $request Full request object.
	 * @param  string          $param   Parameter name.
	 * @return true|WP_Error
	 */
	public function validate_question_text( $value, $request, $param ) {
		$length = mb_strlen( sanitize_textarea_field( (string) $value ) );

		if ( $length < 10 ) {
			return new WP_Error(
				'quick_qa_too_short',
				__( 'Your question must be at least 10 characters.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 422 )
			);
		}

		if ( $length > 500 ) {
			return new WP_Error(
				'quick_qa_too_long',
				__( 'Your question must be 500 characters or fewer.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 422 )
			);
		}

		return true;
	}

	// =========================================================================
	// Paginated questions endpoint
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

		// Total approved questions (for has_more check).
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$total = (int) $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT COUNT(*) FROM {$questions_table} WHERE product_id = %d AND status = 'approved'",
				$product_id
			)
		);

		// Fetch this page of questions.
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

		// Fetch approved answers for these questions in a single query.
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

		// Map answers onto their parent questions.
		$answers_map = array();
		foreach ( $answers as $answer ) {
			$answers_map[ (int) $answer->question_id ][] = $answer;
		}
		foreach ( $questions as $question ) {
			$question->answers = $answers_map[ (int) $question->id ] ?? array();
		}

		// Resolve current-user vote state for buttons.
		$is_logged_in     = is_user_logged_in();
		$user_voted_ids   = array();
		$user_helpful_ids = array();

		if ( $is_logged_in ) {
			$user_id  = get_current_user_id();
			$q_args   = array_merge( array( $user_id ), $question_ids );

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

		// Render question items HTML using the shared partial template.
		ob_start();
		$partial = trailingslashit( dirname( dirname( __FILE__ ) ) ) . 'public/partials/quick-qa-question-items.php';
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

	// =========================================================================
	// Endpoint callback
	// =========================================================================

	/**
	 * Handle POST /wp-json/quick-qa/v1/questions.
	 *
	 * Processing order:
	 *  1. Rate-limit check.
	 *  2. Guest-field validation (name required; email optional but must be valid).
	 *  3. Verified-buyer lookup for the authenticated user.
	 *  4. DB insert.
	 *  5. Rate-limit counter increment.
	 *  6. Return JSON confirmation.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request Incoming request object.
	 * @return WP_REST_Response|WP_Error
	 */
	public function submit_question( WP_REST_Request $request ) {

		// 1. Rate limit.
		$rate_check = $this->check_rate_limit();
		if ( is_wp_error( $rate_check ) ) {
			return $rate_check;
		}

		$product_id    = $request->get_param( 'product_id' );
		$question_text = $request->get_param( 'question_text' );
		$user_id       = get_current_user_id();
		$is_logged_in  = (bool) $user_id;

		// 2. Guest field validation — these are only required when not logged in.
		$guest_name  = '';
		$guest_email = '';

		if ( ! $is_logged_in ) {
			$guest_name  = $request->get_param( 'guest_name' );
			$guest_email = $request->get_param( 'guest_email' );

			if ( empty( $guest_name ) ) {
				return new WP_Error(
					'quick_qa_name_required',
					__( 'Please enter your name.', 'quick-qa-for-woocommerce' ),
					array( 'status' => 422 )
				);
			}

			if ( ! empty( $guest_email ) && ! is_email( $guest_email ) ) {
				return new WP_Error(
					'quick_qa_invalid_email',
					__( 'Please enter a valid email address.', 'quick-qa-for-woocommerce' ),
					array( 'status' => 422 )
				);
			}
		}

		// 3. Verified-buyer check — determines the badge shown on the saved question.
		$is_verified = false;
		if ( $is_logged_in ) {
			$user_data   = get_userdata( $user_id );
			$is_verified = $user_data
				? (bool) wc_customer_bought_product( $user_data->user_email, $user_id, $product_id )
				: false;
		}

		// 4. Determine approval status — all questions require admin review before appearing.
		$status = 'pending';

		// 5. Persist.
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

		// 6. Bump the rate-limit counter.
		$this->increment_rate_limit();

		// 7. Respond — include the resolved status so the JS can react correctly.
		if ( 'approved' === $status ) {
			$message = __( 'Your question has been published.', 'quick-qa-for-woocommerce' );
		} else {
			/* translators: Shown when the question requires manual approval before appearing. */
			$message = __( 'Your question has been submitted and is pending review.', 'quick-qa-for-woocommerce' );
		}

		return rest_ensure_response(
			array(
				'id'      => $question_id,
				'status'  => $status,
				'message' => $message,
			)
		);
	}

	// =========================================================================
	// Database
	// =========================================================================

	/**
	 * Insert a new question row.
	 *
	 * All column values are already sanitized by the REST arg schema before
	 * this method is called. The format array passed to $wpdb->insert() is the
	 * final line of defence ensuring correct type binding.
	 *
	 * @since  1.0.0
	 * @access private
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

		$now   = current_time( 'mysql', true ); // UTC.
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
				__( 'Unable to save your question. Please try again.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 500 )
			);
		}

		return (int) $wpdb->insert_id;
	}

	// =========================================================================
	// Answers endpoint callback
	// =========================================================================

	/**
	 * Handle POST /wp-json/quick-qa/v1/answers.
	 *
	 * Only logged-in users may answer (enforced by require_login permission
	 * callback). Admin/staff answers are auto-approved; community answers go to
	 * `pending` for moderation.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function submit_answer( WP_REST_Request $request ) {
		global $wpdb;

		$user_id     = get_current_user_id();
		$question_id = $request->get_param( 'question_id' );
		$answer_text = $request->get_param( 'answer_text' );

		// Verify the question exists and is approved.
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
				__( 'Question not found.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		// Determine answer type; all answers require admin review before appearing.
		$is_admin    = user_can( $user_id, 'manage_woocommerce' ) || user_can( $user_id, 'manage_options' );
		$answer_type = $is_admin ? 'admin' : 'community';
		$status      = 'pending';

		$now            = current_time( 'mysql', true );
		$answers_table  = $wpdb->prefix . 'quick_qa_answers';

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
				__( 'Unable to save your answer. Please try again.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 500 )
			);
		}

		$message = 'approved' === $status
			? __( 'Your answer has been posted.', 'quick-qa-for-woocommerce' )
			: __( 'Your answer has been submitted for review.', 'quick-qa-for-woocommerce' );

		return rest_ensure_response(
			array(
				'id'      => (int) $wpdb->insert_id,
				'status'  => $status,
				'message' => $message,
			)
		);
	}

	// =========================================================================
	// Votes endpoint callback
	// =========================================================================

	/**
	 * Handle POST /wp-json/quick-qa/v1/votes.
	 *
	 * Toggles a vote: if the authenticated user has already voted on this
	 * object the vote is removed (un-vote); otherwise a new vote is recorded.
	 * The `upvotes` counter on the parent table is kept in sync atomically.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request Incoming request.
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function submit_vote( WP_REST_Request $request ) {
		global $wpdb;

		$user_id     = get_current_user_id();
		$object_type = $request->get_param( 'object_type' );
		$object_id   = $request->get_param( 'object_id' );

		// Confirm the object exists and is approved.
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

		// Check whether the user has already voted on this object.
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

		// Return the authoritative count from the database.
		$count = (int) $wpdb->get_var(  // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
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

	/**
	 * Increment or decrement the `upvotes` column on a question or answer row.
	 *
	 * GREATEST(0, upvotes - 1) prevents the counter from going negative if
	 * rows are deleted or counts drift due to concurrent requests.
	 *
	 * @since  1.0.0
	 * @access private
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

	// =========================================================================
	// Rate limiting
	// =========================================================================

	/**
	 * Return WP_Error if the current user/IP has exceeded the hourly limit.
	 *
	 * @since  1.0.0
	 * @access private
	 * @return true|WP_Error
	 */
	private function check_rate_limit() {
		$count = (int) get_transient( $this->rate_limit_key() );

		if ( $count >= self::RATE_LIMIT ) {
			return new WP_Error(
				'quick_qa_rate_limited',
				__( "You've reached the hourly question limit. Please try again later.", 'quick-qa-for-woocommerce' ),
				array( 'status' => 429 )
			);
		}

		return true;
	}

	/**
	 * Increment the hourly submission counter for the current user/IP.
	 *
	 * Uses WordPress transients (stored in the options table or object cache)
	 * with a one-hour expiry. The counter is additive so that multiple
	 * submissions within the hour accumulate correctly even across page loads.
	 *
	 * @since  1.0.0
	 * @access private
	 */
	private function increment_rate_limit() {
		$key   = $this->rate_limit_key();
		$count = (int) get_transient( $key );
		set_transient( $key, $count + 1, HOUR_IN_SECONDS );
	}

	/**
	 * Build the transient key used for rate limiting.
	 *
	 * Logged-in users are keyed by user ID.
	 * Guests are keyed by a one-way hash of the remote IP so that raw IP
	 * addresses are never written to the database.
	 *
	 * @since  1.0.0
	 * @access private
	 * @return string  Transient key (always ≤ 172 chars, within WP's 191-char limit).
	 */
	private function rate_limit_key() {
		$user_id = get_current_user_id();

		if ( $user_id ) {
			return 'quick_qa_rl_u_' . $user_id;
		}

		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
		$raw_ip = isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : '';

		return 'quick_qa_rl_ip_' . md5( $raw_ip );
	}
}
