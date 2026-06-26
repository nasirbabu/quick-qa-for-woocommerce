<?php

/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              https://profiles.wordpress.org/nashirbabu/
 * @since             1.0.0
 * @package           Quick_Qa_For_Woocommerce
 *
 * @wordpress-plugin
 * Plugin Name:       Quick QA for WooCommerce
 * Plugin URI:        https://https://wordpress.org/plugins/quick-qa-for-woocommerce
 * Description:       Quick Question and Answer Plugin for WooCommerce 
 * Version:           1.0.0
 * Author:            Nashir Uddin
 * Author URI:        https://profiles.wordpress.org/nashirbabu//
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain:       quick-qa-for-woocommerce
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Currently plugin version.
 * Start at version 1.0.0 and use SemVer - https://semver.org
 * Rename this for your plugin and update it as you release new versions.
 */
define( 'QUICK_QA_FOR_WOOCOMMERCE_VERSION', '1.0.0' );

/**
 * The code that runs during plugin activation.
 * This action is documented in includes/class-quick-qa-for-woocommerce-activator.php
 *
 * @param bool $network_wide Whether the plugin is being activated network-wide.
 */
function activate_quick_qa_for_woocommerce( $network_wide = false ) {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-quick-qa-for-woocommerce-activator.php';
	Quick_Qa_For_Woocommerce_Activator::activate( $network_wide );
}

/**
 * Run a schema-version check on every page load and apply upgrades if needed.
 *
 * This handles users who update the plugin via the WordPress updater without
 * manually deactivating and reactivating it, which would skip activate().
 *
 * @since 1.0.0
 */
function quick_qa_maybe_update_db() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-quick-qa-for-woocommerce-activator.php';
	Quick_Qa_For_Woocommerce_Activator::maybe_update_db();
}
add_action( 'plugins_loaded', 'quick_qa_maybe_update_db' );

/**
 * When the admin switches to a different theme, automatically update the
 * plugin's brand colour to match the new theme's button / accent colour.
 *
 * Priority 20 ensures WordPress has already flushed its own theme caches
 * (registered at priority 10) before we run colour detection.
 *
 * @since 1.0.0
 */
function quick_qa_on_switch_theme() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-quick-qa-for-woocommerce-activator.php';
	Quick_Qa_For_Woocommerce_Activator::sync_brand_color();
}
add_action( 'switch_theme', 'quick_qa_on_switch_theme', 20 );

/**
 * The code that runs during plugin deactivation.
 * This action is documented in includes/class-quick-qa-for-woocommerce-deactivator.php
 */
function deactivate_quick_qa_for_woocommerce() {
	require_once plugin_dir_path( __FILE__ ) . 'includes/class-quick-qa-for-woocommerce-deactivator.php';
	Quick_Qa_For_Woocommerce_Deactivator::deactivate();
}

register_activation_hook( __FILE__, 'activate_quick_qa_for_woocommerce' );
register_deactivation_hook( __FILE__, 'deactivate_quick_qa_for_woocommerce' );

/**
 * The core plugin class that is used to define internationalization,
 * admin-specific hooks, and public-facing site hooks.
 */
require plugin_dir_path( __FILE__ ) . 'includes/class-quick-qa-for-woocommerce.php';

/**
 * Begins execution of the plugin.
 *
 * Since everything within the plugin is registered via hooks,
 * then kicking off the plugin from this point in the file does
 * not affect the page life cycle.
 *
 * @since    1.0.0
 */
function run_quick_qa_for_woocommerce() {

	$plugin = new Quick_Qa_For_Woocommerce();
	$plugin->run();

}
run_quick_qa_for_woocommerce();
