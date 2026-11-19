import React, { useState } from 'react';
import { __, _n, sprintf } from '../../i18n';
import { useNav } from '../../navigation';
import { fetchProducts } from './api';
import { formatNumber, formatDuration } from '../Analytics/format';
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

export const PROFILE_RANGES = [
	{ key: '7d', label: __( 'Last 7 days', TEXT_DOMAIN ) },
	{ key: '30d', label: __( 'Last 30 days', TEXT_DOMAIN ) },
	{ key: '90d', label: __( 'Last 90 days', TEXT_DOMAIN ) },
	{ key: 'year', label: __( 'This year', TEXT_DOMAIN ) },
	{ key: 'all', label: __( 'All time', TEXT_DOMAIN ) },
];

/**
 * Products with Q&A activity in the selected range (KAN-33). Sortable by
 * questions, unanswered, answer rate, avg response, upvotes (votes on
 * questions), helpful votes (votes on answers), community answers, last
 * activity and name.
 */
export default function ProductsDirectory() {
	const { navigate }          = useNav();
	const [ range, setRange ]   = useState( '30d' );
	const [ sort, setSort ]     = useState( { sort: 'questions', order: 'desc' } );
	const [ page, setPage ]     = useState( 1 );
	const [ search, setSearch ] = useState( '' );
	const q                     = useDebounced( search );

	const { data, error, loading } = useRemote(
		signal => fetchProducts( { range, ...sort, page, per_page: 25, search: q }, signal ),
		[ range, sort.sort, sort.order, page, q ]
	);

	const onSort = ( key, order ) => {
		setSort( { sort: key, order } );
		setPage( 1 );
	};
	const header = { sort: data ? data.sort : sort.sort, order: data ? data.order : sort.order, onSort };

	return (
		<div className="qq-page qq-pf">
			<div className="qq-top">
				<div className="qq-top-left">
					<span className="qq-page-label">{ __( 'Products', TEXT_DOMAIN ) }</span>
					<input
						type="search"
						className="qq-search"
						placeholder={ __( 'Search products…', TEXT_DOMAIN ) }
						value={ search }
						onChange={ e => {
							setSearch( e.target.value );
							setPage( 1 );
						} }
						aria-label={ __( 'Search products', TEXT_DOMAIN ) }
					/>
				</div>
				<div className="qq-an-top-right">
					{ loading && data && <span className="qq-an-faded qq-an-refreshing">{ __( 'Updating…', TEXT_DOMAIN ) }</span> }
					<select
						className="qq-an-select"
						value={ range }
						onChange={ e => {
							setRange( e.target.value );
							setPage( 1 );
						} }
						aria-label={ __( 'Date range', TEXT_DOMAIN ) }
					>
						{ PROFILE_RANGES.map( r => <option key={ r.key } value={ r.key }>{ r.label }</option> ) }
					</select>
				</div>
			</div>

			<div className="qq-pf-scroll">
				<div className={ `qq-pf-content${ loading && data ? ' is-loading' : '' }` }>
					<BackLink />
					<h1 className="qq-pf-title">{ __( 'All products', TEXT_DOMAIN ) }</h1>
					<p className="qq-pf-sub">{ __( 'Products with Q&A activity in the selected date range.', TEXT_DOMAIN ) }</p>

					{ error && ! data && <ErrorState error={ error } /> }
					{ ! data && ! error && <div className="qq-state-msg">{ __( 'Loading products…', TEXT_DOMAIN ) }</div> }

					{ data && (
						<div className="qq-pf-table" role="table">
							<div className="qq-pf-row qq-pf-head qq-pf-products-grid" role="row">
								<span />
								<SortHeader { ...header } label={ __( 'Product', TEXT_DOMAIN ) } sortKey="name" defaultOrder="asc" />
								<SortHeader { ...header } label={ __( 'Questions', TEXT_DOMAIN ) } sortKey="questions" />
								<SortHeader { ...header } label={ __( 'Unanswered', TEXT_DOMAIN ) } sortKey="unanswered" />
								<SortHeader { ...header } label={ __( 'Answer rate', TEXT_DOMAIN ) } sortKey="answer_rate" />
								<SortHeader { ...header } label={ __( 'Avg response', TEXT_DOMAIN ) } sortKey="response" defaultOrder="asc" />
								<SortHeader { ...header } label={ __( 'Upvotes', TEXT_DOMAIN ) } sortKey="upvotes" title={ __( 'Votes on questions', TEXT_DOMAIN ) } />
								<SortHeader { ...header } label={ __( 'Helpful', TEXT_DOMAIN ) } sortKey="helpful_votes" title={ __( 'Helpful votes on answers', TEXT_DOMAIN ) } />
								<SortHeader { ...header } label={ __( 'Community', TEXT_DOMAIN ) } sortKey="community" title={ __( 'Approved answers from customers', TEXT_DOMAIN ) } />
								<SortHeader { ...header } label={ __( 'Last question', TEXT_DOMAIN ) } sortKey="last_activity" />
							</div>

							{ data.items.length === 0 && (
								<div className="qq-pf-empty">
									{ q ? __( 'No products match your search.', TEXT_DOMAIN ) : __( 'No questions in this date range.', TEXT_DOMAIN ) }
								</div>
							) }

							{ data.items.map( p => (
								<div
									key={ p.id }
									className="qq-pf-row qq-pf-products-grid qq-pf-row-link"
									role="row"
									tabIndex={ 0 }
									onClick={ () => navigate( 'product-profile', { id: p.id } ) }
									onKeyDown={ e => ( 'Enter' === e.key ) && navigate( 'product-profile', { id: p.id } ) }
								>
									{ p.thumbnail
										? <img className="qq-pf-av product" src={ p.thumbnail } alt="" />
										: <span className="qq-pf-av product">{ ( p.name || '?' ).slice( 0, 1 ) }</span> }
									<span className="qq-pf-cell-name">
										<span className="qq-pf-name">{ p.name }</span>
										<span className="qq-pf-name-sub">{ [ p.category, p.sku ].filter( Boolean ).join( ' · ' ) }</span>
									</span>
									<span className="qq-pf-num">{ formatNumber( p.questions ) }</span>
									<span className={ `qq-pf-num${ p.unanswered > 3 ? ' warm' : p.unanswered === 0 ? ' qq-pf-faded-cell' : '' }` }>{ formatNumber( p.unanswered ) }</span>
									<span className="qq-pf-num">{ p.answer_rate }%</span>
									<span className="qq-pf-num">{ formatDuration( p.avg_response_secs ) }</span>
									<span className="qq-pf-num">{ formatNumber( p.upvotes ) }</span>
									<span className="qq-pf-num">{ formatNumber( p.helpful_votes ?? 0 ) }</span>
									<span className="qq-pf-num">{ formatNumber( p.community ) }</span>
									<span className="qq-pf-num qq-pf-faded-cell">{ relativeTime( p.last_activity ) }</span>
								</div>
							) ) }

							<Pager
								page={ data.page }
								pages={ data.pages }
								total={ data.total }
								onPage={ setPage }
								noun={ n => sprintf( _n( '%s product', '%s products', n, TEXT_DOMAIN ), formatNumber( n ) ) }
							/>
						</div>
					) }
				</div>
			</div>
		</div>
	);
}
