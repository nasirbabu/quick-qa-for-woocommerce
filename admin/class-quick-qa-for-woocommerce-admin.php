<?php
defined( 'ABSPATH' ) || exit;

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.0.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/admin
 */

class Quick_Qa_For_Woocommerce_Admin {

	private $plugin_name;
	private $version;

	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version     = $version;
	}

	/**
	 * Register the "Askora QA" top-level admin menu.
	 */
	public function register_admin_menu() {
		add_menu_page(
			__( 'Askora QA', 'quick-qa-for-woocommerce' ),
			__( 'Askora QA', 'quick-qa-for-woocommerce' ),
			'manage_options',
			'quick-qa',
			array( $this, 'render_admin_page' ),
			'data:image/svg+xml;base64,' . base64_encode(
				'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white">'
				. '<circle cx="10" cy="10" r="9" fill="none" stroke="white" stroke-width="2"/>'
				. '<text x="10" y="14" text-anchor="middle" font-size="11" font-family="sans-serif" fill="white">Q</text>'
				. '</svg>'
			),
			56
		);
	}

	/**
	 * Render the admin page shell. React mounts into #quick-qa-root.
	 */
	public function render_admin_page() {
		echo '<div id="quick-qa-root"></div>';
	}

	/**
	 * Enqueue the React app assets only on the Askora QA admin page.
	 */
	private function plugin_root_url() {
		return plugin_dir_url( dirname( dirname( __FILE__ ) ) . '/quick-qa-for-woocommerce.php' );
	}

	private function plugin_root_path() {
		return trailingslashit( dirname( dirname( __FILE__ ) ) );
	}

	public function enqueue_styles( $hook ) {
		if ( 'toplevel_page_quick-qa' !== $hook ) {
			return;
		}

		$css_file = $this->plugin_root_path() . 'build/quick-qa-app.css';
		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'quick-qa-react-app',
				$this->plugin_root_url() . 'build/quick-qa-app.css',
				array(),
				$this->version
			);
		}
	}

	public function enqueue_scripts( $hook ) {
		if ( 'toplevel_page_quick-qa' !== $hook ) {
			return;
		}

		$js_file = $this->plugin_root_path() . 'build/quick-qa-app.js';
		if ( file_exists( $js_file ) ) {
			wp_enqueue_script(
				'quick-qa-react-app',
				$this->plugin_root_url() . 'build/quick-qa-app.js',
				array(),
				$this->version,
				true
			);

			add_filter( 'script_loader_tag', array( $this, 'set_module_type' ), 10, 2 );

			wp_localize_script(
				'quick-qa-react-app',
				'quickQaAdmin',
				array(
					'restUrl'        => esc_url_raw( rest_url( 'quick-qa/v1/' ) ),
					'nonce'          => wp_create_nonce( 'wp_rest' ),
					'logDownloadUrl' => esc_url_raw( add_query_arg(
						array(
							'action'   => 'quick_qa_download_log',
							'_wpnonce' => wp_create_nonce( 'quick_qa_download_log' ),
						),
						admin_url( 'admin-post.php' )
					) ),
				)
			);
		}
	}

	/**
	 * admin-post handler: stream the Advanced tab's debug log as a file
	 * download. Gated on the same admin capability as every other Askora
	 * settings action, plus a dedicated nonce.
	 *
	 * @since 1.3.0
	 */
	public function handle_log_download() {
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'quick-qa-for-woocommerce' ), '', array( 'response' => 403 ) );
		}

		check_admin_referer( 'quick_qa_download_log' );

		if ( ! class_exists( 'Quick_Qa_Logger' ) ) {
			wp_die( esc_html__( 'The debug log is not available.', 'quick-qa-for-woocommerce' ), '', array( 'response' => 404 ) );
		}

		$path = Quick_Qa_Logger::path();
		if ( ! file_exists( $path ) ) {
			wp_die( esc_html__( 'The debug log is empty.', 'quick-qa-for-woocommerce' ), '', array( 'response' => 404 ) );
		}

		nocache_headers();
		header( 'Content-Type: text/plain; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="quick-qa-debug-' . gmdate( 'Y-m-d-His' ) . '.log"' );
		header( 'Content-Length: ' . filesize( $path ) );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_read_readfile
		readfile( $path );
		exit;
	}

	/**
	 * Add type="module" to the React app script tag so top-level const/let
	 * declarations are scoped to the module and cannot collide with window.wp.
	 */
	public function set_module_type( $tag, $handle ) {
		if ( 'quick-qa-react-app' === $handle ) {
			return str_replace( ' src=', ' type="module" src=', $tag );
		}
		return $tag;
	}
}
