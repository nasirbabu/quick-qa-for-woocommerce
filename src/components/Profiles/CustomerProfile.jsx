import React from 'react';
import { __, _n, sprintf } from '../../i18n';
import { useNav } from '../../navigation';
import { fetchCustomer } from './api';
import { formatNumber } from '../Analytics/format';
import { Empty, Interpolate } from '../Analytics/parts';
import { CustomerLink } from './ProfileLink';
import {
	TEXT_DOMAIN,
	BackLink,
	useRemote,
	ErrorState,
	TypePill,
	StatusPill,
	RiskSignals,
	relativeTime,
	monthYear,
} from './shared';
import './Profiles.css';

/**
 * One customer's full Q&A history, purchases and risk signals (KAN-33).
 */
export default function CustomerProfile( { customerKey } ) {
	const { navigate } = useNav();
	const { data: c, error } = useRemote( signal => fetchCustomer( customerKey, signal ), [ customerKey ] );

	const top = (
		<div className="qq-top">
			<div className="qq-top-left">
				<span className="qq-page-label">
					{ __( 'Customer', TEXT_DOMAIN ) }{ c ? ` · ${ c.name }` : '' }
				</span>
			</div>
		</div>
	);

	if ( error || ! c ) {
		return (
			<div className="qq-page qq-pf">
				{ top }
				<div className="qq-pf-scroll">
					<div className="qq-pf-content">
						<BackLink />
						{ error ? <ErrorState error={ error } /> : <div className="qq-state-msg">{ __( 'Loading customer…', TEXT_DOMAIN ) }</div> }
					</div>
				</div>
			</div>
		);
	}

	const s = c.stats;
	const openProduct  = id => navigate( 'product-profile', { id } );
	const openQuestion = id => navigate( 'all-qa', { questionId: id } );

	return (
		<div className="qq-page qq-pf">
			{ top }
			<div className="qq-pf-scroll">
				<div className="qq-pf-content">
					<BackLink />

					<div className="qq-pf-header">
						<div className={ `qq-pf-avatar-large${ c.is_guest ? ' guest' : '' }` }>{ c.initials }</div>
						<div className="qq-pf-header-body">
							<h1 className="qq-pf-name-large">{ c.name }</h1>
							<div className="qq-pf-meta">
								<TypePill type={ c.type } />
								{ c.email && <span>{ c.email }</span> }
								{ c.member_since && (
									/* translators: %s: month and year. */
									<span>· { sprintf( __( 'Member since %s', TEXT_DOMAIN ), monthYear( c.member_since ) ) }</span>
								) }
								{ c.last_active && (
									/* translators: %s: relative time, e.g. "2h ago". */
									<span>· { sprintf( __( 'Last active %s', TEXT_DOMAIN ), relativeTime( c.last_active ) ) }</span>
								) }
								{ c.edit_url && (
									<a className="qq-pf-ext" href={ c.edit_url } target="_blank" rel="noopener noreferrer">
										{ __( 'Edit user ↗', TEXT_DOMAIN ) }
									</a>
								) }
							</div>
							<div className="qq-pf-trust-line">
								<Interpolate
									/* translators: 1: questions asked, 2: answers contributed, 3: helpful votes, 4: products purchased. */
									format={ __( '%1$s asked · %2$s answers contributed · %3$s helpful votes received · %4$s products purchased', TEXT_DOMAIN ) }
									values={ [ formatNumber( s.questions ), formatNumber( s.answers ), formatNumber( s.helpful ), formatNumber( s.products_purchased ) ] }
								/>
							</div>
						</div>
					</div>

					<div className="qq-an-stat-row qq-pf-stats">
						<div className="qq-an-stat">
							<div className="qq-an-stat-label">{ __( 'Questions asked', TEXT_DOMAIN ) }</div>
							<div className="qq-an-stat-num">{ formatNumber( s.questions ) }</div>
						</div>
						<div className="qq-an-stat">
							<div className="qq-an-stat-label">{ __( 'Answers given', TEXT_DOMAIN ) }</div>
							<div className="qq-an-stat-num">{ formatNumber( s.answers ) }</div>
							<div className="qq-an-stat-trend qq-an-tone-flat">
								{ sprintf( _n( '%s helpful vote', '%s helpful votes', s.helpful, TEXT_DOMAIN ), formatNumber( s.helpful ) ) }
							</div>
						</div>
						<div className="qq-an-stat">
							<div className="qq-an-stat-label">{ __( 'Lifetime value', TEXT_DOMAIN ) }</div>
							<div className="qq-an-stat-num">{ s.orders > 0 ? s.value_formatted : '—' }</div>
							<div className="qq-an-stat-trend qq-an-tone-flat">
								{ sprintf( _n( '%s paid order', '%s paid orders', s.orders, TEXT_DOMAIN ), formatNumber( s.orders ) ) }
							</div>
						</div>
						<div className="qq-an-stat">
							<div className="qq-an-stat-label">{ __( 'Risk signals', TEXT_DOMAIN ) }</div>
							<div className={ `qq-an-stat-num${ c.risk.count > 0 ? ' warm' : '' }` }>{ c.risk.count }</div>
							<div className={ `qq-an-stat-trend ${ c.risk.count > 0 ? 'qq-an-tone-bad' : 'qq-an-tone-flat' }` }>
								{ c.risk.count > 0
									? c.risk.signals.filter( x => x.triggered ).map( x => x.label ).join( ', ' )
									: __( 'No risk signals', TEXT_DOMAIN ) }
							</div>
						</div>
					</div>

					<div className="qq-pf-section">
						<RiskSignals risk={ c.risk } />
					</div>

					<div className="qq-pf-section">
						<div className="qq-an-section-head">
							<div className="qq-an-section-label">{ __( 'Questions asked', TEXT_DOMAIN ) }</div>
							<span className="qq-an-faded qq-pf-count">
								{ /* translators: %d: number shown (latest). */ }
								{ c.questions.length >= 20 ? __( 'Latest 20', TEXT_DOMAIN ) : '' }
							</span>
						</div>
						<div className="qq-an-card qq-pf-activity">
							{ c.questions.length === 0 ? <Empty>{ __( 'No questions yet.', TEXT_DOMAIN ) }</Empty> : c.questions.map( q => (
								<div className="qq-pf-activity-item" key={ q.id }>
									<div className="qq-pf-activity-main">
										<button type="button" className="qq-pf-link qq-pf-activity-product" onClick={ () => openProduct( q.product.id ) }>
											{ q.product.name }
										</button>
										<button type="button" className="qq-pf-activity-text" onClick={ () => openQuestion( q.id ) } title={ __( 'Open in All Q&A', TEXT_DOMAIN ) }>
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

					{ ! c.is_guest && (
						<div className="qq-pf-section">
							<div className="qq-an-section-label">{ __( 'Answers contributed', TEXT_DOMAIN ) }</div>
							<div className="qq-an-card qq-pf-activity">
								{ c.answers.length === 0 ? <Empty>{ __( 'No community answers contributed yet.', TEXT_DOMAIN ) }</Empty> : c.answers.map( a => (
									<div className="qq-pf-activity-item" key={ a.id }>
										<div className="qq-pf-activity-main">
											<div className="qq-pf-activity-context">
												{ __( 'On', TEXT_DOMAIN ) }{ ' ' }
												<button type="button" className="qq-pf-link qq-pf-link-strong" onClick={ () => openProduct( a.product.id ) }>{ a.product.name }</button>
												{ ' · ' }{ __( 'in reply to', TEXT_DOMAIN ) }{ ' ' }
												<CustomerLink as="span" identity={ a.asker.key } name={ a.asker.name } />
											</div>
											<button type="button" className="qq-pf-activity-text" onClick={ () => openQuestion( a.question_id ) } title={ a.question }>
												{ a.text }
											</button>
										</div>
										<div className="qq-pf-activity-side">
											{ 'approved' === a.status
												? <span className="qq-an-faded">{ sprintf( _n( '%s helpful', '%s helpful', a.upvotes, TEXT_DOMAIN ), formatNumber( a.upvotes ) ) }</span>
												: <StatusPill status={ a.status } /> }
											<span className="qq-an-faded">{ relativeTime( a.date ) }</span>
										</div>
									</div>
								) ) }
							</div>
						</div>
					) }

					<div className="qq-pf-section">
						<div className="qq-an-section-head">
							<div className="qq-an-section-label">{ __( 'Recent purchases', TEXT_DOMAIN ) }</div>
							{ s.orders > 0 && (
								<span className="qq-an-faded qq-pf-count">
									{ /* translators: 1: number of orders, 2: lifetime value. */ }
									{ sprintf( _n( '%1$s order · %2$s lifetime', '%1$s orders · %2$s lifetime', s.orders, TEXT_DOMAIN ), formatNumber( s.orders ), s.value_formatted ) }
								</span>
							) }
						</div>
						{ c.recent_purchases.length === 0 ? (
							<div className="qq-an-card qq-pf-blank">
								{ c.is_guest
									? __( "Guest customers don't have an account. No paid orders were found for the email they left, so there's no purchase history to show.", TEXT_DOMAIN )
									: __( 'No paid orders yet.', TEXT_DOMAIN ) }
							</div>
						) : (
							<div className="qq-an-card qq-pf-activity">
								{ c.recent_purchases.map( o => (
									<div className="qq-pf-activity-item" key={ o.order_id }>
										<div className="qq-pf-activity-main">
											<div className="qq-pf-activity-context">
												<a className="qq-pf-link qq-pf-link-strong" href={ o.edit_url } target="_blank" rel="noopener noreferrer">
													{ /* translators: %s: order number. */ }
													{ sprintf( __( 'Order #%s', TEXT_DOMAIN ), o.number ) }
												</a>
												{ ' · ' }{ o.total_formatted }
											</div>
											<div className="qq-pf-chips">
												{ o.items.map( ( it, i ) => (
													<button type="button" key={ i } className="qq-pf-chip" onClick={ () => it.product_id && openProduct( it.product_id ) }>
														{ it.name }
													</button>
												) ) }
											</div>
										</div>
										<div className="qq-pf-activity-side">
											<span className="qq-an-faded">{ relativeTime( o.date ) }</span>
										</div>
									</div>
								) ) }
							</div>
						) }
					</div>
				</div>
			</div>
		</div>
	);
}
