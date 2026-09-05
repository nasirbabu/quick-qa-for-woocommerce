<?php
/**
 * Debug logger for Quick Q&A for WooCommerce.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.3.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

defined( 'ABSPATH' ) || exit;

/**
 * Writes a single rolling log file scoped to Askora's own events (email
 * sends, Slack posts, blocked public REST requests) so a developer can
 * diagnose problems — e.g. a digest email that never arrived — from inside
 * wp-admin instead of digging through the server's raw debug.log.
 *
 * Logging is skipped entirely when the 'adv_debug_log_enabled' setting is
 * off. The file is capped at MAX_BYTES; once exceeded, the oldest half is
 * dropped so the log can never grow unbounded on a busy store.
 *
 * @since      1.3.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Logger {

	/**
	 * Maximum log file size in bytes before the oldest half is trimmed.
	 *
	 * @since 1.3.0
	 * @var   int
	 */
	const MAX_BYTES = 1048576; // 1 MB.

	/**
	 * Bytes read from the end of the file for the admin log viewer / download.
	 *
	 * @since 1.3.0
	 * @var   int
	 */
	const TAIL_BYTES = 131072; // 128 KB.

	/**
	 * Append one line to the log file, unless debug logging is turned off.
	 *
	 * @since 1.3.0
	 * @param string $level   'info' | 'warning' | 'error'.
	 * @param string $message Human-readable log line (no trailing newline).
	 */
	public static function log( $level, $message ) {
		$settings = get_option( 'quick_qa_settings', array() );
		if ( isset( $settings['adv_debug_log_enabled'] ) && ! $settings['adv_debug_log_enabled'] ) {
			return;
		}

		self::ensure_dir();

		$path = self::path();
		$line = sprintf( "[%s] %s: %s\n", gmdate( 'Y-m-d H:i:s' ), strtoupper( $level ), $message );

		$current_size = file_exists( $path ) ? filesize( $path ) : 0;
		if ( $current_size + strlen( $line ) > self::MAX_BYTES ) {
			self::trim_oldest_half( $path );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		file_put_contents( $path, $line, FILE_APPEND | LOCK_EX );
	}

	/**
	 * Absolute path to the log file, inside wp-content/uploads so it survives
	 * plugin updates and is writable on every standard WordPress install.
	 *
	 * @since  1.3.0
	 * @return string
	 */
	public static function path() {
		$upload = wp_upload_dir();
		return trailingslashit( $upload['basedir'] ) . 'quick-qa-logs/debug.log';
	}

	/**
	 * Current log file size in bytes (0 if it doesn't exist yet).
	 *
	 * @since  1.3.0
	 * @return int
	 */
	public static function size() {
		$path = self::path();
		return file_exists( $path ) ? filesize( $path ) : 0;
	}

	/**
	 * Last-modified time of the log file as an ISO 8601 UTC string, or null.
	 *
	 * @since  1.3.0
	 * @return string|null
	 */
	public static function updated() {
		$path = self::path();
		return file_exists( $path ) ? gmdate( 'c', filemtime( $path ) ) : null;
	}

	/**
	 * Return up to the last TAIL_BYTES of the log, for the admin viewer.
	 *
	 * @since  1.3.0
	 * @return string
	 */
	public static function tail() {
		$path = self::path();
		if ( ! file_exists( $path ) ) {
			return '';
		}

		$size = filesize( $path );
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_read_fopen
		$handle = fopen( $path, 'rb' );
		if ( ! $handle ) {
			return '';
		}

		$truncated = $size > self::TAIL_BYTES;
		if ( $truncated ) {
			fseek( $handle, -self::TAIL_BYTES, SEEK_END );
		}
		$data = stream_get_contents( $handle );
		fclose( $handle ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose

		if ( $truncated ) {
			// Drop the partial first line left over from the seek.
			$newline = strpos( $data, "\n" );
			$data    = false !== $newline ? substr( $data, $newline + 1 ) : $data;
		}

		return $data;
	}

	/**
	 * Empty the log file (keeps the file itself so permissions/dir stay put).
	 *
	 * @since 1.3.0
	 */
	public static function clear() {
		$path = self::path();
		if ( file_exists( $path ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $path, '' );
		}
	}

	/**
	 * Create the log directory on first write and lock it down from direct
	 * web access (defense in depth on top of the REST/admin-post auth checks
	 * that gate every read/download of its contents).
	 *
	 * @since 1.3.0
	 */
	private static function ensure_dir() {
		$dir = dirname( self::path() );
		if ( ! file_exists( $dir ) ) {
			wp_mkdir_p( $dir );
		}

		$htaccess = $dir . '/.htaccess';
		if ( ! file_exists( $htaccess ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $htaccess, "Deny from all\n" );
		}

		$index = $dir . '/index.php';
		if ( ! file_exists( $index ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $index, "<?php\n// Silence is golden.\n" );
		}
	}

	/**
	 * Drop the oldest half of the log file, at a line boundary, to keep the
	 * file bounded without an external log-rotation process.
	 *
	 * @since 1.3.0
	 * @param string $path
	 */
	private static function trim_oldest_half( $path ) {
		if ( ! file_exists( $path ) ) {
			return;
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_read_file_get_contents
		$contents = file_get_contents( $path );
		$half     = (int) ( strlen( $contents ) / 2 );
		$trimmed  = substr( $contents, $half );

		$newline = strpos( $trimmed, "\n" );
		if ( false !== $newline ) {
			$trimmed = substr( $trimmed, $newline + 1 );
		}

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		file_put_contents( $path, $trimmed, LOCK_EX );
	}
}
