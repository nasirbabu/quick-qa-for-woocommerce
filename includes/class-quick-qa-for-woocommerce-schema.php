<?php
/**
 * JSON-LD schema (QAPage / FAQPage) output for WooCommerce product pages.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.3.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

/**
 * Builds and outputs structured data for answered Q&A so search engines can
 * show it as a rich snippet (KAN-25).
 *
 * Reuses Quick_Qa_For_Woocommerce_Public for settings, scope checks, and
 * Q&A data access so this feature's rules never drift from what the
 * on-page widget itself already enforces.
 *
 * @since      1.3.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_For_Woocommerce_Schema {

	/**
	 * The ID of this plugin.
	 *
	 * @since  1.3.0
	 * @access private
	 * @var    string
	 */
	private $plugin_name;

	/**
	 * The current version of this plugin.
	 *
	 * @since  1.3.0
	 * @access private
	 * @var    string
	 */
	private $version;

	/**
	 * Shared public-facing instance — reused for settings, scope checks, and
	 * Q&A data access so this class never duplicates that logic.
	 *
	 * @since  1.3.0
	 * @access private
	 * @var    Quick_Qa_For_Woocommerce_Public
	 */
	private $public;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since 1.3.0
	 * @param string $plugin_name The name of the plugin.
	 * @param string $version     The current version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version     = $version;
		$this->public       = new Quick_Qa_For_Woocommerce_Public( $plugin_name, $version );
	}

	/**
	 * Output JSON-LD schema for the current product's qualifying Q&A.
	 *
	 * Hooked onto `wp_head` at priority 5. Emits nothing when schema is
	 * disabled, delegated to another SEO plugin, the product is outside the
	 * plugin's configured scope, or there are no qualifying questions.
	 *
	 * @since 1.3.0
	 */
	public function render_schema() {
		if ( ! is_product() ) {
			return;
		}

		// wp_head fires before WooCommerce populates the `$product` global
		// (that happens on the `the_post` hook, once the theme's loop
		// actually runs) — resolve the product from the main query instead.
		$product_id = absint( get_queried_object_id() );
		if ( ! $product_id || ! wc_get_product( $product_id ) ) {
			return;
		}

		$s = $this->public->get_settings();

		if ( empty( $s['seo_enabled'] ) || ! empty( $s['seo_delegate_to_seo_plugin'] ) ) {
			return;
		}

		if ( ! $this->public->is_qa_enabled_for_product( $s, $product_id ) ) {
			return;
		}

		$blocks = $this->build_schema_blocks( $product_id, $s );

		foreach ( $blocks as $block ) {
			echo '<script type="application/ld+json">' . wp_json_encode( $block ) . '</script>' . "\n";
		}
	}

	/**
	 * Build the JSON-LD block(s) for a product's qualifying Q&A.
	 *
	 * Shared by render_schema() and the admin settings preview endpoint so
	 * the preview never drifts from what's actually output on the page.
	 *
	 * QAPage models a page about *one* question with multiple answers, so
	 * each qualifying question becomes its own separate schema block.
	 * FAQPage models several Q&A pairs on one page, so all qualifying
	 * questions are collected into a single block's mainEntity array.
	 *
	 * @since  1.3.0
	 * @param  int   $product_id WooCommerce product post ID.
	 * @param  array $s          Plugin settings array (from get_settings()).
	 * @return array[] Zero or more JSON-LD-ready associative arrays.
	 */
	public function build_schema_blocks( $product_id, $s ) {
		$questions = $this->public->get_approved_questions( $product_id, 0, 50, 'upvoted' );
		$questions = $this->filter_qualifying_questions( $questions, $s );

		$max       = max( 1, (int) $s['seo_max_per_product'] );
		$questions = array_slice( $questions, 0, $max );

		if ( empty( $questions ) ) {
			return array();
		}

		if ( 'FAQPage' === $s['seo_schema_type'] ) {
			return $this->build_faq_page_block( $questions );
		}

		return $this->build_qa_page_blocks( $questions, $product_id );
	}

	/**
	 * Build a single FAQPage block containing every qualifying question.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  object[] $questions Qualifying questions with ->answers attached.
	 * @return array[]  Zero or one JSON-LD-ready associative array.
	 */
	private function build_faq_page_block( $questions ) {
		$entities = array();

		foreach ( $questions as $question ) {
			$accepted = $this->pick_accepted_answer( $question );
			if ( ! $accepted ) {
				continue;
			}

			$entities[] = array(
				'@type'          => 'Question',
				'name'           => $question->question_text,
				'acceptedAnswer' => array(
					'@type' => 'Answer',
					'text'  => $accepted->answer_text,
				),
			);
		}

		if ( empty( $entities ) ) {
			return array();
		}

		return array(
			array(
				'@context'   => 'https://schema.org',
				'@type'      => 'FAQPage',
				'mainEntity' => $entities,
			),
		);
	}

	/**
	 * Build one QAPage block per qualifying question.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  object[] $questions  Qualifying questions with ->answers attached.
	 * @param  int      $product_id WooCommerce product post ID.
	 * @return array[]  Zero or more JSON-LD-ready associative arrays.
	 */
	private function build_qa_page_blocks( $questions, $product_id ) {
		$blocks      = array();
		$product_url = get_permalink( $product_id );

		foreach ( $questions as $question ) {
			$accepted = $this->pick_accepted_answer( $question );
			if ( ! $accepted ) {
				continue;
			}

			$suggested = array();
			foreach ( $question->answers as $answer ) {
				if ( (int) $answer->id === (int) $accepted->id ) {
					continue;
				}
				$suggested[] = array(
					'@type'       => 'Answer',
					'text'        => $answer->answer_text,
					'upvoteCount' => (int) $answer->upvotes,
					'author'      => array(
						'@type' => 'Person',
						'name'  => $this->resolve_answer_author( $answer ),
					),
					'dateCreated' => $this->to_iso8601( $answer->created_at ),
				);
			}

			$main_entity = array(
				'@type'          => 'Question',
				'name'           => $question->question_text,
				'text'           => $question->question_text,
				'answerCount'    => count( $question->answers ),
				'upvoteCount'    => (int) $question->upvotes,
				'dateCreated'    => $this->to_iso8601( $question->created_at ),
				'author'         => array(
					'@type' => 'Person',
					'name'  => $this->resolve_question_author( $question ),
				),
				'acceptedAnswer' => array(
					'@type'       => 'Answer',
					'text'        => $accepted->answer_text,
					'upvoteCount' => (int) $accepted->upvotes,
					'author'      => array(
						'@type' => 'Person',
						'name'  => $this->resolve_answer_author( $accepted ),
					),
					'dateCreated' => $this->to_iso8601( $accepted->created_at ),
				),
			);

			if ( ! empty( $suggested ) ) {
				$main_entity['suggestedAnswer'] = $suggested;
			}

			$blocks[] = array(
				'@context'   => 'https://schema.org',
				'@type'      => 'QAPage',
				'mainEntity' => $main_entity,
				'about'      => array(
					'@type' => 'Product',
					'name'  => get_the_title( $product_id ),
					'url'   => $product_url,
				),
			);
		}

		return $blocks;
	}

	/**
	 * Filter approved questions down to the ones that qualify for schema
	 * under the store's `seo_include_rule` setting.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  object[] $questions Questions with ->answers already attached.
	 * @param  array    $s         Plugin settings array.
	 * @return object[]
	 */
	private function filter_qualifying_questions( $questions, $s ) {
		$rule = $s['seo_include_rule'];

		return array_values( array_filter( $questions, function ( $question ) use ( $rule, $s ) {
			if ( empty( $question->answers ) ) {
				return false;
			}

			if ( 'staff-only' === $rule ) {
				foreach ( $question->answers as $answer ) {
					if ( 'admin' === $answer->answer_type ) {
						return true;
					}
				}
				return false;
			}

			if ( 'upvoted' === $rule ) {
				return (int) $question->upvotes >= (int) $s['seo_upvote_min'];
			}

			// 'all-answered'.
			return true;
		} ) );
	}

	/**
	 * Pick the answer to use as a question's acceptedAnswer: the first
	 * admin (staff) answer if one exists, otherwise the first approved
	 * answer of any type.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  object $question Question with ->answers attached.
	 * @return object|null
	 */
	private function pick_accepted_answer( $question ) {
		foreach ( $question->answers as $answer ) {
			if ( 'admin' === $answer->answer_type ) {
				return $answer;
			}
		}

		return ! empty( $question->answers[0] ) ? $question->answers[0] : null;
	}

	/**
	 * Resolve a question's author display name — the asking user's display
	 * name when logged in, otherwise the guest name they gave.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  object $question
	 * @return string
	 */
	private function resolve_question_author( $question ) {
		if ( ! empty( $question->user_id ) ) {
			$user = get_userdata( (int) $question->user_id );
			if ( $user ) {
				return $user->display_name;
			}
		}

		return ! empty( $question->guest_name ) ? $question->guest_name : __( 'Anonymous', 'quick-qa-for-woocommerce' );
	}

	/**
	 * Resolve an answer's author display name. Every answer belongs to a
	 * logged-in user (staff or community member) — there is no guest path.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  object $answer
	 * @return string
	 */
	private function resolve_answer_author( $answer ) {
		$user = get_userdata( (int) $answer->user_id );

		return $user ? $user->display_name : __( 'Anonymous', 'quick-qa-for-woocommerce' );
	}

	/**
	 * Convert a MySQL UTC datetime string (as stored via
	 * current_time('mysql', true)) to ISO 8601 for JSON-LD dateCreated
	 * fields.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  string $mysql_datetime
	 * @return string
	 */
	private function to_iso8601( $mysql_datetime ) {
		$timestamp = strtotime( (string) $mysql_datetime );

		return $timestamp ? gmdate( 'c', $timestamp ) : '';
	}

	/**
	 * Detect a known SEO plugin so the delegation setting's banner can name
	 * it. Used by the REST settings response only — never stored.
	 *
	 * @since  1.3.0
	 * @return string|null
	 */
	public static function detect_seo_plugin() {
		if ( defined( 'WPSEO_VERSION' ) ) {
			return 'Yoast SEO';
		}

		if ( class_exists( 'RankMath' ) ) {
			return 'RankMath';
		}

		if ( defined( 'AIOSEO_VERSION' ) ) {
			return 'All in One SEO';
		}

		return null;
	}
}
