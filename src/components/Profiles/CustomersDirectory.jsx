import React, { useState } from 'react';
import { __, _n, sprintf } from '../../i18n';
import { useNav } from '../../navigation';
import { fetchCustomers } from './api';
import { formatNumber } from '../Analytics/format';
import {
	TEXT_DOMAIN,
	BackLink,
	useRemote,
	useDebounced,
	ErrorState,
	SortHeader,
	Pager,
	relativeTime,
} from './shared';
import './Profiles.css';

const TYPE_LABEL = {
	'verified-buyer': __( 'Verified buyer', TEXT_DOMAIN ),
	customer:         __( 'Customer', TEXT_DOMAIN ),
	guest:            __( 'Guest customer', TEXT_DOMAIN ),
};

/**
 * All customers who asked or answered a question (KAN-33). Sortable by
 * activity, questions, answers, helpful votes, lifetime value, last active,
 * risk and name; searchable; server-paginated.
 */
export default function CustomersDirectory() {
	const { navigate }          = useNav();
	const [ sort, setSort ]     = useState( { sort: 'activity', order: 'desc' } );
	const [ page, setPage ]     = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const q                     = useDebounced( search );

	const { data, error, loading } = useRemote(
		signal => fetchCustomers( { ...sort, page, per_page: 25, search: q }, signal ),
		[ sort.sort, sort.order, page, q ]
	);

	const onSort = ( key, order ) => {
		setSort( { sort: key, order } );
		setPage( 1 );
	};
	const fullSort = ! data || data.full_sort_available;
	const fullSortTitle = fullSort ? undefined : __( 'Too many customers to sort by this column. Use search to narrow the list.', TEXT_DOMAIN );
	const header = { sort: data ? data.sort : sort.sort, order: data ? data.order : sort.order, onSort };

	return (
		<div className="qq-page qq-pf">
			<div className="qq-top">
				<div className="qq-top-left">
					<span className="qq-page-label">{ __( 'Customers', TEXT_DOMAIN ) }</span>
					<input
						type="search"
						className="qq-search"
						placeholder={ __( 'Search name or email…', TEXT_DOMAIN ) }
						value={ search }
						onChange={ e => {
							setSearch( e.target.value );
							setPage( 1 );
						} }
						aria-label={ __( 'Search customers', TEXT_DOMAIN ) }
					/>
				</div>
				{ loading && data && <span className="qq-an-faded qq-an-refreshing">{ __( 'Updating…', TEXT_DOMAIN ) }</span> }
			</div>

			<div className="qq-pf-scroll">
				<div className={ `qq-pf-content${ loading && data ? ' is-loading' : '' }` }>
					<BackLink />
					<h1 className="qq-pf-title">{ __( 'All customers', TEXT_DOMAIN ) }</h1>
					<p className="qq-pf-sub">
						{ __( 'Everyone who has asked or answered a question. Guests are grouped by the email they left.', TEXT_DOMAIN ) }
					</p>

					{ error && ! data && <ErrorState error={ error } /> }
					{ ! data && ! error && <div className="qq-state-msg">{ __( 'Loading customers…', TEXT_DOMAIN ) }</div> }

					{ data && (
						<div className="qq-pf-table" role="table">
							<div className="qq-pf-row qq-pf-head qq-pf-customers-grid" role="row">
								<span />
								<SortHeader { ...header } label={ __( 'Customer', TEXT_DOMAIN ) } sortKey="name" defaultOrder="asc" />
								<SortHeader { ...header } label={ __( 'Activity', TEXT_DOMAIN ) } sortKey="activity" />
								<SortHeader { ...header } label={ __( 'Questions', TEXT_DOMAIN ) } sortKey="questions" />
								<SortHeader { ...header } label={ __( 'Answers', TEXT_DOMAIN ) } sortKey="answers" />
								<SortHeader { ...header } label={ __( 'Helpful', TEXT_DOMAIN ) } sortKey="helpful" />
								<span className="qq-pf-th">{ __( 'Recent products', TEXT_DOMAIN ) }</span>
								<SortHeader { ...header } label={ __( 'Lifetime value', TEXT_DOMAIN ) } sortKey="value" disabled={ ! fullSort } title={ fullSortTitle } />
								<SortHeader { ...header } label={ __( 'Risk', TEXT_DOMAIN ) } sortKey="risk" disabled={ ! fullSort } title={ fullSortTitle } />
								<SortHeader { ...header } label={ __( 'Last active', TEXT_DOMAIN ) } sortKey="last_active" />
							</div>

							{ data.items.length === 0 && (
								<div className="qq-pf-empty">
									{ q ? __( 'No customers match your search.', TEXT_DOMAIN ) : __( 'No customers yet. They appear here once someone asks or answers a question.', TEXT_DOMAIN ) }
								</div>
							) }

							{ data.items.map( c => (
								<div
									key={ c.key }
									className="qq-pf-row qq-pf-customers-grid qq-pf-row-link"
									role="row"
									tabIndex={ 0 }
									onClick={ () => navigate( 'customer-profile', { key: c.key } ) }
									onKeyDown={ e => ( 'Enter' === e.key ) && navigate( 'customer-profile', { key: c.key } ) }
								>
									<span className={ `qq-pf-av${ 'guest' === c.type ? ' guest' : '' }` }>{ c.initials }</span>
									<span className="qq-pf-cell-name">
										<span className="qq-pf-name">{ c.name }</span>
										<span className={ `qq-pf-name-sub ${ c.type }` }>{ TYPE_LABEL[ c.type ] }</span>
									</span>
									<span className="qq-pf-num">{ formatNumber( c.asked + c.answered ) }</span>
									<span className="qq-pf-num">{ formatNumber( c.asked ) }</span>
									<span className="qq-pf-num">{ formatNumber( c.answered ) }</span>
									<span className="qq-pf-num">{ formatNumber( c.helpful ) }</span>
									<span className="qq-pf-products">
										{ c.recent_products.length
											? c.recent_products.map( p => p.name ).join( ', ' )
											: <span className="qq-an-faded">—</span> }
									</span>
									<span className="qq-pf-num">
										{ c.orders > 0 ? c.value_formatted : <span className="qq-an-faded">—</span> }
									</span>
									<span className="qq-pf-num">
										{ c.risk_count > 0
											? <span className="qq-pf-risk-badge">{ sprintf( _n( '%d signal', '%d signals', c.risk_count, TEXT_DOMAIN ), c.risk_count ) }</span>
											: <span className="qq-an-faded">—</span> }
									</span>
									<span className="qq-pf-num qq-pf-faded-cell">{ relativeTime( c.last_active ) }</span>
								</div>
							) ) }

							<Pager
								page={ data.page }
								pages={ data.pages }
								total={ data.total }
								onPage={ setPage }
								noun={ n => sprintf( _n( '%s customer', '%s customers', n, TEXT_DOMAIN ), formatNumber( n ) ) }
							/>
						</div>
					) }
				</div>
			</div>
		</div>
	);
}
