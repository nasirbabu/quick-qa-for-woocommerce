<?php
/**
 * Reply templates and template categories REST API controller.
 *
 * @link       https://profiles.wordpress.org/nashirbabu/
 * @since      1.2.0
 *
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 */

/**
 * Handles all REST routes for reply templates and their categories:
 *
 *   Categories
 *     GET  /admin/template-categories
 *     POST /admin/template-categories
 *     POST /admin/template-categories/delete
 *
 *   Templates
 *     GET  /admin/templates
 *     POST /admin/templates
 *     POST /admin/templates/{id}
 *     POST /admin/templates/{id}/delete
 *     POST /admin/templates/{id}/duplicate
 *     POST /admin/templates/{id}/use
 *     POST /admin/templates/import
 *
 * Categories and templates are kept in the same controller because
 * delete_template_category() writes to both wp_options and the templates
 * table (to reassign orphaned templates to 'Other').
 *
 * @since      1.2.0
 * @package    Quick_Qa_For_Woocommerce
 * @subpackage Quick_Qa_For_Woocommerce/includes/api
 * @author     Nashir Uddin <nashirbabu@gmail.com>
 */
class Quick_Qa_Rest_Templates extends Quick_Qa_Rest_Controller {

	/**
	 * wp_options key that stores the custom category list as a JSON array.
	 *
	 * @since 1.2.0
	 * @var   string
	 */
	const CATEGORIES_OPTION = 'quick_qa_template_categories';

	/**
	 * Built-in default categories seeded on first use.
	 * 'Other' is the protected fallback and must always be last.
	 *
	 * @since 1.2.0
	 * @var   string[]
	 */
	const DEFAULT_CATEGORIES = array( 'Shipping', 'Returns', 'Sizing', 'Materials', 'Warranty', 'Other' );

	/**
	 * Register all template and category routes.
	 *
	 * NOTE: /admin/template-categories/delete is registered before the generic
	 * /admin/template-categories route so WordPress matches the literal path
	 * first and does not treat 'delete' as a wildcard segment.
	 *
	 * @since 1.2.0
	 */
	public function register_routes() {

		// ── Categories: delete (registered first — see note above) ────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/template-categories/delete',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'delete_template_category' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'name' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => static function ( $value ) {
							return mb_strlen( trim( $value ) ) >= 1;
						},
					),
				),
			)
		);

		// ── Categories: list and add ───────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/template-categories',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_template_categories' ),
					'permission_callback' => array( $this, 'require_admin' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'add_template_category' ),
					'permission_callback' => array( $this, 'require_admin' ),
					'args'                => array(
						'name' => array(
							'required'          => true,
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
							'validate_callback' => static function ( $value ) {
								$len = mb_strlen( trim( $value ) );
								return $len >= 1 && $len <= 50;
							},
						),
					),
				),
			)
		);

		// ── Templates: list and create ─────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/templates',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'admin_get_templates' ),
					'permission_callback' => array( $this, 'require_admin' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'admin_create_template' ),
					'permission_callback' => array( $this, 'require_admin' ),
					'args'                => $this->get_template_args(),
				),
			)
		);

		// ── Templates: update ──────────────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/templates/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_update_template' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array_merge(
					array(
						'id' => array(
							'required'          => true,
							'type'              => 'integer',
							'minimum'           => 1,
							'sanitize_callback' => 'absint',
						),
					),
					$this->get_template_args( false )
				),
			)
		);

		// ── Templates: delete ──────────────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/templates/(?P<id>\d+)/delete',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_delete_template' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		// ── Templates: duplicate ───────────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/templates/(?P<id>\d+)/duplicate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_duplicate_template' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		// ── Templates: record a use ────────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/templates/(?P<id>\d+)/use',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_increment_template_use' ),
				'permission_callback' => array( $this, 'require_admin' ),
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'minimum'           => 1,
						'sanitize_callback' => 'absint',
					),
				),
			)
		);

		// ── Templates: import ───────────────────────────────────────────────────
		register_rest_route(
			self::REST_NAMESPACE,
			'/admin/templates/import',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( $this, 'admin_import_templates' ),
				'permission_callback' => array( $this, 'require_admin' ),
			)
		);
	}

	// =========================================================================
	// Category callbacks
	// =========================================================================

	/**
	 * GET /wp-json/quick-qa/v1/admin/template-categories
	 *
	 * @since  1.2.0
	 * @return WP_REST_Response
	 */
	public function get_template_categories() {
		return rest_ensure_response( $this->load_categories() );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/template-categories
	 *
	 * Adds a new category. Inserted before 'Other' so 'Other' stays last.
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 */
	public function add_template_category( WP_REST_Request $request ) {
		$name = trim( $request->get_param( 'name' ) );
		$cats = $this->load_categories();

		// Reject duplicates (case-insensitive).
		foreach ( $cats as $existing ) {
			if ( strtolower( $existing ) === strtolower( $name ) ) {
				return new WP_Error(
					'quick_qa_category_exists',
					__( 'A category with that name already exists.', 'quick-qa-for-woocommerce' ),
					array( 'status' => 409 )
				);
			}
		}

		// Insert before 'Other' so the protected fallback stays last.
		$other_idx = array_search( 'Other', $cats, true );
		if ( false !== $other_idx ) {
			array_splice( $cats, (int) $other_idx, 0, array( $name ) );
		} else {
			$cats[] = $name;
		}

		update_option( self::CATEGORIES_OPTION, $cats );

		return rest_ensure_response( array_values( $cats ) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/template-categories/delete
	 *
	 * Deletes a category and reassigns all templates that used it to 'Other'.
	 * The 'Other' category is protected and cannot be deleted.
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function delete_template_category( WP_REST_Request $request ) {
		global $wpdb;

		$name = trim( $request->get_param( 'name' ) );

		if ( 'Other' === $name ) {
			return new WP_Error(
				'quick_qa_protected_category',
				__( 'The "Other" category cannot be deleted.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 403 )
			);
		}

		$cats = $this->load_categories();
		$cats = array_values( array_filter( $cats, static function ( $c ) use ( $name ) {
			return $c !== $name;
		} ) );

		if ( ! in_array( 'Other', $cats, true ) ) {
			$cats[] = 'Other';
		}

		update_option( self::CATEGORIES_OPTION, $cats );

		// Reassign all templates in the deleted category to 'Other'.
		$table = $wpdb->prefix . 'quick_qa_reply_templates';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$reassigned = (int) $wpdb->update(
			$table,
			array(
				'category'   => 'Other',
				'updated_at' => current_time( 'mysql', true ),
			),
			array( 'category' => $name ),
			array( '%s', '%s' ),
			array( '%s' )
		);

		return rest_ensure_response(
			array(
				'categories' => array_values( $cats ),
				'reassigned' => $reassigned,
				'deleted'    => $name,
			)
		);
	}

	// =========================================================================
	// Template callbacks
	// =========================================================================

	/**
	 * GET /wp-json/quick-qa/v1/admin/templates
	 *
	 * @since  1.2.0
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function admin_get_templates() {
		global $wpdb;

		$table = $wpdb->prefix . 'quick_qa_reply_templates';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
			"SELECT id, name, category, content, uses, created_at, updated_at FROM {$table} ORDER BY uses DESC, id ASC"
		);

		return rest_ensure_response( $rows ?: array() );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/templates
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function admin_create_template( WP_REST_Request $request ) {
		global $wpdb;

		$now   = current_time( 'mysql', true );
		$table = $wpdb->prefix . 'quick_qa_reply_templates';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$inserted = $wpdb->insert(
			$table,
			array(
				'name'       => $request->get_param( 'name' ),
				'category'   => $request->get_param( 'category' ),
				'content'    => $request->get_param( 'content' ),
				'uses'       => 0,
				'created_at' => $now,
				'updated_at' => $now,
			),
			array( '%s', '%s', '%s', '%d', '%s', '%s' )
		);

		if ( false === $inserted ) {
			return new WP_Error(
				'quick_qa_db_error',
				__( 'Unable to create template. Please try again.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 500 )
			);
		}

		$id = (int) $wpdb->insert_id;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id, name, category, content, uses, created_at, updated_at FROM {$table} WHERE id = %d",
				$id
			)
		);

		$response = rest_ensure_response( $row );
		$response->set_status( 201 );

		return $response;
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/templates/{id}
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function admin_update_template( WP_REST_Request $request ) {
		global $wpdb;

		$id    = (int) $request->get_param( 'id' );
		$table = $wpdb->prefix . 'quick_qa_reply_templates';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$exists = $wpdb->get_var(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id FROM {$table} WHERE id = %d",
				$id
			)
		);

		if ( ! $exists ) {
			return new WP_Error(
				'quick_qa_not_found',
				__( 'Template not found.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		$data   = array( 'updated_at' => current_time( 'mysql', true ) );
		$format = array( '%s' );

		if ( null !== $request->get_param( 'name' ) ) {
			$data['name'] = $request->get_param( 'name' );
			$format[]     = '%s';
		}
		if ( null !== $request->get_param( 'category' ) ) {
			$data['category'] = $request->get_param( 'category' );
			$format[]         = '%s';
		}
		if ( null !== $request->get_param( 'content' ) ) {
			$data['content'] = $request->get_param( 'content' );
			$format[]        = '%s';
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->update(
			$table,
			$data,
			array( 'id' => $id ),
			$format,
			array( '%d' )
		);

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id, name, category, content, uses, created_at, updated_at FROM {$table} WHERE id = %d",
				$id
			)
		);

		return rest_ensure_response( $row );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/templates/{id}/delete
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function admin_delete_template( WP_REST_Request $request ) {
		global $wpdb;

		$id    = (int) $request->get_param( 'id' );
		$table = $wpdb->prefix . 'quick_qa_reply_templates';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$deleted = $wpdb->delete(
			$table,
			array( 'id' => $id ),
			array( '%d' )
		);

		if ( false === $deleted ) {
			return new WP_Error(
				'quick_qa_db_error',
				__( 'Unable to delete template.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 500 )
			);
		}

		return rest_ensure_response( array( 'id' => $id, 'deleted' => true ) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/templates/{id}/duplicate
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function admin_duplicate_template( WP_REST_Request $request ) {
		global $wpdb;

		$id    = (int) $request->get_param( 'id' );
		$table = $wpdb->prefix . 'quick_qa_reply_templates';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$original = $wpdb->get_row(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT name, category, content FROM {$table} WHERE id = %d",
				$id
			)
		);

		if ( ! $original ) {
			return new WP_Error(
				'quick_qa_not_found',
				__( 'Template not found.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 404 )
			);
		}

		$now = current_time( 'mysql', true );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->insert(
			$table,
			array(
				'name'       => $original->name . ' (copy)',
				'category'   => $original->category,
				'content'    => $original->content,
				'uses'       => 0,
				'created_at' => $now,
				'updated_at' => $now,
			),
			array( '%s', '%s', '%s', '%d', '%s', '%s' )
		);

		$new_id = (int) $wpdb->insert_id;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT id, name, category, content, uses, created_at, updated_at FROM {$table} WHERE id = %d",
				$new_id
			)
		);

		$response = rest_ensure_response( $row );
		$response->set_status( 201 );

		return $response;
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/templates/{id}/use
	 *
	 * Increments the `uses` counter. Called by the frontend only after an
	 * answer built from this template has actually been published — never
	 * at template-insert time, so inserting then discarding never counts.
	 *
	 * @since  1.2.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response
	 * @global wpdb $wpdb
	 */
	public function admin_increment_template_use( WP_REST_Request $request ) {
		global $wpdb;

		$id    = (int) $request->get_param( 'id' );
		$table = $wpdb->prefix . 'quick_qa_reply_templates';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$wpdb->query(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"UPDATE {$table} SET uses = uses + 1 WHERE id = %d",
				$id
			)
		);

		return rest_ensure_response( array( 'id' => $id, 'incremented' => true ) );
	}

	/**
	 * POST /wp-json/quick-qa/v1/admin/templates/import
	 *
	 * Imports templates from a previously-exported JSON file. The entire
	 * payload is validated before anything is inserted — a single invalid
	 * item rejects the whole import rather than partially applying it.
	 * Purely additive: existing templates are never modified or removed,
	 * and every imported row is a brand-new template with uses reset to 0.
	 * A category not recognized on this store falls back to 'Other', the
	 * same fallback used when a category is deleted elsewhere in this file.
	 *
	 * @since  1.3.0
	 * @param  WP_REST_Request $request
	 * @return WP_REST_Response|WP_Error
	 * @global wpdb $wpdb
	 */
	public function admin_import_templates( WP_REST_Request $request ) {
		global $wpdb;

		$body = $request->get_json_params();

		if ( ! is_array( $body ) ) {
			return new WP_Error(
				'quick_qa_invalid_import',
				__( 'Invalid file: not a valid JSON object.', 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		if ( empty( $body['templates'] ) || ! is_array( $body['templates'] ) ) {
			return new WP_Error(
				'quick_qa_invalid_import',
				__( "Invalid file: missing a 'templates' array.", 'quick-qa-for-woocommerce' ),
				array( 'status' => 400 )
			);
		}

		$known_categories = $this->load_categories();
		$validated         = array();

		foreach ( $body['templates'] as $index => $item ) {
			if ( ! is_array( $item ) ) {
				/* translators: %d: zero-based position of the invalid item in the imported file. */
				return new WP_Error(
					'quick_qa_invalid_import',
					sprintf( __( 'Invalid file: item %d is not a valid template object.', 'quick-qa-for-woocommerce' ), $index ),
					array( 'status' => 400 )
				);
			}

			$name = isset( $item['name'] ) ? sanitize_text_field( (string) $item['name'] ) : '';
			if ( '' === trim( $name ) || mb_strlen( $name ) > 200 ) {
				/* translators: %d: zero-based position of the invalid item in the imported file. */
				return new WP_Error(
					'quick_qa_invalid_import',
					sprintf( __( 'Invalid file: item %d has a missing or invalid name.', 'quick-qa-for-woocommerce' ), $index ),
					array( 'status' => 400 )
				);
			}

			$content = isset( $item['content'] ) ? sanitize_textarea_field( (string) $item['content'] ) : '';
			if ( mb_strlen( $content ) > 5000 ) {
				/* translators: %d: zero-based position of the invalid item in the imported file. */
				return new WP_Error(
					'quick_qa_invalid_import',
					sprintf( __( 'Invalid file: item %d has content over 5000 characters.', 'quick-qa-for-woocommerce' ), $index ),
					array( 'status' => 400 )
				);
			}

			$category = isset( $item['category'] ) ? sanitize_text_field( (string) $item['category'] ) : '';
			if ( ! in_array( $category, $known_categories, true ) ) {
				$category = 'Other';
			}

			$validated[] = array(
				'name'     => $name,
				'category' => $category,
				'content'  => $content,
			);
		}

		$now   = current_time( 'mysql', true );
		$table = $wpdb->prefix . 'quick_qa_reply_templates';

		foreach ( $validated as $item ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$wpdb->insert(
				$table,
				array(
					'name'       => $item['name'],
					'category'   => $item['category'],
					'content'    => $item['content'],
					'uses'       => 0,
					'created_at' => $now,
					'updated_at' => $now,
				),
				array( '%s', '%s', '%s', '%d', '%s', '%s' )
			);
		}

		return rest_ensure_response( array( 'imported' => count( $validated ) ) );
	}

	// =========================================================================
	// Private helpers
	// =========================================================================

	/**
	 * Return the persisted category list, falling back to defaults.
	 *
	 * Always ensures 'Other' is present (it is the reassignment target when
	 * a category is deleted).
	 *
	 * @since  1.2.0
	 * @return string[]
	 */
	private function load_categories() {
		$cats = get_option( self::CATEGORIES_OPTION, self::DEFAULT_CATEGORIES );

		if ( ! is_array( $cats ) || empty( $cats ) ) {
			$cats = self::DEFAULT_CATEGORIES;
		}

		if ( ! in_array( 'Other', $cats, true ) ) {
			$cats[] = 'Other';
		}

		return array_values( $cats );
	}

	/**
	 * Returns the argument schema shared by create and update template routes.
	 *
	 * The category field is validated against the live category list so that
	 * custom categories added by the admin are accepted alongside the defaults.
	 *
	 * @since  1.2.0
	 * @param  bool $all_required Whether every field is required (true = create).
	 * @return array[]
	 */
	private function get_template_args( $all_required = true ) {
		return array(
			'name'     => array(
				'required'          => $all_required,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => static function ( $value ) {
					$len = mb_strlen( trim( $value ) );
					return $len >= 1 && $len <= 200;
				},
			),
			'category' => array(
				'required'          => $all_required,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_text_field',
				'validate_callback' => function ( $value ) {
					return in_array( $value, $this->load_categories(), true );
				},
			),
			'content'  => array(
				'required'          => $all_required,
				'type'              => 'string',
				'sanitize_callback' => 'sanitize_textarea_field',
				'validate_callback' => static function ( $value ) {
					return mb_strlen( $value ) <= 5000;
				},
			),
		);
	}
}
