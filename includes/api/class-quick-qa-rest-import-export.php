<?php
/**
 * CSV import REST controller (KAN-26).
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.3.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Handles bulk CSV import of Q&A in two phases:
 *
 *   POST /admin/import/preview — parses an uploaded CSV, validates every
 *                                row, and returns a verdict per row. Writes
 *                                nothing to the database.
 *   POST /admin/import/commit  — takes the (already-validated) row set the
 *                                client got back from /preview and performs
 *                                the actual inserts, preserving the CSV's
 *                                historical dates.
 *
 * CSV export is handled separately via an admin-post.php action (see
 * Quick_Qa_For_Woocommerce_Export) since it needs to stream a raw file
 * download rather than a JSON response.
 *
 * @since      1.3.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Rest_Import_Export extends Quick_Qa_Rest_Controller {

	/**
	 * Guardrail against PHP timeouts on a single synchronous request — this
	 * ticket does not build chunked/background processing.
	 *
	 * @since 1.3.0
	 * @var   int
	 */
	const MAX_IMPORT_ROWS = 5000;

	/**
	 * CSV header names (lowercased) accepted for each logical column.
	 *
	 * @since 1.3.0
	 * @var   array<string, string[]>
	 */
	const COLUMN_ALIASES = array(
		'product_id_or_sku' => array( 'product_id or sku', 'product id or sku', 'product_id', 'sku' ),
		'question_text'     => array( 'question_text', 'question text', 'question' ),
		'answer_text'       => array( 'answer_text', 'answer text', 'answer' ),
		'question_date'     => array( 'question_date', 'question date' ),
		'answer_date'       => array( 'answer_date', 'answer date' ),
		'author_name'       => array( 'author_name', 'author name', 'author' ),
	);

	/**
	 * Register import routes.
	 *
	 * @since 1.3.0
	 */
	public function register_routes() {
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/import/preview',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'preview_import' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);

		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/import/commit',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'commit_import' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);
	}

	// =========================================================================
	// Callbacks
	// =========================================================================

	/**
	 * POST /wp-json/quick-qa/v1/admin/import/preview
	 *
	 * Parses the uploaded CSV and validates every row. Writes nothing to the
	 * database — this is the preview step acceptance criteria requires
	 * before any commit can happen.
	 *
	 * @since  1.3.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function preview_import( WP_REST_Request $request ) {
		$locked = $this->pro_required_error();
		if ( $locked ) {
			return $locked;
		}

		$files = $request->get_file_params();

		if ( empty( $files['csv_file'] ) || UPLOAD_ERR_OK !== $files['csv_file']['error'] ) {
			return new WP_Error(
				'quick_qa_no_file',
				__( 'Please choose a CSV file to upload.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$file = $files['csv_file'];

		if ( 'csv' !== strtolower( pathinfo( $file['name'], PATHINFO_EXTENSION ) ) ) {
			return new WP_Error(
				'quick_qa_invalid_file',
				__( 'Please upload a .csv file.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$rows_raw = $this->parse_csv_file( $file );
		if ( is_wp_error( $rows_raw ) ) {
			return $rows_raw;
		}

		if ( count( $rows_raw ) > self::MAX_IMPORT_ROWS ) {
			return new WP_Error(
				'quick_qa_too_many_rows',
				sprintf(
					/* translators: %d: maximum row count allowed in a single import. */
					__( 'This file has more than %d rows. Please split it into smaller files.', 'quick-qa-for-woocommerce' ),
					self::MAX_IMPORT_ROWS
				),
				array( 'status' => 400 )
			);
		}

		$rows  = array();
		$ready = 0;

		foreach ( $rows_raw as $i => $row ) {
			// Row 1 is the header, so the first data row is row 2.
			$result = $this->validate_row( $row, $i + 2 );
			$rows[] = $result;
			if ( $result['valid'] ) {
				++$ready;
			}
		}

		return rest_ensure_response(
			array(
				'total'           => count( $rows ),
				'ready'           => $ready,
				'needs_attention' => count( $rows ) - $ready,
				'rows'            => $rows,
			)
		);
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/import/commit
	 *
	 * Inserts the row set the client already validated via /preview,
	 * preserving each row's historical question/answer dates instead of
	 * stamping the current time. Every row is re-validated server-side —
	 * a client-supplied verdict is never trusted blindly.
	 *
	 * @since  1.3.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function commit_import( WP_REST_Request $request ) {
		$locked = $this->pro_required_error();
		if ( $locked ) {
			return $locked;
		}

		$body = $request->get_json_params();
		$rows = ( isset( $body['rows'] ) && is_array( $body['rows'] ) ) ? $body['rows'] : array();

		if ( empty( $rows ) ) {
			return new WP_Error(
				'quick_qa_no_rows',
				__( 'No rows to import.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		if ( count( $rows ) > self::MAX_IMPORT_ROWS ) {
			return new WP_Error(
				'quick_qa_too_many_rows',
				__( 'Too many rows in a single import.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$imported = 0;
		$skipped  = 0;

		foreach ( $rows as $row ) {
			$row = is_array( $row ) ? $row : array();

			$product_identifier = trim( (string) ( $row['product_id_or_sku'] ?? '' ) );
			$question_text      = trim( (string) ( $row['question_text'] ?? '' ) );
			$answer_text        = trim( (string) ( $row['answer_text'] ?? '' ) );
			$author_name        = trim( (string) ( $row['author_name'] ?? '' ) );
			$question_date_raw  = trim( (string) ( $row['question_date'] ?? '' ) );
			$answer_date_raw    = trim( (string) ( $row['answer_date'] ?? '' ) );

			list( $product_id, $product_error ) = $this->resolve_product_id( $product_identifier );

			if ( $product_error || '' === $question_text || '' === $answer_text ) {
				++$skipped;
				continue;
			}

			$question_dt = ( '' !== $question_date_raw ) ? $this->parse_historical_date( $question_date_raw ) : false;
			if ( '' !== $question_date_raw && false === $question_dt ) {
				++$skipped;
				continue;
			}
			$question_created_at = $question_dt ? $question_dt->format( 'Y-m-d H:i:s' ) : current_time( 'mysql', true );

			$answer_dt = ( '' !== $answer_date_raw ) ? $this->parse_historical_date( $answer_date_raw ) : false;
			if ( '' !== $answer_date_raw && false === $answer_dt ) {
				++$skipped;
				continue;
			}
			$answer_created_at = $answer_dt ? $answer_dt->format( 'Y-m-d H:i:s' ) : $question_created_at;

			$question_id = $this->insert_historical_question( $product_id, $author_name, $question_text, $question_created_at );
			if ( is_wp_error( $question_id ) ) {
				++$skipped;
				continue;
			}

			$this->insert_historical_answer( $question_id, $answer_text, $answer_created_at );
			++$imported;
		}

		return rest_ensure_response(
			array(
				'imported' => $imported,
				'skipped'  => $skipped,
			)
		);
	}

	/**
	 * Import/Export is Pro-only (KAN-60): the 403 returned to the free tier,
	 * or null when a licensed Pro install unlocks it via `quick_qa_is_pro`.
	 *
	 * @since  1.6.0
	 * @access private
	 * @return WP_Error|null
	 */
	private function pro_required_error() {
		if ( Quick_Qa_For_Woocommerce_Export::is_pro() ) {
			return null;
		}

		return new WP_Error(
			'quick_qa_pro_required',
			__( 'Import/Export is a Pro feature. Upgrade to Askora Pro to import Q&A.', 'quick-qa-for-woocommerce' ),
			array( 'status' => 403 )
		);
	}

	// =========================================================================
	// CSV parsing
	// =========================================================================

	/**
	 * Parse an uploaded CSV file into an array of associative rows keyed by
	 * logical column name (see COLUMN_ALIASES).
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  array $file One entry from $request->get_file_params().
	 * @return array[]|WP_Error
	 */
	private function parse_csv_file( array $file ) {
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fopen
		$handle = fopen( $file['tmp_name'], 'r' );
		if ( ! $handle ) {
			return new WP_Error(
				'quick_qa_file_read_error',
				__( 'Could not read the uploaded file.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$header = fgetcsv( $handle );
		if ( ! $header ) {
			fclose( $handle );
			return new WP_Error(
				'quick_qa_empty_file',
				__( 'The uploaded file is empty.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		// Strip a UTF-8 BOM from the first header cell, if present.
		$header[0] = preg_replace( '/^\xEF\xBB\xBF/', '', $header[0] );

		$col_index = array();
		foreach ( $header as $index => $cell ) {
			$normalized = strtolower( trim( (string) $cell ) );
			foreach ( self::COLUMN_ALIASES as $key => $names ) {
				if ( in_array( $normalized, $names, true ) ) {
					$col_index[ $key ] = $index;
					break;
				}
			}
		}

		$required = array( 'product_id_or_sku', 'question_text', 'answer_text' );
		$missing  = array_diff( $required, array_keys( $col_index ) );
		if ( ! empty( $missing ) ) {
			fclose( $handle );
			return new WP_Error(
				'quick_qa_missing_columns',
				sprintf(
					/* translators: %s: comma-separated list of missing column names. */
					__( 'Missing required column(s): %s', 'quick-qa-for-woocommerce' ),
					implode( ', ', $missing )
				),
				array( 'status' => 400 )
			);
		}

		$rows = array();
		while ( false !== ( $line = fgetcsv( $handle ) ) ) {
			// fgetcsv() returns [null] for a fully blank line — skip it.
			if ( 1 === count( $line ) && null === $line[0] ) {
				continue;
			}
			$rows[] = array(
				'product_id_or_sku' => $this->cell( $line, $col_index, 'product_id_or_sku' ),
				'question_text'     => $this->cell( $line, $col_index, 'question_text' ),
				'answer_text'       => $this->cell( $line, $col_index, 'answer_text' ),
				'question_date'     => $this->cell( $line, $col_index, 'question_date' ),
				'answer_date'       => $this->cell( $line, $col_index, 'answer_date' ),
				'author_name'       => $this->cell( $line, $col_index, 'author_name' ),
			);
		}
		fclose( $handle );

		return $rows;
	}

	/**
	 * Safely read one CSV cell by logical column name.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  array  $line      A single fgetcsv() row.
	 * @param  array  $col_index Logical column name => cell index map.
	 * @param  string $key       Logical column name to read.
	 * @return string
	 */
	private function cell( array $line, array $col_index, $key ) {
		if ( ! isset( $col_index[ $key ] ) || ! isset( $line[ $col_index[ $key ] ] ) ) {
			return '';
		}
		return (string) $line[ $col_index[ $key ] ];
	}

	// =========================================================================
	// Validation
	// =========================================================================

	/**
	 * Validate one parsed CSV row.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  array $row        One row from parse_csv_file().
	 * @param  int   $row_number 1-based row number as it appears in the CSV (header = row 1).
	 * @return array{row_number:int,product_id_or_sku:string,question_text:string,answer_text:string,question_date:string,answer_date:string,author_name:string,resolved_product_id:int|null,valid:bool,errors:string[]}
	 */
	private function validate_row( array $row, $row_number ) {
		$errors = array();

		$product_identifier                 = trim( (string) $row['product_id_or_sku'] );
		list( $resolved_product_id, $product_error ) = $this->resolve_product_id( $product_identifier );
		if ( $product_error ) {
			$errors[] = $product_error;
		}

		$question_text = trim( (string) $row['question_text'] );
		if ( '' === $question_text ) {
			$errors[] = __( 'Question text is required', 'quick-qa-for-woocommerce' );
		}

		$answer_text = trim( (string) $row['answer_text'] );
		if ( '' === $answer_text ) {
			$errors[] = __( 'Answer text is required', 'quick-qa-for-woocommerce' );
		}

		$question_date_raw = trim( (string) $row['question_date'] );
		if ( '' !== $question_date_raw && false === $this->parse_historical_date( $question_date_raw ) ) {
			/* translators: %s: the raw date value from the CSV row. */
			$errors[] = sprintf( __( 'Invalid question_date: %s (expected YYYY-MM-DD)', 'quick-qa-for-woocommerce' ), $question_date_raw );
		}

		$answer_date_raw = trim( (string) $row['answer_date'] );
		if ( '' !== $answer_date_raw && false === $this->parse_historical_date( $answer_date_raw ) ) {
			/* translators: %s: the raw date value from the CSV row. */
			$errors[] = sprintf( __( 'Invalid answer_date: %s (expected YYYY-MM-DD)', 'quick-qa-for-woocommerce' ), $answer_date_raw );
		}

		return array(
			'row_number'           => $row_number,
			'product_id_or_sku'    => $product_identifier,
			'question_text'        => $question_text,
			'answer_text'          => $answer_text,
			'question_date'        => $question_date_raw,
			'answer_date'          => $answer_date_raw,
			'author_name'          => trim( (string) $row['author_name'] ),
			'resolved_product_id' => $resolved_product_id,
			'valid'                => empty( $errors ),
			'errors'               => $errors,
		);
	}

	/**
	 * Resolve the CSV's "product_id or SKU" column to a real product ID.
	 *
	 * A purely numeric value is treated as a post ID (verified to actually
	 * be a product); anything else is looked up as a SKU.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  string $identifier
	 * @return array{0:int|null,1:string|null} [resolved_id, error_message]
	 */
	private function resolve_product_id( $identifier ) {
		if ( '' === $identifier ) {
			return array( null, __( 'SKU required', 'quick-qa-for-woocommerce' ) );
		}

		if ( ctype_digit( $identifier ) ) {
			$id = (int) $identifier;
			if ( 'product' === get_post_type( $id ) ) {
				return array( $id, null );
			}
			/* translators: %s: the numeric identifier from the CSV row. */
			return array( null, sprintf( __( 'Product not found: %s', 'quick-qa-for-woocommerce' ), $identifier ) );
		}

		$id = wc_get_product_id_by_sku( $identifier );
		if ( $id ) {
			return array( (int) $id, null );
		}
		/* translators: %s: the SKU from the CSV row. */
		return array( null, sprintf( __( 'Product not found: %s', 'quick-qa-for-woocommerce' ), $identifier ) );
	}

	/**
	 * Strictly parse a CSV date cell — accepts `Y-m-d` or `Y-m-d H:i:s` only.
	 *
	 * Deliberately not strtotime(): ambiguous formats like `03/04/2024`
	 * would silently misparse a migrated store's historical dates, which
	 * this feature's entire purpose is to preserve accurately.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  string $value
	 * @return DateTime|false
	 */
	private function parse_historical_date( $value ) {
		$value = trim( (string) $value );
		if ( '' === $value ) {
			return false;
		}

		foreach ( array( 'Y-m-d H:i:s', 'Y-m-d' ) as $format ) {
			$dt     = DateTime::createFromFormat( $format, $value );
			$errors = DateTime::getLastErrors();
			if ( $dt instanceof DateTime && empty( $errors['warning_count'] ) && empty( $errors['error_count'] ) ) {
				return $dt;
			}
		}

		return false;
	}

	// =========================================================================
	// Inserts
	// =========================================================================

	/**
	 * Insert a question with a caller-supplied historical date.
	 *
	 * A fresh method rather than reusing Quick_Qa_Rest_Questions::insert_question()
	 * (private to that class, and hardcodes current_time()) — see KAN-26 plan.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  int    $product_id
	 * @param  string $author_name  Falls back to "Anonymous" when blank.
	 * @param  string $question_text
	 * @param  string $created_at   MySQL datetime string.
	 * @return int|WP_Error Inserted question ID, or WP_Error on DB failure.
	 * @global wpdb $wpdb
	 */
	private function insert_historical_question( $product_id, $author_name, $question_text, $created_at ) {
		global $wpdb;

		$table = $wpdb->prefix . 'quick_qa_questions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->insert(
			$table,
			array(
				'product_id'        => $product_id,
				'user_id'           => 0,
				'guest_name'        => ( '' !== $author_name ) ? $author_name : __( 'Anonymous', 'quick-qa-for-woocommerce' ),
				'guest_email'       => '',
				'question_text'     => $question_text,
				'status'            => 'approved',
				'upvotes'           => 0,
				'is_verified_buyer' => 0,
				'created_at'        => $created_at,
				'updated_at'        => $created_at,
			),
			array( '%d', '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s' )
		);

		if ( false === $rows ) {
			return new WP_Error( 'quick_qa_db_error', __( 'Unable to insert question.', 'quick-qa-for-woocommerce' ) );
		}

		return (int) $wpdb->insert_id;
	}

	/**
	 * Insert an answer with a caller-supplied historical date.
	 *
	 * Always inserted as answer_type='admin' — this is store-provided
	 * historical content being bulk-migrated, not an attempt to recreate a
	 * specific customer account.
	 *
	 * @since  1.3.0
	 * @access private
	 * @param  int    $question_id
	 * @param  string $answer_text
	 * @param  string $created_at  MySQL datetime string.
	 * @global wpdb $wpdb
	 */
	private function insert_historical_answer( $question_id, $answer_text, $created_at ) {
		global $wpdb;

		$table = $wpdb->prefix . 'quick_qa_answers';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->insert(
			$table,
			array(
				'question_id' => $question_id,
				'user_id'     => get_current_user_id(),
				'answer_type' => 'admin',
				'answer_text' => $answer_text,
				'status'      => 'approved',
				'upvotes'     => 0,
				'created_at'  => $created_at,
				'updated_at'  => $created_at,
			),
			array( '%d', '%d', '%s', '%s', '%s', '%d', '%s', '%s' )
		);
	}
}
