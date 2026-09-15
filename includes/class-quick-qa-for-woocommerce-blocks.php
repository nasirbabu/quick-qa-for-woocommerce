<?php
/**
 * The "Askora Q&A" Gutenberg block — manual placement of the Q&A widget in
 * the block editor and block-aware page builders (KAN-28).
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.4.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

/**
 * Registers the askora/qa-widget dynamic block.
 *
 * The block has no build step: the editor script is plain JS using the
 * `wp-server-side-render` handle WordPress core ships by default, and the
 * front-end render callback reuses
 * Quick_Qa_For_Woocommerce_Public::render_qa_tab() directly — the same
 * function the automatic hook-based placement uses — so the block renders
 * identically to automatic placement by construction.
 *
 * @since      1.4.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */
class Quick_Qa_For_Woocommerce_Blocks {

	const BLOCK_NAME = 'askora/qa-widget';

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
	 * @since  1.4.0
	 * @access private
	 * @var    string
	 */
	private $version;

	/**
	 * @since 1.4.0
	 * @param Quick_Qa_For_Woocommerce_Public $plugin_public Shared public-facing plugin instance.
	 * @param string                          $version       Current plugin version.
	 */
	public function __construct( $plugin_public, $version ) {
		$this->plugin_public = $plugin_public;
		$this->version       = $version;
	}

	/**
	 * Register the block editor script.
	 *
	 * Must run before register_block() so the `editorScript` handle
	 * referenced in block.json already exists.
	 *
	 * @since 1.4.0
	 */
	public function register_editor_script() {
		wp_register_script(
			'quick-qa-block-editor',
			plugin_dir_url( __FILE__ ) . 'blocks/qa-widget/edit.js',
			array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-server-side-render', 'wp-i18n' ),
			$this->version,
			true
		);
	}

	/**
	 * Register the askora/qa-widget dynamic block.
	 *
	 * @since 1.4.0
	 */
	public function register_block() {
		register_block_type(
			plugin_dir_path( __FILE__ ) . 'blocks/qa-widget',
			array(
				'render_callback' => array( $this, 'render' ),
			)
		);
	}

	/**
	 * Render callback for the askora/qa-widget block.
	 *
	 * @since  1.4.0
	 * @param  array         $attributes Block attributes.
	 * @param  string        $content    Block default content (unused, dynamic block).
	 * @param  WP_Block|null $block      Block instance, carrying `postId` via `usesContext`
	 *                                   when available (e.g. the editor's ServerSideRender
	 *                                   preview, which has no ambient `global $post` of its
	 *                                   own unless explicitly told which post it's for).
	 * @return string
	 */
	public function render( $attributes, $content = '', $block = null ) {
		$product_id = isset( $attributes['productId'] ) ? absint( $attributes['productId'] ) : 0;

		if ( ! $product_id && $block instanceof WP_Block && ! empty( $block->context['postId'] ) ) {
			$product_id = absint( $block->context['postId'] );
		}

		$product = $this->plugin_public->resolve_product_for_manual_placement( $product_id );

		if ( ! $product instanceof WC_Product ) {
			if ( current_user_can( 'edit_posts' ) ) {
				return '<p class="qa-widget-admin-notice">' . esc_html__(
					'Askora: No product found to show Q&A for. Place this block on a product page/template, or set a Product ID in the block settings (sidebar).',
					'quick-qa-for-woocommerce'
				) . '</p>';
			}
			return '';
		}

		$resolved_id = absint( $product->get_id() );
		$s           = $this->plugin_public->get_settings();

		if ( ! $this->plugin_public->is_qa_enabled_for_product( $s, $resolved_id ) ) {
			if ( current_user_can( 'edit_posts' ) ) {
				return '<p class="qa-widget-admin-notice">' . esc_html__(
					'Askora: Q&A is not shown here because this product is excluded by your scope settings. (Only visible to editors.)',
					'quick-qa-for-woocommerce'
				) . '</p>';
			}
			return '';
		}

		// Guarantee assets load even in contexts the wp_enqueue_scripts-time
		// has_block() check can't see (e.g. a page builder that stores block
		// markup outside the normal post content flow).
		$this->plugin_public->enqueue_public_style();
		$this->plugin_public->enqueue_public_script();

		ob_start();
		$this->plugin_public->render_qa_tab( $product );
		return ob_get_clean();
	}

	/**
	 * Register a dedicated "Askora" block category so the block is easy to
	 * find in the inserter, per the KAN-28 acceptance criteria.
	 *
	 * @since  1.4.0
	 * @param  array                     $categories    Registered block categories.
	 * @param  WP_Block_Editor_Context   $editor_context Current block editor context.
	 * @return array
	 */
	public function register_block_category( $categories, $editor_context ) {
		return array_merge(
			array(
				array(
					'slug'  => 'askora',
					'title' => __( 'Askora', 'quick-qa-for-woocommerce' ),
				),
			),
			$categories
		);
	}

	/**
	 * Load the public stylesheet (+ appearance inline CSS) into the block
	 * editor so the ServerSideRender preview isn't unstyled while editing.
	 *
	 * @since 1.4.0
	 */
	public function enqueue_editor_assets() {
		$this->plugin_public->enqueue_public_style();
	}
}
