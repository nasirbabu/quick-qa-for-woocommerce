<?php
/**
 * WPML / Polylang compatibility helpers (KAN-29).
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.4.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

/**
 * Resolves a post/term ID into its equivalent in the current front-end
 * content language, when a supported multilingual plugin is active.
 *
 * Questions/answers themselves are already scoped correctly across
 * languages by construction — every fetch and insert keys strictly off the
 * literal `product_id` of the page being viewed (WPML/Polylang give each
 * translation its own distinct post ID, and this plugin never merges IDs
 * across translations). This class exists only for the places that resolve
 * an *admin-configured* ID (scope settings, manual shortcode/block
 * placement) which may have been picked in a different language than the
 * one currently being viewed.
 *
 * @since      1.4.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */
class Quick_Qa_For_Woocommerce_Multilingual {

	/**
	 * Whether a supported multilingual plugin (WPML or Polylang) is active.
	 *
	 * @since  1.4.0
	 * @return bool
	 */
	public static function is_active() {
		return defined( 'ICL_SITEPRESS_VERSION' ) || function_exists( 'pll_get_post' );
	}

	/**
	 * Translate a post ID (e.g. a WooCommerce product) into its equivalent
	 * in the current content language.
	 *
	 * Falls back to the original ID when no multilingual plugin is active,
	 * when no translation exists for the current language, or when the
	 * post ID is invalid — so callers can use the return value unconditionally.
	 *
	 * @since  1.4.0
	 * @param  int    $id   Post ID, in any language.
	 * @param  string $type WPML element type, e.g. 'product' or 'post_product'. Ignored by Polylang.
	 * @return int
	 */
	public static function translate_object_id( $id, $type = 'product' ) {
		$id = absint( $id );
		if ( ! $id ) {
			return $id;
		}

		if ( function_exists( 'pll_get_post' ) ) {
			$translated = pll_get_post( $id );
			return $translated ? absint( $translated ) : $id;
		}

		if ( defined( 'ICL_SITEPRESS_VERSION' ) ) {
			// The trailing `true` returns the original ID when no translation exists.
			return absint( apply_filters( 'wpml_object_id', $id, $type, true ) );
		}

		return $id;
	}

	/**
	 * Translate a taxonomy term ID (e.g. a product category) into its
	 * equivalent in the current content language.
	 *
	 * Falls back the same way translate_object_id() does.
	 *
	 * @since  1.4.0
	 * @param  int    $term_id  Term ID, in any language.
	 * @param  string $taxonomy Taxonomy name, e.g. 'product_cat'.
	 * @return int
	 */
	public static function translate_term_id( $term_id, $taxonomy = 'product_cat' ) {
		$term_id = absint( $term_id );
		if ( ! $term_id ) {
			return $term_id;
		}

		if ( function_exists( 'pll_get_term' ) ) {
			// Polylang's signature is pll_get_term( $term_id, $lang = '' ) — no
			// taxonomy argument; it resolves the term's taxonomy internally.
			$translated = pll_get_term( $term_id );
			return $translated ? absint( $translated ) : $term_id;
		}

		if ( defined( 'ICL_SITEPRESS_VERSION' ) ) {
			return absint( apply_filters( 'wpml_object_id', $term_id, $taxonomy, true ) );
		}

		return $term_id;
	}
}
