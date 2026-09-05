<?php
/**
 * Facade registering the 10 Quick Q&A WC_Email subclasses with WooCommerce.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Every other file (Quick_Qa_Notifier, REST controllers, cron callbacks)
 * sends one of the 10 emails through Quick_Qa_Emails::send() rather than
 * touching WC()->mailer() directly.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Emails {

	/**
	 * Template id => WC_Email subclass name.
	 *
	 * @since 1.2.0
	 * @var   array<string,string>
	 */
	const TEMPLATE_CLASSES = array(
		'e-new-question'              => 'Quick_Qa_Email_New_Question',
		'e-community-pending'         => 'Quick_Qa_Email_Community_Pending',
		'e-upvote-threshold'          => 'Quick_Qa_Email_Upvote_Threshold',
		'e-unanswered-reminder'       => 'Quick_Qa_Email_Unanswered_Reminder',
		'e-daily-digest'              => 'Quick_Qa_Email_Daily_Digest',
		'e-question-answered'         => 'Quick_Qa_Email_Question_Answered',
		'e-community-answer-approved' => 'Quick_Qa_Email_Community_Answer_Approved',
		'e-followup-submitted'        => 'Quick_Qa_Email_Followup_Submitted',
		'e-question-rejected'         => 'Quick_Qa_Email_Question_Rejected',
		'e-review-invitation'         => 'Quick_Qa_Email_Review_Invitation',
	);

	/**
	 * Template ids whose class file lives under templates/admin/ rather than
	 * templates/customer/ — mirrors the on-disk layout exactly.
	 *
	 * @since 1.2.0
	 * @var   string[]
	 */
	const ADMIN_TEMPLATE_IDS = array(
		'e-new-question',
		'e-community-pending',
		'e-upvote-threshold',
		'e-unanswered-reminder',
		'e-daily-digest',
	);

	/**
	 * Registers all 10 emails onto WooCommerce's `woocommerce_email_classes`
	 * filter so they appear under WooCommerce → Settings → Emails.
	 *
	 * The base class and 10 subclasses (`Quick_Qa_Email_Base extends WC_Email`)
	 * are require_once'd here, lazily, rather than during the plugin's own
	 * load_dependencies() — this filter only ever fires after WooCommerce has
	 * fully loaded WC_Email, whereas this plugin's own bootstrap runs at
	 * top-level file-include time and cannot guarantee that ordering itself.
	 *
	 * @since  1.2.0
	 * @param  array $email_classes
	 * @return array
	 */
	public static function register( $email_classes ) {
		$dir = plugin_dir_path( __FILE__ );

		require_once $dir . 'class-quick-qa-email-base.php';
		foreach ( self::TEMPLATE_CLASSES as $id => $class ) {
			$group = in_array( $id, self::ADMIN_TEMPLATE_IDS, true ) ? 'admin' : 'customer';
			require_once $dir . 'templates/' . $group . '/class-quick-qa-email-' . substr( $id, 2 ) . '.php';
		}

		foreach ( self::TEMPLATE_CLASSES as $id => $class ) {
			if ( class_exists( $class ) ) {
				$email_classes[ $id ] = new $class();
			}
		}
		return $email_classes;
	}

	/**
	 * Fire one of the 10 emails.
	 *
	 * @since  1.2.0
	 * @param  string $id   Template id, e.g. 'e-new-question'.
	 * @param  array  $args Event-specific context passed straight to the
	 *                      subclass's trigger() method.
	 */
	public static function send( $id, array $args ) {
		if ( ! function_exists( 'WC' ) || ! WC()->mailer() ) {
			return;
		}

		$emails = WC()->mailer()->get_emails();
		if ( isset( $emails[ $id ] ) && $emails[ $id ] instanceof Quick_Qa_Email_Base ) {
			$emails[ $id ]->trigger( $args );
		}
	}
}
