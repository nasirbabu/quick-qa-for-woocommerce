<?php
/**
 * "Upvote threshold" admin email.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails/templates/admin
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sent when a question's upvote count hits the configured threshold.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails/templates/admin
 */
class Quick_Qa_Email_Upvote_Threshold extends Quick_Qa_Email_Base {

	public function __construct() {
		$this->id             = 'e-upvote-threshold';
		$this->title          = __( 'Quick Q&A: Upvote threshold', 'quick-qa-for-woocommerce' );
		$this->description    = __( 'Sent when many customers upvote the same unanswered question — signals high priority.', 'quick-qa-for-woocommerce' );
		$this->customer_email = false;

		parent::__construct();
	}

	/**
	 * @since 1.2.0
	 * @param array $args {
	 *     @type int    $question_id
	 *     @type int    $product_id
	 *     @type string $question_text
	 *     @type int    $upvote_count
	 *     @type string $customer_name
	 * }
	 */
	public function trigger( array $args ) {
		$product = wc_get_product( (int) $args['product_id'] );

		$data = array(
			'question_text' => $args['question_text'] ?? '',
			'upvote_count'  => (string) (int) ( $args['upvote_count'] ?? 0 ),
			'customer_name' => $args['customer_name'] ?? '',
			'product_name'  => $product ? $product->get_name() : '',
			'product_url'   => get_permalink( (int) $args['product_id'] ),
			'answer_url'    => admin_url( 'admin.php?page=quick-qa&qid=' . (int) $args['question_id'] ),
		);

		$this->dispatch( $data, Quick_Qa_Notifier::admin_recipients() );
	}
}
