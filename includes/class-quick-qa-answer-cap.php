<?php
/**
 * Free-tier cap on staff (admin) answers per product (KAN-30).
 *
 * Staff answers are limited to a fixed number per individual product,
 * permanently. Community answers (verified buyers and logged-in customers)
 * are never counted or blocked. A licensed Pro install lifts the cap via the
 * `quick_qa_is_pro` filter.
 *
 * @since      1.6.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

defined( 'ABSPATH' ) || exit;

class Quick_Qa_Answer_Cap {

	/**
	 * Default number of staff answers allowed per product on the free tier.
	 */
	const FREE_LIMIT = 3;

	/**
	 * Free-tier staff answer limit per product.
	 *
	 * @since  1.6.0
	 * @return int
	 */
	public static function get_limit() {
		/**
		 * Filters the free-tier staff answer limit per product.
		 *
		 * @since 1.6.0
		 * @param int $limit Default 3.
		 */
		return max( 1, (int) apply_filters( 'quick_qa_free_staff_answer_limit', self::FREE_LIMIT ) );
	}

	/**
	 * Whether the cap is lifted (licensed Pro).
	 *
	 * @since  1.6.0
	 * @return bool
	 */
	public static function is_unlimited() {
		return (bool) apply_filters( 'quick_qa_is_pro', false );
	}

	/**
	 * Number of approved staff answers on a product.
	 *
	 * Follow-up replies by staff are stored as answer_type = 'admin' with a
	 * parent_answer_id, so they count too. Customer follow-ups
	 * (answer_type = 'followup') and community answers never do.
	 *
	 * @since  1.6.0
	 * @param  int $product_id
	 * @return int
	 * @global wpdb $wpdb
	 */
	public static function count_staff_answers( $product_id ) {
		global $wpdb;

		$answers_table   = $wpdb->prefix . 'quick_qa_answers';
		$questions_table = $wpdb->prefix . 'quick_qa_questions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT COUNT(*) FROM {$answers_table} a
				 INNER JOIN {$questions_table} q ON q.id = a.question_id
				 WHERE q.product_id = %d AND a.answer_type = 'admin' AND a.status = 'approved'",
				(int) $product_id
			)
		);
	}

	/**
	 * Whether one more staff answer on this product would exceed the cap.
	 *
	 * @since  1.6.0
	 * @param  int $product_id
	 * @return bool
	 */
	public static function is_capped( $product_id ) {
		if ( self::is_unlimited() ) {
			return false;
		}

		return self::count_staff_answers( $product_id ) >= self::get_limit();
	}

	/**
	 * Error returned when the cap blocks a staff answer.
	 *
	 * @since  1.6.0
	 * @param  int $product_id
	 * @return WP_Error
	 */
	public static function get_error( $product_id ) {
		$limit = self::get_limit();

		/**
		 * Filters the URL of the upgrade call-to-action shown at the cap.
		 *
		 * @since 1.6.0
		 * @param string $url
		 */
		$upgrade_url = (string) apply_filters( 'quick_qa_upgrade_url', 'https://askora.io/pro' );

		return new WP_Error(
			'quick_qa_staff_answer_limit',
			sprintf(
				/* translators: %d: number of free staff answers allowed per product. */
				_n(
					'You\'ve reached the free limit of %d staff answer on this product. Upgrade to Pro to keep answering here. Your existing answer stays visible, and customers can still answer this question.',
					'You\'ve reached the free limit of %d staff answers on this product. Upgrade to Pro to keep answering here. Your existing answers stay visible, and customers can still answer this question.',
					$limit,
					'quick-qa-for-woocommerce'
				),
				$limit
			),
			array(
				'status'      => 403,
				'is_cap'      => true,
				'limit'       => $limit,
				'product_id'  => (int) $product_id,
				'upgrade_url' => esc_url_raw( $upgrade_url ),
			)
		);
	}
}
