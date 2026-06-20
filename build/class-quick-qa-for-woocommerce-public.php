<?php
/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Registers the WooCommerce product tab, fetches Q&A data from the database,
 * and enqueues frontend assets only on single product pages.
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/public
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_For_Woocommerce_Public {

	/**
	 * The ID of this plugin.
	 *
	 * @since  1.0.0
	 * @access private
	 * @var    string
	 */
	private $plugin_name;

	/**
	 * The current version of this plugin.
	 *
	 * @since  1.0.0
	 * @access private
	 * @var    string
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since 1.0.0
	 * @param string $plugin_name The name of the plugin.
	 * @param string $version     The current version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version     = $version;
	}

	/**
	 * Add the Q&A tab to WooCommerce product tabs.
	 *
	 * Hooked onto `woocommerce_product_tabs`. The tab title is configurable
	 * via the plugin settings (stored as `quick_qa_tab_name`).
	 *
	 * @since  1.0.0
	 * @param  array $tabs Existing WooCommerce product tabs.
	 * @return array
	 */
	public function register_product_tab( $tabs ) {
		$tabs['quick_qa'] = array(
			'title'    => esc_html(
				get_option(
					'quick_qa_tab_name',
					/* translators: WooCommerce product tab label. */
					__( 'Questions &amp; Answers', 'quick-qa-for-woocommerce' )
				)
			),
			'priority' => 50,
			'callback' => array( $this, 'render_qa_tab' ),
		);

		return $tabs;
	}

	/**
	 * Render the Q&A tab content.
	 *
	 * Resolves the current product, fetches approved questions with their
	 * answers, determines the visitor's user context (logged-in / guest /
	 * verified buyer), then loads the tab partial template.
	 *
	 * @since 1.0.0
	 */
	public function render_qa_tab() {
		global $product;

		if ( ! $product instanceof WC_Product ) {
			return;
		}

		$product_id   = absint( $product->get_id() );
		$current_user = wp_get_current_user();
		$is_logged_in = is_user_logged_in();
		$is_verified  = $is_logged_in && $this->is_verified_buyer(
			absint( $current_user->ID ),
			$product_id
		);
		$per_page    = 3;
		$questions   = $this->get_approved_questions( $product_id, 0, $per_page );
		$total_count = $this->get_total_approved_questions_count( $product_id );
		$has_more    = $total_count > count( $questions );

		// Determine which questions the current user has already upvoted.
		$user_voted_ids = array();
		if ( $is_logged_in && ! empty( $questions ) ) {
			$question_ids   = array_map( 'absint', wp_list_pluck( $questions, 'id' ) );
			$user_voted_ids = $this->get_user_question_votes( absint( $current_user->ID ), $question_ids );
		}

		// Determine which answers the current user has marked as helpful.
		$user_helpful_ids = array();
		if ( $is_logged_in && ! empty( $questions ) ) {
			$all_answer_ids = array();
			foreach ( $questions as $q ) {
				foreach ( $q->answers as $a ) {
					$all_answer_ids[] = (int) $a->id;
				}
			}
			if ( ! empty( $all_answer_ids ) ) {
				$user_helpful_ids = $this->get_user_answer_votes( absint( $current_user->ID ), $all_answer_ids );
			}
		}

		// reCAPTCHA — show widget only when both enabled and site key is configured.
		$recaptcha_site_key = (string) get_option( 'quick_qa_recaptcha_site_key', '' );
		$show_recaptcha     = (bool) get_option( 'quick_qa_recaptcha_enabled', false ) && ! empty( $recaptcha_site_key );

		include plugin_dir_path( __FILE__ ) . 'partials/quick-qa-tab.php';
	}

	/**
	 * Fetch all approved questions for a product, with approved answers attached.
	 *
	 * Executes two queries: one for questions, one for all their answers (to
	 * avoid N+1). Answers are grouped onto each question object as `->answers`.
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  int $product_id WooCommerce product post ID.
	 * @return object[]        Array of question row objects.
	 * @global wpdb $wpdb
	 */
	private function get_approved_questions( $product_id, $offset = 0, $limit = 3 ) {
		global $wpdb;

		$questions_table = $wpdb->prefix . 'quick_qa_questions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$questions = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$questions_table} WHERE product_id = %d AND status = 'approved' ORDER BY created_at DESC LIMIT %d OFFSET %d",
				$product_id,
				$limit,
				$offset
			)
		);

		if ( empty( $questions ) ) {
			return array();
		}

		// Fetch answers in a single query and map them onto their questions.
		$question_ids = array_map( 'absint', wp_list_pluck( $questions, 'id' ) );
		$answers      = $this->get_approved_answers( $question_ids );

		$answers_map = array();
		foreach ( $answers as $answer ) {
			$answers_map[ (int) $answer->question_id ][] = $answer;
		}

		foreach ( $questions as $question ) {
			$question->answers = $answers_map[ (int) $question->id ] ?? array();
		}

		return $questions;
	}

	/**
	 * Count all approved questions for a product (used for pagination).
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  int $product_id WooCommerce product post ID.
	 * @return int
	 * @global wpdb $wpdb
	 */
	public function get_total_approved_questions_count( $product_id ) {
		global $wpdb;

		$questions_table = $wpdb->prefix . 'quick_qa_questions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT COUNT(*) FROM {$questions_table} WHERE product_id = %d AND status = 'approved'",
				$product_id
			)
		);
	}

	/**
	 * Fetch approved answers for a set of question IDs.
	 *
	 * Admin answers sort before community answers; within each type, higher
	 * upvote counts sort first, then chronologically oldest first.
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  int[] $question_ids Array of question IDs.
	 * @return object[]
	 * @global wpdb $wpdb
	 */
	private function get_approved_answers( array $question_ids ) {
		if ( empty( $question_ids ) ) {
			return array();
		}

		global $wpdb;

		$answers_table = $wpdb->prefix . 'quick_qa_answers';
		$placeholders  = implode( ', ', array_fill( 0, count( $question_ids ), '%d' ) );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$answers_table} WHERE question_id IN ( {$placeholders} ) AND status = 'approved' ORDER BY answer_type DESC, upvotes DESC, created_at ASC",
				...$question_ids
			)
		);
	}

	/**
	 * Fetch the IDs of questions the given user has upvoted.
	 *
	 * Used to set the initial `is-voted` state on upvote buttons without
	 * requiring a separate per-question query (single IN() query).
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  int   $user_id      WordPress user ID.
	 * @param  int[] $question_ids Question IDs to check.
	 * @return int[]               Subset of $question_ids the user has upvoted.
	 * @global wpdb $wpdb
	 */
	private function get_user_question_votes( $user_id, array $question_ids ) {
		if ( ! $user_id || empty( $question_ids ) ) {
			return array();
		}

		global $wpdb;

		$votes_table  = $wpdb->prefix . 'quick_qa_votes';
		$placeholders = implode( ', ', array_fill( 0, count( $question_ids ), '%d' ) );
		$args         = array_merge( array( $user_id ), $question_ids );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$voted_ids = $wpdb->get_col(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT object_id FROM {$votes_table} WHERE user_id = %d AND object_type = 'question' AND object_id IN ( {$placeholders} )",
				...$args
			)
		);

		return array_map( 'absint', $voted_ids ?: array() );
	}

	/**
	 * Fetch the IDs of answers the given user has marked as helpful.
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  int   $user_id    WordPress user ID.
	 * @param  int[] $answer_ids Answer IDs to check.
	 * @return int[]             Subset of $answer_ids the user has voted helpful.
	 * @global wpdb $wpdb
	 */
	private function get_user_answer_votes( $user_id, array $answer_ids ) {
		if ( ! $user_id || empty( $answer_ids ) ) {
			return array();
		}

		global $wpdb;

		$votes_table  = $wpdb->prefix . 'quick_qa_votes';
		$placeholders = implode( ', ', array_fill( 0, count( $answer_ids ), '%d' ) );
		$args         = array_merge( array( $user_id ), $answer_ids );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$voted_ids = $wpdb->get_col(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT object_id FROM {$votes_table} WHERE user_id = %d AND object_type = 'answer' AND object_id IN ( {$placeholders} )",
				...$args
			)
		);

		return array_map( 'absint', $voted_ids ?: array() );
	}

	/**
	 * Determine whether the current user has purchased this product.
	 *
	 * Delegates to WooCommerce's `wc_customer_bought_product()` and caches
	 * the result in the WordPress object cache for one hour to avoid repeated
	 * order queries on the same page load or across a short visit.
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  int $user_id    WordPress user ID.
	 * @param  int $product_id WooCommerce product ID.
	 * @return bool
	 */
	private function is_verified_buyer( $user_id, $product_id ) {
		if ( ! $user_id || ! $product_id ) {
			return false;
		}

		$cache_key = "quick_qa_vb_{$user_id}_{$product_id}";
		$cached    = wp_cache_get( $cache_key, 'quick_qa' );

		if ( false !== $cached ) {
			return (bool) $cached;
		}

		$user_data = get_userdata( $user_id );
		$result    = $user_data
			? wc_customer_bought_product( $user_data->user_email, $user_id, $product_id )
			: false;

		wp_cache_set( $cache_key, (int) $result, 'quick_qa', HOUR_IN_SECONDS );

		return $result;
	}

	/**
	 * Enqueue the public stylesheet — only on single product pages.
	 *
	 * @since 1.0.0
	 */
	public function enqueue_styles() {
		if ( ! is_product() ) {
			return;
		}

		wp_enqueue_style(
			$this->plugin_name,
			plugin_dir_url( __FILE__ ) . 'css/quick-qa-for-woocommerce-public.css',
			array(),
			$this->version,
			'all'
		);
	}

	/**
	 * Enqueue the public JavaScript — only on single product pages.
	 *
	 * Loaded in the footer (`$in_footer = true`) so the DOM is ready and the
	 * script can query elements without a DOMContentLoaded wrapper.
	 *
	 * @since 1.0.0
	 */
	public function enqueue_scripts() {
		if ( ! is_product() ) {
			return;
		}

		wp_enqueue_script(
			$this->plugin_name,
			plugin_dir_url( __FILE__ ) . 'js/quick-qa-for-woocommerce-public.js',
			array(),
			$this->version,
			true
		);

		// Conditionally load Google reCAPTCHA v2 API.
		$recaptcha_enabled  = (bool) get_option( 'quick_qa_recaptcha_enabled', false );
		$recaptcha_site_key = (string) get_option( 'quick_qa_recaptcha_site_key', '' );

		if ( $recaptcha_enabled && $recaptcha_site_key ) {
			wp_enqueue_script(
				'google-recaptcha',
				'https://www.google.com/recaptcha/api.js',
				array(),
				null,
				true
			);
		}

		/**
		 * Pass REST API URL, nonce, and translatable strings to the frontend JS.
		 *
		 * The nonce uses the standard WordPress REST cookie (`wp_rest`) so
		 * WordPress can resolve the current user from the X-WP-Nonce header on
		 * every fetch() request — no manual session handling required.
		 */
		wp_localize_script(
			$this->plugin_name,
			'quickQaSettings',
			array(
				'restUrl'          => esc_url_raw( rest_url( 'quick-qa/v1/' ) ),
				'nonce'            => wp_create_nonce( 'wp_rest' ),
				'recaptchaEnabled' => ( $recaptcha_enabled && $recaptcha_site_key ) ? '1' : '0',
				'i18n'             => array(
					'askQuestion'      => __( 'Ask a question', 'quick-qa-for-woocommerce' ),
					'cancel'           => __( 'Cancel', 'quick-qa-for-woocommerce' ),
					'submit'           => __( 'Submit question', 'quick-qa-for-woocommerce' ),
					'submitting'       => __( 'Submitting…', 'quick-qa-for-woocommerce' ),
					'minLength'        => __( 'Your question must be at least 10 characters.', 'quick-qa-for-woocommerce' ),
					'nameRequired'     => __( 'Please enter your name.', 'quick-qa-for-woocommerce' ),
					'recaptchaRequired' => __( 'Please complete the reCAPTCHA check.', 'quick-qa-for-woocommerce' ),
					'errorGeneric'     => __( 'Something went wrong. Please try again.', 'quick-qa-for-woocommerce' ),
					/* translators: %d replaced by JS with the question count. Singular. */
					'questionCount'    => __( '%d question about this product', 'quick-qa-for-woocommerce' ),
					/* translators: %d replaced by JS with the question count. Plural. */
					'questionsCount'   => __( '%d questions about this product', 'quick-qa-for-woocommerce' ),
					'collapse'         => __( 'Collapse', 'quick-qa-for-woocommerce' ),
					'oneAnswer'        => __( '1 answer', 'quick-qa-for-woocommerce' ),
					'answers'          => __( 'answers', 'quick-qa-for-woocommerce' ),
					'noAnswersYet'     => __( 'No answers yet', 'quick-qa-for-woocommerce' ),
					'answerMinLength'  => __( 'Your answer must be at least 10 characters.', 'quick-qa-for-woocommerce' ),
					'submitAnswer'     => __( 'Submit answer', 'quick-qa-for-woocommerce' ),
					'showMore'         => __( 'Show more questions', 'quick-qa-for-woocommerce' ),
					'loadingMore'      => __( 'Loading…', 'quick-qa-for-woocommerce' ),
				),
			)
		);
	}
}
