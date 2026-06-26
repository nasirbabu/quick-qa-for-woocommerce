<?php
/**
 * Abstract base controller for Quick Q&A REST API resource controllers.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Shared constants, permission callbacks, and rate-limiting helpers that
 * every resource controller inherits.
 *
 * Pattern mirrors WP_REST_Controller in WordPress Core:
 *   - Subclasses must implement register_routes().
 *   - Permission callbacks (require_admin, require_login) live here so they
 *     are defined exactly once and referenced via array( $this, '...' ) in
 *     each controller's route registration.
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
abstract class Quick_Qa_Rest_Controller {

	/**
	 * REST API namespace shared by all plugin routes.
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const REST_NAMESPACE = 'quick-qa/v1';

	/**
	 * Fallback hourly submission cap (overridden by the submission_rate_limit setting).
	 *
	 * @since 1.0.0
	 * @var   int
	 */
	const RATE_LIMIT = 3;

	/**
	 * Register all routes provided by this controller onto rest_api_init.
	 *
	 * @since 1.0.0
	 */
	abstract public function register_routes();

	// =========================================================================
	// Permission callbacks
	// =========================================================================

	/**
	 * Permission callback: user must be logged in.
	 *
	 * @since  1.0.0
	 * @return true|WP_Error
	 */
	public function require_login() {
		if ( ! is_user_logged_in() ) {
			return new WP_Error(
				'quick_qa_login_required',
				__( 'You must be logged in to perform this action.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 401 )
			);
		}

		return true;
	}

	/**
	 * Permission callback: user must have WooCommerce shop manager or admin capability.
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
	// Rate limiting helpers
	// =========================================================================

	/**
	 * Return WP_Error when the current user/IP has exceeded the hourly limit.
	 *
	 * Reads the limit from the submission_rate_limit plugin option so the
	 * admin-configured value is always respected.
	 *
	 * @since  1.0.0
	 * @return true|WP_Error
	 */
	protected function check_rate_limit() {
		$count    = (int) get_transient( $this->rate_limit_key() );
		$settings = get_option( 'quick_qa_settings', array() );
		$limit    = isset( $settings['submission_rate_limit'] )
			? max( 1, (int) $settings['submission_rate_limit'] )
			: self::RATE_LIMIT;

		if ( $count >= $limit ) {
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
	 * Uses WordPress transients with a one-hour expiry.
	 *
	 * @since  1.0.0
	 */
	protected function increment_rate_limit() {
		$key   = $this->rate_limit_key();
		$count = (int) get_transient( $key );
		set_transient( $key, $count + 1, HOUR_IN_SECONDS );
	}

	/**
	 * Build the transient key for rate limiting.
	 *
	 * Logged-in users are keyed by user ID.
	 * Guests are keyed by a one-way hash of the remote IP so raw addresses
	 * are never written to the database.
	 *
	 * @since  1.0.0
	 * @return string  Always ≤ 172 chars, within WP's 191-char transient key limit.
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
