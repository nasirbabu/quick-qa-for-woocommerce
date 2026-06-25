import React, { useState, useEffect, useRef } from 'react';

const CATEGORIES = ['Shipping', 'Returns', 'Sizing', 'Materials', 'Warranty', 'Other'];
const CAT_TABS   = ['All', ...CATEGORIES];

const settings = window.quickQaAdmin || { restUrl: '', nonce: '' };

async function apiFetch( path, options = {} ) {
	const res = await fetch( settings.restUrl + path, {
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json',
			'X-WP-Nonce':   settings.nonce,
		},
		method: options.method || 'GET',
		...( options.body ? { body: JSON.stringify( options.body ) } : {} ),
	} );
	if ( ! res.ok ) {
		const err = await res.json().catch( () => ( {} ) );
		throw new Error( err.message || `Request failed (${ res.status })` );
	}
	return res.json();
}

function timeLabel( dateStr ) {
	if ( ! dateStr ) return '—';
	const diff = ( Date.now() - new Date( dateStr + 'Z' ).getTime() ) / 1000;
	if ( diff < 60 )     return 'just now';
	if ( diff < 3600 )   return `${ Math.floor( diff / 60 ) }m ago`;
	if ( diff < 86400 )  return `${ Math.floor( diff / 3600 ) }h ago`;
	if ( diff < 604800 ) return `${ Math.floor( diff / 86400 ) }d ago`;
	return `${ Math.floor( diff / 604800 ) }w ago`;
}

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast( { message, onDone } ) {
	useEffect( () => {
		const t = setTimeout( onDone, 2200 );
		return () => clearTimeout( t );
	}, [ onDone ] );
	return <div className="qq-tpl-toast">{ message }</div>;
}

// ── Template list ─────────────────────────────────────────────────────────────

function TemplateList( { templates, cat, onCatChange, onNew, onEdit, onDuplicate, onDelete } ) {
	const filtered = cat === 'all'
		? templates
		: templates.filter( t => t.category === cat );

	const totalUses = templates.reduce( ( s, t ) => s + ( parseInt( t.uses, 10 ) || 0 ), 0 );
	const topId     = templates.length > 0 ? templates[0].id : null;

	return (
		<div className="qq-tpl-page">
			{/* Top bar */}
			<div className="qq-top">
				<div className="qq-top-left">
					<span className="qq-page-label">Reply templates</span>
				</div>
				<div className="qq-tpl-top-right">
					<button className="qq-tpl-btn-add" onClick={ onNew }>+ New template</button>
				</div>
			</div>

			{/* Content */}
			<div className="qq-tpl-content">
				<h1 className="qq-tpl-page-title">Reply templates</h1>
				<p className="qq-tpl-page-sub">
					Save time on repeat questions. Templates pre-fill the answer field with one click — you can always edit before publishing.{' '}
					<b>{ templates.length } templates</b> · used <b>{ totalUses } times</b> this month.
				</p>

				{/* Category filter tabs */}
				<div className="qq-tpl-cat-tabs">
					{ CAT_TABS.map( c => {
						const key   = c.toLowerCase();
						const count = c === 'All'
							? templates.length
							: templates.filter( t => t.category === c ).length;
						return (
							<div
								key={ key }
								className={ `qq-tpl-cat-tab${ cat === key ? ' active' : '' }` }
								onClick={ () => onCatChange( key ) }
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
									<b>{ t.uses }</b> uses<br />
									<span className="qq-tcard-uses-sub">this month</span>
								</div>
							</div>
							<div className="qq-tcard-preview">{ t.content }</div>
							<div className="qq-tcard-foot">
								<div className="qq-tcard-meta">Updated { timeLabel( t.updated_at ) }</div>
								<div className="qq-tcard-actions">
									<span
										onClick={ e => { e.stopPropagation(); onEdit( t ); } }
									>Edit</span>
									<span
										onClick={ e => { e.stopPropagation(); onDuplicate( t ); } }
									>Duplicate</span>
									<span
										className="danger"
										onClick={ e => { e.stopPropagation(); onDelete( t ); } }
									>Delete</span>
								</div>
							</div>
						</div>
					) ) }

					{/* Add card */}
					<div className="qq-tcard-add" onClick={ onNew }>
						<div className="qq-tcard-add-plus">+</div>
						<div className="qq-tcard-add-text">Create a template</div>
						<div className="qq-tcard-add-sub">Save time on repeat questions</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Template editor ───────────────────────────────────────────────────────────

function TemplateEditor( { template, onBack, onSaved } ) {
	const isNew        = ! template.id;
	const [ name,     setName ]     = useState( template.name    || '' );
	const [ category, setCategory ] = useState( template.category || 'Other' );
	const [ content,  setContent ]  = useState( template.content  || '' );
	const [ saving,   setSaving ]   = useState( false );
	const [ error,    setError ]    = useState( null );

	const origRef = useRef( { name: template.name || '', category: template.category || 'Other', content: template.content || '' } );
	const isDirty = name !== origRef.current.name || category !== origRef.current.category || content !== origRef.current.content;

	async function handleSave() {
		if ( ! name.trim() ) {
			setError( 'Template name is required.' );
			return;
		}
		setSaving( true );
		setError( null );
		try {
			let saved;
			if ( isNew ) {
				saved = await apiFetch( 'admin/templates', {
					method: 'POST',
					body:   { name: name.trim(), category, content },
				} );
			} else {
				saved = await apiFetch( `admin/templates/${ template.id }`, {
					method: 'POST',
					body:   { name: name.trim(), category, content },
				} );
			}
			onSaved( saved, isNew ? 'created' : 'updated' );
		} catch ( err ) {
			setError( err.message );
		} finally {
			setSaving( false );
		}
	}

	function handleDiscard() {
		onBack();
	}

	const charCount = content.length;

	return (
		<div className="qq-tpl-editor-page">
			{/* Top bar */}
			<div className="qq-top">
				<div className="qq-top-left">
					<span className="qq-page-label">Reply templates</span>
				</div>
			</div>

			{/* Editor body */}
			<div className="qq-tpl-editor-content">
				<div
					className="qq-tpl-editor-back"
					onClick={ handleDiscard }
				>
					&larr; Back to templates
				</div>

				<h1 className="qq-tpl-page-title">
					{ isNew ? 'New template' : 'Edit template' }
				</h1>
				{ ! isNew && (
					<p className="qq-tpl-page-sub">
						Used { template.uses || 0 } times · last updated { timeLabel( template.updated_at ) }
					</p>
				) }

				{ error && (
					<div className="qq-tpl-editor-error">{ error }</div>
				) }

				<div className="qq-settings-card">
					{/* Name */}
					<div className="qq-tpl-field">
						<label className="qq-tpl-label" htmlFor="tpl-name">Template name</label>
						<div className="qq-tpl-help">Only you and your team see this. Customers see the answer text only.</div>
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
						<label className="qq-tpl-label">Category</label>
						<div className="qq-tpl-help">Group similar templates so your team finds them quickly.</div>
						<div className="qq-tpl-cat-row">
							{ CATEGORIES.map( c => (
								<span
									key={ c }
									className={ `qq-tpl-cat-pill${ category === c ? ' selected' : '' }` }
									onClick={ () => setCategory( c ) }
								>
									{ c }
								</span>
							) ) }
						</div>
					</div>

					{/* Content */}
					<div className="qq-tpl-field">
						<label className="qq-tpl-label" htmlFor="tpl-content">Answer content</label>
						<div className="qq-tpl-help">This is what gets pre-filled into the answer field. You can always edit before publishing.</div>
						<div className="qq-tpl-editor-wrap">
							<textarea
								id="tpl-content"
								className="qq-tpl-editor-area"
								value={ content }
								maxLength={ 5000 }
								onChange={ e => setContent( e.target.value ) }
								placeholder="Type your template answer here…"
							/>
							<div className="qq-tpl-editor-foot">
								<span>Plain text</span>
								<span>{ charCount } / 5000 characters</span>
							</div>
						</div>
					</div>
				</div>

				{/* Live preview */}
				<div className="qq-settings-card">
					<div className="qq-tpl-preview-label">Customer will see</div>
					<div className="qq-tpl-preview-card">
						<div className="qq-tpl-preview-inner">
							<div className="qq-av" style={ { width: 32, height: 32, fontSize: 12 } }>ST</div>
							<div style={ { flex: 1 } }>
								<div className="qq-tpl-preview-meta">
									<b className="qq-tpl-preview-name">Store team</b>
									<span className="qq-tpl-preview-badge">Staff</span>
									&middot; just now
								</div>
								<div className="qq-tpl-preview-text">
									{ content || <span style={ { color: 'var(--text-4)' } }>Your answer will appear here…</span> }
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Save bar */}
				<div className="qq-savebar">
					<div className="qq-savebar-msg">
						{ isDirty
							? <><b>Unsaved changes.</b> They will not apply until you save.</>
							: 'No unsaved changes'
						}
					</div>
					<div className="qq-savebar-actions">
						<button
							className="btn btn-ghost"
							onClick={ handleDiscard }
							disabled={ saving }
						>
							Discard
						</button>
						<button
							className="btn btn-primary"
							onClick={ handleSave }
							disabled={ saving || ! isDirty }
						>
							{ saving ? 'Saving…' : isNew ? 'Create template' : 'Save template' }
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ── Confirm delete modal ──────────────────────────────────────────────────────

function DeleteModal( { template, onConfirm, onCancel } ) {
	return (
		<div className="qq-modal-overlay" onClick={ onCancel }>
			<div className="qq-modal" onClick={ e => e.stopPropagation() }>
				<div className="qq-modal-head">
					<div className="qq-modal-title">Delete template</div>
					<button className="qq-modal-close" onClick={ onCancel }>&#x2715;</button>
				</div>
				<div className="qq-modal-body">
					<p style={ { fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 } }>
						Are you sure you want to delete <b>"{ template.name }"</b>? This cannot be undone.
					</p>
				</div>
				<div className="qq-modal-foot">
					<button className="btn btn-ghost" onClick={ onCancel }>Cancel</button>
					<button className="btn" style={ { background: 'var(--red)', color: 'white', border: 'none' } } onClick={ onConfirm }>
						Delete template
					</button>
				</div>
			</div>
		</div>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ReplyTemplates() {
	const [ templates,   setTemplates ]   = useState( [] );
	const [ loading,     setLoading ]     = useState( true );
	const [ loadError,   setLoadError ]   = useState( null );
	const [ editing,     setEditing ]     = useState( null );
	const [ cat,         setCat ]         = useState( 'all' );
	const [ toast,       setToast ]       = useState( null );
	const [ deleteTarget, setDeleteTarget ] = useState( null );

	useEffect( () => {
		apiFetch( 'admin/templates' )
			.then( data => setTemplates( data ) )
			.catch( err => setLoadError( err.message ) )
			.finally( () => setLoading( false ) );
	}, [] );

	function showToast( msg ) {
		setToast( msg );
	}

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
		setTemplates( prev => {
			if ( action === 'created' ) {
				return [ ...prev, saved ];
			}
			return prev.map( t => String( t.id ) === String( saved.id ) ? saved : t );
		} );
		setEditing( null );
		showToast( action === 'created' ? 'Template created' : 'Template saved' );
	}

	async function handleDuplicate( t ) {
		try {
			const copy = await apiFetch( `admin/templates/${ t.id }/duplicate`, { method: 'POST' } );
			setTemplates( prev => [ ...prev, copy ] );
			showToast( 'Template duplicated' );
		} catch ( err ) {
			showToast( `Error: ${ err.message }` );
		}
	}

	function handleDeleteRequest( t ) {
		setDeleteTarget( t );
	}

	async function handleDeleteConfirm() {
		const t = deleteTarget;
		setDeleteTarget( null );
		try {
			await apiFetch( `admin/templates/${ t.id }/delete`, { method: 'POST' } );
			setTemplates( prev => prev.filter( x => String( x.id ) !== String( t.id ) ) );
			showToast( 'Template deleted' );
		} catch ( err ) {
			showToast( `Error: ${ err.message }` );
		}
	}

	if ( loading ) {
		return (
			<div className="qq-page">
				<div className="qq-state-msg">Loading templates…</div>
			</div>
		);
	}

	if ( loadError ) {
		return (
			<div className="qq-page">
				<div className="qq-state-msg qq-state-msg--error">Failed to load templates: { loadError }</div>
			</div>
		);
	}

	return (
		<>
			{ editing !== null ? (
				<TemplateEditor
					template={ editing }
					onBack={ handleBack }
					onSaved={ handleSaved }
				/>
			) : (
				<TemplateList
					templates={ templates }
					cat={ cat }
					onCatChange={ setCat }
					onNew={ handleNew }
					onEdit={ handleEdit }
					onDuplicate={ handleDuplicate }
					onDelete={ handleDeleteRequest }
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
