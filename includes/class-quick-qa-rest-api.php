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

		// 4. Persist.
		$question_id = $this->insert_question(
			$product_id,
			$user_id,
			$guest_name,
			$guest_email,
			$question_text,
			$is_verified
		);

		if ( is_wp_error( $question_id ) ) {
			return $question_id;
		}

		// 5. Bump the rate-limit counter.
		$this->increment_rate_limit();

		// 6. Respond.
		return rest_ensure_response(
			array(
				'id'      => $question_id,
				'status'  => 'pending',
				/* translators: Confirmation message shown to the customer after submitting a question. */
				'message' => __( 'Your question has been submitted and is pending review.', 'quick-qa-for-woocommerce' ),
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
	 * @return int|WP_Error  Inserted row ID, or WP_Error on DB failure.
	 * @global wpdb $wpdb
	 */
	private function insert_question( $product_id, $user_id, $guest_name, $guest_email, $question_text, $is_verified ) {
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
				'status'            => 'pending',
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
