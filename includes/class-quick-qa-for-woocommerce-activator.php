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
	const DB_VERSION = '1.2.0';

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
				restore_current_blog();
			}
		} else {
			self::create_tables();
			self::update_db_version();
		}
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
