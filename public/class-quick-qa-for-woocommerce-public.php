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
	 * Load and cache plugin settings from the single `quick_qa_settings` option.
	 *
	 * @since  1.0.0
	 * @access private
	 * @return array
	 */
	private function get_settings() {
		static $cache = null;
		if ( null !== $cache ) {
			return $cache;
		}

		$defaults = array(
			'enable_scope'        => 'all',
			'enabled_categories'  => array(),
			'enabled_products'    => array(),
			'excluded_products'   => array(),
			'position'            => 'tab',
			'tab_name'            => __( 'Questions & Answers', 'quick-qa-for-woocommerce' ),
			'per_page'            => 10,
			'default_sort'        => 'recent',
			'show_search'         => true,
			'show_filter'         => true,
			'max_length'          => 500,
			'min_length'          => 10,
			'allow_community'     => true,
			'auto_lock'           => 'never',
			'pause_submissions'   => false,
			'recaptcha_enabled'   => false,
			'recaptcha_site_key'  => '',
			'recaptcha_secret_key' => '',
		);

		$saved  = get_option( 'quick_qa_settings', array() );
		$cache  = array_merge( $defaults, is_array( $saved ) ? $saved : array() );
		return $cache;
	}

	/**
	 * Check whether the Q&A widget should be shown for the given product,
	 * based on the `enable_scope` setting.
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  array $s          Plugin settings array (from get_settings()).
	 * @param  int   $product_id WooCommerce product post ID.
	 * @return bool
	 */
	private function is_qa_enabled_for_product( $s, $product_id ) {
		switch ( $s['enable_scope'] ) {
			case 'categories':
				if ( empty( $s['enabled_categories'] ) ) {
					return false;
				}
				$term_ids = wp_get_post_terms( $product_id, 'product_cat', array( 'fields' => 'ids' ) );
				if ( is_wp_error( $term_ids ) ) {
					return false;
				}
				return ! empty( array_intersect(
					array_map( 'absint', (array) $term_ids ),
					array_map( 'absint', (array) $s['enabled_categories'] )
				) );

			case 'products':
				return in_array(
					$product_id,
					array_map( 'absint', (array) $s['enabled_products'] ),
					true
				);

			case 'exclude':
				return ! in_array(
					$product_id,
					array_map( 'absint', (array) $s['excluded_products'] ),
					true
				);

			default: // 'all'
				return true;
		}
	}

	/**
	 * Add the Q&A tab to WooCommerce product tabs.
	 *
	 * Hooked onto `woocommerce_product_tabs`. Respects scope, position, and
	 * tab name settings from `quick_qa_settings`. When position is set to
	 * `below_reviews` the tab is suppressed here and rendered via
	 * `render_qa_below_reviews()` instead.
	 *
	 * @since  1.0.0
	 * @param  array $tabs Existing WooCommerce product tabs.
	 * @return array
	 */
	public function register_product_tab( $tabs ) {
		global $product;
		if ( ! $product instanceof WC_Product ) {
			return $tabs;
		}

		$s          = $this->get_settings();
		$product_id = absint( $product->get_id() );

		if ( ! $this->is_qa_enabled_for_product( $s, $product_id ) ) {
			return $tabs;
		}

		// 'below_reviews' renders via woocommerce_after_single_product_summary, not as a tab.
		if ( 'below_reviews' === $s['position'] ) {
			return $tabs;
		}

		$tab_name         = ! empty( $s['tab_name'] )
			? $s['tab_name']
			: __( 'Questions & Answers', 'quick-qa-for-woocommerce' );

		$tabs['quick_qa'] = array(
			'title'    => esc_html( $tab_name ),
			'priority' => 50,
			'callback' => array( $this, 'render_qa_tab' ),
		);

		return $tabs;
	}

	/**
	 * Render the Q&A section below the product tabs / reviews area.
	 *
	 * Hooked onto `woocommerce_after_single_product_summary` at priority 25.
	 * Only outputs when position setting is `below_reviews`.
	 *
	 * @since 1.0.0
	 */
	public function render_qa_below_reviews() {
		global $product;
		if ( ! $product instanceof WC_Product ) {
			return;
		}

		$s = $this->get_settings();
		if ( 'below_reviews' !== $s['position'] ) {
			return;
		}

		$product_id = absint( $product->get_id() );
		if ( ! $this->is_qa_enabled_for_product( $s, $product_id ) ) {
			return;
		}

		$tab_name = ! empty( $s['tab_name'] )
			? $s['tab_name']
			: __( 'Questions & Answers', 'quick-qa-for-woocommerce' );

		echo '<section class="qa-below-reviews-wrap">';
		echo '<h2 class="qa-below-reviews-title">' . esc_html( $tab_name ) . '</h2>';
		$this->render_qa_tab();
		echo '</section>';
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

		$s            = $this->get_settings();
		$product_id   = absint( $product->get_id() );
		$current_user = wp_get_current_user();
		$is_logged_in = is_user_logged_in();
		$is_verified  = $is_logged_in && $this->is_verified_buyer(
			absint( $current_user->ID ),
			$product_id
		);

		$per_page    = max( 1, min( 100, (int) $s['per_page'] ) );
		$questions   = $this->get_approved_questions( $product_id, 0, $per_page, $s['default_sort'] );
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

		// Settings-driven template variables.
		$show_search       = (bool) $s['show_search'];
		$show_filter       = (bool) $s['show_filter'];
		$default_sort      = (string) $s['default_sort'];
		$max_length        = max( 1, (int) $s['max_length'] );
		$min_length        = max( 1, (int) $s['min_length'] );
		$allow_community   = (bool) $s['allow_community'];
		$pause_submissions = (bool) $s['pause_submissions'];

		// Admins can always answer even when community answers are disabled.
		$is_admin = current_user_can( 'manage_options' ) || current_user_can( 'manage_woocommerce' );

		// reCAPTCHA — show widget only when both enabled and site key is configured.
		$recaptcha_site_key = (string) $s['recaptcha_site_key'];
		$show_recaptcha     = (bool) $s['recaptcha_enabled'] && ! empty( $recaptcha_site_key );

		include plugin_dir_path( __FILE__ ) . 'partials/quick-qa-tab.php';
	}

	/**
	 * Fetch approved questions for a product with answers attached.
	 *
	 * Executes two queries: one for questions, one for all their answers (to
	 * avoid N+1). Answers are grouped onto each question object as `->answers`.
	 *
	 * @since  1.0.0
	 * @access private
	 * @param  int    $product_id WooCommerce product post ID.
	 * @param  int    $offset     Number of rows to skip.
	 * @param  int    $limit      Maximum rows to return.
	 * @param  string $sort       Order: 'recent' | 'upvoted' | 'oldest'.
	 * @return object[]
	 * @global wpdb $wpdb
	 */
	private function get_approved_questions( $product_id, $offset = 0, $limit = 10, $sort = 'recent' ) {
		global $wpdb;

		$questions_table = $wpdb->prefix . 'quick_qa_questions';

		switch ( $sort ) {
			case 'upvoted':
				$order_by = 'upvotes DESC, created_at DESC';
				break;
			case 'oldest':
				$order_by = 'created_at ASC';
				break;
			default: // 'recent'
				$order_by = 'created_at DESC';
				break;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$questions = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$questions_table} WHERE product_id = %d AND status = 'approved' ORDER BY {$order_by} LIMIT %d OFFSET %d",
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
	 * @since  1.0.0
	 * @access private
	 * @param  int   $user_id      WordPress user ID.
	 * @param  int[] $question_ids Question IDs to check.
	 * @return int[]
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
	 * @return int[]
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
	 * Loaded in the footer so the DOM is ready when the script runs.
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

		$s = $this->get_settings();

		$recaptcha_enabled  = (bool) $s['recaptcha_enabled'];
		$recaptcha_site_key = (string) $s['recaptcha_site_key'];

		if ( $recaptcha_enabled && $recaptcha_site_key ) {
			wp_enqueue_script(
				'google-recaptcha',
				'https://www.google.com/recaptcha/api.js',
				array(),
				null,
				true
			);
		}

		wp_localize_script(
			$this->plugin_name,
			'quickQaSettings',
			array(
				'restUrl'          => esc_url_raw( rest_url( 'quick-qa/v1/' ) ),
				'nonce'            => wp_create_nonce( 'wp_rest' ),
				'recaptchaEnabled' => ( $recaptcha_enabled && $recaptcha_site_key ) ? '1' : '0',
				'perPage'          => max( 1, (int) $s['per_page'] ),
				'minLength'        => max( 1, (int) $s['min_length'] ),
				'maxLength'        => max( 1, (int) $s['max_length'] ),
				'defaultSort'      => (string) $s['default_sort'],
				'i18n'             => array(
					'askQuestion'       => __( 'Ask a question', 'quick-qa-for-woocommerce' ),
					'cancel'            => __( 'Cancel', 'quick-qa-for-woocommerce' ),
					'submit'            => __( 'Submit question', 'quick-qa-for-woocommerce' ),
					'submitting'        => __( 'Submitting…', 'quick-qa-for-woocommerce' ),
					/* translators: %d: minimum character count for a question */
					'minLength'         => sprintf(
						__( 'Your question must be at least %d characters.', 'quick-qa-for-woocommerce' ),
						max( 1, (int) $s['min_length'] )
					),
					'nameRequired'      => __( 'Please enter your name.', 'quick-qa-for-woocommerce' ),
					'recaptchaRequired' => __( 'Please complete the reCAPTCHA check.', 'quick-qa-for-woocommerce' ),
					'errorGeneric'      => __( 'Something went wrong. Please try again.', 'quick-qa-for-woocommerce' ),
					/* translators: %d replaced by JS with the question count. Singular. */
					'questionCount'     => __( '%d question about this product', 'quick-qa-for-woocommerce' ),
					/* translators: %d replaced by JS with the question count. Plural. */
					'questionsCount'    => __( '%d questions about this product', 'quick-qa-for-woocommerce' ),
					'collapse'          => __( 'Collapse', 'quick-qa-for-woocommerce' ),
					'oneAnswer'         => __( '1 answer', 'quick-qa-for-woocommerce' ),
					'answers'           => __( 'answers', 'quick-qa-for-woocommerce' ),
					'noAnswersYet'      => __( 'No answers yet', 'quick-qa-for-woocommerce' ),
					'answerMinLength'   => __( 'Your answer must be at least 10 characters.', 'quick-qa-for-woocommerce' ),
					'submitAnswer'      => __( 'Submit answer', 'quick-qa-for-woocommerce' ),
					'showMore'          => __( 'Show more questions', 'quick-qa-for-woocommerce' ),
					'loadingMore'       => __( 'Loading…', 'quick-qa-for-woocommerce' ),
				),
			)
		);
	}
}
