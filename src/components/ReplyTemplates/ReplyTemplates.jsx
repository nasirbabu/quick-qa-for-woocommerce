import React, { useState, useEffect, useRef } from 'react';
import './ReplyTemplates.css';
import { __, _n, sprintf } from '../../i18n';

const settings = window.quickQaAdmin || { restUrl: '', nonce: '' };

async function apiFetch( path, options = {} ) {
	const res = await fetch( settings.restUrl + path, {
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce':   settings.nonce,
		},
		method: options.method || 'GET',
		...( options.body !== undefined ? { body: JSON.stringify( options.body ) } : {} ),
	} );
	if ( ! res.ok ) {
		const err = await res.json().catch( () => ( {} ) );
		throw new Error( err.message || sprintf(
			// translators: %d is the HTTP status code returned by the failed request.
			__( 'Request failed (%d)', 'quick-qa-for-woocommerce' ),
			res.status
		) );
	}
	return res.json();
}

function timeLabel( dateStr ) {
	if ( ! dateStr ) return '—';
	const diff = ( Date.now() - new Date( dateStr + 'Z' ).getTime() ) / 1000;
	if ( diff < 60 )     return __( 'just now', 'quick-qa-for-woocommerce' );
	if ( diff < 3600 )   return sprintf(
		// translators: %d is the number of minutes since the template was last updated.
		__( '%dm ago', 'quick-qa-for-woocommerce' ), Math.floor( diff / 60 )
	);
	if ( diff < 86400 )  return sprintf(
		// translators: %d is the number of hours since the template was last updated.
		__( '%dh ago', 'quick-qa-for-woocommerce' ), Math.floor( diff / 3600 )
	);
	if ( diff < 604800 ) return sprintf(
		// translators: %d is the number of days since the template was last updated.
		__( '%dd ago', 'quick-qa-for-woocommerce' ), Math.floor( diff / 86400 )
	);
	return sprintf(
		// translators: %d is the number of weeks since the template was last updated.
		__( '%dw ago', 'quick-qa-for-woocommerce' ), Math.floor( diff / 604800 )
	);
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast( { message, onDone } ) {
	useEffect( () => {
		const t = setTimeout( onDone, 2400 );
		return () => clearTimeout( t );
	}, [ onDone ] );
	return <div className="qq-tpl-toast">{ message }</div>;
}

// ── Template list ─────────────────────────────────────────────────────────────

function TemplateList( { templates, categories, cat, onCatChange, onNew, onEdit, onDuplicate, onDelete, onExport, onImport } ) {
	const allLabel = __( 'All', 'quick-qa-for-woocommerce' );
	const catTabs  = [ allLabel, ...categories ];
	const filtered = cat === 'all'
		? templates
		: templates.filter( t => t.category === cat );

	const totalUses  = templates.reduce( ( s, t ) => s + ( parseInt( t.uses, 10 ) || 0 ), 0 );
	const topId      = templates.length > 0 ? templates[0].id : null;
	const importRef  = useRef( null );

	function handleImportFileChange( e ) {
		const file = e.target.files && e.target.files[ 0 ];
		if ( file ) onImport( file );
		e.target.value = '';
	}

	return (
		<div className="qq-tpl-page">
			<div className="qq-top">
				<div className="qq-top-left">
					<span className="qq-page-label">{ __( 'Reply templates', 'quick-qa-for-woocommerce' ) }</span>
				</div>
				<div className="qq-tpl-top-right">
					<button className="btn btn-ghost" onClick={ onExport } disabled={ templates.length === 0 }>{ __( 'Export', 'quick-qa-for-woocommerce' ) }</button>
					<button className="btn btn-ghost" onClick={ () => importRef.current && importRef.current.click() }>{ __( 'Import', 'quick-qa-for-woocommerce' ) }</button>
					<input
						ref={ importRef }
						type="file"
						accept="application/json"
						style={ { display: 'none' } }
						onChange={ handleImportFileChange }
					/>
					<button className="qq-tpl-btn-add" onClick={ onNew }>{ __( '+ New template', 'quick-qa-for-woocommerce' ) }</button>
				</div>
			</div>

			<div className="qq-tpl-content">
				<h1 className="qq-tpl-page-title">{ __( 'Reply templates', 'quick-qa-for-woocommerce' ) }</h1>
				<p className="qq-tpl-page-sub">
					{ __( 'Save time on repeat questions. Templates pre-fill the answer field with one click — you can always edit before publishing.', 'quick-qa-for-woocommerce' ) }{' '}
					<b>{ templates.length } { _n( 'template', 'templates', templates.length, 'quick-qa-for-woocommerce' ) }</b> · { __( 'used', 'quick-qa-for-woocommerce' ) } <b>{ totalUses } { _n( 'time', 'times', totalUses, 'quick-qa-for-woocommerce' ) }</b> { __( 'this month.', 'quick-qa-for-woocommerce' ) }
				</p>

				{/* Category filter tabs */}
				<div className="qq-tpl-cat-tabs">
					{ catTabs.map( c => {
						const tabVal = c === allLabel ? 'all' : c;
						const count  = c === allLabel
							? templates.length
							: templates.filter( t => t.category === c ).length;
						return (
							<div
								key={ c }
								className={ `qq-tpl-cat-tab${ cat === tabVal ? ' active' : '' }` }
								onClick={ () => onCatChange( tabVal ) }
							>
								{ c } <span className="qq-tpl-cat-num">{ count }</span>
							</div>
						);
					} ) }
				</div>

				{/* Grid */}
				<div className="qq-tpl-grid">
					{ filtered.map( t => (
						<div
							key={ t.id }
							className={ `qq-tcard${ String( t.id ) === String( topId ) && cat === 'all' ? ' qq-tcard--top' : '' }` }
							onClick={ () => onEdit( t ) }
						>
							<div className="qq-tcard-head">
								<div>
									<h3 className="qq-tcard-title">{ t.name }</h3>
									<div className="qq-tcard-cat">{ t.category }</div>
								</div>
								<div className="qq-tcard-uses">
									<b>{ t.uses }</b> { _n( 'use', 'uses', t.uses, 'quick-qa-for-woocommerce' ) }<br />
									<span className="qq-tcard-uses-sub">{ __( 'this month', 'quick-qa-for-woocommerce' ) }</span>
								</div>
							</div>
							<div className="qq-tcard-preview">{ t.content }</div>
							<div className="qq-tcard-foot">
								<div className="qq-tcard-meta">
									{ sprintf(
										// translators: %s is a relative time such as "2 days ago", or "—" when no date is set.
										__( 'Updated %s', 'quick-qa-for-woocommerce' ),
										timeLabel( t.updated_at )
									) }
								</div>
								<div className="qq-tcard-actions">
									<span onClick={ e => { e.stopPropagation(); onEdit( t ); } }>{ __( 'Edit', 'quick-qa-for-woocommerce' ) }</span>
									<span onClick={ e => { e.stopPropagation(); onDuplicate( t ); } }>{ __( 'Duplicate', 'quick-qa-for-woocommerce' ) }</span>
									<span className="danger" onClick={ e => { e.stopPropagation(); onDelete( t ); } }>{ __( 'Delete', 'quick-qa-for-woocommerce' ) }</span>
								</div>
							</div>
						</div>
					) ) }

					<div className="qq-tcard-add" onClick={ onNew }>
						<div className="qq-tcard-add-plus">+</div>
						<div className="qq-tcard-add-text">{ __( 'Create a template', 'quick-qa-for-woocommerce' ) }</div>
						<div className="qq-tcard-add-sub">{ __( 'Save time on repeat questions', 'quick-qa-for-woocommerce' ) }</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Category pills with add / delete ─────────────────────────────────────────

function CategoryPills( { categories, selected, onSelect, onAdd, onDelete } ) {
	const [ adding,    setAdding ]    = useState( false );
	const [ newName,   setNewName ]   = useState( '' );
	const [ saving,    setSaving ]    = useState( false );
	const [ addError,  setAddError ]  = useState( '' );
	const [ deletingCat, setDeletingCat ] = useState( null );
	const inputRef = useRef( null );

	useEffect( () => {
		if ( adding && inputRef.current ) {
			inputRef.current.focus();
		}
	}, [ adding ] );

	function openAdd() {
		setAdding( true );
		setNewName( '' );
		setAddError( '' );
	}

	function cancelAdd() {
		setAdding( false );
		setNewName( '' );
		setAddError( '' );
	}

	async function commitAdd() {
		const trimmed = newName.trim();
		if ( ! trimmed ) {
			setAddError( __( 'Name cannot be empty.', 'quick-qa-for-woocommerce' ) );
			return;
		}
		setSaving( true );
		setAddError( '' );
		try {
			const updated = await apiFetch( 'admin/template-categories', {
				method: 'POST',
				body:   { name: trimmed },
			} );
			setAdding( false );
			setNewName( '' );
			onAdd( updated, trimmed );
		} catch ( err ) {
			setAddError( err.message );
		} finally {
			setSaving( false );
		}
	}

	async function handleDelete( catName ) {
		setDeletingCat( catName );
		try {
			const result = await apiFetch( 'admin/template-categories/delete', {
				method: 'POST',
				body:   { name: catName },
			} );
			onDelete( result );
		} catch ( err ) {
			// silently reset — parent toast will not fire; at least unblock UI
		} finally {
			setDeletingCat( null );
		}
	}

	function handleKeyDown( e ) {
		if ( e.key === 'Enter' ) {
			e.preventDefault();
			commitAdd();
		}
		if ( e.key === 'Escape' ) {
			cancelAdd();
		}
	}

	return (
		<div className="qq-tpl-cat-row">
			{ categories.map( c => (
				<span
					key={ c }
					className={ `qq-tpl-cat-pill${ selected === c ? ' selected' : '' }${ deletingCat === c ? ' deleting' : '' }` }
					onClick={ () => deletingCat !== c && onSelect( c ) }
				>
					{ c }
					{ c !== 'Other' && (
						<button
							className="qq-tpl-cat-pill-x"
							title={ sprintf(
								// translators: %s is the category name.
								__( 'Delete "%s" category', 'quick-qa-for-woocommerce' ),
								c
							) }
							disabled={ deletingCat === c }
							onClick={ e => {
								e.stopPropagation();
								handleDelete( c );
							} }
						>
							{ deletingCat === c ? '…' : '×' }
						</button>
					) }
				</span>
			) ) }

			{ adding ? (
				<span className="qq-tpl-cat-pill qq-tpl-cat-pill--adding">
					<input
						ref={ inputRef }
						className="qq-tpl-cat-pill-input"
						type="text"
						value={ newName }
						maxLength={ 50 }
						placeholder={ __( 'Category name', 'quick-qa-for-woocommerce' ) }
						onChange={ e => { setNewName( e.target.value ); setAddError( '' ); } }
						onKeyDown={ handleKeyDown }
						disabled={ saving }
					/>
					<button
						className="qq-tpl-cat-pill-confirm"
						onClick={ commitAdd }
						disabled={ saving || ! newName.trim() }
						title={ __( 'Save category', 'quick-qa-for-woocommerce' ) }
					>
						{ saving ? '…' : '✓' }
					</button>
					<button
						className="qq-tpl-cat-pill-x"
						onClick={ cancelAdd }
						disabled={ saving }
						title={ __( 'Cancel', 'quick-qa-for-woocommerce' ) }
					>
						×
					</button>
					{ addError && (
						<span className="qq-tpl-cat-add-error">{ addError }</span>
					) }
				</span>
			) : (
				<span
					className="qq-tpl-cat-pill qq-tpl-cat-pill--new"
					onClick={ openAdd }
				>
					{ __( '+ New category', 'quick-qa-for-woocommerce' ) }
				</span>
			) }
		</div>
	);
}

// ── Template editor ───────────────────────────────────────────────────────────

function TemplateEditor( { template, categories, onBack, onSaved, onCategoryAdded, onCategoryDeleted } ) {
	const isNew = ! template.id;

	const [ name,     setName ]     = useState( template.name     || '' );
	const [ category, setCategory ] = useState( template.category || 'Other' );
	const [ content,  setContent ]  = useState( template.content  || '' );
	const [ saving,   setSaving ]   = useState( false );
	const [ error,    setError ]    = useState( null );

	const origRef = useRef( {
		name:     template.name     || '',
		category: template.category || 'Other',
		content:  template.content  || '',
	} );
	const isDirty = name !== origRef.current.name
		|| category !== origRef.current.category
		|| content  !== origRef.current.content;

	// If the currently selected category was deleted, fall back to 'Other'.
	useEffect( () => {
		if ( ! categories.includes( category ) ) {
			setCategory( 'Other' );
		}
	}, [ categories, category ] );

	async function handleSave() {
		if ( ! name.trim() ) {
			setError( __( 'Template name is required.', 'quick-qa-for-woocommerce' ) );
			return;
		}
		setSaving( true );
		setError( null );
		try {
			const path = isNew
				? 'admin/templates'
				: `admin/templates/${ template.id }`;
			const saved = await apiFetch( path, {
				method: 'POST',
				body:   { name: name.trim(), category, content },
			} );
			onSaved( saved, isNew ? 'created' : 'updated' );
		} catch ( err ) {
			setError( err.message );
		} finally {
			setSaving( false );
		}
	}

	function handleCategoryAdded( newCategories, newName ) {
		setCategory( newName );
		onCategoryAdded( newCategories );
	}

	function handleCategoryDeleted( result ) {
		// result = { categories, reassigned, deleted }
		onCategoryDeleted( result );
	}

	const charCount = content.length;

	return (
		<div className="qq-tpl-editor-page">
			<div className="qq-top">
				<div className="qq-top-left">
					<span className="qq-page-label">{ __( 'Reply templates', 'quick-qa-for-woocommerce' ) }</span>
				</div>
			</div>

			<div className="qq-tpl-editor-content">
				<div className="qq-tpl-editor-back" onClick={ onBack }>
					&larr; { __( 'Back to templates', 'quick-qa-for-woocommerce' ) }
				</div>

				<h1 className="qq-tpl-page-title">
					{ isNew ? __( 'New template', 'quick-qa-for-woocommerce' ) : __( 'Edit template', 'quick-qa-for-woocommerce' ) }
				</h1>
				{ ! isNew && (
					<p className="qq-tpl-page-sub">
						{ __( 'Used', 'quick-qa-for-woocommerce' ) } { template.uses || 0 } { _n( 'time', 'times', template.uses || 0, 'quick-qa-for-woocommerce' ) } ·{' '}
						{ sprintf(
							// translators: %s is a relative time such as "2 days ago".
							__( 'last updated %s', 'quick-qa-for-woocommerce' ),
							timeLabel( template.updated_at )
						) }
					</p>
				) }

				{ error && <div className="qq-tpl-editor-error">{ error }</div> }

				<div className="qq-settings-card">
					{/* Name */}
					<div className="qq-tpl-field">
						<label className="qq-tpl-label" htmlFor="tpl-name">{ __( 'Template name', 'quick-qa-for-woocommerce' ) }</label>
						<div className="qq-tpl-help">{ __( 'Only you and your team see this. Customers see the answer text only.', 'quick-qa-for-woocommerce' ) }</div>
						<input
							id="tpl-name"
							className="qq-tpl-input"
							type="text"
							value={ name }
							maxLength={ 200 }
							onChange={ e => setName( e.target.value ) }
						/>
					</div>

					{/* Category */}
					<div className="qq-tpl-field">
						<label className="qq-tpl-label">{ __( 'Category', 'quick-qa-for-woocommerce' ) }</label>
						<div className="qq-tpl-help">
							{ __( 'Click a category to select it. Use', 'quick-qa-for-woocommerce' ) } <b>{ __( '+ New category', 'quick-qa-for-woocommerce' ) }</b> { __( 'to add one, or the', 'quick-qa-for-woocommerce' ) } <b>×</b> { __( 'to remove it — templates in that category move to Other automatically.', 'quick-qa-for-woocommerce' ) }
						</div>
						<CategoryPills
							categories={ categories }
							selected={ category }
							onSelect={ setCategory }
							onAdd={ handleCategoryAdded }
							onDelete={ handleCategoryDeleted }
						/>
					</div>

					{/* Content */}
					<div className="qq-tpl-field">
						<label className="qq-tpl-label" htmlFor="tpl-content">{ __( 'Answer content', 'quick-qa-for-woocommerce' ) }</label>
						<div className="qq-tpl-help">{ __( 'This is what gets pre-filled into the answer field. You can always edit before publishing.', 'quick-qa-for-woocommerce' ) }</div>
						<div className="qq-tpl-editor-wrap">
							<textarea
								id="tpl-content"
								className="qq-tpl-editor-area"
								value={ content }
								maxLength={ 5000 }
								onChange={ e => setContent( e.target.value ) }
								placeholder={ __( 'Type your template answer here…', 'quick-qa-for-woocommerce' ) }
							/>
							<div className="qq-tpl-editor-foot">
								<span>{ __( 'Plain text', 'quick-qa-for-woocommerce' ) }</span>
								<span>
									{ sprintf(
										// translators: %d is the current character count out of the 5000 character limit.
										__( '%d / 5000 characters', 'quick-qa-for-woocommerce' ),
										charCount
									) }
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Live preview */}
				<div className="qq-settings-card">
					<div className="qq-tpl-preview-label">{ __( 'Customer will see', 'quick-qa-for-woocommerce' ) }</div>
					<div className="qq-tpl-preview-card">
						<div className="qq-tpl-preview-inner">
							<div className="qq-av" style={ { width: 32, height: 32, fontSize: 12 } }>ST</div>
							<div style={ { flex: 1 } }>
								<div className="qq-tpl-preview-meta">
									<b className="qq-tpl-preview-name">{ __( 'Store team', 'quick-qa-for-woocommerce' ) }</b>
									<span className="qq-tpl-preview-badge">{ __( 'Staff', 'quick-qa-for-woocommerce' ) }</span>
									&middot; { __( 'just now', 'quick-qa-for-woocommerce' ) }
								</div>
								<div className="qq-tpl-preview-text">
									{ content || <span style={ { color: 'var(--text-4)' } }>{ __( 'Your answer will appear here…', 'quick-qa-for-woocommerce' ) }</span> }
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Save bar */}
				<div className="qq-savebar">
					<div className="qq-savebar-msg">
						{ isDirty
							? <><b>{ __( 'Unsaved changes.', 'quick-qa-for-woocommerce' ) }</b> { __( 'They will not apply until you save.', 'quick-qa-for-woocommerce' ) }</>
							: __( 'No unsaved changes', 'quick-qa-for-woocommerce' )
						}
					</div>
					<div className="qq-savebar-actions">
						<button className="btn btn-ghost" onClick={ onBack } disabled={ saving }>
							{ __( 'Discard', 'quick-qa-for-woocommerce' ) }
						</button>
						<button
							className="btn btn-primary"
							onClick={ handleSave }
							disabled={ saving || ! isDirty }
						>
							{ saving ? __( 'Saving…', 'quick-qa-for-woocommerce' ) : isNew ? __( 'Create template', 'quick-qa-for-woocommerce' ) : __( 'Save template', 'quick-qa-for-woocommerce' ) }
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Confirm delete template modal ─────────────────────────────────────────────

function DeleteModal( { template, onConfirm, onCancel } ) {
	return (
		<div className="qq-modal-overlay" onClick={ onCancel }>
			<div className="qq-modal" onClick={ e => e.stopPropagation() }>
				<div className="qq-modal-head">
					<div className="qq-modal-title">{ __( 'Delete template', 'quick-qa-for-woocommerce' ) }</div>
					<button className="qq-modal-close" onClick={ onCancel }>&#x2715;</button>
				</div>
				<div className="qq-modal-body">
					<p style={ { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 } }>
						{ __( 'Are you sure you want to delete', 'quick-qa-for-woocommerce' ) } <b>"{ template.name }"</b>? { __( 'This cannot be undone.', 'quick-qa-for-woocommerce' ) }
					</p>
				</div>
				<div className="qq-modal-foot">
					<button className="btn btn-ghost" onClick={ onCancel }>{ __( 'Cancel', 'quick-qa-for-woocommerce' ) }</button>
					<button
						className="btn"
						style={ { background: 'var(--red)', color: 'white', border: 'none', padding: '9px 16px', borderRadius: 'var(--r-md)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' } }
						onClick={ onConfirm }
					>
						{ __( 'Delete template', 'quick-qa-for-woocommerce' ) }
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReplyTemplates() {
	const [ templates,    setTemplates ]    = useState( [] );
	const [ categories,   setCategories ]   = useState( [] );
	const [ loading,      setLoading ]      = useState( true );
	const [ loadError,    setLoadError ]    = useState( null );
	const [ editing,      setEditing ]      = useState( null );
	const [ cat,          setCat ]          = useState( 'all' );
	const [ toast,        setToast ]        = useState( null );
	const [ deleteTarget, setDeleteTarget ] = useState( null );

	// Load templates and categories in parallel on mount.
	useEffect( () => {
		Promise.all( [
			apiFetch( 'admin/templates' ),
			apiFetch( 'admin/template-categories' ),
		] )
			.then( ( [ tpls, cats ] ) => {
				setTemplates( tpls );
				setCategories( cats );
			} )
			.catch( err => setLoadError( err.message ) )
			.finally( () => setLoading( false ) );
	}, [] );

	function showToast( msg ) {
		setToast( msg );
	}

	// ── Category handlers ──────────────────────────────────────────────────────

	function handleCategoryAdded( newCategories ) {
		setCategories( newCategories );
		showToast( __( 'Category created', 'quick-qa-for-woocommerce' ) );
	}

	function handleCategoryDeleted( result ) {
		// result = { categories, reassigned, deleted }
		setCategories( result.categories );

		// Keep template list in sync without a refetch.
		if ( result.reassigned > 0 ) {
			setTemplates( prev =>
				prev.map( t =>
					t.category === result.deleted ? { ...t, category: 'Other' } : t
				)
			);
		}

		// If the list view was filtered by the deleted category, reset to All.
		if ( cat !== 'all' && cat === result.deleted ) {
			setCat( 'all' );
		}

		const msg = result.reassigned > 0
			? sprintf(
				// translators: %d is the number of templates that were moved to the "Other" category.
				_n(
					'Category deleted. %d template moved to Other.',
					'Category deleted. %d templates moved to Other.',
					result.reassigned,
					'quick-qa-for-woocommerce'
				),
				result.reassigned
			)
			: __( 'Category deleted.', 'quick-qa-for-woocommerce' );
		showToast( msg );
	}

	// ── Template handlers ──────────────────────────────────────────────────────

	function handleNew() {
		setEditing( { name: '', category: 'Other', content: '' } );
	}

	function handleEdit( t ) {
		setEditing( t );
	}

	function handleBack() {
		setEditing( null );
	}

	function handleSaved( saved, action ) {
		setTemplates( prev =>
			action === 'created'
				? [ ...prev, saved ]
				: prev.map( t => String( t.id ) === String( saved.id ) ? saved : t )
		);
		setEditing( null );
		showToast( action === 'created'
			? __( 'Template created', 'quick-qa-for-woocommerce' )
			: __( 'Template saved', 'quick-qa-for-woocommerce' ) );
	}

	async function handleDuplicate( t ) {
		try {
			const copy = await apiFetch( `admin/templates/${ t.id }/duplicate`, { method: 'POST' } );
			setTemplates( prev => [ ...prev, copy ] );
			showToast( __( 'Template duplicated', 'quick-qa-for-woocommerce' ) );
		} catch ( err ) {
			showToast( sprintf(
				// translators: %s is the error message returned by the failed request.
				__( 'Error: %s', 'quick-qa-for-woocommerce' ),
				err.message
			) );
		}
	}

	async function handleDeleteConfirm() {
		const t = deleteTarget;
		setDeleteTarget( null );
		try {
			await apiFetch( `admin/templates/${ t.id }/delete`, { method: 'POST' } );
			setTemplates( prev => prev.filter( x => String( x.id ) !== String( t.id ) ) );
			showToast( __( 'Template deleted', 'quick-qa-for-woocommerce' ) );
		} catch ( err ) {
			showToast( sprintf(
				// translators: %s is the error message returned by the failed request.
				__( 'Error: %s', 'quick-qa-for-woocommerce' ),
				err.message
			) );
		}
	}

	// ── Import / export ────────────────────────────────────────────────────────

	function handleExport() {
		const payload = {
			type:        'quick-qa-templates',
			version:     1,
			exported_at: new Date().toISOString(),
			categories,
			templates:   templates.map( t => ( {
				name:     t.name,
				category: t.category,
				content:  t.content,
			} ) ),
		};
		const blob = new Blob( [ JSON.stringify( payload, null, 2 ) ], { type: 'application/json' } );
		const url  = URL.createObjectURL( blob );
		const a    = document.createElement( 'a' );
		a.href     = url;
		a.download = 'quick-qa-templates.json';
		document.body.appendChild( a );
		a.click();
		document.body.removeChild( a );
		URL.revokeObjectURL( url );
	}

	async function handleImport( file ) {
		let parsed;
		try {
			parsed = JSON.parse( await file.text() );
		} catch {
			showToast( __( 'Error: not a valid JSON file', 'quick-qa-for-woocommerce' ) );
			return;
		}
		try {
			const result = await apiFetch( 'admin/templates/import', { method: 'POST', body: parsed } );
			const fresh  = await apiFetch( 'admin/templates' );
			setTemplates( fresh );
			showToast( sprintf(
				_n( 'Imported %d template', 'Imported %d templates', result.imported, 'quick-qa-for-woocommerce' ),
				result.imported
			) );
		} catch ( err ) {
			showToast( sprintf(
				// translators: %s is the error message returned by the failed request.
				__( 'Error: %s', 'quick-qa-for-woocommerce' ),
				err.message
			) );
		}
	}

	// ── Render ─────────────────────────────────────────────────────────────────

	if ( loading ) {
		return (
			<div className="qq-page">
				<div className="qq-state-msg">{ __( 'Loading templates…', 'quick-qa-for-woocommerce' ) }</div>
			</div>
		);
	}

	if ( loadError ) {
		return (
			<div className="qq-page">
				<div className="qq-state-msg qq-state-msg--error">
					{ sprintf(
						// translators: %s is the error message returned by the failed request.
						__( 'Failed to load: %s', 'quick-qa-for-woocommerce' ),
						loadError
					) }
				</div>
			</div>
		);
	}

	return (
		<>
			{ editing !== null ? (
				<TemplateEditor
					template={ editing }
					categories={ categories }
					onBack={ handleBack }
					onSaved={ handleSaved }
					onCategoryAdded={ handleCategoryAdded }
					onCategoryDeleted={ handleCategoryDeleted }
				/>
			) : (
				<TemplateList
					templates={ templates }
					categories={ categories }
					cat={ cat }
					onCatChange={ setCat }
					onNew={ handleNew }
					onEdit={ handleEdit }
					onDuplicate={ handleDuplicate }
					onDelete={ t => setDeleteTarget( t ) }
					onExport={ handleExport }
					onImport={ handleImport }
				/>
			) }

			{ deleteTarget && (
				<DeleteModal
					template={ deleteTarget }
					onConfirm={ handleDeleteConfirm }
					onCancel={ () => setDeleteTarget( null ) }
				/>
			) }

			{ toast && (
				<Toast message={ toast } onDone={ () => setToast( null ) } />
			) }
		</>
	);
}
