/**
 * Builds a WordPress.org-ready copy of the plugin.
 *
 *   npm run release
 *
 * Output:
 *   release/quick-qa-for-woocommerce/              -> copy into SVN trunk/ (and tags/<version>/)
 *   release/quick-qa-for-woocommerce-<version>.zip -> installable zip (top-level plugin folder)
 *
 * Only the files listed in INCLUDE are shipped; sources (src/), tooling and
 * dev files never reach the release. Runs after `vite build` (see package.json).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import archiver from 'archiver';

const ROOT = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const SLUG = 'quick-qa-for-woocommerce';
const RELEASE_DIR = path.join( ROOT, 'release' );
const PLUGIN_DIR = path.join( RELEASE_DIR, SLUG );

// Files and folders that make up the production plugin.
const INCLUDE = [
	'admin',
	'build',
	'includes',
	'languages',
	'public',
	'index.php',
	'LICENSE.txt',
	'README.txt',
	`${ SLUG }.php`,
	'uninstall.php',
];

// Never ship these, wherever they appear.
const EXCLUDE = [ /^\.DS_Store$/, /^Thumbs\.db$/i, /\.map$/, /^\.git/ ];

// Files the admin React app needs; fail early if `vite build` didn't produce them.
const REQUIRED = [ 'build/quick-qa-app.js', 'build/quick-qa-app.css' ];

function fail( msg ) {
	console.error( `\n✖ release failed: ${ msg }\n` );
	process.exit( 1 );
}

function read( rel ) {
	return fs.readFileSync( path.join( ROOT, rel ), 'utf8' );
}

/** Plugin header Version, VERSION constant and readme Stable tag must agree. */
function getVersion() {
	const main = read( `${ SLUG }.php` );
	const header = main.match( /^\s*\*\s*Version:\s*(\S+)/m )?.[ 1 ];
	const constant = main.match( /define\(\s*'QUICK_QA_FOR_WOOCOMMERCE_VERSION',\s*'([^']+)'/ )?.[ 1 ];
	const stable = read( 'README.txt' ).match( /^Stable tag:\s*(\S+)/im )?.[ 1 ];

	if ( ! header ) {
		fail( `no "Version:" header found in ${ SLUG }.php` );
	}
	if ( header !== constant || header !== stable ) {
		fail(
			`version mismatch: header ${ header }, QUICK_QA_FOR_WOOCOMMERCE_VERSION ${ constant }, ` +
				`README.txt Stable tag ${ stable }`
		);
	}
	return header;
}

function copy( src, dest ) {
	if ( EXCLUDE.some( ( re ) => re.test( path.basename( src ) ) ) ) {
		return;
	}
	if ( fs.statSync( src ).isDirectory() ) {
		fs.mkdirSync( dest, { recursive: true } );
		for ( const entry of fs.readdirSync( src ) ) {
			copy( path.join( src, entry ), path.join( dest, entry ) );
		}
	} else {
		fs.copyFileSync( src, dest );
	}
}

function zip( zipPath ) {
	return new Promise( ( resolve, reject ) => {
		const output = fs.createWriteStream( zipPath );
		const archive = archiver( 'zip', { zlib: { level: 9 } } );
		output.on( 'close', () => resolve( archive.pointer() ) );
		archive.on( 'warning', reject );
		archive.on( 'error', reject );
		archive.pipe( output );
		// Forward-slash paths with the slug as the top-level folder, as WordPress expects.
		archive.directory( PLUGIN_DIR, SLUG );
		archive.finalize();
	} );
}

async function main() {
	const version = getVersion();

	for ( const rel of [ ...INCLUDE, ...REQUIRED ] ) {
		if ( ! fs.existsSync( path.join( ROOT, rel ) ) ) {
			fail( `missing ${ rel }` );
		}
	}

	fs.rmSync( RELEASE_DIR, { recursive: true, force: true } );
	fs.mkdirSync( PLUGIN_DIR, { recursive: true } );

	for ( const rel of INCLUDE ) {
		copy( path.join( ROOT, rel ), path.join( PLUGIN_DIR, rel ) );
	}

	const zipName = `${ SLUG }-${ version }.zip`;
	const bytes = await zip( path.join( RELEASE_DIR, zipName ) );

	console.log( `\n✔ ${ SLUG } ${ version } released` );
	console.log( `  SVN folder: release/${ SLUG }/` );
	console.log( `  Zip:        release/${ zipName } (${ ( bytes / 1024 ).toFixed( 1 ) } KB)\n` );
}

main().catch( ( err ) => fail( err.message ) );
