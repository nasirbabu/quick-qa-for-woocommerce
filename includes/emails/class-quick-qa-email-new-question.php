<?php
/**
 * "New question" admin email.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sent to the admin whenever a customer asks a new question (instant mode).
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Email_New_Question extends Quick_Qa_Email_Base {

	public function __construct() {
		$this->id             = 'e-new-question';
		$this->title          = __( 'Quick Q&A: New question', 'quick-qa-for-woocommerce' );
		$this->description    = __( 'Sent to your team whenever a customer asks a new question on a product page.', 'quick-qa-for-woocommerce' );
		$this->customer_email = false;

		parent::__construct();
	}

	/**
	 * @since 1.2.0
	 * @param array $args {
	 *     @type int    $question_id
	 *     @type int    $product_id
	 *     @type string $question_text
	 *     @type string $asker_name
	 * }
	 */
	public function trigger( array $args ) {
		$product = wc_get_product( (int) $args['product_id'] );

		$data = array(
			'customer_name' => $args['asker_name'] ?? '',
			'question_text' => $args['question_text'] ?? '',
			'product_name'  => $product ? $product->get_name() : '',
			'product_url'   => get_permalink( (int) $args['product_id'] ),
			'answer_url'    => admin_url( 'admin.php?page=quick-qa&qid=' . (int) $args['question_id'] ),
		);

		$this->dispatch( $data, Quick_Qa_Notifier::admin_recipients() );
	}
}
