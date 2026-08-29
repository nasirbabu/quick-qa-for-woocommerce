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
	 * admin-configured value is always respected. Checks both the IP-based
	 * and (when logged in) the user-based counter so a logged-in visitor
	 * can't reset their count by clearing cookies and submitting as a
	 * guest from the same IP.
	 *
	 * @since  1.0.0
	 * @return true|WP_Error
	 */
	protected function check_rate_limit() {
		$settings = get_option( 'quick_qa_settings', array() );
		$limit    = isset( $settings['submission_rate_limit'] )
			? max( 1, (int) $settings['submission_rate_limit'] )
			: self::RATE_LIMIT;

		$ip_count = (int) get_transient( $this->ip_rate_limit_key() );
		$user_id  = get_current_user_id();
		$user_count = $user_id ? (int) get_transient( $this->user_rate_limit_key( $user_id ) ) : 0;

		if ( $ip_count >= $limit || $user_count >= $limit ) {
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
	 * Always increments the IP-based counter, and additionally the
	 * user-based counter when logged in, so both signals stay in sync
	 * and neither alone can be used to bypass the limit.
	 *
	 * Uses WordPress transients with a one-hour expiry.
	 *
	 * @since  1.0.0
	 */
	protected function increment_rate_limit() {
		$ip_key   = $this->ip_rate_limit_key();
		$ip_count = (int) get_transient( $ip_key );
		set_transient( $ip_key, $ip_count + 1, HOUR_IN_SECONDS );

		$user_id = get_current_user_id();
		if ( $user_id ) {
			$user_key   = $this->user_rate_limit_key( $user_id );
			$user_count = (int) get_transient( $user_key );
			set_transient( $user_key, $user_count + 1, HOUR_IN_SECONDS );
		}
	}

	/**
	 * Build the transient key for the user-based rate-limit counter.
	 *
	 * @since  1.0.0
	 * @param  int $user_id  Current user ID.
	 * @return string
	 */
	private function user_rate_limit_key( $user_id ) {
		return 'quick_qa_rl_u_' . $user_id;
	}

	/**
	 * Build the transient key for the IP-based rate-limit counter.
	 *
	 * Keyed by a one-way hash of the remote IP so raw addresses are never
	 * written to the database. Computed regardless of login state so the
	 * counter survives a visitor logging out or clearing cookies.
	 *
	 * @since  1.0.0
	 * @return string  Always ≤ 172 chars, within WP's 191-char transient key limit.
	 */
	private function ip_rate_limit_key() {
		$raw_ip = isset( $_SERVER['REMOTE_ADDR'] ) ? wp_unslash( $_SERVER['REMOTE_ADDR'] ) : '';

		return 'quick_qa_rl_ip_' . md5( $raw_ip );
	}
}
