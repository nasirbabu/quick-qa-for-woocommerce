<?php
/**
 * Variable-substitution renderer for Quick Q&A email templates.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */

defined( 'ABSPATH' ) || exit;

/**
 * Renders a subject/body template string against a data array, guaranteeing
 * no raw {token} ever survives in the output — even for a token an admin
 * pasted into the body that isn't in the template's declared variable list.
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/emails
 */
class Quick_Qa_Email_Renderer {

	/**
	 * Replace every {token} in $text with its real value (from $data) or,
	 * when missing/empty, the token's fallback text. Any {token}-shaped
	 * string that still remains afterwards (e.g. an unregistered token) is
	 * stripped as a final safety net.
	 *
	 * @since  1.2.0
	 * @param  string   $text         Raw template subject or body.
	 * @param  array    $data         Real values, keyed by token name (no braces).
	 * @param  string[] $known_tokens Token names this template declares (no braces).
	 * @return string
	 */
	public static function render( $text, array $data, array $known_tokens ) {
		foreach ( $known_tokens as $token ) {
			$value = $data[ $token ] ?? null;
			if ( null === $value || '' === trim( (string) $value ) ) {
				$value = Quick_Qa_Email_Vars::fallback( $token );
			}
			$text = str_replace( '{' . $token . '}', (string) $value, $text );
		}

		// Safety net: strip any {token}-shaped string that survived (typo or
		// unregistered token pasted into the body) so it can never reach a
		// sent email literally.
		return preg_replace( '/\{[a-z0-9_]+\}/i', '', $text );
	}
}
