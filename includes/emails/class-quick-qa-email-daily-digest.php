<?php
/**
 * "Daily digest" admin email.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sent each morning with a summary of overnight Q&A activity (WP-Cron).
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Email_Daily_Digest extends Quick_Qa_Email_Base {

	public function __construct() {
		$this->id             = 'e-daily-digest';
		$this->title          = __( 'Quick Q&A: Daily digest', 'quick-qa-for-woocommerce' );
		$this->description    = __( 'Sent each morning with a summary of overnight activity, instead of individual question alerts.', 'quick-qa-for-woocommerce' );
		$this->customer_email = false;

		parent::__construct();
	}

	/**
	 * @since 1.2.0
	 * @param array $args {
	 *     @type int    $new_questions_count
	 *     @type int    $pending_answers_count
	 *     @type int    $flagged_count
	 *     @type string $top_question_text
	 *     @type int    $top_question_upvotes
	 *     @type string $top_question_product
	 * }
	 */
	public function trigger( array $args ) {
		$new_q    = (int) ( $args['new_questions_count'] ?? 0 );
		$pending_a = (int) ( $args['pending_answers_count'] ?? 0 );
		$flagged  = (int) ( $args['flagged_count'] ?? 0 );

		$data = array(
			'pending_count'          => (string) ( $new_q + $pending_a ),
			'new_questions_count'    => (string) $new_q,
			'pending_answers_count'  => (string) $pending_a,
			'flagged_count'          => (string) $flagged,
			'top_question_text'      => $args['top_question_text'] ?? '',
			'top_question_upvotes'   => (string) (int) ( $args['top_question_upvotes'] ?? 0 ),
			'top_question_product'   => $args['top_question_product'] ?? '',
			'admin_url'              => admin_url( 'admin.php?page=quick-qa' ),
		);

		$this->dispatch( $data, Quick_Qa_Notifier::admin_recipients() );
	}
}
