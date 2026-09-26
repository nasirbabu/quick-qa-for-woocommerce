<?php
/**
 * Email templates REST API controller.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Handles the Email Templates settings REST routes:
 *
 *   GET  /admin/email-templates                — return the merged resource (global + all 10 templates)
 *   POST /admin/email-templates                — validate, save, return the updated resource
 *   POST /admin/email-templates/{id}/preview    — render draft subject/body with sample data (no save)
 *   POST /admin/email-templates/{id}/test       — render draft subject/body with sample data and email it to the current admin
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Rest_Email_Templates extends Quick_Qa_Rest_Controller {

	/**
	 * Register routes.
	 *
	 * @since 1.2.0
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/email-templates',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_templates' ),
					'permission_callback' => array( $this, 'require_admin' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'save_templates' ),
					'permission_callback' => array( $this, 'require_admin' ),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/email-templates/(?P<id>[a-z0-9-]+)/preview',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'preview_template' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => $this->get_draft_args(),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/email-templates/(?P<id>[a-z0-9-]+)/test',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'send_test_email' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => $this->get_draft_args(),
			)
		);
	}

	/**
	 * Shared REST arg schema for the {id}/preview and {id}/test routes.
	 *
	 * @since  1.2.0
	 * @return array[]
	 */
	private function get_draft_args() {
		return array(
			'id'      => array(
				'required'          => true,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_key',
				'validate_callback' => static function ( $value ) {
					return array_key_exists( $value, Quick_Qa_Email_Store::defaults() );
				},
			),
			'subject' => array(
				'required'          => false,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
			),
			'body'    => array(
				'required'          => false,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
			),
		);
	}

	// =========================================================================
	// Callbacks
	// =========================================================================

	/**
	 * GET /wp-json/quick-qa/v1/admin/email-templates
	 *
	 * @since  1.2.0
	 * @return WP_REST_Response
	 */
	public function get_templates() {
		return rest_ensure_response( Quick_Qa_Email_Store::get_all() );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/email-templates
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function save_templates( WP_REST_Request $request ) {
		$body  = $request->get_json_params();
		$patch = array();

		// Email templates are Pro-only (KAN-58). The admin app only posts
		// what changed, so any global/template payload is a customization.
		if ( ! Quick_Qa_Email_Store::is_pro() && ( isset( $body['global'] ) || isset( $body['templates'] ) ) ) {
			return new WP_Error(
				'quick_qa_pro_required',
				__( 'Email templates are a Pro feature. Upgrade to Askora Pro to customize them.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		if ( isset( $body['global'] ) && is_array( $body['global'] ) ) {
			$patch['global'] = $body['global'];
		}
		if ( isset( $body['templates'] ) && is_array( $body['templates'] ) ) {
			$patch['templates'] = $body['templates'];
		}

		$result = Quick_Qa_Email_Store::save( $patch );

		// Re-evaluate the review-invitation cron immediately in case its
		// enabled state just changed, mirroring how settings save reschedules
		// the other notification crons.
		if ( class_exists( 'Quick_Qa_Notifier' ) ) {
			Quick_Qa_Notifier::schedule_crons();
		}

		return rest_ensure_response( $result );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/email-templates/{id}/preview
	 *
	 * Renders the *draft* subject/body (not what's saved) against sample
	 * data, using the exact same renderer real sends use — so the preview
	 * can never disagree with what a real email would look like.
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function preview_template( WP_REST_Request $request ) {
		$id = $request->get_param( 'id' );

		$template = Quick_Qa_Email_Store::get( $id );
		if ( ! $template ) {
			return new WP_Error( 'quick_qa_not_found', __( 'Unknown email template.', 'quick-qa-for-woocommerce' ), array( 'status' => 404 ) );
		}

		$subject_raw  = $this->draft_param( $request, 'subject', $template['subject'] );
		$body_raw     = $this->draft_param( $request, 'body', $template['body'] );
		$known_tokens = array_keys( $template['variables'] );
		$sample       = Quick_Qa_Email_Vars::sample_data();

		$rendered_subject = Quick_Qa_Email_Renderer::render( $subject_raw, $sample, $known_tokens );
		$rendered_body    = Quick_Qa_Email_Renderer::render( $body_raw, $sample, $known_tokens );

		$global = Quick_Qa_Email_Store::get_global_sender();
		if ( 'customer' === $template['group'] && '' !== trim( $global['footer'] ) ) {
			$rendered_body .= "\n\n" . $global['footer'];
		}

		return rest_ensure_response( array(
			'from'    => sprintf( '%s <%s>', $global['sender_name'], $global['sender_address'] ),
			'to'      => $this->recipient_preview( $template ),
			'subject' => $rendered_subject,
			'body'    => $rendered_body,
		) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/email-templates/{id}/test
	 *
	 * Sends the current *draft* subject/body rendered with sample data
	 * straight to the current admin user's email, bypassing is_enabled()
	 * and any dedup/trigger conditions — a formatting/copy check, not a
	 * simulation of a real trigger.
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function send_test_email( WP_REST_Request $request ) {
		$id = $request->get_param( 'id' );

		$template = Quick_Qa_Email_Store::get( $id );
		if ( ! $template ) {
			return new WP_Error( 'quick_qa_not_found', __( 'Unknown email template.', 'quick-qa-for-woocommerce' ), array( 'status' => 404 ) );
		}

		$to = wp_get_current_user()->user_email;
		if ( ! is_email( $to ) ) {
			return new WP_Error( 'quick_qa_no_email', __( 'Your account has no email address to send a test to.', 'quick-qa-for-woocommerce' ), array( 'status' => 422 ) );
		}

		$subject_raw  = $this->draft_param( $request, 'subject', $template['subject'] );
		$body_raw     = $this->draft_param( $request, 'body', $template['body'] );
		$known_tokens = array_keys( $template['variables'] );
		$sample       = Quick_Qa_Email_Vars::sample_data();

		/* translators: %s: rendered subject line of the test email */
		$rendered_subject = sprintf( __( '[Test] %s', 'quick-qa-for-woocommerce' ), Quick_Qa_Email_Renderer::render( $subject_raw, $sample, $known_tokens ) );
		$rendered_body    = Quick_Qa_Email_Renderer::render( $body_raw, $sample, $known_tokens );

		$sent = wp_mail( $to, $rendered_subject, $rendered_body );

		return rest_ensure_response( array( 'sent' => (bool) $sent, 'to' => $to ) );
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	/**
	 * The editor's draft subject/body, or the template's own value when no
	 * draft was sent. On the free tier (KAN-58) the draft is ignored so a
	 * preview or test only ever shows the built-in copy.
	 *
	 * @since  1.6.0
	 * @param  WP_REST_Request $request
	 * @param  string          $key      'subject' or 'body'.
	 * @param  string          $fallback The template's current value.
	 * @return string
	 */
	private function draft_param( WP_REST_Request $request, $key, $fallback ) {
		$value = $request->get_param( $key );
		if ( null === $value || ! Quick_Qa_Email_Store::is_pro() ) {
			return $fallback;
		}
		return (string) $value;
	}

	/**
	 * Human-readable "sent to" preview for the list/editor UI.
	 *
	 * @since  1.2.0
	 * @param  array $template
	 * @return string
	 */
	private function recipient_preview( array $template ) {
		switch ( $template['recipient'] ) {
			case 'admin':
				$recipients = class_exists( 'Quick_Qa_Notifier' ) ? Quick_Qa_Notifier::admin_recipients() : array( get_option( 'admin_email' ) );
				return implode( ', ', $recipients );
			case 'participants':
				return __( 'Admin + prior answerers on the thread', 'quick-qa-for-woocommerce' );
			case 'asker':
			default:
				return __( 'The original asker', 'quick-qa-for-woocommerce' );
		}
	}
}
