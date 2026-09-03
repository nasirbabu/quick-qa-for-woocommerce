<?php
/**
 * "Follow-up submitted" email.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sent to participants (admin + prior answerers) when a customer adds a
 * follow-up after the initial answer.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Email_Followup_Submitted extends Quick_Qa_Email_Base {

	public function __construct() {
		$this->id             = 'e-followup-submitted';
		$this->title          = __( 'Quick Q&A: Follow-up submitted', 'quick-qa-for-woocommerce' );
		$this->description    = __( 'Sent to participants when the customer adds a follow-up after the initial answer.', 'quick-qa-for-woocommerce' );
		$this->customer_email = true;

		parent::__construct();
	}

	/**
	 * @since 1.2.0
	 * @param array $args {
	 *     @type int      $product_id
	 *     @type string   $question_text
	 *     @type string   $answer_text
	 *     @type string   $followup_text
	 *     @type string   $customer_name
	 *     @type string   $author_name
	 *     @type string   $author_role
	 *     @type string[] $participant_emails
	 * }
	 */
	public function trigger( array $args ) {
		if ( empty( $args['participant_emails'] ) ) {
			return;
		}

		$product = wc_get_product( (int) $args['product_id'] );

		$data = array(
			'customer_name' => $args['customer_name'] ?? '',
			'question_text' => $args['question_text'] ?? '',
			'answer_text'   => $args['answer_text'] ?? '',
			'author_name'   => $args['author_name'] ?? '',
			'author_role'   => $args['author_role'] ?? '',
			'followup_text' => $args['followup_text'] ?? '',
			'product_name'  => $product ? $product->get_name() : '',
			'product_url'   => get_permalink( (int) $args['product_id'] ),
		);

		$this->dispatch( $data, $args['participant_emails'] );
	}
}
