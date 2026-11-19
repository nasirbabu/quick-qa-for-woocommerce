import React, { useState } from 'react';
import { __, _n, sprintf } from '../../i18n';
import { useNav } from '../../navigation';
import { fetchProduct } from './api';
import { formatNumber, formatDuration } from '../Analytics/format';
import { Card, Empty, Interpolate } from '../Analytics/parts';
import { CustomerLink } from './ProfileLink';
import { PROFILE_RANGES } from './ProductsDirectory';
import { TEXT_DOMAIN, BackLink, useRemote, ErrorState, StatusPill, relativeTime } from './shared';
import './Profiles.css';

/**
 * One product's Q&A health: stats, what customers ask about most, recent
 * questions, top askers and top community answerers (KAN-33).
 */
export default function ProductProfile( { productId } ) {
	const { navigate }        = useNav();
	const [ range, setRange ] = useState( 'all' );
	const [ theme, setTheme ] = useState( null );
	const { data: p, error, loading } = useRemote( signal => fetchProduct( productId, range, signal ), [ productId, range ] );

	const top = (
		<div className="qq-top">
			<div className="qq-top-left">
				<span className="qq-page-label">{ __( 'Product', TEXT_DOMAIN ) }{ p ? ` · ${ p.name }` : '' }</span>
			</div>
			<div className="qq-an-top-right">
				{ loading && p && <span className="qq-an-faded qq-an-refreshing">{ __( 'Updating…', TEXT_DOMAIN ) }</span> }
				<select
					className="qq-an-select"
					value={ range }
					onChange={ e => {
						setRange( e.target.value );
						setTheme( null );
					} }
					aria-label={ __( 'Date range', TEXT_DOMAIN ) }
				>
					{ PROFILE_RANGES.map( r => <option key={ r.key } value={ r.key }>{ r.label }</option> ) }
				</select>
			</div>
		</div>
	);

	if ( ! p ) {
		return (
			<div className="qq-page qq-pf">
				{ top }
				<div className="qq-pf-scroll">
					<div className="qq-pf-content">
						<BackLink />
						{ error ? <ErrorState error={ error } /> : <div className="qq-state-msg">{ __( 'Loading product…', TEXT_DOMAIN ) }</div> }
					</div>
				</div>
			</div>
		);
	}

	const s         = p.stats;
	const questions = theme
		? p.recent_questions.filter( q => ( 'other' === theme ? q.themes.length === 0 : q.themes.includes( theme ) ) )
		: p.recent_questions.slice( 0, 10 );

	return (
		<div className="qq-page qq-pf">
			{ top }
			<div className="qq-pf-scroll">
				<div className={ `qq-pf-content${ loading ? ' is-loading' : '' }` }>
					<BackLink />

					<div className="qq-pf-header">
						{ p.thumbnail
							? <img className="qq-pf-avatar-large product" src={ p.thumbnail } alt="" />
							: <div className="qq-pf-avatar-large product">{ ( p.name || '?' ).slice( 0, 1 ) }</div> }
						<div className="qq-pf-header-body">
							<h1 className="qq-pf-name-large">{ p.name }</h1>
							<div className="qq-pf-meta">
								{ [ p.category, p.sku && sprintf( __( 'SKU %s', TEXT_DOMAIN ), p.sku ), p.price ].filter( Boolean ).join( ' · ' ) }
								{ p.edit_url && <a className="qq-pf-ext" href={ p.edit_url } target="_blank" rel="noopener noreferrer">{ __( 'Edit product ↗', TEXT_DOMAIN ) }</a> }
								{ p.view_url && <a className="qq-pf-ext" href={ p.view_url } target="_blank" rel="noopener noreferrer">{ __( 'View ↗', TEXT_DOMAIN ) }</a> }
							</div>
							<div className="qq-pf-trust-line">
								<Interpolate
									/* translators: 1: questions, 2: answered percentage, 3: upvotes on questions, 4: helpful votes on answers, 5: community answers. */
									format={ __( '%1$s questions · %2$s answered · %3$s upvotes · %4$s helpful votes · %5$s community answers', TEXT_DOMAIN ) }
									values={ [ formatNumber( s.questions ), null === s.answer_rate ? '—' : `${ s.answer_rate }%`, formatNumber( s.upvotes ), formatNumber( s.helpful_votes ?? 0 ), formatNumber( s.community ) ] }
								/>
								<span className="qq-an-faded"> · { p.range.label }</span>
							</div>
						</div>
					</div>

					<div className="qq-an-stat-row qq-pf-stats">
						<div className="qq-an-stat">
							<div className="qq-an-stat-label">{ __( 'Total questions', TEXT_DOMAIN ) }</div>
							<div className="qq-an-stat-num">{ formatNumber( s.questions ) }</div>
							<div className="qq-an-stat-trend qq-an-tone-flat">{ p.range.label }</div>
						</div>
						<div className="qq-an-stat">
							<div className="qq-an-stat-label">{ __( 'Answer rate', TEXT_DOMAIN ) }</div>
							<div className="qq-an-stat-num">{ null === s.answer_rate ? '—' : `${ s.answer_rate }%` }</div>
							<div className="qq-an-stat-trend qq-an-tone-flat">
								{ /* translators: 1: answered, 2: total. */ }
								{ sprintf( __( '%1$s of %2$s', TEXT_DOMAIN ), formatNumber( s.answered ), formatNumber( s.questions ) ) }
							</div>
						</div>
						<div className="qq-an-stat">
							<div className="qq-an-stat-label">{ __( 'Unanswered now', TEXT_DOMAIN ) }</div>
							<div className={ `qq-an-stat-num${ s.unanswered > 3 ? ' warm' : '' }` }>{ formatNumber( s.unanswered ) }</div>
							<div className={ `qq-an-stat-trend ${ s.overdue > 0 ? 'qq-an-tone-bad' : 'qq-an-tone-flat' }` }>
								{ s.overdue > 0
									/* translators: %d: number of questions. */
									? sprintf( _n( '%d over 3 days old', '%d over 3 days old', s.overdue, TEXT_DOMAIN ), s.overdue )
									: ( s.unanswered > 3 ? __( 'Needs attention', TEXT_DOMAIN ) : __( 'On track', TEXT_DOMAIN ) ) }
							</div>
						</div>
						<div className="qq-an-stat">
							<div className="qq-an-stat-label">{ __( 'Avg response', TEXT_DOMAIN ) }</div>
							<div className="qq-an-stat-num">{ formatDuration( s.avg_response_secs ) }</div>
							<div className="qq-an-stat-trend qq-an-tone-flat">{ __( 'to first answer', TEXT_DOMAIN ) }</div>
						</div>
					</div>

					<div className="qq-pf-section">
						<div className="qq-an-section-head">
							<div className="qq-an-section-label">{ __( 'What customers ask about most', TEXT_DOMAIN ) }</div>
							{ theme && (
								<button type="button" className="qq-an-link-btn" onClick={ () => setTheme( null ) }>{ __( 'Clear theme filter', TEXT_DOMAIN ) }</button>
							) }
						</div>
						{ s.questions === 0 ? (
							<div className="qq-an-card qq-pf-blank">{ __( 'No questions in this date range.', TEXT_DOMAIN ) }</div>
						) : (
							<div className="qq-pf-chips qq-pf-themes">
								{ p.themes.map( t => (
									<button
										type="button"
										key={ t.key }
										className={ `qq-pf-chip qq-pf-theme${ theme === t.key ? ' active' : '' }` }
										onClick={ () => setTheme( theme === t.key ? null : t.key ) }
										aria-pressed={ theme === t.key }
									>
										{ t.label }
										<span className="qq-pf-chip-count">
											{ /* translators: 1: question count, 2: share percent. */ }
											{ sprintf( __( '%1$s · %2$s%%', TEXT_DOMAIN ), formatNumber( t.count ), String( t.share ) ) }
										</span>
									</button>
								) ) }
								{ p.themes_other > 0 && (
									<button
										type="button"
										className={ `qq-pf-chip qq-pf-theme other${ 'other' === theme ? ' active' : '' }` }
										onClick={ () => setTheme( 'other' === theme ? null : 'other' ) }
										aria-pressed={ 'other' === theme }
									>
										{ __( 'Other', TEXT_DOMAIN ) }
										<span className="qq-pf-chip-count">{ formatNumber( p.themes_other ) }</span>
									</button>
								) }
							</div>
						) }
					</div>

					<div className="qq-pf-section">
						<div className="qq-an-section-head">
							<div className="qq-an-section-label">
								{ theme ? __( 'Questions on this theme', TEXT_DOMAIN ) : __( 'Recent questions', TEXT_DOMAIN ) }
							</div>
							<span className="qq-an-faded qq-pf-count">
								{ theme && p.recent_questions.length >= 50 ? __( 'From the latest 50', TEXT_DOMAIN ) : '' }
							</span>
						</div>
						<div className="qq-an-card qq-pf-activity">
							{ questions.length === 0 ? <Empty>{ __( 'No questions yet on this product.', TEXT_DOMAIN ) }</Empty> : questions.map( q => (
								<div className="qq-pf-activity-item" key={ q.id }>
									<div className="qq-pf-activity-main">
										<div className="qq-pf-activity-context">
											{ __( 'From', TEXT_DOMAIN ) }{ ' ' }
											<CustomerLink identity={ q.author.key } name={ q.author.name } />
										</div>
										<button type="button" className="qq-pf-activity-text" onClick={ () => navigate( 'all-qa', { questionId: q.id } ) } title={ __( 'Open in All Q&A', TEXT_DOMAIN ) }>
											{ q.text }
										</button>
									</div>
									<div className="qq-pf-activity-side">
										<StatusPill status={ q.status } answered={ q.answered } />
										<span className="qq-an-faded">{ relativeTime( q.date ) }</span>
									</div>
								</div>
							) ) }
						</div>
					</div>

					<div className="qq-an-grid-2">
						<Card title={ __( 'Top askers', TEXT_DOMAIN ) } sub={ __( 'Most active customers', TEXT_DOMAIN ) }>
							{ p.top_askers.length === 0 ? <Empty>{ __( 'No data yet.', TEXT_DOMAIN ) }</Empty> : (
								<div className="qq-an-list">
									{ p.top_askers.map( ( a, i ) => (
										<div className="qq-an-list-row" key={ a.key }>
											<span className="qq-an-list-rank">{ i + 1 }</span>
											<span className="qq-an-list-name"><CustomerLink as="span" identity={ a.key } name={ a.name } /></span>
											<span className="qq-an-list-num">{ sprintf( _n( '%s question', '%s questions', a.count, TEXT_DOMAIN ), formatNumber( a.count ) ) }</span>
										</div>
									) ) }
								</div>
							) }
						</Card>
						<Card title={ __( 'Top community answerers', TEXT_DOMAIN ) } sub={ __( 'Helpful voices', TEXT_DOMAIN ) }>
							{ p.top_answerers.length === 0 ? <Empty>{ __( 'No community answers yet.', TEXT_DOMAIN ) }</Empty> : (
								<div className="qq-an-list">
									{ p.top_answerers.map( ( a, i ) => (
										<div className="qq-an-list-row" key={ a.key }>
											<span className="qq-an-list-rank">{ i + 1 }</span>
											<span className="qq-an-list-name"><CustomerLink as="span" identity={ a.key } name={ a.name } /></span>
											<span className="qq-an-faded qq-an-list-detail">{ sprintf( _n( '%s helpful', '%s helpful', a.helpful, TEXT_DOMAIN ), formatNumber( a.helpful ) ) }</span>
											<span className="qq-an-list-num">{ sprintf( _n( '%s answer', '%s answers', a.count, TEXT_DOMAIN ), formatNumber( a.count ) ) }</span>
										</div>
									) ) }
								</div>
							) }
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
