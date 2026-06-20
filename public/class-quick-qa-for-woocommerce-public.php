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
		$questions = $this->get_approved_questions( $product_id );

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
	private function get_approved_questions( $product_id ) {
		global $wpdb;

		$questions_table = $wpdb->prefix . 'quick_qa_questions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$questions = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$questions_table} WHERE product_id = %d AND status = 'approved' ORDER BY created_at DESC LIMIT %d",
				$product_id,
				absint( get_option( 'quick_qa_per_page', 10 ) )
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
				'restUrl' => esc_url_raw( rest_url( 'quick-qa/v1/' ) ),
				'nonce'   => wp_create_nonce( 'wp_rest' ),
				'i18n'    => array(
					'askQuestion'  => __( 'Ask a question', 'quick-qa-for-woocommerce' ),
					'cancel'       => __( 'Cancel', 'quick-qa-for-woocommerce' ),
					'submit'       => __( 'Submit question', 'quick-qa-for-woocommerce' ),
					'submitting'   => __( 'Submitting…', 'quick-qa-for-woocommerce' ),
					'minLength'    => __( 'Your question must be at least 10 characters.', 'quick-qa-for-woocommerce' ),
					'nameRequired' => __( 'Please enter your name.', 'quick-qa-for-woocommerce' ),
					'errorGeneric' => __( 'Something went wrong. Please try again.', 'quick-qa-for-woocommerce' ),
				),
			)
		);
	}
}
