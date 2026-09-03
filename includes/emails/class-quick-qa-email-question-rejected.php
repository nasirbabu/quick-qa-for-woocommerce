<?php
/**
 * "Question rejected" customer email.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Optional polite notice sent when a moderator rejects a question. Off by
 * default. Never fired for the silent auto-reject-short path — only a
 * deliberate moderator action triggers this.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Email_Question_Rejected extends Quick_Qa_Email_Base {

	public function __construct() {
		$this->id             = 'e-question-rejected';
		$this->title          = __( 'Quick Q&A: Question rejected', 'quick-qa-for-woocommerce' );
		$this->description    = __( 'Optional polite notice sent when a question is rejected by a moderator. Off by default.', 'quick-qa-for-woocommerce' );
		$this->customer_email = true;

		parent::__construct();
	}

	/**
	 * @since 1.2.0
	 * @param array $args {
	 *     @type int    $product_id
	 *     @type string $question_text
	 *     @type string $customer_name
	 *     @type string $customer_email
	 * }
	 */
	public function trigger( array $args ) {
		if ( empty( $args['customer_email'] ) ) {
			return;
		}

		$product = wc_get_product( (int) $args['product_id'] );

		$data = array(
			'customer_name' => $args['customer_name'] ?? '',
			'question_text' => $args['question_text'] ?? '',
			'product_name'  => $product ? $product->get_name() : '',
			'product_url'   => get_permalink( (int) $args['product_id'] ),
		);

		$this->dispatch( $data, $args['customer_email'] );
	}
}
