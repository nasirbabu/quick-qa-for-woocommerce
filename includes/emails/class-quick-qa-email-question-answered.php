<?php
/**
 * "Question answered" customer email.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sent to the original asker when an admin/staff member answers their question.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Email_Question_Answered extends Quick_Qa_Email_Base {

	public function __construct() {
		$this->id             = 'e-question-answered';
		$this->title          = __( 'Quick Q&A: Question answered', 'quick-qa-for-woocommerce' );
		$this->description    = __( 'Sent to the original asker when their question is answered by your team.', 'quick-qa-for-woocommerce' );
		$this->customer_email = true;

		parent::__construct();
	}

	/**
	 * @since 1.2.0
	 * @param array $args {
	 *     @type int    $product_id
	 *     @type string $question_text
	 *     @type string $answer_text
	 *     @type string $customer_name
	 *     @type string $customer_email
	 *     @type string $author_name
	 *     @type string $author_role
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
			'answer_text'   => $args['answer_text'] ?? '',
			'author_name'   => $args['author_name'] ?? __( 'the team', 'quick-qa-for-woocommerce' ),
			'author_role'   => $args['author_role'] ?? __( 'Staff', 'quick-qa-for-woocommerce' ),
			'product_name'  => $product ? $product->get_name() : '',
			'product_url'   => get_permalink( (int) $args['product_id'] ),
		);

		$this->dispatch( $data, $args['customer_email'] );
	}
}
