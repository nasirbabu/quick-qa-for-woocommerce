<?php
/**
 * The [askora] shortcode — manual placement of the Q&A widget for custom
 * templates and page builders that don't use the automatic WooCommerce hooks
 * (KAN-28).
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.4.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

/**
 * Registers and renders the [askora] shortcode.
 *
 * Renders identically to the automatic hook-based placement — it reuses
 * Quick_Qa_For_Woocommerce_Public::render_qa_tab() directly rather than
 * duplicating any markup or settings logic.
 *
 * @since      1.4.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */
class Quick_Qa_For_Woocommerce_Shortcode {

	/**
	 * Shared public-facing plugin instance (settings, scope check, render,
	 * asset enqueue).
	 *
	 * @since  1.4.0
	 * @access private
	 * @var    Quick_Qa_For_Woocommerce_Public
	 */
	private $plugin_public;

	/**
	 * @since 1.4.0
	 * @param Quick_Qa_For_Woocommerce_Public $plugin_public Shared public-facing plugin instance.
	 */
	public function __construct( $plugin_public ) {
		$this->plugin_public = $plugin_public;
	}

	/**
	 * Register the [askora] shortcode.
	 *
	 * @since 1.4.0
	 */
	public function register() {
		add_shortcode( 'askora', array( $this, 'render' ) );
	}

	/**
	 * Render the [askora] shortcode.
	 *
	 * @since  1.4.0
	 * @param  array $atts Shortcode attributes.
	 * @return string
	 */
	public function render( $atts ) {
		$atts = shortcode_atts(
			array(
				'product_id' => 0,
			),
			$atts,
			'askora'
		);

		$product = $this->plugin_public->resolve_product_for_manual_placement( absint( $atts['product_id'] ) );

		if ( ! $product instanceof WC_Product ) {
			return '';
		}

		$product_id = absint( $product->get_id() );
		$s          = $this->plugin_public->get_settings();

		if ( ! $this->plugin_public->is_qa_enabled_for_product( $s, $product_id ) ) {
			if ( current_user_can( 'edit_posts' ) ) {
				return '<p class="qa-widget-admin-notice">' . esc_html__(
					'Askora: Q&A is not shown here because this product is excluded by your scope settings. (Only visible to editors.)',
					'quick-qa-for-woocommerce'
				) . '</p>';
			}
			return '';
		}

		// Guarantee assets load even when this shortcode is rendered from a
		// page-builder context (e.g. Elementor's Shortcode widget) whose
		// content lives outside `post_content` and so is invisible to the
		// wp_enqueue_scripts-time has_shortcode() check.
		$this->plugin_public->enqueue_public_style();
		$this->plugin_public->enqueue_public_script();
		add_action( 'wp_footer', array( $this, 'print_late_styles' ), 99 );

		ob_start();
		$this->plugin_public->render_qa_tab( $product );
		return ob_get_clean();
	}

	/**
	 * Safety net for when the shortcode renders after `wp_head` has already
	 * printed styles (common for page-builder widgets rendered inside
	 * `the_content`) — `wp_print_styles()` tracks already-printed handles, so
	 * calling it again here only outputs the stylesheet if it wasn't already
	 * printed in `<head>`.
	 *
	 * @since 1.4.0
	 */
	public function print_late_styles() {
		wp_print_styles( array( $this->plugin_public->get_plugin_name() ) );
	}
}
