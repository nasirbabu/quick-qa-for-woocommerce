<?php

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
	 * Register the "Quick QA" top-level admin menu.
	 */
	public function register_admin_menu() {
		add_menu_page(
			__( 'Quick QA', 'quick-qa-for-woocommerce' ),
			__( 'Quick QA', 'quick-qa-for-woocommerce' ),
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
	 * Enqueue the React app assets only on the Quick QA admin page.
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

		add_action( 'admin_head', array( $this, 'inline_admin_overrides' ) );
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
		}
	}

	/**
	 * Remove WP admin chrome that competes with the full-page React layout.
	 */
	public function inline_admin_overrides() {
		echo '<style>
			#quick-qa-root { margin: -8px -20px -10px; }
			#wpcontent { padding-left: 0 !important; }
			.wrap { margin: 0; padding: 0; }
			h1.wp-heading-inline { display: none; }
		</style>';
	}
}
