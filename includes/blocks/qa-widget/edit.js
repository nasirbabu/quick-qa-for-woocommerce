/**
 * Editor script for the askora/qa-widget dynamic block.
 *
 * No build step — plain JS registered against the wp-blocks / wp-element /
 * wp-block-editor / wp-components / wp-server-side-render / wp-i18n handles
 * WordPress core ships by default. The edit preview uses ServerSideRender so
 * it always shows the exact PHP-rendered markup, guaranteeing it matches the
 * front end.
 */
( function ( blocks, element, blockEditor, components, ServerSideRender, i18n ) {
	var el = element.createElement;
	var Fragment = element.Fragment;
	var useBlockProps = blockEditor.useBlockProps;
	var InspectorControls = blockEditor.InspectorControls;
	var PanelBody = components.PanelBody;
	var TextControl = components.TextControl;
	var __ = i18n.__;

	blocks.registerBlockType( 'askora/qa-widget', {
		edit: function ( props ) {
			var blockProps = useBlockProps();
			var attributes = props.attributes;
			var setAttributes = props.setAttributes;

			// ServerSideRender's REST preview has no post context of its own —
			// pass the post being edited explicitly so the render callback can
			// resolve which product to render for (see
			// class-quick-qa-for-woocommerce-blocks.php). An explicit Product ID
			// attribute (set below) always takes priority over this.
			var contextPostId = props.context && props.context.postId;

			return el(
				Fragment,
				{},
				el(
					InspectorControls,
					{},
					el(
						PanelBody,
						{ title: __( 'Askora Q&A settings', 'quick-qa-for-woocommerce' ) },
						el( TextControl, {
							label: __( 'Product ID', 'quick-qa-for-woocommerce' ),
							help: __(
								'Leave blank to use the product this page is for. Set a product ID to show Q&A for a different product (e.g. on a custom template).',
								'quick-qa-for-woocommerce'
							),
							value: attributes.productId ? String( attributes.productId ) : '',
							type: 'number',
							onChange: function ( value ) {
								setAttributes( { productId: value ? parseInt( value, 10 ) : 0 } );
							},
						} )
					)
				),
				el(
					'div',
					blockProps,
					el( ServerSideRender, {
						block: 'askora/qa-widget',
						attributes: attributes,
						urlQueryArgs: contextPostId ? { post_id: contextPostId } : {},
					} )
				)
			);
		},
		save: function () {
			return null;
		},
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.serverSideRender,
	window.wp.i18n
);
