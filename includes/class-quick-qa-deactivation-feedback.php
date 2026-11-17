<?php
defined( 'ABSPATH' ) || exit;

/**
 * Deactivation feedback popup (KAN-68).
 *
 * On the Plugins screen, clicking "Deactivate" on Askora opens a short
 * modal asking why. The answer is posted to the shared Easy Soft feedback
 * API (the same one Easy Map uses) and the original deactivate link is then
 * followed. Skipping is always possible and deactivation is never held up
 * for long: the remote request has a short timeout and the popup moves on
 * after a few seconds regardless.
 *
 * Askora Pro keeps the Freemius deactivation form on its own row.
 *
 * Data sent: reason, optional details, site URL, plugin / WordPress / PHP /
 * WooCommerce versions, locale and whether Pro is active. Nothing is stored
 * locally.
 *
 * @since      1.5.1
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */
class Quick_Qa_Deactivation_Feedback {

	/**
	 * AJAX action and nonce name.
	 *
	 * @since 1.5.1
	 * @var   string
	 */
	const ACTION = 'quick_qa_deactivation_feedback';

	/**
	 * Default feedback API (filterable via `quick_qa_deactivation_feedback_endpoint`).
	 *
	 * @since 1.5.1
	 * @var   string
	 */
	const ENDPOINT = 'https://easy-soft-feedback.vercel.app/api/feedbacks';

	/**
	 * Max characters accepted in the details field.
	 *
	 * @since 1.5.1
	 * @var   int
	 */
	const MAX_DETAILS = 1000;

	/**
	 * Deactivation reasons: key => { label, placeholder }.
	 *
	 * @since  1.5.1
	 * @return array
	 */
	public static function reasons() {
		/**
		 * Filter the deactivation reasons shown in the feedback popup.
		 *
		 * @since 1.5.1
		 * @param array $reasons key => { label: string, placeholder: string }
		 */
		return (array) apply_filters(
			'quick_qa_deactivation_reasons',
			array(
				'not_working'     => array(
					'label'       => __( 'The plugin is not working', 'quick-qa-for-woocommerce' ),
					'placeholder' => __( 'What went wrong? Any error message helps.', 'quick-qa-for-woocommerce' ),
				),
				'missing_feature' => array(
					'label'       => __( "It's missing a feature I need", 'quick-qa-for-woocommerce' ),
					'placeholder' => __( 'Which feature would you like to see?', 'quick-qa-for-woocommerce' ),
				),
				'found_better'    => array(
					'label'       => __( 'I found a better plugin', 'quick-qa-for-woocommerce' ),
					'placeholder' => __( 'Which plugin, and what does it do better?', 'quick-qa-for-woocommerce' ),
				),
				'confusing'       => array(
					'label'       => __( "It's hard to set up or use", 'quick-qa-for-woocommerce' ),
					'placeholder' => __( 'Which part was confusing?', 'quick-qa-for-woocommerce' ),
				),
				'temporary'       => array(
					'label'       => __( "I'm just deactivating temporarily", 'quick-qa-for-woocommerce' ),
					'placeholder' => __( 'Anything else you want to tell us? (optional)', 'quick-qa-for-woocommerce' ),
				),
				'other'           => array(
					'label'       => __( 'Other', 'quick-qa-for-woocommerce' ),
					'placeholder' => __( 'Please tell us a bit more.', 'quick-qa-for-woocommerce' ),
				),
			)
		);
	}

	/**
	 * Whether the popup should be shown on the current request.
	 *
	 * @since  1.5.1
	 * @return bool
	 */
	private static function should_show() {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return false;
		}

		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

		return $screen && 'plugins' === $screen->id;
	}

	/**
	 * @since  1.5.1
	 * @return string
	 */
	private static function plugin_url() {
		return plugin_dir_url( QUICK_QA_FOR_WOOCOMMERCE_FILE );
	}

	/**
	 * Enqueue the popup assets on the Plugins screen only.
	 *
	 * @since 1.5.1
	 * @param string $hook Current admin page hook.
	 */
	public function enqueue( $hook ) {
		if ( 'plugins.php' !== $hook || ! self::should_show() ) {
			return;
		}

		$version = defined( 'QUICK_QA_FOR_WOOCOMMERCE_VERSION' ) ? QUICK_QA_FOR_WOOCOMMERCE_VERSION : '1.0.0';

		wp_enqueue_style( 'quick-qa-deactivate', self::plugin_url() . 'admin/css/quick-qa-deactivate.css', array(), $version );
		wp_enqueue_script( 'quick-qa-deactivate', self::plugin_url() . 'admin/js/quick-qa-deactivate.js', array( 'jquery' ), $version, true );

		$placeholders = array();
		foreach ( self::reasons() as $key => $reason ) {
			$placeholders[ $key ] = isset( $reason['placeholder'] ) ? (string) $reason['placeholder'] : '';
		}

		wp_localize_script(
			'quick-qa-deactivate',
			'quickQaDeactivate',
			array(
				'ajaxUrl'      => admin_url( 'admin-ajax.php' ),
				'action'       => self::ACTION,
				'nonce'        => wp_create_nonce( self::ACTION ),
				'basename'     => plugin_basename( QUICK_QA_FOR_WOOCOMMERCE_FILE ),
				'placeholders' => $placeholders,
				'sending'      => __( 'Sending…', 'quick-qa-for-woocommerce' ),
			)
		);
	}

	/**
	 * Print the (hidden) modal in the Plugins screen footer.
	 *
	 * @since 1.5.1
	 */
	public function render_modal() {
		if ( ! self::should_show() ) {
			return;
		}
		?>
		<div class="qq-dfb-overlay" id="qq-dfb-overlay" hidden>
			<div class="qq-dfb-modal" role="dialog" aria-modal="true" aria-labelledby="qq-dfb-title" aria-describedby="qq-dfb-sub">
				<form class="qq-dfb-form" id="qq-dfb-form" novalidate>
					<div class="qq-dfb-head">
						<span class="qq-dfb-mark" aria-hidden="true">Q</span>
						<div>
							<h2 class="qq-dfb-title" id="qq-dfb-title"><?php esc_html_e( 'Quick feedback before you go', 'quick-qa-for-woocommerce' ); ?></h2>
							<p class="qq-dfb-sub" id="qq-dfb-sub"><?php esc_html_e( "Could you tell us why you're deactivating Askora? It helps us make it better.", 'quick-qa-for-woocommerce' ); ?></p>
						</div>
					</div>

					<fieldset class="qq-dfb-reasons">
						<legend class="screen-reader-text"><?php esc_html_e( 'Reason for deactivating', 'quick-qa-for-woocommerce' ); ?></legend>
						<?php foreach ( self::reasons() as $key => $reason ) : ?>
							<label class="qq-dfb-reason">
								<input type="radio" name="qq_dfb_reason" value="<?php echo esc_attr( $key ); ?>" />
								<span><?php echo esc_html( $reason['label'] ); ?></span>
							</label>
						<?php endforeach; ?>
					</fieldset>

					<label class="screen-reader-text" for="qq-dfb-details"><?php esc_html_e( 'Details', 'quick-qa-for-woocommerce' ); ?></label>
					<textarea
						class="qq-dfb-details"
						id="qq-dfb-details"
						rows="3"
						maxlength="<?php echo (int) self::MAX_DETAILS; ?>"
						placeholder="<?php esc_attr_e( 'Your feedback (optional)', 'quick-qa-for-woocommerce' ); ?>"
					></textarea>

					<p class="qq-dfb-privacy">
						<?php esc_html_e( 'We receive your answer, your site URL, and your plugin, WordPress, PHP and WooCommerce versions. Nothing else.', 'quick-qa-for-woocommerce' ); ?>
					</p>

					<div class="qq-dfb-actions">
						<button type="button" class="button-link qq-dfb-cancel" id="qq-dfb-cancel"><?php esc_html_e( 'Cancel', 'quick-qa-for-woocommerce' ); ?></button>
						<span class="qq-dfb-actions-right">
							<button type="button" class="button qq-dfb-skip" id="qq-dfb-skip"><?php esc_html_e( 'Skip & Deactivate', 'quick-qa-for-woocommerce' ); ?></button>
							<button type="submit" class="button button-primary qq-dfb-submit" id="qq-dfb-submit" disabled><?php esc_html_e( 'Submit & Deactivate', 'quick-qa-for-woocommerce' ); ?></button>
						</span>
					</div>
				</form>
			</div>
		</div>
		<?php
	}

	/**
	 * AJAX: forward the feedback to the feedback API.
	 *
	 * @since 1.5.1
	 */
	public function handle_ajax() {
		check_ajax_referer( self::ACTION, 'nonce' );

		if ( ! current_user_can( 'activate_plugins' ) ) {
			wp_send_json_error( array( 'message' => 'forbidden' ), 403 );
		}

		$payload = self::build_payload(
			isset( $_POST['reason'] ) ? wp_unslash( $_POST['reason'] ) : '', // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized in build_payload().
			isset( $_POST['details'] ) ? wp_unslash( $_POST['details'] ) : '' // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- sanitized in build_payload().
		);

		/**
		 * Filter the feedback API URL.
		 *
		 * @since 1.5.1
		 * @param string $endpoint
		 */
		$endpoint = (string) apply_filters( 'quick_qa_deactivation_feedback_endpoint', self::ENDPOINT );

		// Blocking with a short timeout: a non-blocking request is dropped almost
		// immediately and serverless APIs may never receive the body. The popup
		// JS deactivates anyway after a few seconds, so a slow API never holds
		// the admin up.
		$response = wp_remote_post(
			$endpoint,
			array(
				'timeout'  => 4,
				'blocking' => true,
				'headers'  => array(
					'Content-Type' => 'application/json',
					'Accept'       => 'application/json',
				),
				'body'     => wp_json_encode( $payload ),
			)
		);

		if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			if ( is_wp_error( $response ) ) {
				error_log( '[Askora] Deactivation feedback failed: ' . $response->get_error_message() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			} elseif ( wp_remote_retrieve_response_code( $response ) >= 300 ) {
				error_log( '[Askora] Deactivation feedback HTTP ' . wp_remote_retrieve_response_code( $response ) . ': ' . substr( (string) wp_remote_retrieve_body( $response ), 0, 300 ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			}
		}

		wp_send_json_success();
	}

	/**
	 * Sanitize the submitted answer and add environment details.
	 *
	 * @since  1.5.1
	 * @param  string $reason
	 * @param  string $details
	 * @return array
	 */
	public static function build_payload( $reason, $details ) {
		$reason  = sanitize_key( (string) $reason );
		$reason  = array_key_exists( $reason, self::reasons() ) ? $reason : '';
		$details = sanitize_textarea_field( (string) $details );
		if ( function_exists( 'mb_substr' ) ) {
			$details = mb_substr( $details, 0, self::MAX_DETAILS );
		} else {
			$details = substr( $details, 0, self::MAX_DETAILS );
		}

		return array(
			'reason'         => $reason,
			'details'        => $details,
			'site_url'       => home_url(),
			'plugin'         => 'Askora',
			'plugin_version' => defined( 'QUICK_QA_FOR_WOOCOMMERCE_VERSION' ) ? QUICK_QA_FOR_WOOCOMMERCE_VERSION : '',
			'wp_version'     => get_bloginfo( 'version' ),
			'php_version'    => PHP_VERSION,
			'wc_version'     => defined( 'WC_VERSION' ) ? WC_VERSION : '',
			'locale'         => get_locale(),
			'is_pro'         => (bool) apply_filters( 'quick_qa_is_pro', false ),
		);
	}
}
