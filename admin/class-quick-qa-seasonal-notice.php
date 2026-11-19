<?php
/**
 * Black Friday / Cyber Monday 2026 seasonal sale admin notice.
 *
 * Self-contained on purpose: this is a temporary, dated promotion. To remove
 * it after the sale, delete this file, admin/css/quick-qa-seasonal-notice.css
 * and admin/js/quick-qa-seasonal-notice.js, the marked block (and require) in
 * includes/class-quick-qa-for-woocommerce.php, and the "BFCM 2026" lines in
 * the admin class and src/components/UpgradePro/UpgradePro.jsx.
 *
 * Ported from Product Video Gallery for WooCommerce's seasonal notice; the
 * Claim button opens Askora's own Upgrade to Pro screen instead of an
 * external pricing page.
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/admin
 */

defined( 'ABSPATH' ) || exit;

class Quick_Qa_Seasonal_Notice {

	const COUPON_CODE      = 'FSBFCM2026';
	const DISCOUNT_PERCENT = 40;
	const EXPIRES_AT       = '2026-12-07 23:59:59';
	const DISMISS_META     = 'quick_qa_bfcm_2026_dismissed';
	const NONCE_ACTION     = 'quick_qa_bfcm_dismiss';
	const AJAX_ACTION      = 'quick_qa_bfcm_dismiss';

	// Single-site plans (see src/components/UpgradePro/UpgradePro.jsx); shown as "from".
	const YEARLY_PRICE            = 49;
	const YEARLY_DISCOUNT_PRICE   = 29.40;
	const LIFETIME_PRICE          = 149;
	const LIFETIME_DISCOUNT_PRICE = 89.40;

	/**
	 * Whether the sale is still running (ignores dismissal and Pro status).
	 * Used by the Upgrade page to pre-apply the coupon at checkout.
	 *
	 * @return bool
	 */
	public static function is_sale_active() {
		return current_time( 'timestamp' ) <= strtotime( self::EXPIRES_AT );
	}

	/**
	 * Sale details for the admin React app, or null once the sale is over.
	 *
	 * @return array|null
	 */
	public static function sale_data() {
		if ( ! self::is_sale_active() ) {
			return null;
		}

		return array(
			'coupon'  => self::COUPON_CODE,
			'percent' => self::DISCOUNT_PERCENT,
			'endsAt'  => date_i18n( 'M j', strtotime( self::EXPIRES_AT ) ),
		);
	}

	/**
	 * Askora's own Upgrade to Pro screen.
	 *
	 * @return string
	 */
	protected function claim_url() {
		return admin_url( 'admin.php?page=quick-qa#upgrade' );
	}

	/**
	 * Single gate reused by enqueue_assets() and render_notice() so both
	 * hooks agree on whether the banner is shown this request.
	 *
	 * @return bool
	 */
	protected function should_show() {
		// The plugin/theme upload screens use a bare header and stream
		// install output into the page, which breaks the banner layout.
		global $pagenow;
		if ( 'update.php' === $pagenow ) {
			return false;
		}

		if ( ! is_user_logged_in() || ! current_user_can( 'manage_options' ) ) {
			return false;
		}

		if ( $this->is_pro_active() || ! self::is_sale_active() || $this->is_dismissed_for_current_user() ) {
			return false;
		}

		return true;
	}

	/**
	 * Same signal the admin app uses: a licensed Pro plugin turns it on.
	 * Pro installed but unlicensed still sees the offer (and the Upgrade page).
	 *
	 * @return bool
	 */
	protected function is_pro_active() {
		return (bool) apply_filters( 'quick_qa_is_pro', false );
	}

	/**
	 * @return bool
	 */
	protected function is_dismissed_for_current_user() {
		return (bool) get_user_meta( get_current_user_id(), self::DISMISS_META, true );
	}

	/**
	 * @return string Plugin root URL with a trailing slash.
	 */
	private function plugin_root_url() {
		return plugin_dir_url( QUICK_QA_FOR_WOOCOMMERCE_FILE );
	}

	public function enqueue_assets() {
		if ( ! $this->should_show() ) {
			return;
		}

		$version = defined( 'QUICK_QA_FOR_WOOCOMMERCE_VERSION' ) ? QUICK_QA_FOR_WOOCOMMERCE_VERSION : false;

		wp_enqueue_style(
			'quick-qa-seasonal-notice',
			$this->plugin_root_url() . 'admin/css/quick-qa-seasonal-notice.css',
			array( 'dashicons' ),
			$version
		);

		wp_enqueue_script(
			'quick-qa-seasonal-notice',
			$this->plugin_root_url() . 'admin/js/quick-qa-seasonal-notice.js',
			array( 'jquery' ),
			$version,
			true
		);

		wp_localize_script(
			'quick-qa-seasonal-notice',
			'quickQaBfcm',
			array(
				'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
				'action'     => self::AJAX_ACTION,
				'nonce'      => wp_create_nonce( self::NONCE_ACTION ),
				'couponCode' => self::COUPON_CODE,
			)
		);
	}

	public function render_notice() {
		if ( ! $this->should_show() ) {
			return;
		}

		/* translators: %d: discount percentage, e.g. 40 */
		$percent_label = sprintf( __( '%d%%', 'quick-qa-for-woocommerce' ), self::DISCOUNT_PERCENT );
		?>
		<div id="qq-bfcm-notice" class="notice qq-bfcm-notice" role="region" aria-label="<?php esc_attr_e( 'Black Friday Sale', 'quick-qa-for-woocommerce' ); ?>">
			<button type="button" id="qq-bfcm-dismiss" class="qq-bfcm-dismiss" aria-label="<?php esc_attr_e( 'Dismiss', 'quick-qa-for-woocommerce' ); ?>">
				<span class="dashicons dashicons-no-alt" aria-hidden="true"></span>
			</button>

			<div class="qq-bfcm-body">
				<div class="qq-bfcm-headline-group">
					<h2 class="qq-bfcm-headline">
						<span class="qq-bfcm-emoji" aria-hidden="true">🛍️🔥🖤</span>
						<?php esc_html_e( 'Black Friday & Cyber Monday Sale —', 'quick-qa-for-woocommerce' ); ?>
						<span class="qq-bfcm-percent"><?php echo esc_html( $percent_label ); ?></span>
						<?php esc_html_e( 'OFF Askora Pro', 'quick-qa-for-woocommerce' ); ?>
					</h2>
					<div class="qq-bfcm-offer-ends">
						<span class="dashicons dashicons-clock" aria-hidden="true"></span>
						<?php
						printf(
							/* translators: %s: formatted end date, e.g. "Dec 7" */
							esc_html__( 'Offer ends %s', 'quick-qa-for-woocommerce' ),
							esc_html( date_i18n( 'M j', strtotime( self::EXPIRES_AT ) ) )
						);
						?>
					</div>
				</div>

				<div class="qq-bfcm-pricing">
					<div class="qq-bfcm-price-card">
						<span class="qq-bfcm-price-label"><?php esc_html_e( 'Yearly, from', 'quick-qa-for-woocommerce' ); ?></span>
						<span class="qq-bfcm-price-old">$<?php echo esc_html( number_format_i18n( self::YEARLY_PRICE, 0 ) ); ?></span>
						<span class="qq-bfcm-price-new">$<?php echo esc_html( number_format_i18n( self::YEARLY_DISCOUNT_PRICE, 2 ) ); ?></span>
					</div>
					<div class="qq-bfcm-price-card qq-bfcm-price-card--best">
						<span class="qq-bfcm-best-badge"><?php esc_html_e( 'Best Deal', 'quick-qa-for-woocommerce' ); ?></span>
						<span class="qq-bfcm-price-label"><?php esc_html_e( 'Lifetime, from', 'quick-qa-for-woocommerce' ); ?></span>
						<span class="qq-bfcm-price-old">$<?php echo esc_html( number_format_i18n( self::LIFETIME_PRICE, 0 ) ); ?></span>
						<span class="qq-bfcm-price-new">$<?php echo esc_html( number_format_i18n( self::LIFETIME_DISCOUNT_PRICE, 2 ) ); ?></span>
					</div>
				</div>

				<div class="qq-bfcm-coupon-row">
					<div class="qq-bfcm-coupon-card">
						<div class="qq-bfcm-coupon-info">
							<span class="qq-bfcm-coupon-label"><?php esc_html_e( 'Coupon Code', 'quick-qa-for-woocommerce' ); ?></span>
							<code class="qq-bfcm-code" id="qq-bfcm-code"><?php echo esc_html( self::COUPON_CODE ); ?></code>
						</div>
						<button type="button" id="qq-bfcm-copy-btn" class="qq-bfcm-copy-btn">
							<span class="dashicons dashicons-clipboard" aria-hidden="true"></span>
							<?php esc_html_e( 'Copy', 'quick-qa-for-woocommerce' ); ?>
						</button>
					</div>
					<span id="qq-bfcm-copy-status" class="qq-bfcm-copy-status">
						<span class="dashicons dashicons-yes" aria-hidden="true"></span>
						<?php esc_html_e( 'Copied!', 'quick-qa-for-woocommerce' ); ?>
					</span>

					<div class="qq-bfcm-cta-group">
						<a href="<?php echo esc_url( $this->claim_url() ); ?>" class="qq-bfcm-cta">
							<?php
							printf(
								/* translators: %s: discount percentage label, e.g. "40%" */
								esc_html__( 'Claim %s Off', 'quick-qa-for-woocommerce' ),
								esc_html( $percent_label )
							);
							?>
							<span class="qq-bfcm-cta-arrow" aria-hidden="true">→</span>
						</a>
						<span class="qq-bfcm-guarantee">
							<span class="dashicons dashicons-shield" aria-hidden="true"></span>
							<?php esc_html_e( '30-day money back', 'quick-qa-for-woocommerce' ); ?>
						</span>
					</div>
				</div>
			</div>
		</div>
		<?php
	}

	public function handle_dismiss() {
		check_ajax_referer( self::NONCE_ACTION, 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( __( 'Unauthorized', 'quick-qa-for-woocommerce' ), 403 );
		}

		update_user_meta( get_current_user_id(), self::DISMISS_META, time() );

		wp_send_json_success();
	}
}
