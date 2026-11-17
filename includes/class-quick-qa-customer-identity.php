<?php
defined( 'ABSPATH' ) || exit;

/**
 * Stable, URL-safe identity keys for Q&A authors (KAN-33).
 *
 * Registered users are keyed by user ID ("u:12"). Guests have no account,
 * so they are keyed by a hash of their lower-cased email ("g:<md5>"); the
 * raw address never appears in URLs or keys. Guests who left no email get
 * an empty key (no profile).
 *
 * Used by the admin questions payload here and by the Pro plugin's
 * customer profiles, so both always agree on who is who.
 *
 * @since      1.5.1
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */
class Quick_Qa_Customer_Identity {

	/**
	 * Identity key for an author.
	 *
	 * @since  1.5.1
	 * @param  int    $user_id     0 for guests.
	 * @param  string $guest_email Guest email (ignored for registered users).
	 * @return string "u:{id}", "g:{md5}", or '' when the author can't be identified.
	 */
	public static function key( $user_id, $guest_email = '' ) {
		$user_id = (int) $user_id;
		if ( $user_id > 0 ) {
			return 'u:' . $user_id;
		}

		$email = strtolower( trim( (string) $guest_email ) );

		return '' !== $email ? 'g:' . md5( $email ) : '';
	}

	/**
	 * Parse a key back into its parts.
	 *
	 * @since  1.5.1
	 * @param  string $key
	 * @return array|null { type: 'user'|'guest', user_id: int, hash: string } or null if malformed.
	 */
	public static function parse( $key ) {
		if ( preg_match( '/^u:([1-9]\d*)$/', (string) $key, $m ) ) {
			return array(
				'type'    => 'user',
				'user_id' => (int) $m[1],
				'hash'    => '',
			);
		}

		if ( preg_match( '/^g:([a-f0-9]{32})$/', (string) $key, $m ) ) {
			return array(
				'type'    => 'guest',
				'user_id' => 0,
				'hash'    => $m[1],
			);
		}

		return null;
	}
}
