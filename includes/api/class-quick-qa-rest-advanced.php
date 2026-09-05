<?php
/**
 * Advanced settings REST API controller.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.3.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Handles the routes backing Settings → Advanced that are not part of the
 * single quick_qa_settings option (Quick_Qa_Rest_Settings already owns the
 * adv_cron_engine / adv_rest_api_enabled / adv_debug_log_enabled fields):
 *
 *   GET  /admin/advanced           — read-only environment info (table prefix, Action Scheduler availability)
 *   GET  /admin/advanced/log       — tail of the debug log
 *   POST /admin/advanced/log/clear — empty the debug log
 *   POST /admin/advanced/cache/clear — clear the plugin's own cached/transient data
 *
 * Also owns the guard that actually turns off the public-facing REST
 * endpoints when the "Public REST API" toggle is off (see guard_rest_api()).
 *
 * @since      1.3.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Rest_Advanced extends Quick_Qa_Rest_Controller {

	// =========================================================================
	// Route registration
	// =========================================================================

	/**
	 * Register Advanced tab routes.
	 *
	 * @since 1.3.0
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/advanced',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_info' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/advanced/log',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_log' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/advanced/log/clear',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'clear_log' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/advanced/cache/clear',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'clear_cache' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);
	}

	// =========================================================================
	// Callbacks
	// =========================================================================

	/**
	 * GET /wp-json/quick-qa/v1/admin/advanced
	 *
	 * @since  1.3.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function get_info( WP_REST_Request $request ) {
		global $wpdb;

		return rest_ensure_response( array(
			'table_prefix'               => $wpdb->prefix . 'quick_qa_',
			'action_scheduler_available' => function_exists( 'as_schedule_recurring_action' ),
		) );
	}

	/**
	 * GET /wp-json/quick-qa/v1/admin/advanced/log
	 *
	 * @since  1.3.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function get_log( WP_REST_Request $request ) {
		return rest_ensure_response( array(
			'content' => Quick_Qa_Logger::tail(),
			'size'    => Quick_Qa_Logger::size(),
			'updated' => Quick_Qa_Logger::updated(),
		) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/advanced/log/clear
	 *
	 * @since  1.3.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function clear_log( WP_REST_Request $request ) {
		Quick_Qa_Logger::clear();

		return rest_ensure_response( array(
			'content' => '',
			'size'    => 0,
			'updated' => null,
		) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/advanced/cache/clear
	 *
	 * Clears every transient this plugin has set (currently the hourly
	 * submission rate-limit counters). Does not touch questions, answers,
	 * or settings.
	 *
	 * @since  1.3.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function clear_cache( WP_REST_Request $request ) {
		global $wpdb;

		$like_value   = $wpdb->esc_like( '_transient_quick_qa_' ) . '%';
		$like_timeout = $wpdb->esc_like( '_transient_timeout_quick_qa_' ) . '%';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$cleared = (int) $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				$like_value,
				$like_timeout
			)
		);

		Quick_Qa_Logger::log( 'info', sprintf( 'Cache cleared from Advanced settings (%d item(s)).', $cleared ) );

		return rest_ensure_response( array( 'cleared' => $cleared ) );
	}

	// =========================================================================
	// Public REST API on/off enforcement
	// =========================================================================

	/**
	 * Short-circuit every public-facing quick-qa/v1 route (i.e. every route
	 * NOT under /admin/…) with a 403 when the "Public REST API" toggle is
	 * off. Admin routes are always left reachable — they're already gated
	 * behind require_admin(), and the wp-admin Settings screen (this toggle
	 * included) is itself served through them.
	 *
	 * Hooked onto rest_pre_dispatch, which runs before permission callbacks,
	 * so a disabled public endpoint actually stops responding rather than
	 * merely hiding the toggle's state in the admin UI.
	 *
	 * @since  1.3.0
	 * @param  mixed           $result  Response to replace the requested version with, if not null.
	 * @param  WP_REST_Server  $server
	 * @param  WP_REST_Request $request
	 * @return mixed
	 */
	public function guard_rest_api( $result, $server, $request ) {
		$prefix = '/' . self::REST_NAMESPACE . '/';
		$route  = $request->get_route();

		if ( 0 !== strpos( $route, $prefix ) ) {
			return $result; // Not one of ours.
		}

		$sub_route = substr( $route, strlen( $prefix ) );
		if ( 0 === strpos( $sub_route, 'admin/' ) ) {
			return $result; // Admin-only routes are unaffected by this toggle.
		}

		$settings = get_option( 'quick_qa_settings', array() );
		$enabled  = ! isset( $settings['adv_rest_api_enabled'] ) || (bool) $settings['adv_rest_api_enabled'];
		if ( $enabled ) {
			return $result;
		}

		Quick_Qa_Logger::log( 'warning', sprintf( 'Blocked public REST request to %s — Public REST API is turned off in Advanced settings.', $route ) );

		return new WP_Error(
			'quick_qa_rest_disabled',
			__( 'The public Quick Q&A REST API is currently turned off by the store administrator.', 'quick-qa-for-woocommerce' ),
			array( 'status' => 403 )
		);
	}
}
