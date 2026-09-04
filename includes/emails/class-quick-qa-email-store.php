<?php
/**
 * Storage for the 10 Quick Q&A email templates and global sender settings.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Single reader/writer for the `quick_qa_email_templates` option. Every other
 * file (REST controller, WC_Email subclasses, cron callbacks) goes through
 * this class rather than calling get_option()/update_option() directly.
 *
 * Only admin *overrides* are persisted (subject/body null = "use the
 * hardcoded default"); the defaults themselves live here in PHP so a copy
 * fix never requires a data migration.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Email_Store {

	/**
	 * WordPress option key.
	 *
	 * @since 1.2.0
	 * @var   string
	 */
	const OPTION_KEY = 'quick_qa_email_templates';

	/**
	 * Human-facing metadata + hardcoded default subject/body for all 10
	 * templates. This is never persisted — only admin overrides are stored.
	 *
	 * group:     'admin' | 'customer' — which section of the list view it sits in.
	 * recipient: who the email addresses ('admin', 'asker', 'participants').
	 *
	 * @since  1.2.0
	 * @return array<string, array>
	 */
	public static function defaults() {
		return array(
			'e-new-question'              => array(
				'name'        => __( 'New question', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent to your team whenever a customer asks a new question on a product page.', 'quick-qa-for-woocommerce' ),
				'group'       => 'admin',
				'recipient'   => 'admin',
				'enabled'     => true,
				'subject'     => 'New question on {product_name}',
				'body'        => "Hi,\n\n{customer_name} just asked a question on {product_name}:\n\n\"{question_text}\"\n\nAnswer it directly: {answer_url}\n\n— Sent from {store_name}",
			),
			'e-community-pending'         => array(
				'name'        => __( 'Community answer pending', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent to moderators when a verified buyer or community member submits an answer that needs review.', 'quick-qa-for-woocommerce' ),
				'group'       => 'admin',
				'recipient'   => 'admin',
				'enabled'     => true,
				'subject'     => 'Community answer awaiting your review · {product_name}',
				'body'        => "Hi,\n\n{author_name} ({author_role}) submitted a community answer on {product_name}:\n\n\"{answer_text}\"\n\nIn reply to: \"{question_text}\"\n\nReview it in your dashboard: {answer_url}\n\n— Sent from {store_name}",
			),
			'e-upvote-threshold'          => array(
				'name'        => __( 'Upvote threshold', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent when many customers upvote the same unanswered question — signals high priority.', 'quick-qa-for-woocommerce' ),
				'group'       => 'admin',
				'recipient'   => 'admin',
				'enabled'     => true,
				'subject'     => '{upvote_count} customers want this answered · {product_name}',
				'body'        => "Hi,\n\nA question on {product_name} just hit {upvote_count} upvotes — multiple customers are waiting for the same answer:\n\n\"{question_text}\"\n\nThis is high priority. Answer it now: {answer_url}\n\n— Sent from {store_name}",
			),
			'e-unanswered-reminder'       => array(
				'name'        => __( 'Unanswered reminder', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent as a reminder when a question has been pending too long.', 'quick-qa-for-woocommerce' ),
				'group'       => 'admin',
				'recipient'   => 'admin',
				'enabled'     => false,
				'subject'     => 'Question on {product_name} has been waiting {days_waiting} days',
				'body'        => "Hi,\n\nThis question has been pending for {days_waiting} days:\n\n\"{question_text}\"\n\nFrom: {customer_name}\nProduct: {product_name}\n\nAnswer it now: {answer_url}\n\n— Sent from {store_name}",
			),
			'e-daily-digest'              => array(
				'name'        => __( 'Daily digest', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent each morning with a summary of overnight activity, instead of individual question alerts.', 'quick-qa-for-woocommerce' ),
				'group'       => 'admin',
				'recipient'   => 'admin',
				'enabled'     => true,
				'subject'     => 'Daily digest · {pending_count} items waiting',
				'body'        => "Good morning,\n\nHere is what came in over the last 24 hours:\n\n• {new_questions_count} new questions\n• {pending_answers_count} community answers awaiting review\n• {flagged_count} flagged items\n\nReview it all: {admin_url}\n\nTop pending question by upvotes:\n\"{top_question_text}\" — {top_question_upvotes} upvotes on {top_question_product}\n\n— Sent from {store_name}",
			),
			'e-question-answered'         => array(
				'name'        => __( 'Question answered', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent to the original asker when their question is answered by your team.', 'quick-qa-for-woocommerce' ),
				'group'       => 'customer',
				'recipient'   => 'asker',
				'enabled'     => true,
				'subject'     => 'Your question on {product_name} has been answered',
				'body'        => "Hi {customer_name},\n\nGood news — your question has been answered:\n\nYour question:\n\"{question_text}\"\n\nOur answer:\n\"{answer_text}\"\n\nView it here: {product_url}\n\nIf you have a follow-up question, you can ask it directly from the product page.\n\n— {store_name}",
			),
			'e-community-answer-approved' => array(
				'name'        => __( 'Community answer approved', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent to the original asker when a community member answers their question (after approval).', 'quick-qa-for-woocommerce' ),
				'group'       => 'customer',
				'recipient'   => 'asker',
				'enabled'     => true,
				'subject'     => 'A {author_role} answered your question on {product_name}',
				'body'        => "Hi {customer_name},\n\nA {author_role} just shared their experience on your question:\n\nYour question:\n\"{question_text}\"\n\n{author_name} answered:\n\"{answer_text}\"\n\nView it here: {product_url}\n\nYou can mark this answer as helpful or ask a follow-up directly from the page.\n\n— {store_name}",
			),
			'e-followup-submitted'        => array(
				'name'        => __( 'Follow-up submitted', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent to participants when the customer adds a follow-up after the initial answer.', 'quick-qa-for-woocommerce' ),
				'group'       => 'customer',
				'recipient'   => 'participants',
				'enabled'     => true,
				'subject'     => 'Follow-up question on {product_name}',
				'body'        => "Hi,\n\n{customer_name} replied to your answer on {product_name}:\n\nThe original question:\n\"{question_text}\"\n\nThe follow-up:\n\"{followup_text}\"\n\nView the thread: {product_url}\n\n— {store_name}",
			),
			'e-question-rejected'         => array(
				'name'        => __( 'Question rejected', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Optional polite notice sent when a question is rejected. Off by default.', 'quick-qa-for-woocommerce' ),
				'group'       => 'customer',
				'recipient'   => 'asker',
				'enabled'     => false,
				'subject'     => 'About your recent question on {product_name}',
				'body'        => "Hi {customer_name},\n\nThanks for taking the time to ask a question. Unfortunately, we were not able to publish this one — it did not match our community guidelines for product questions.\n\nIf you have a different question about the product, you can submit a new one from the product page.\n\n— {store_name}",
			),
			'e-review-invitation'         => array(
				'name'        => __( 'Review invitation', 'quick-qa-for-woocommerce' ),
				'description' => __( 'Sent a few days after a question is answered, inviting the customer to leave a product review.', 'quick-qa-for-woocommerce' ),
				'group'       => 'customer',
				'recipient'   => 'asker',
				'enabled'     => true,
				'subject'     => 'How is your {product_name}?',
				'body'        => "Hi {customer_name},\n\nWe noticed you asked a question about {product_name} a while back, and we hope our answer helped.\n\nIf you have the product now, would you mind leaving a quick review? It helps other customers make informed decisions.\n\nLeave a review: {product_url}\n\n— {store_name}",
			),
		);
	}

	/**
	 * Default global sender settings, seeded from WooCommerce's own global
	 * "From Name"/"From Address" so out-of-the-box behaviour matches what an
	 * admin already configured under WooCommerce → Settings → Emails.
	 *
	 * @since  1.2.0
	 * @return array{sender_name:string,sender_address:string,reply_to:string,footer:string}
	 */
	public static function default_global() {
		return array(
			'sender_name'    => get_option( 'woocommerce_email_from_name', get_bloginfo( 'name' ) ),
			'sender_address' => get_option( 'woocommerce_email_from_address', get_option( 'admin_email' ) ),
			'reply_to'       => get_option( 'admin_email' ),
			'footer'         => '',
		);
	}

	/**
	 * Load the saved option merged over defaults (overrides win).
	 *
	 * @since  1.2.0
	 * @return array{global: array, templates: array<string, array>}
	 */
	public static function get_all() {
		$saved = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $saved ) ) {
			$saved = array();
		}

		$global    = wp_parse_args( $saved['global'] ?? array(), self::default_global() );
		$templates = array();

		foreach ( self::defaults() as $id => $default ) {
			$override         = is_array( $saved['templates'][ $id ] ?? null ) ? $saved['templates'][ $id ] : array();
			$templates[ $id ] = array(
				'name'            => $default['name'],
				'description'     => $default['description'],
				'group'           => $default['group'],
				'recipient'       => $default['recipient'],
				'enabled'         => array_key_exists( 'enabled', $override ) ? (bool) $override['enabled'] : (bool) $default['enabled'],
				'subject'         => ( isset( $override['subject'] ) && '' !== $override['subject'] ) ? (string) $override['subject'] : $default['subject'],
				'body'            => ( isset( $override['body'] ) && '' !== $override['body'] ) ? (string) $override['body'] : $default['body'],
				'sender_override' => (string) ( $override['sender_override'] ?? '' ),
				'variables'       => Quick_Qa_Email_Vars::for_template( $id ),
			);
		}

		return array( 'global' => $global, 'templates' => $templates );
	}

	/**
	 * Load one merged template by id.
	 *
	 * @since  1.2.0
	 * @param  string $id
	 * @return array|null
	 */
	public static function get( $id ) {
		$all = self::get_all();
		return $all['templates'][ $id ] ?? null;
	}

	/**
	 * Whether a template is currently enabled.
	 *
	 * @since  1.2.0
	 * @param  string $id
	 * @return bool
	 */
	public static function is_enabled( $id ) {
		$template = self::get( $id );
		return (bool) ( $template['enabled'] ?? false );
	}

	/**
	 * Merged global sender settings.
	 *
	 * @since  1.2.0
	 * @return array{sender_name:string,sender_address:string,reply_to:string,footer:string}
	 */
	public static function get_global_sender() {
		return self::get_all()['global'];
	}

	/**
	 * Validate and persist a patch of global/template overrides.
	 *
	 * @since  1.2.0
	 * @param  array $patch  Shape: [ 'global' => [...], 'templates' => [ id => [...] ] ].
	 * @return array         The full merged resource after saving (see get_all()).
	 */
	public static function save( array $patch ) {
		$saved = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $saved ) ) {
			$saved = array();
		}
		if ( ! isset( $saved['global'] ) || ! is_array( $saved['global'] ) ) {
			$saved['global'] = array();
		}
		if ( ! isset( $saved['templates'] ) || ! is_array( $saved['templates'] ) ) {
			$saved['templates'] = array();
		}

		if ( isset( $patch['global'] ) && is_array( $patch['global'] ) ) {
			foreach ( array( 'sender_name', 'reply_to', 'footer' ) as $key ) {
				if ( array_key_exists( $key, $patch['global'] ) ) {
					$saved['global'][ $key ] = sanitize_text_field( (string) $patch['global'][ $key ] );
				}
			}
			if ( array_key_exists( 'sender_address', $patch['global'] ) ) {
				$email = sanitize_email( (string) $patch['global']['sender_address'] );
				if ( '' === $email || is_email( $email ) ) {
					$saved['global']['sender_address'] = $email;
				}
			}
			if ( array_key_exists( 'footer', $patch['global'] ) ) {
				$saved['global']['footer'] = sanitize_textarea_field( (string) $patch['global']['footer'] );
			}
		}

		$known_ids = array_keys( self::defaults() );
		if ( isset( $patch['templates'] ) && is_array( $patch['templates'] ) ) {
			foreach ( $patch['templates'] as $id => $fields ) {
				if ( ! in_array( $id, $known_ids, true ) || ! is_array( $fields ) ) {
					continue;
				}
				if ( ! isset( $saved['templates'][ $id ] ) || ! is_array( $saved['templates'][ $id ] ) ) {
					$saved['templates'][ $id ] = array();
				}
				if ( array_key_exists( 'enabled', $fields ) ) {
					$saved['templates'][ $id ]['enabled'] = (bool) $fields['enabled'];
				}
				if ( array_key_exists( 'subject', $fields ) ) {
					$saved['templates'][ $id ]['subject'] = sanitize_text_field( (string) $fields['subject'] );
				}
				if ( array_key_exists( 'body', $fields ) ) {
					$saved['templates'][ $id ]['body'] = sanitize_textarea_field( (string) $fields['body'] );
				}
				if ( array_key_exists( 'sender_override', $fields ) ) {
					$saved['templates'][ $id ]['sender_override'] = sanitize_text_field( (string) $fields['sender_override'] );
				}
			}
		}

		update_option( self::OPTION_KEY, $saved );

		return self::get_all();
	}
}
