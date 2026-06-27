<?php
/**
 * Fired during plugin activation.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

/**
 * Fired during plugin activation.
 *
 * Creates the plugin's custom database tables and handles schema upgrades
 * for both single-site and multisite (network-activated) installations.
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_For_Woocommerce_Activator {

	/**
	 * Current schema version.
	 *
	 * Bump this constant whenever the table structure changes so that
	 * maybe_update_db() triggers a fresh dbDelta() run for existing installs.
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const DB_VERSION = '1.0.0';

	/**
	 * Option key used to store the installed schema version.
	 *
	 * @since 1.0.0
	 * @var   string
	 */
	const DB_VERSION_OPTION = 'quick_qa_db_version';

	/**
	 * Run on plugin activation.
	 *
	 * Handles both single-site and network-activated multisite installs by
	 * iterating over every blog when $network_wide is true.
	 *
	 * @since 1.0.0
	 * @param bool $network_wide Whether activation is network-wide.
	 */
	public static function activate( $network_wide = false ) {
		if ( function_exists( 'is_multisite' ) && is_multisite() && $network_wide ) {
			$site_ids = get_sites( array( 'fields' => 'ids', 'number' => 0 ) );

			foreach ( $site_ids as $site_id ) {
				switch_to_blog( $site_id );
				self::create_tables();
				self::update_db_version();
				self::maybe_seed_brand_color();
				restore_current_blog();
			}
		} else {
			self::create_tables();
			self::update_db_version();
			self::maybe_seed_brand_color();
		}
	}

	/**
	 * Detect the active theme's primary button / accent colour.
	 *
	 * Checks in priority order:
	 *   1. WooCommerce core accent colour option.
	 *   2. Common Customizer theme_mods used by popular themes
	 *      (Storefront, Astra, OceanWP, GeneratePress, Twenty* series …).
	 *   3. Block-theme colour palette from theme.json.
	 *
	 * Returns a lowercase 6-digit hex string (e.g. '#96588a') or null when
	 * no theme colour is detectable.
	 *
	 * @since  1.0.0
	 * @return string|null
	 */
	public static function detect_theme_button_color() {
		// 1. WooCommerce accent colour (set by Storefront and legacy WC setting).
		$val = get_option( 'woocommerce_accent_color', '' );
		if ( preg_match( '/^#[0-9A-Fa-f]{6}$/', $val ) ) {
			return strtolower( $val );
		}

		// 2. Common Customizer theme_mods — checked in priority order.
		$mods = array(
			'accent_color',            // Storefront, Twenty* series
			'button_background_color', // Storefront WooCommerce overrides
			'primary_color',           // Astra, OceanWP, GeneratePress
			'button_color',            // Various themes
			'link_color',              // Broad fallback
		);
		foreach ( $mods as $mod ) {
			$val = get_theme_mod( $mod, '' );
			if ( $val && preg_match( '/^#[0-9A-Fa-f]{6}$/i', $val ) ) {
				return strtolower( $val );
			}
		}

		// 3. Block theme — theme.json global colour palette.
		if ( function_exists( 'wp_get_global_settings' ) ) {
			$palette = wp_get_global_settings( array( 'color', 'palette', 'theme' ) );
			if ( is_array( $palette ) ) {
				$priority_slugs = array( 'primary', 'accent', 'button', 'cta', 'action', 'brand' );
				$slug_map       = array();
				foreach ( $palette as $entry ) {
					if ( isset( $entry['slug'], $entry['color'] ) ) {
						$slug_map[ $entry['slug'] ] = $entry['color'];
					}
				}
				foreach ( $priority_slugs as $slug ) {
					if ( ! empty( $slug_map[ $slug ] )
						&& preg_match( '/^#[0-9A-Fa-f]{6}$/i', $slug_map[ $slug ] ) ) {
						return strtolower( $slug_map[ $slug ] );
					}
				}
			}
		}

		return null; // No theme colour detected.
	}

	/**
	 * Update appr_color to match the newly-activated theme's button colour.
	 *
	 * Called from the switch_theme action (priority 20, after WordPress has
	 * flushed its own theme caches). If the new theme exposes no detectable
	 * button colour the existing appr_color is left unchanged so the admin's
	 * previous choice is preserved.
	 *
	 * @since 1.0.0
	 */
	public static function sync_brand_color() {
		$color = self::detect_theme_button_color();
		if ( ! $color ) {
			return; // New theme has no detectable colour; keep existing value.
		}

		$saved = get_option( 'quick_qa_settings', array() );
		if ( ! is_array( $saved ) ) {
			$saved = array();
		}
		$saved['appr_color'] = $color;
		update_option( 'quick_qa_settings', $saved, true );
	}

	/**
	 * Seed appr_color from the active theme if it has not been set yet.
	 *
	 * Called on activation (new installs) and after plugin updates via
	 * maybe_update_db() so existing installs can also benefit without
	 * requiring a manual deactivate/reactivate cycle.
	 *
	 * Does nothing if:
	 *   - appr_color is already present in quick_qa_settings (admin has
	 *     configured it, or a previous activation already seeded it).
	 *   - No theme colour can be detected.
	 *
	 * @since 1.0.0
	 */
	public static function maybe_seed_brand_color() {
		$saved = get_option( 'quick_qa_settings', null );

		// Bail if appr_color is already explicitly stored.
		if ( is_array( $saved ) && ! empty( $saved['appr_color'] ) ) {
			return;
		}

		$color = self::detect_theme_button_color();
		if ( ! $color ) {
			return; // No theme colour found; keep the hardcoded fallback.
		}

		if ( is_array( $saved ) ) {
			$saved['appr_color'] = $color;
		} else {
			$saved = array( 'appr_color' => $color );
		}

		update_option( 'quick_qa_settings', $saved, true );
	}

	/**
	 * Create or upgrade plugin database tables using dbDelta().
	 *
	 * dbDelta() is additive-only: it adds missing columns and indexes but
	 * never drops existing ones or deletes data, making this safe to call
	 * on upgrades as well as fresh installs.
	 *
	 * Table overview:
	 *  - wp_quick_qa_questions : one row per customer question on a product.
	 *  - wp_quick_qa_answers   : one row per answer (admin or community).
	 *  - wp_quick_qa_votes     : one row per upvote; unique key prevents duplicates.
	 *  - wp_quick_qa_flags     : one row per user-flag on a question or answer.
	 *
	 * @since  1.0.0
	 * @global wpdb $wpdb WordPress database abstraction object.
	 */
	public static function create_tables() {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		// ------------------------------------------------------------------ //
		// Table: wp_quick_qa_questions
		// ------------------------------------------------------------------ //
		// Stores questions submitted on WooCommerce product pages.
		// guest_name / guest_email are empty strings for logged-in users.
		// is_verified_buyer is set when user_id has a completed order for product_id.
		// ------------------------------------------------------------------ //
		$table_questions = $wpdb->prefix . 'quick_qa_questions';
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		dbDelta(
			"CREATE TABLE {$table_questions} (
				id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				product_id bigint(20) UNSIGNED NOT NULL,
				user_id bigint(20) UNSIGNED NOT NULL DEFAULT 0,
				guest_name varchar(100) NOT NULL DEFAULT '',
				guest_email varchar(100) NOT NULL DEFAULT '',
				question_text text NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'pending',
				upvotes int(10) UNSIGNED NOT NULL DEFAULT 0,
				is_verified_buyer tinyint(1) UNSIGNED NOT NULL DEFAULT 0,
				created_at datetime DEFAULT NULL,
				updated_at datetime DEFAULT NULL,
				PRIMARY KEY  (id),
				KEY product_status (product_id, status),
				KEY user_id (user_id)
			) {$charset_collate};"
		);

		// ------------------------------------------------------------------ //
		// Table: wp_quick_qa_answers
		// ------------------------------------------------------------------ //
		// answer_type: 'admin' for store owner/staff, 'community' for customers.
		// status mirrors questions: 'pending' | 'approved' | 'rejected'.
		// ------------------------------------------------------------------ //
		$table_answers = $wpdb->prefix . 'quick_qa_answers';
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		dbDelta(
			"CREATE TABLE {$table_answers} (
				id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				question_id bigint(20) UNSIGNED NOT NULL,
				user_id bigint(20) UNSIGNED NOT NULL DEFAULT 0,
				answer_type varchar(20) NOT NULL DEFAULT 'community',
				answer_text text NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'pending',
				upvotes int(10) UNSIGNED NOT NULL DEFAULT 0,
				created_at datetime DEFAULT NULL,
				updated_at datetime DEFAULT NULL,
				PRIMARY KEY  (id),
				KEY question_status (question_id, status)
			) {$charset_collate};"
		);

		// ------------------------------------------------------------------ //
		// Table: wp_quick_qa_votes
		// ------------------------------------------------------------------ //
		// object_type: 'question' | 'answer'.
		// The UNIQUE KEY on (object_type, object_id, user_id) enforces one
		// vote per user per item at the database level.
		// ------------------------------------------------------------------ //
		$table_votes = $wpdb->prefix . 'quick_qa_votes';
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		dbDelta(
			"CREATE TABLE {$table_votes} (
				id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				object_type varchar(20) NOT NULL,
				object_id bigint(20) UNSIGNED NOT NULL,
				user_id bigint(20) UNSIGNED NOT NULL,
				created_at datetime DEFAULT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY vote_unique (object_type,object_id,user_id)
			) {$charset_collate};"
		);

		// ------------------------------------------------------------------ //
		// Table: wp_quick_qa_flags
		// ------------------------------------------------------------------ //
		// object_type: 'question' | 'answer'.
		// The UNIQUE KEY on (object_type, object_id, user_id) prevents a user
		// from flagging the same item twice.
		// When an item accumulates FLAG_THRESHOLD flags its status is set to
		// 'flagged' and it is hidden from the public thread list.
		// ------------------------------------------------------------------ //
		$table_flags = $wpdb->prefix . 'quick_qa_flags';
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		dbDelta(
			"CREATE TABLE {$table_flags} (
				id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				object_type varchar(20) NOT NULL,
				object_id bigint(20) UNSIGNED NOT NULL,
				user_id bigint(20) UNSIGNED NOT NULL,
				reason varchar(100) NOT NULL DEFAULT '',
				created_at datetime DEFAULT NULL,
				PRIMARY KEY  (id),
				KEY object_idx (object_type,object_id),
				UNIQUE KEY flag_unique (object_type,object_id,user_id)
			) {$charset_collate};"
		);

		// ------------------------------------------------------------------ //
		// Table: wp_quick_qa_reply_templates
		// ------------------------------------------------------------------ //
		// Stores admin-created reply templates that can be loaded into the
		// answer composer with one click.
		// uses tracks how many times the template was applied to an answer.
		// ------------------------------------------------------------------ //
		$table_templates = $wpdb->prefix . 'quick_qa_reply_templates';
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
		dbDelta(
			"CREATE TABLE {$table_templates} (
				id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
				name varchar(200) NOT NULL DEFAULT '',
				category varchar(50) NOT NULL DEFAULT 'Other',
				content longtext NOT NULL,
				uses int(10) UNSIGNED NOT NULL DEFAULT 0,
				created_at datetime DEFAULT NULL,
				updated_at datetime DEFAULT NULL,
				PRIMARY KEY  (id),
				KEY category (category)
			) {$charset_collate};"
		);
	}

	/**
	 * Run create_tables() only when the stored schema version is outdated.
	 *
	 * Hook onto plugins_loaded so schema changes are automatically applied
	 * for users who update the plugin without manually re-activating it.
	 *
	 * @since 1.0.0
	 */
	public static function maybe_update_db() {
		if ( get_option( self::DB_VERSION_OPTION ) !== self::DB_VERSION ) {
			self::create_tables();
			self::update_db_version();
		}

		// Seed theme colour on first update if the plugin was installed before
		// this feature existed and appr_color was never saved.
		self::maybe_seed_brand_color();
	}

	/**
	 * Persist the current schema version to the options table.
	 *
	 * autoload is set to false because this option is only read during the
	 * plugins_loaded upgrade check, not on every page request.
	 *
	 * @since 1.0.0
	 */
	private static function update_db_version() {
		update_option( self::DB_VERSION_OPTION, self::DB_VERSION, false );
	}
}
