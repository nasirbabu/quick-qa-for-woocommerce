<?php
/**
 * "Unanswered reminder" admin email.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails/templates/admin
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sent once per question when it has been unanswered too long (WP-Cron).
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails/templates/admin
 */
class Quick_Qa_Email_Unanswered_Reminder extends Quick_Qa_Email_Base {

	public function __construct() {
		$this->id             = 'e-unanswered-reminder';
		$this->title          = __( 'Quick Q&A: Unanswered reminder', 'quick-qa-for-woocommerce' );
		$this->description    = __( 'Sent as a reminder when a question has been pending too long.', 'quick-qa-for-woocommerce' );
		$this->customer_email = false;

		parent::__construct();
	}

	/**
	 * @since 1.2.0
	 * @param array $args {
	 *     @type int    $question_id
	 *     @type int    $product_id
	 *     @type string $question_text
	 *     @type string $customer_name
	 *     @type int    $days_waiting
	 * }
	 */
	public function trigger( array $args ) {
		$product = wc_get_product( (int) $args['product_id'] );

		$data = array(
			'customer_name' => $args['customer_name'] ?? '',
			'question_text' => $args['question_text'] ?? '',
			'days_waiting'  => (string) (int) ( $args['days_waiting'] ?? 0 ),
			'product_name'  => $product ? $product->get_name() : '',
			'product_url'   => get_permalink( (int) $args['product_id'] ),
			'answer_url'    => admin_url( 'admin.php?page=quick-qa&qid=' . (int) $args['question_id'] ),
		);

		$this->dispatch( $data, Quick_Qa_Notifier::admin_recipients() );
	}
}
