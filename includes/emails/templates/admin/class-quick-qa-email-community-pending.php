<?php
/**
 * "Community answer pending review" admin email.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails/templates/admin
 */

defined( 'ABSPATH' ) || exit;

/**
 * Sent to moderators when a community/verified-buyer answer needs review.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails/templates/admin
 */
class Quick_Qa_Email_Community_Pending extends Quick_Qa_Email_Base {

	public function __construct() {
		$this->id             = 'e-community-pending';
		$this->title          = __( 'Quick Q&A: Community answer pending', 'quick-qa-for-woocommerce' );
		$this->description    = __( 'Sent to moderators when a verified buyer or community member submits an answer that needs review.', 'quick-qa-for-woocommerce' );
		$this->customer_email = false;

		parent::__construct();
	}

	/**
	 * @since 1.2.0
	 * @param array $args {
	 *     @type int    $question_id
	 *     @type int    $product_id
	 *     @type string $question_text
	 *     @type string $answer_text
	 *     @type string $responder_name
	 *     @type string $responder_role
	 * }
	 */
	public function trigger( array $args ) {
		$product = wc_get_product( (int) $args['product_id'] );

		$data = array(
			'question_text' => $args['question_text'] ?? '',
			'answer_text'   => $args['answer_text'] ?? '',
			'author_name'   => $args['responder_name'] ?? '',
			'author_role'   => $args['responder_role'] ?? __( 'Community member', 'quick-qa-for-woocommerce' ),
			'product_name'  => $product ? $product->get_name() : '',
			'product_url'   => get_permalink( (int) $args['product_id'] ),
			'answer_url'    => admin_url( 'admin.php?page=quick-qa&qid=' . (int) $args['question_id'] ),
		);

		$this->dispatch( $data, Quick_Qa_Notifier::admin_recipients() );
	}
}
