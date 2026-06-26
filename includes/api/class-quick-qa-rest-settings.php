<?php
/**
 * Settings REST API controller.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Handles the plugin settings REST routes:
 *
 *   GET  /admin/settings            — return current settings object
 *   POST /admin/settings            — validate, save, return updated object
 *   GET  /admin/settings/categories — return WooCommerce product categories
 *   GET  /admin/settings/products   — return WooCommerce products
 *
 * All plugin settings are stored as a single serialised array under the
 * WordPress option key 'quick_qa_settings'.  One row in the options table
 * instead of one row per field — easier to export, import, and reset.
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Rest_Settings extends Quick_Qa_Rest_Controller {

	/**
	 * The single WordPress option key used to store all plugin settings.
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const OPTION_KEY = 'quick_qa_settings';

	// =========================================================================
	// Route registration
	// =========================================================================

	/**
	 * Register settings routes.
	 *
	 * @since 1.0.0
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'require_admin' ),
				),
				array(
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => array( $this, 'save_settings' ),
					'permission_callback' => array( $this, 'require_admin' ),
				),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/settings/categories',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_categories' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/settings/products',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_products' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);
	}

	// =========================================================================
	// Callbacks
	// =========================================================================

	/**
	 * GET /wp-json/quick-qa/v1/admin/settings
	 *
	 * Loads the single option, fills missing keys with defaults, and returns
	 * a type-safe response object.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function get_settings( WP_REST_Request $request ) {
		$s = $this->load();

		return rest_ensure_response( array(

			// General — scope
			'enable_scope'           => (string) $s['enable_scope'],
			'enabled_categories'     => $this->cast_id_array( $s['enabled_categories'] ),
			'enabled_products'       => $this->cast_id_array( $s['enabled_products'] ),
			'excluded_products'      => $this->cast_id_array( $s['excluded_products'] ),

			// General — display
			'position'               => (string) $s['position'],
			'tab_name'               => (string) $s['tab_name'],
			'per_page'               => (int) $s['per_page'],

			// General — sorting & filters
			'default_sort'           => (string) $s['default_sort'],
			'show_search'            => (bool) $s['show_search'],
			'show_filter'            => (bool) $s['show_filter'],

			// General — question limits
			'max_length'             => (int) $s['max_length'],
			'min_length'             => (int) $s['min_length'],

			// General — community answers
			'allow_community'        => (bool) $s['allow_community'],
			'auto_lock'              => (string) $s['auto_lock'],

			// General — operations
			'pause_submissions'      => (bool) $s['pause_submissions'],

			// Appearance
			'appr_color'              => (string) $s['appr_color'],
			'appr_radius'             => (string) $s['appr_radius'],
			'appr_avatar_style'       => (string) $s['appr_avatar_style'],
			'appr_card_style'         => (string) $s['appr_card_style'],
			'appr_font_mode'          => (string) $s['appr_font_mode'],
			'appr_font_custom'        => (string) $s['appr_font_custom'],
			'appr_font_size'          => (string) $s['appr_font_size'],
			'appr_density'            => (string) $s['appr_density'],
			'appr_show_upvotes'       => (bool) $s['appr_show_upvotes'],
			'appr_show_helpful'       => (bool) $s['appr_show_helpful'],
			'appr_show_role_badges'   => (bool) $s['appr_show_role_badges'],
			'appr_show_best_highlight' => (bool) $s['appr_show_best_highlight'],
			'appr_show_avatars'       => (bool) $s['appr_show_avatars'],
			'appr_custom_css'         => (string) $s['appr_custom_css'],

			// Notifications
			'notify_new_question'       => (bool) $s['notify_new_question'],
			'new_question_recipients'   => (string) $s['new_question_recipients'],
			'notify_mode'               => (string) $s['notify_mode'],
			'digest_time'               => (string) $s['digest_time'],
			'notify_community_answer'   => (bool) $s['notify_community_answer'],
			'notify_upvote_threshold'   => (bool) $s['notify_upvote_threshold'],
			'upvote_threshold_value'    => (int) $s['upvote_threshold_value'],
			'notify_unanswered_reminder' => (bool) $s['notify_unanswered_reminder'],
			'unanswered_reminder_days'  => (int) $s['unanswered_reminder_days'],
			'slack_webhook'             => (string) $s['slack_webhook'],

			// Moderation
			'question_approval_mode' => (string) $s['question_approval_mode'],
			'profanity_filter'       => (bool) $s['profanity_filter'],
			'profanity_words'        => (string) $s['profanity_words'],
			'auto_reject_short'      => (bool) $s['auto_reject_short'],
			'email_blocklist'        => (string) $s['email_blocklist'],
			'email_allowlist'        => (string) $s['email_allowlist'],

			// Submission
			'who_can_ask'              => (string) $s['who_can_ask'],
			'require_email_for_guests' => (bool) $s['require_email_for_guests'],
			'enable_honeypot'          => (bool) $s['enable_honeypot'],
			'submission_rate_limit'    => (int) $s['submission_rate_limit'],
			'recaptcha_enabled'        => (bool) $s['recaptcha_enabled'],
			'recaptcha_site_key'       => (string) $s['recaptcha_site_key'],
			'recaptcha_secret_key'     => (string) $s['recaptcha_secret_key'],

			// Community
			'allow_verified_buyers'     => (bool) $s['allow_verified_buyers'],
			'allow_logged_in_customers' => (bool) $s['allow_logged_in_customers'],
			'verified_buyer_approval'   => (string) $s['verified_buyer_approval'],
			'community_approval'        => (string) $s['community_approval'],
			'followup_approval'         => (string) $s['followup_approval'],
			'enable_trust_tier'         => (bool) $s['enable_trust_tier'],
			'trust_helpful_threshold'   => (int) $s['trust_helpful_threshold'],
		) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/settings
	 *
	 * Validates and sanitises every incoming field, merges the result with
	 * the currently saved settings, then persists everything as one option.
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function save_settings( WP_REST_Request $request ) {
		$body    = $request->get_json_params();
		$current = $this->load();
		$patch   = array();

		// Enum fields — only accept values from the allow-list.
		$enums = array(
			'appr_radius'             => array( 'sharp', 'rounded', 'pill' ),
			'appr_avatar_style'       => array( 'circle', 'square', 'hidden' ),
			'appr_card_style'         => array( 'bordered', 'filled', 'minimal' ),
			'appr_font_mode'          => array( 'inherit', 'system', 'custom' ),
			'appr_font_size'          => array( 'small', 'medium', 'large' ),
			'appr_density'            => array( 'compact', 'comfortable', 'spacious' ),
			'enable_scope'            => array( 'all', 'categories', 'products', 'exclude' ),
			'position'                => array( 'tab', 'below_reviews' ),
			'default_sort'            => array( 'recent', 'upvoted', 'oldest' ),
			'auto_lock'               => array( 'never', '30', '60', '90' ),
			'question_approval_mode'  => array( 'manual', 'auto', 'trust-tiered' ),
			'who_can_ask'             => array( 'both', 'logged-in', 'guests' ),
			'notify_mode'             => array( 'instant', 'digest' ),
			'verified_buyer_approval' => array( 'require', 'auto' ),
			'community_approval'      => array( 'always', 'auto_trusted' ),
			'followup_approval'       => array( 'auto', 'require' ),
		);
		foreach ( $enums as $key => $allowed ) {
			if ( isset( $body[ $key ] ) && in_array( $body[ $key ], $allowed, true ) ) {
				$patch[ $key ] = $body[ $key ];
			}
		}

		// ID array fields — cast each element to a positive integer.
		foreach ( array( 'enabled_categories', 'enabled_products', 'excluded_products' ) as $key ) {
			if ( array_key_exists( $key, $body ) && is_array( $body[ $key ] ) ) {
				$patch[ $key ] = array_values( array_map( 'absint', $body[ $key ] ) );
			}
		}

		// Hex color (appr_color) — validate format before storing.
		if ( array_key_exists( 'appr_color', $body ) ) {
			$color = trim( $body['appr_color'] );
			if ( preg_match( '/^#[0-9A-Fa-f]{6}$/', $color ) ) {
				$patch['appr_color'] = strtoupper( $color );
			}
		}

		// Single-line text fields.
		foreach ( array( 'tab_name', 'appr_font_custom', 'digest_time', 'slack_webhook', 'recaptcha_site_key', 'recaptcha_secret_key' ) as $key ) {
			if ( array_key_exists( $key, $body ) ) {
				$patch[ $key ] = sanitize_text_field( $body[ $key ] );
			}
		}

		// Multi-line text fields (newlines preserved).
		foreach ( array( 'appr_custom_css', 'profanity_words', 'email_blocklist', 'email_allowlist', 'new_question_recipients' ) as $key ) {
			if ( array_key_exists( $key, $body ) ) {
				$patch[ $key ] = sanitize_textarea_field( $body[ $key ] );
			}
		}

		// Boolean fields.
		$bool_keys = array(
			'appr_show_upvotes', 'appr_show_helpful', 'appr_show_role_badges',
			'appr_show_best_highlight', 'appr_show_avatars',
			'show_search', 'show_filter', 'allow_community', 'pause_submissions',
			'profanity_filter', 'auto_reject_short',
			'notify_new_question', 'notify_community_answer',
			'notify_upvote_threshold', 'notify_unanswered_reminder',
			'require_email_for_guests', 'enable_honeypot', 'recaptcha_enabled',
			'allow_verified_buyers', 'allow_logged_in_customers', 'enable_trust_tier',
		);
		foreach ( $bool_keys as $key ) {
			if ( array_key_exists( $key, $body ) ) {
				$patch[ $key ] = (bool) $body[ $key ];
			}
		}

		// Integer fields with min/max clamps.
		$int_fields = array(
			'per_page'                 => array( 1, 100 ),
			'max_length'               => array( 50, 2000 ),
			'min_length'               => array( 1, 200 ),
			'upvote_threshold_value'   => array( 1, 999 ),
			'unanswered_reminder_days' => array( 1, 365 ),
			'submission_rate_limit'    => array( 1, 100 ),
			'trust_helpful_threshold'  => array( 1, 50 ),
		);
		foreach ( $int_fields as $key => $range ) {
			if ( array_key_exists( $key, $body ) ) {
				$patch[ $key ] = max( $range[0], min( $range[1], (int) $body[ $key ] ) );
			}
		}

		// Merge validated patch over the current settings and write one option.
		update_option( self::OPTION_KEY, array_merge( $current, $patch ) );

		return $this->get_settings( $request );
	}

	/**
	 * GET /wp-json/quick-qa/v1/admin/settings/categories
	 *
	 * Returns all WooCommerce product categories as [{id, name}].
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function get_categories( WP_REST_Request $request ) {
		$terms = get_terms( array(
			'taxonomy'   => 'product_cat',
			'hide_empty' => false,
			'orderby'    => 'name',
			'order'      => 'ASC',
			'number'     => 200,
		) );

		if ( is_wp_error( $terms ) ) {
			return rest_ensure_response( array() );
		}

		$result = array();
		foreach ( $terms as $term ) {
			$result[] = array(
				'id'   => (int) $term->term_id,
				'name' => $term->name,
			);
		}

		return rest_ensure_response( $result );
	}

	/**
	 * GET /wp-json/quick-qa/v1/admin/settings/products
	 *
	 * Returns published WooCommerce products as [{id, name}].
	 *
	 * @since  1.0.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 */
	public function get_products( WP_REST_Request $request ) {
		$posts = get_posts( array(
			'post_type'      => 'product',
			'post_status'    => 'publish',
			'posts_per_page' => 200,
			'orderby'        => 'title',
			'order'          => 'ASC',
			'fields'         => 'ids',
		) );

		$result = array();
		foreach ( $posts as $post_id ) {
			$result[] = array(
				'id'   => (int) $post_id,
				'name' => get_the_title( $post_id ),
			);
		}

		return rest_ensure_response( $result );
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	/**
	 * Default values for every plugin setting.
	 *
	 * Must stay in sync with DEFAULT_SETTINGS in src/components/Settings/constants.js.
	 * When a new setting is added, update both files.
	 *
	 * @since  1.0.0
	 * @return array<string, mixed>
	 */
	private function defaults() {
		return array(

			// General — scope
			'enable_scope'           => 'all',
			'enabled_categories'     => array(),
			'enabled_products'       => array(),
			'excluded_products'      => array(),

			// General — display
			'position'               => 'tab',
			'tab_name'               => 'Questions & Answers',
			'per_page'               => 10,

			// General — sorting & filters
			'default_sort'           => 'recent',
			'show_search'            => true,
			'show_filter'            => true,

			// General — question limits
			'max_length'             => 500,
			'min_length'             => 10,

			// General — community answers
			'allow_community'        => true,
			'auto_lock'              => 'never',

			// General — operations
			'pause_submissions'      => false,

			// Appearance
			'appr_color'               => '#FF6B4A',
			'appr_radius'              => 'rounded',
			'appr_avatar_style'        => 'circle',
			'appr_card_style'          => 'bordered',
			'appr_font_mode'           => 'inherit',
			'appr_font_custom'         => '',
			'appr_font_size'           => 'medium',
			'appr_density'             => 'comfortable',
			'appr_show_upvotes'        => true,
			'appr_show_helpful'        => true,
			'appr_show_role_badges'    => true,
			'appr_show_best_highlight' => true,
			'appr_show_avatars'        => true,
			'appr_custom_css'          => '',

			// Notifications
			'notify_new_question'        => true,
			'new_question_recipients'    => get_option( 'admin_email', '' ),
			'notify_mode'                => 'instant',
			'digest_time'                => '09:00',
			'notify_community_answer'    => true,
			'notify_upvote_threshold'    => true,
			'upvote_threshold_value'     => 5,
			'notify_unanswered_reminder' => true,
			'unanswered_reminder_days'   => 3,
			'slack_webhook'              => '',

			// Moderation
			'question_approval_mode' => 'manual',
			'profanity_filter'       => true,
			'profanity_words'        => 'spam, scam, fake',
			'auto_reject_short'      => true,
			'email_blocklist'        => '',
			'email_allowlist'        => '',

			// Submission
			'who_can_ask'              => 'both',
			'require_email_for_guests' => true,
			'enable_honeypot'          => false,
			'submission_rate_limit'    => 3,
			'recaptcha_enabled'        => false,
			'recaptcha_site_key'       => '',
			'recaptcha_secret_key'     => '',

			// Community
			'allow_verified_buyers'     => true,
			'allow_logged_in_customers' => true,
			'verified_buyer_approval'   => 'require',
			'community_approval'        => 'always',
			'followup_approval'         => 'auto',
			'enable_trust_tier'         => false,
			'trust_helpful_threshold'   => 3,
		);
	}

	/**
	 * Load the saved settings, filling in any missing keys with defaults.
	 *
	 * @since  1.0.0
	 * @return array<string, mixed>
	 */
	private function load() {
		$saved = get_option( self::OPTION_KEY, array() );

		if ( ! is_array( $saved ) ) {
			return $this->defaults();
		}

		return wp_parse_args( $saved, $this->defaults() );
	}

	/**
	 * Cast a raw stored value to a clean array of positive integers.
	 *
	 * @since  1.0.0
	 * @param  mixed $value
	 * @return int[]
	 */
	private function cast_id_array( $value ) {
		if ( ! is_array( $value ) ) {
			return array();
		}
		return array_values( array_map( 'intval', $value ) );
	}
}
