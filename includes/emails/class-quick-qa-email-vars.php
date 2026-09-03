<?php
/**
 * Variable registry for Quick Q&A email templates.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Declares which {variable} tokens each of the 10 email templates supports,
 * the sample values used by the live preview / test-send, and the fallback
 * text substituted when real data for a token is missing at send time.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Email_Vars {

	/**
	 * Variable tokens shared by every template (site-level context).
	 *
	 * @since 1.2.0
	 * @var   array<string,string>
	 */
	const BASE = array(
		'store_name' => 'Your store name.',
		'store_url'  => 'Link to your store.',
		'date'       => 'Current date.',
	);

	/**
	 * Variable tokens shared by every template about the original question.
	 *
	 * @since 1.2.0
	 * @var   array<string,string>
	 */
	const QUESTION = array(
		'customer_name' => 'Name of the asker.',
		'question_text' => 'Body of the question.',
		'product_name'  => 'Product the question is about.',
		'product_url'   => 'Direct link to the product page.',
	);

	/**
	 * Variable tokens shared by templates that reference an answer.
	 *
	 * @since 1.2.0
	 * @var   array<string,string>
	 */
	const ANSWER = array(
		'answer_text'  => 'Body of the answer.',
		'author_name'  => 'Who wrote the answer.',
		'author_role'  => 'Their role (Staff / Verified buyer / Community).',
	);

	/**
	 * Per-template extra variable tokens, beyond BASE/QUESTION/ANSWER.
	 *
	 * @since 1.2.0
	 * @var   array<string, array<string,string>>
	 */
	const EXTRAS = array(
		'e-new-question'              => array( 'answer_url' => 'Direct link to answer this question in your dashboard.' ),
		'e-community-pending'         => array( 'answer_url' => 'Direct link to review this answer in your dashboard.' ),
		'e-upvote-threshold'          => array(
			'upvote_count' => 'How many upvotes the question has.',
			'answer_url'   => 'Direct link to answer this question in your dashboard.',
		),
		'e-unanswered-reminder'       => array(
			'days_waiting' => 'How long it has been pending.',
			'answer_url'   => 'Direct link to answer this question in your dashboard.',
		),
		'e-daily-digest'              => array(
			'pending_count'          => 'Total pending items.',
			'new_questions_count'    => 'New questions in the last 24 hours.',
			'pending_answers_count'  => 'Community answers awaiting review.',
			'flagged_count'          => 'Flagged items needing review.',
			'top_question_text'      => 'Most upvoted pending question.',
			'top_question_upvotes'   => 'Upvotes on the top question.',
			'top_question_product'   => 'Product the top question is about.',
			'admin_url'              => 'Link to your dashboard.',
		),
		'e-followup-submitted'        => array( 'followup_text' => 'The follow-up question.' ),
	);

	/**
	 * Which shared groups (besides BASE, which every template gets) apply to
	 * each template id.
	 *
	 * @since 1.2.0
	 * @var   array<string, string[]>
	 */
	const GROUPS = array(
		'e-new-question'              => array( 'question' ),
		'e-community-pending'         => array( 'question', 'answer' ),
		'e-upvote-threshold'          => array( 'question' ),
		'e-unanswered-reminder'       => array( 'question' ),
		'e-daily-digest'              => array(),
		'e-question-answered'         => array( 'question', 'answer' ),
		'e-community-answer-approved' => array( 'question', 'answer' ),
		'e-followup-submitted'        => array( 'question', 'answer' ),
		'e-question-rejected'         => array( 'question' ),
		'e-review-invitation'         => array( 'question' ),
	);

	/**
	 * Build the ordered {token => description} list a template's editor
	 * sidebar should display.
	 *
	 * @since  1.2.0
	 * @param  string $template_id
	 * @return array<string,string>
	 */
	public static function for_template( $template_id ) {
		$vars = self::BASE;

		foreach ( self::GROUPS[ $template_id ] ?? array() as $group ) {
			if ( 'question' === $group ) {
				$vars = array_merge( $vars, self::QUESTION );
			} elseif ( 'answer' === $group ) {
				$vars = array_merge( $vars, self::ANSWER );
			}
		}

		if ( isset( self::EXTRAS[ $template_id ] ) ) {
			$vars = array_merge( $vars, self::EXTRAS[ $template_id ] );
		}

		return $vars;
	}

	/**
	 * Sample data used for the live preview and "send test email" — fixed,
	 * illustrative values, independent of any real store data.
	 *
	 * @since  1.2.0
	 * @return array<string,string>
	 */
	public static function sample_data() {
		return array(
			'store_name'             => get_bloginfo( 'name' ),
			'store_url'              => home_url( '/' ),
			'date'                   => date_i18n( get_option( 'date_format' ) ),
			'customer_name'          => 'Sarah K.',
			'question_text'          => 'Is this jacket fully waterproof or just water resistant?',
			'product_name'           => 'Leather Backpack Pro',
			'product_url'            => home_url( '/product/leather-backpack-pro' ),
			'answer_text'            => 'Yes, it is rated IPX6 for full waterproofing. Tested in heavy rain.',
			'author_name'            => 'Sandra M.',
			'author_role'            => 'Verified buyer',
			'upvote_count'           => '5',
			'days_waiting'           => '4',
			'followup_text'          => 'Thanks — does it come with a carry strap too?',
			'pending_count'          => '8',
			'new_questions_count'    => '12',
			'pending_answers_count'  => '3',
			'flagged_count'          => '2',
			'top_question_text'      => 'What is the actual battery life under normal volume use?',
			'top_question_upvotes'   => '12',
			'top_question_product'   => 'Wireless Speaker X3',
			'answer_url'             => admin_url( 'admin.php?page=quick-qa&qid=1' ),
			'admin_url'              => admin_url( 'admin.php?page=quick-qa' ),
		);
	}

	/**
	 * Sensible fallback text for one token when the real value is missing,
	 * empty, or unresolvable at send time. Guarantees no raw {token} is ever
	 * needed as a literal fallback — every known token has one.
	 *
	 * @since  1.2.0
	 * @param  string $token Token name, without braces.
	 * @return string
	 */
	public static function fallback( $token ) {
		$numeric = array(
			'upvote_count', 'days_waiting', 'pending_count', 'new_questions_count',
			'pending_answers_count', 'flagged_count', 'top_question_upvotes',
		);
		if ( in_array( $token, $numeric, true ) ) {
			return '0';
		}

		$text_blocks = array( 'question_text', 'answer_text', 'followup_text', 'top_question_text' );
		if ( in_array( $token, $text_blocks, true ) ) {
			return __( '(no additional details provided)', 'quick-qa-for-woocommerce' );
		}

		switch ( $token ) {
			case 'customer_name':
				return __( 'a customer', 'quick-qa-for-woocommerce' );
			case 'author_name':
				return __( 'a team member', 'quick-qa-for-woocommerce' );
			case 'author_role':
				return __( 'Team member', 'quick-qa-for-woocommerce' );
			case 'product_name':
			case 'top_question_product':
				return __( 'this product', 'quick-qa-for-woocommerce' );
			case 'product_url':
			case 'store_url':
				return home_url( '/' );
			case 'answer_url':
			case 'admin_url':
				return admin_url( 'admin.php?page=quick-qa' );
			case 'store_name':
				return get_bloginfo( 'name' );
			case 'date':
				return date_i18n( get_option( 'date_format' ) );
			default:
				return '';
		}
	}
}
