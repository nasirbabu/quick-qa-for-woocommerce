<?php

/**
 * The file that defines the core plugin class
 *
 * A class definition that includes attributes and functions used across both the
 * public-facing side of the site and the admin area.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_For_Woocommerce {

	/**
	 * The loader that's responsible for maintaining and registering all hooks that power
	 * the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      Quick_Qa_For_Woocommerce_Loader    $loader    Maintains and registers all hooks for the plugin.
	 */
	protected $loader;

	/**
	 * The unique identifier of this plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $plugin_name    The string used to uniquely identify this plugin.
	 */
	protected $plugin_name;

	/**
	 * The current version of the plugin.
	 *
	 * @since    1.0.0
	 * @access   protected
	 * @var      string    $version    The current version of the plugin.
	 */
	protected $version;

	/**
	 * Define the core functionality of the plugin.
	 *
	 * Set the plugin name and the plugin version that can be used throughout the plugin.
	 * Load the dependencies, define the locale, and set the hooks for the admin area and
	 * the public-facing side of the site.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		if ( defined( 'QUICK_QA_FOR_WOOCOMMERCE_VERSION' ) ) {
			$this->version = QUICK_QA_FOR_WOOCOMMERCE_VERSION;
		} else {
			$this->version = '1.1.0';
		}
		$this->plugin_name = 'quick-qa-for-woocommerce';

		$this->load_dependencies();
		$this->define_admin_hooks();
		$this->define_public_hooks();
		$this->define_rest_hooks();
		$this->define_notification_hooks();

	}

	/**
	 * Load the required dependencies for this plugin.
	 *
	 * Include the following files that make up the plugin:
	 *
	 * - Quick_Qa_For_Woocommerce_Loader. Orchestrates the hooks of the plugin.
	 * - Quick_Qa_For_Woocommerce_i18n. Defines internationalization functionality.
	 * - Quick_Qa_For_Woocommerce_Admin. Defines all hooks for the admin area.
	 * - Quick_Qa_For_Woocommerce_Public. Defines all hooks for the public side of the site.
	 *
	 * Create an instance of the loader which will be used to register the hooks
	 * with WordPress.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function load_dependencies() {

		/**
		 * The class responsible for orchestrating the actions and filters of the
		 * core plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-quick-qa-for-woocommerce-loader.php';

		/**
		 * The class responsible for defining internationalization functionality
		 * of the plugin.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-quick-qa-for-woocommerce-i18n.php';

		/**
		 * The class responsible for defining all actions that occur in the admin area.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'admin/class-quick-qa-for-woocommerce-admin.php';

		/**
		 * The class responsible for defining all actions that occur in the public-facing
		 * side of the site.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'public/class-quick-qa-for-woocommerce-public.php';

		/**
		 * REST API: abstract base controller (must be loaded before any subclass).
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/api/class-quick-qa-rest-controller.php';

		/**
		 * REST API resource controllers — one file per resource group.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/api/class-quick-qa-rest-questions.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/api/class-quick-qa-rest-moderation.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/api/class-quick-qa-rest-templates.php';
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/api/class-quick-qa-rest-settings.php';

		/**
		 * Notification dispatcher — email alerts, digest, Slack, and WP Cron jobs.
		 */
		require_once plugin_dir_path( dirname( __FILE__ ) ) . 'includes/class-quick-qa-notifier.php';

		$this->loader = new Quick_Qa_For_Woocommerce_Loader();

	}

	/**
	 * Register all of the hooks related to the admin area functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_admin_hooks() {

		$plugin_admin = new Quick_Qa_For_Woocommerce_Admin( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'admin_menu',            $plugin_admin, 'register_admin_menu' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_styles' );
		$this->loader->add_action( 'admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts' );

	}

	/**
	 * Register all of the hooks related to the public-facing functionality
	 * of the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_public_hooks() {

		$plugin_public = new Quick_Qa_For_Woocommerce_Public( $this->get_plugin_name(), $this->get_version() );

		$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_styles' );
		$this->loader->add_action( 'wp_enqueue_scripts', $plugin_public, 'enqueue_scripts' );

		// Register the Q&A tab on WooCommerce product pages.
		$this->loader->add_filter( 'woocommerce_product_tabs', $plugin_public, 'register_product_tab' );

		// Render Q&A section below the tabs area when position = 'below_reviews'.
		$this->loader->add_action( 'woocommerce_after_single_product_summary', $plugin_public, 'render_qa_below_reviews', 25 );

	}

	/**
	 * Register WP Cron callbacks and the init hook that ensures cron events are
	 * scheduled according to the current notification settings.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_notification_hooks() {
		// Cron callbacks — must be registered on every request so WP Cron can fire them.
		add_action( Quick_Qa_Notifier::DIGEST_HOOK,   array( 'Quick_Qa_Notifier', 'send_digest' ) );
		add_action( Quick_Qa_Notifier::REMINDER_HOOK, array( 'Quick_Qa_Notifier', 'send_unanswered_reminder' ) );

		// Lazily schedule missing cron events once the site is initialised.
		add_action( 'init', array( 'Quick_Qa_Notifier', 'ensure_crons' ) );
	}

	/**
	 * Register all REST API routes provided by the plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 */
	private function define_rest_hooks() {

		foreach ( array(
			new Quick_Qa_Rest_Questions(),
			new Quick_Qa_Rest_Moderation(),
			new Quick_Qa_Rest_Templates(),
			new Quick_Qa_Rest_Settings(),
		) as $controller ) {
			$this->loader->add_action( 'rest_api_init', $controller, 'register_routes' );
		}

	}

	/**
	 * Run the loader to execute all of the hooks with WordPress.
	 *
	 * @since    1.0.0
	 */
	public function run() {
		$this->loader->run();
	}

	/**
	 * The name of the plugin used to uniquely identify it within the context of
	 * WordPress and to define internationalization functionality.
	 *
	 * @since     1.0.0
	 * @return    string    The name of the plugin.
	 */
	public function get_plugin_name() {
		return $this->plugin_name;
	}

	/**
	 * The reference to the class that orchestrates the hooks with the plugin.
	 *
	 * @since     1.0.0
	 * @return    Quick_Qa_For_Woocommerce_Loader    Orchestrates the hooks of the plugin.
	 */
	public function get_loader() {
		return $this->loader;
	}

	/**
	 * Retrieve the version number of the plugin.
	 *
	 * @since     1.0.0
	 * @return    string    The version number of the plugin.
	 */
	public function get_version() {
		return $this->version;
	}

}
