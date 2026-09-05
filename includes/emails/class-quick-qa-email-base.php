<?php
/**
 * Abstract base class for all 10 Quick Q&A WC_Email subclasses.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Shared behaviour for every Quick Q&A email: enabled-state, subject/body,
 * and sender identity all come from Quick_Qa_Email_Store (this plugin's own
 * settings), not from WooCommerce's native per-email options — WooCommerce's
 * Settings → Emails screen is only where each email is *listed* (satisfies
 * the "shows up like every other plugin's emails" requirement); editing
 * happens in Quick QA's own Settings → Email templates screen.
 *
 * Subclasses set $this->id (must match a Quick_Qa_Email_Store template id)
 * and $this->customer_email before calling parent::__construct(), then
 * implement trigger( array $args ) which resolves real data and calls
 * $this->dispatch( $data, $to ).
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
abstract class Quick_Qa_Email_Base extends WC_Email {

	/**
	 * Rendered subject for the email currently being sent (set by dispatch()).
	 *
	 * @since 1.2.0
	 * @var   string
	 */
	protected $rendered_subject = '';

	/**
	 * Rendered body for the email currently being sent (set by dispatch()).
	 *
	 * @since 1.2.0
	 * @var   string
	 */
	protected $rendered_body = '';

	/**
	 * Fire this email for a real event. Implemented per subclass.
	 *
	 * @since 1.2.0
	 * @param array $args Event-specific context (ids, text, names, …).
	 */
	abstract public function trigger( array $args );

	/**
	 * Render the effective template with $data and send it to $to.
	 *
	 * No-ops when the template is disabled or $to resolves to nothing —
	 * callers don't need to check is_enabled()/recipient validity themselves.
	 *
	 * @since  1.2.0
	 * @param  array        $data Real values, keyed by token name (no braces).
	 * @param  string|array $to   One email address, or an array of them.
	 * @return bool  Whether wp_mail() reported success.
	 */
	protected function dispatch( array $data, $to ) {
		if ( ! $this->is_enabled() ) {
			Quick_Qa_Logger::log( 'info', sprintf( '%s: skipped, this email template is disabled.', $this->id ) );
			return false;
		}

		$to = is_array( $to ) ? array_values( array_filter( array_unique( $to ) ) ) : array( $to );
		$to = array_values( array_filter( $to, 'is_email' ) );
		if ( empty( $to ) ) {
			Quick_Qa_Logger::log( 'warning', sprintf( '%s: skipped, no valid recipient email address.', $this->id ) );
			return false;
		}

		$template = Quick_Qa_Email_Store::get( $this->id );
		if ( ! $template ) {
			Quick_Qa_Logger::log( 'error', sprintf( '%s: skipped, template not found in the email store.', $this->id ) );
			return false;
		}

		$known_tokens = array_keys( $template['variables'] );

		$this->rendered_subject = Quick_Qa_Email_Renderer::render( $template['subject'], $data, $known_tokens );
		$body                   = Quick_Qa_Email_Renderer::render( $template['body'], $data, $known_tokens );

		if ( $this->is_customer_email() ) {
			$footer = trim( (string) Quick_Qa_Email_Store::get_global_sender()['footer'] );
			if ( '' !== $footer ) {
				$body .= "\n\n" . $footer;
			}
		}
		$this->rendered_body = $body;

		$this->recipient = implode( ', ', $to );

		$sent = (bool) $this->send( $this->get_recipient(), $this->get_subject(), $this->get_content(), $this->get_headers(), $this->get_attachments() );

		Quick_Qa_Logger::log(
			$sent ? 'info' : 'error',
			sprintf( '%s: %s to %s — "%s"', $this->id, $sent ? 'sent' : 'FAILED to send', implode( ', ', $to ), $this->rendered_subject )
		);

		return $sent;
	}

	/**
	 * @since  1.2.0
	 * @return string
	 */
	public function get_default_subject() {
		$template = Quick_Qa_Email_Store::get( $this->id );
		return $template ? $template['subject'] : '';
	}

	/**
	 * WC_Email::get_subject() reads a per-email "subject" option this plugin
	 * never writes, then falls back to the raw, unrendered template subject —
	 * so without this override every real send goes out with literal
	 * {tokens} in the subject line. Falls back to the raw template subject
	 * when called before dispatch() has rendered one (e.g. WooCommerce's own
	 * admin UI listing this email).
	 *
	 * @since  1.2.0
	 * @return string
	 */
	public function get_subject() {
		return '' !== $this->rendered_subject ? $this->rendered_subject : $this->get_default_subject();
	}

	/**
	 * @since  1.2.0
	 * @return string
	 */
	public function get_content_plain() {
		return $this->rendered_body;
	}

	/**
	 * @since  1.2.0
	 * @return string
	 */
	public function get_content_html() {
		return wpautop( wp_kses_post( $this->rendered_body ) );
	}

	/**
	 * Our own stored sender name overrides WooCommerce's global setting.
	 *
	 * @since  1.2.0
	 * @param  string $from_name
	 * @return string
	 */
	public function get_from_name( $from_name = '' ) {
		$template = Quick_Qa_Email_Store::get( $this->id );
		$override = trim( (string) ( $template['sender_override'] ?? '' ) );
		if ( '' !== $override ) {
			return $override;
		}
		return (string) Quick_Qa_Email_Store::get_global_sender()['sender_name'];
	}

	/**
	 * @since  1.2.0
	 * @param  string $from_email
	 * @return string
	 */
	public function get_from_address( $from_email = '' ) {
		return sanitize_email( (string) Quick_Qa_Email_Store::get_global_sender()['sender_address'] );
	}

	/**
	 * @since  1.2.0
	 * @return bool
	 */
	public function get_reply_to_enabled() {
		return '' !== trim( (string) Quick_Qa_Email_Store::get_global_sender()['reply_to'] );
	}

	/**
	 * @since  1.2.0
	 * @param  string $reply_to_name
	 * @return string
	 */
	public function get_reply_to_name( $reply_to_name = '' ) {
		return $this->get_from_name();
	}

	/**
	 * @since  1.2.0
	 * @param  string $reply_to_email
	 * @return string
	 */
	public function get_reply_to_address( $reply_to_email = '' ) {
		return sanitize_email( (string) Quick_Qa_Email_Store::get_global_sender()['reply_to'] );
	}

	/**
	 * Enabled state comes solely from Quick_Qa_Email_Store — WooCommerce's
	 * own per-email "Enable/Disable" option is not the source of truth here.
	 *
	 * @since  1.2.0
	 * @return bool
	 */
	public function is_enabled() {
		return Quick_Qa_Email_Store::is_enabled( $this->id );
	}

	/**
	 * Minimal settings form: a pointer back to Quick QA's own editor instead
	 * of duplicating a second subject/body editing surface.
	 *
	 * @since 1.2.0
	 */
	public function init_form_fields() {
		$this->form_fields = array(
			'quick_qa_notice' => array(
				'title'       => __( 'Manage this email', 'quick-qa-for-woocommerce' ),
				'type'        => 'title',
				/* translators: %s: link to the plugin's own settings screen */
				'description' => sprintf(
					__( 'Edit this email\'s subject, body, variables, and enabled state under %s.', 'quick-qa-for-woocommerce' ),
					'<a href="' . esc_url( admin_url( 'admin.php?page=quick-qa' ) ) . '">' . esc_html__( 'Askora → Settings → Email templates', 'quick-qa-for-woocommerce' ) . '</a>'
				),
			),
		);
	}
}
