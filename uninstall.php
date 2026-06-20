<?php
/**
 * Fired when the plugin is uninstalled.
 *
 * Drops all plugin tables and removes all stored options for every site
 * in a multisite network, or for a single-site installation.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 */

// If uninstall not called from WordPress, then exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

/**
 * Drop all plugin tables and delete all plugin options for the current site.
 *
 * @since  1.0.0
 * @global wpdb $wpdb WordPress database abstraction object.
 */
function quick_qa_drop_tables_and_options() {
	global $wpdb;

	$tables = array(
		$wpdb->prefix . 'quick_qa_votes',
		$wpdb->prefix . 'quick_qa_answers',
		$wpdb->prefix . 'quick_qa_questions',
	);

	foreach ( $tables as $table ) {
		// Table names are derived from $wpdb->prefix (a trusted config value),
		// not from user input, so direct interpolation is safe here.
		// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared, WordPress.DB.DirectDatabaseQuery.NoCaching, WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.SchemaChange
		$wpdb->query( "DROP TABLE IF EXISTS `{$table}`" );
	}

	delete_option( 'quick_qa_db_version' );
}

if ( function_exists( 'is_multisite' ) && is_multisite() ) {
	$site_ids = get_sites( array( 'fields' => 'ids', 'number' => 0 ) );

	foreach ( $site_ids as $site_id ) {
		switch_to_blog( $site_id );
		quick_qa_drop_tables_and_options();
		restore_current_blog();
	}
} else {
	quick_qa_drop_tables_and_options();
}
