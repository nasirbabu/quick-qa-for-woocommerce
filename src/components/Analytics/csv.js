/**
 * CSV export of the analytics dashboard (KAN-32).
 *
 * Built in the browser from the exact report payload currently rendered,
 * using the same formatters as the UI, so the file always matches what is
 * on screen for the selected range and product filter — no second server
 * query that could drift.
 */
import { __ } from '../../i18n';
import { TEXT_DOMAIN } from './api';
import { describeTiles, describeOutlier } from './format';

/**
 * Quote a cell and neutralise spreadsheet formula injection: values that
 * start with = + - @ (or tab/CR) get a leading apostrophe. Plain numbers
 * (e.g. "-3") are left alone.
 */
export function csvCell( value ) {
	let s = value === null || value === undefined ? '' : String( value );
	if ( /^[=+\-@\t\r]/.test( s ) && ! /^-?\d+(\.\d+)?$/.test( s ) ) {
		s = `'${ s }`;
	}
	return `"${ s.replace( /"/g, '""' ) }"`;
}

export function buildCsvRows( report ) {
	const rows = [];
	const blank = () => rows.push( [] );

	rows.push( [ __( 'Askora analytics', TEXT_DOMAIN ) ] );
	rows.push( [ __( 'Date range', TEXT_DOMAIN ), `${ report.range.label } (${ report.range.start } – ${ report.range.end })` ] );
	rows.push( [ __( 'Product', TEXT_DOMAIN ), report.product ? report.product.name : __( 'All products', TEXT_DOMAIN ) ] );
	rows.push( [ __( 'Generated', TEXT_DOMAIN ), report.generated_at ] );
	blank();

	rows.push( [ __( 'Overview', TEXT_DOMAIN ) ] );
	rows.push( [ __( 'Metric', TEXT_DOMAIN ), __( 'Value', TEXT_DOMAIN ), __( 'Trend', TEXT_DOMAIN ) ] );
	describeTiles( report ).forEach( t => rows.push( [ t.label, t.value, t.trend ] ) );
	rows.push( [ __( 'Upvotes', TEXT_DOMAIN ), report.summary.upvotes, '' ] );
	rows.push( [ __( 'Verified-buyer answers', TEXT_DOMAIN ), report.summary.verified_answers, '' ] );
	blank();

	const outlier = describeOutlier( report.outlier );
	if ( outlier ) {
		rows.push( [ __( 'High-volume product', TEXT_DOMAIN ) ] );
		rows.push( [ outlier.title ] );
		rows.push( [ outlier.desc ] );
		report.outlier.top_questions.forEach( q => rows.push( [ __( 'Top question', TEXT_DOMAIN ), q ] ) );
		blank();
	}

	rows.push( [ __( 'Questions per day', TEXT_DOMAIN ) ] );
	rows.push( [ __( 'Date', TEXT_DOMAIN ), __( 'Questions', TEXT_DOMAIN ) ] );
	report.daily.forEach( d => rows.push( [ d.date, d.questions ] ) );
	blank();

	rows.push( [ __( 'Products with most questions', TEXT_DOMAIN ) ] );
	rows.push( [ __( 'Rank', TEXT_DOMAIN ), __( 'Product', TEXT_DOMAIN ), __( 'Questions', TEXT_DOMAIN ) ] );
	report.top_products.forEach( ( p, i ) => rows.push( [ i + 1, p.name, p.questions ] ) );
	blank();

	rows.push( [ __( 'Most active customers', TEXT_DOMAIN ) ] );
	rows.push( [
		__( 'Rank', TEXT_DOMAIN ),
		__( 'Customer', TEXT_DOMAIN ),
		__( 'Verified buyer', TEXT_DOMAIN ),
		__( 'Asked', TEXT_DOMAIN ),
		__( 'Answered', TEXT_DOMAIN ),
		__( 'Total', TEXT_DOMAIN ),
	] );
	report.top_customers.forEach( ( c, i ) => rows.push( [
		i + 1,
		c.name,
		c.verified_buyer ? __( 'Yes', TEXT_DOMAIN ) : __( 'No', TEXT_DOMAIN ),
		c.asked,
		c.answered,
		c.total,
	] ) );
	blank();

	rows.push( [ __( 'Most upvoted questions', TEXT_DOMAIN ) ] );
	rows.push( [ __( 'Question', TEXT_DOMAIN ), __( 'Product', TEXT_DOMAIN ), __( 'Upvotes', TEXT_DOMAIN ) ] );
	report.top_questions.forEach( q => rows.push( [ q.text, q.product.name, q.upvotes ] ) );
	blank();

	rows.push( [ __( 'Where answers come from', TEXT_DOMAIN ) ] );
	rows.push( [ __( 'Source', TEXT_DOMAIN ), __( 'Answers', TEXT_DOMAIN ) ] );
	report.answer_sources.forEach( s => rows.push( [ s.label, s.count ] ) );

	return rows;
}

export function buildCsv( report ) {
	return buildCsvRows( report ).map( row => row.map( csvCell ).join( ',' ) ).join( '\r\n' ) + '\r\n';
}

export function downloadCsv( report ) {
	// UTF-8 BOM so Excel detects the encoding of non-ASCII product names.
	const blob = new Blob( [ '﻿', buildCsv( report ) ], { type: 'text/csv;charset=utf-8' } );
	const url  = URL.createObjectURL( blob );
	const slug = report.product ? `-product-${ report.product.id }` : '';
	const a    = document.createElement( 'a' );
	a.href     = url;
	a.download = `askora-analytics-${ report.range.key }${ slug }-${ report.range.end }.csv`;
	document.body.appendChild( a );
	a.click();
	a.remove();
	setTimeout( () => URL.revokeObjectURL( url ), 1000 );
}
