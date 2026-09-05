<?php
/**
 * CSV export of Q&A data (KAN-26), streamed via admin-post.php.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.3.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 */

/**
 * Streams a raw CSV file download of Q&A matching the requested filters.
 *
 * Uses admin-post.php rather than the REST API — the simplest, standard
 * WordPress way to serve a raw (non-JSON) file download; a plain GET
 * browser navigation with its own dedicated nonce, not a fetch() call.
 *
 * @since      1.3.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_For_Woocommerce_Export {

	/**
	 * The ID of this plugin.
	 *
	 * @since  1.3.0
	 * @access private
	 * @var    string
	 */
	private $plugin_name;

	/**
	 * The current version of this plugin.
	 *
	 * @since  1.3.0
	 * @access private
	 * @var    string
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since 1.3.0
	 * @param string $plugin_name The name of the plugin.
	 * @param string $version     The current version of this plugin.
	 */
	public function __construct( $plugin_name, $version ) {
		$this->plugin_name = $plugin_name;
		$this->version     = $version;
	}

	/**
	 * Handle `admin-post.php?action=quick_qa_export_csv`.
	 *
	 * Reads date_from/date_to/status/category filters from the query
	 * string, queries matching Q&A, and streams a UTF-8-BOM-prefixed CSV
	 * built with fputcsv() (so Excel/Sheets/LibreOffice all open it cleanly
	 * with correctly escaped special characters — KAN-26 acceptance
	 * criterion #2).
	 *
	 * @since 1.3.0
	 */
	public function handle_export_csv() {
		if ( ! current_user_can( 'manage_woocommerce' ) && ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'quick-qa-for-woocommerce' ), '', array( 'response' => 403 ) );
		}

		check_admin_referer( 'quick_qa_export_csv' );

		$rows = $this->fetch_rows(
			isset( $_GET['date_from'] ) ? sanitize_text_field( wp_unslash( $_GET['date_from'] ) ) : '',
			isset( $_GET['date_to'] ) ? sanitize_text_field( wp_unslash( $_GET['date_to'] ) ) : '',
			isset( $_GET['status'] ) ? sanitize_key( wp_unslash( $_GET['status'] ) ) : '',
			isset( $_GET['category'] ) ? absint( $_GET['category'] ) : 0
		);

		$this->stream_csv( $rows );
	}

	/**
	 * Query questions (+ their first admin/community answer) matching the
	 * given filters.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  string $date_from 'Y-m-d' or empty.
	 * @param  string $date_to   'Y-m-d' or empty.
	 * @param  string $status    Question status, 'all', or empty.
	 * @param  int    $category  product_cat term ID, or 0 for no filter.
	 * @return object[]
	 * @global wpdb $wpdb
	 */
	private function fetch_rows( $date_from, $date_to, $status, $category ) {
		global $wpdb;

		$questions_table = $wpdb->prefix . 'quick_qa_questions';
		$answers_table   = $wpdb->prefix . 'quick_qa_answers';

		$where  = array( '1=1' );
		$params = array();

		if ( $date_from && $this->is_valid_date( $date_from ) ) {
			$where[]  = 'q.created_at >= %s';
			$params[] = $date_from . ' 00:00:00';
		}
		if ( $date_to && $this->is_valid_date( $date_to ) ) {
			$where[]  = 'q.created_at <= %s';
			$params[] = $date_to . ' 23:59:59';
		}
		if ( $status && 'all' !== $status ) {
			$where[]  = 'q.status = %s';
			$params[] = $status;
		}
		if ( $category ) {
			$product_ids = get_objects_in_term( $category, 'product_cat' );
			if ( is_wp_error( $product_ids ) || empty( $product_ids ) ) {
				$product_ids = array( 0 ); // No matches — force an empty result set rather than erroring.
			}
			$placeholders = implode( ', ', array_fill( 0, count( $product_ids ), '%d' ) );
			$where[]      = "q.product_id IN ( {$placeholders} )";
			$params       = array_merge( $params, array_map( 'absint', $product_ids ) );
		}

		$sql = "
			SELECT
				q.product_id,
				q.question_text,
				q.status     AS question_status,
				q.upvotes    AS question_upvotes,
				q.user_id    AS question_user_id,
				q.guest_name,
				q.created_at AS question_date,
				a.answer_text,
				a.status     AS answer_status,
				a.upvotes    AS answer_upvotes,
				a.user_id    AS answer_user_id,
				a.created_at AS answer_date
			FROM {$questions_table} q
			LEFT JOIN {$answers_table} a
				ON a.question_id = q.id AND a.answer_type IN ( 'admin', 'community' ) AND a.parent_answer_id IS NULL
			WHERE " . implode( ' AND ', $where ) . '
			ORDER BY q.created_at ASC
		';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		return empty( $params )
			// phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared -- no user input reaches $sql when $params is empty.
			? $wpdb->get_results( $sql )
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			: $wpdb->get_results( $wpdb->prepare( $sql, ...$params ) );
	}

	/**
	 * Stream the result set as a downloadable CSV and exit.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  object[] $rows
	 */
	private function stream_csv( array $rows ) {
		nocache_headers();
		header( 'Content-Type: text/csv; charset=UTF-8' );
		header( 'Content-Disposition: attachment; filename="quick-qa-export-' . gmdate( 'Y-m-d' ) . '.csv"' );

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen
		$out = fopen( 'php://output', 'w' );

		// UTF-8 BOM — required for Excel to reliably detect UTF-8 (Sheets/LibreOffice are fine either way).
		fwrite( $out, "\xEF\xBB\xBF" );

		fputcsv(
			$out,
			array(
				__( 'Product', 'quick-qa-for-woocommerce' ),
				__( 'Product ID', 'quick-qa-for-woocommerce' ),
				__( 'Question', 'quick-qa-for-woocommerce' ),
				__( 'Asker', 'quick-qa-for-woocommerce' ),
				__( 'Question status', 'quick-qa-for-woocommerce' ),
				__( 'Question upvotes', 'quick-qa-for-woocommerce' ),
				__( 'Question date', 'quick-qa-for-woocommerce' ),
				__( 'Answer', 'quick-qa-for-woocommerce' ),
				__( 'Answered by', 'quick-qa-for-woocommerce' ),
				__( 'Answer status', 'quick-qa-for-woocommerce' ),
				__( 'Answer upvotes', 'quick-qa-for-woocommerce' ),
				__( 'Answer date', 'quick-qa-for-woocommerce' ),
			)
		);

		foreach ( $rows as $row ) {
			$product_title = get_the_title( $row->product_id );
			fputcsv(
				$out,
				array(
					'' !== $product_title ? $product_title : ( '#' . $row->product_id ),
					$row->product_id,
					$row->question_text,
					$this->resolve_person( $row->question_user_id, $row->guest_name ),
					$row->question_status,
					(int) $row->question_upvotes,
					$this->format_date( $row->question_date ),
					(string) $row->answer_text,
					$row->answer_user_id ? $this->resolve_person( $row->answer_user_id, '' ) : '',
					(string) $row->answer_status,
					$row->answer_upvotes ? (int) $row->answer_upvotes : 0,
					$this->format_date( $row->answer_date ),
				)
			);
		}

		fclose( $out );
		exit;
	}

	/**
	 * Resolve a display name for a question/answer author: real user's
	 * display name when logged in, otherwise the stored guest name.
	 *
	 * Mirrors the resolution pattern in
	 * Quick_Qa_For_Woocommerce_Schema::resolve_question_author()/
	 * resolve_answer_author() — reimplemented locally since those are
	 * private to that class.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  int    $user_id
	 * @param  string $guest_name
	 * @return string
	 */
	private function resolve_person( $user_id, $guest_name ) {
		if ( $user_id ) {
			$user = get_userdata( (int) $user_id );
			if ( $user ) {
				return $user->display_name;
			}
		}

		return $guest_name ? $guest_name : __( 'Anonymous', 'quick-qa-for-woocommerce' );
	}

	/**
	 * Format a MySQL UTC datetime string for the exported CSV.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  string $mysql_datetime
	 * @return string
	 */
	private function format_date( $mysql_datetime ) {
		if ( ! $mysql_datetime ) {
			return '';
		}
		$timestamp = strtotime( $mysql_datetime );
		return $timestamp ? gmdate( 'Y-m-d H:i:s', $timestamp ) : '';
	}

	/**
	 * @since  1.3.0
	 * @access private
	 * @param  string $value
	 * @return bool
	 */
	private function is_valid_date( $value ) {
		$dt = DateTime::createFromFormat( 'Y-m-d', $value );
		return $dt instanceof DateTime;
	}
}
