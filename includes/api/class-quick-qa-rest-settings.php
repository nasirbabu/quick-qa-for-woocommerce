<?php
/**
 * Settings REST API controller.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Handles the plugin settings REST routes:
 *
 *   GET  /admin/settings — return current settings object
 *   POST /admin/settings — save settings, return updated object
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Rest_Settings extends Quick_Qa_Rest_Controller {

	/**
	 * Register settings routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'require_admin' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'save_settings' ),
					'permission_callback' => array( $this, 'require_admin' ),
				),
			)
		);
	}

	/**
	 * GET /wp-json/quick-qa/v1/admin/settings
	 *
	 * @since  1.0.0
	 * @return WP_REST_Response
	 */
	public function get_settings( WP_REST_Request $request ) {
		return rest_ensure_response( array(
			'who_can_ask'              => (string) get_option( 'quick_qa_who_can_ask', 'both' ),
			'require_email_for_guests' => (bool) get_option( 'quick_qa_require_email_for_guests', true ),
			'enable_honeypot'          => (bool) get_option( 'quick_qa_enable_honeypot', false ),
			'submission_rate_limit'    => (int) get_option( 'quick_qa_submission_rate_limit', 3 ),
			'recaptcha_enabled'        => (bool) get_option( 'quick_qa_recaptcha_enabled', false ),
			'recaptcha_site_key'       => (string) get_option( 'quick_qa_recaptcha_site_key', '' ),
			'recaptcha_secret_key'     => (string) get_option( 'quick_qa_recaptcha_secret_key', '' ),
		) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/settings
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function save_settings( WP_REST_Request $request ) {
		$body = $request->get_json_params();

		$string_fields = array( 'who_can_ask', 'recaptcha_site_key', 'recaptcha_secret_key' );
		$bool_fields   = array( 'require_email_for_guests', 'enable_honeypot', 'recaptcha_enabled' );
		$int_fields    = array( 'submission_rate_limit' );

		foreach ( $string_fields as $key ) {
			if ( array_key_exists( $key, $body ) ) {
				update_option( 'quick_qa_' . $key, sanitize_text_field( $body[ $key ] ) );
			}
		}
		foreach ( $bool_fields as $key ) {
			if ( array_key_exists( $key, $body ) ) {
				update_option( 'quick_qa_' . $key, (bool) $body[ $key ] );
			}
		}
		foreach ( $int_fields as $key ) {
			if ( array_key_exists( $key, $body ) ) {
				update_option( 'quick_qa_' . $key, max( 1, (int) $body[ $key ] ) );
			}
		}

		return $this->get_settings( $request );
	}
}
