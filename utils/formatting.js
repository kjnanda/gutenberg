const BLOCK_LIST = [
	'table',
	'thead',
	'tfoot',
	'caption',
	'col',
	'colgroup',
	'tbody',
	'tr',
	'td',
	'th',
	'div',
	'dl',
	'dd',
	'dt',
	'ul',
	'ol',
	'li',
	'pre',
	'form',
	'map',
	'area',
	'blockquote',
	'address',
	'math',
	'style',
	'p',
	'h[1-6]',
	'hr',
	'fieldset',
	'legend',
	'section',
	'article',
	'aside',
	'hgroup',
	'header',
	'footer',
	'nav',
	'figure',
	'figcaption',
	'details',
	'menu',
	'summary',
].join( '|' );

/**
 * Replaces two line breaks with a paragraph tag and one line break with a
 * <br>.
 *
 * Similar to `wpautop()` in formatting.php.
 * Copied from `wp.editor.autop`
 *
 * @param   {string} text The text input.
 * @returns {string}      The formatted text.
 */
export function autop( text ) {
	let preserveLinebreaks = false;
	let preserveBr = false;

	// Normalize line breaks.
	text = text.replace( /\r\n|\r/g, '\n' );

	if ( text.indexOf( '\n' ) === -1 ) {
		return text;
	}

	// Remove line breaks from <object>.
	if ( text.indexOf( '<object' ) !== -1 ) {
		text = text.replace( /<object[\s\S]+?<\/object>/g, function( a ) {
			return a.replace( /\n+/g, '' );
		} );
	}

	// Remove line breaks from tags.
	text = text.replace( /<[^<>]+>/g, function( a ) {
		return a.replace( /[\n\t ]+/g, ' ' );
	} );

	// Preserve line breaks in <pre> and <script> tags.
	if ( text.indexOf( '<pre' ) !== -1 || text.indexOf( '<script' ) !== -1 ) {
		preserveLinebreaks = true;
		text = text.replace( /<(pre|script)[^>]*>[\s\S]*?<\/\1>/g, function( a ) {
			return a.replace( /\n/g, '<wp-line-break>' );
		} );
	}

	if ( text.indexOf( '<figcaption' ) !== -1 ) {
		text = text.replace( /\s*(<figcaption[^>]*>)/g, '$1' );
		text = text.replace( /<\/figcaption>\s*/g, '</figcaption>' );
	}

	// Keep <br> tags inside captions.
	if ( text.indexOf( '[caption' ) !== -1 ) {
		preserveBr = true;

		text = text.replace( /\[caption[\s\S]+?\[\/caption\]/g, function( a ) {
			a = a.replace( /<br([^>]*)>/g, '<wp-temp-br$1>' );
			a = a.replace( /<[^<>]+>/g, function( b ) {
				return b.replace( /[\n\t ]+/, ' ' );
			} );

			return a.replace( /\s*\n\s*/g, '<wp-temp-br />' );
		} );
	}

	text = text + '\n\n';
	text = text.replace( /<br \/>\s*<br \/>/gi, '\n\n' );

	// Pad block tags with two line breaks.
	text = text.replace( new RegExp( '(<(?:' + BLOCK_LIST + ')(?: [^>]*)?>)', 'gi' ), '\n\n$1' );
	text = text.replace( new RegExp( '(</(?:' + BLOCK_LIST + ')>)', 'gi' ), '$1\n\n' );
	text = text.replace( /<hr( [^>]*)?>/gi, '<hr$1>\n\n' );

	// Remove white space chars around <option>.
	text = text.replace( /\s*<option/gi, '<option' );
	text = text.replace( /<\/option>\s*/gi, '</option>' );

	// Normalize multiple line breaks and white space chars.
	text = text.replace( /\n\s*\n+/g, '\n\n' );

	// Convert two line breaks to a paragraph.
	text = text.replace( /([\s\S]+?)\n\n/g, '<p>$1</p>\n' );

	// Remove empty paragraphs.
	text = text.replace( /<p>\s*?<\/p>/gi, '' );

	// Remove <p> tags that are around block tags.
	text = text.replace( new RegExp( '<p>\\s*(</?(?:' + BLOCK_LIST + ')(?: [^>]*)?>)\\s*</p>', 'gi' ), '$1' );
	text = text.replace( /<p>(<li.+?)<\/p>/gi, '$1' );

	// Fix <p> in blockquotes.
	text = text.replace( /<p>\s*<blockquote([^>]*)>/gi, '<blockquote$1><p>' );
	text = text.replace( /<\/blockquote>\s*<\/p>/gi, '</p></blockquote>' );

	// Remove <p> tags that are wrapped around block tags.
	text = text.replace( new RegExp( '<p>\\s*(</?(?:' + BLOCK_LIST + ')(?: [^>]*)?>)', 'gi' ), '$1' );
	text = text.replace( new RegExp( '(</?(?:' + BLOCK_LIST + ')(?: [^>]*)?>)\\s*</p>', 'gi' ), '$1' );

	text = text.replace( /(<br[^>]*>)\s*\n/gi, '$1' );

	// Add <br> tags.
	text = text.replace( /\s*\n/g, '<br />\n' );

	// Remove <br> tags that are around block tags.
	text = text.replace( new RegExp( '(</?(?:' + BLOCK_LIST + ')[^>]*>)\\s*<br />', 'gi' ), '$1' );
	text = text.replace( /<br \/>(\s*<\/?(?:p|li|div|dl|dd|dt|th|pre|td|ul|ol)>)/gi, '$1' );

	// Remove <p> and <br> around captions.
	text = text.replace( /(?:<p>|<br ?\/?>)*\s*\[caption([^\[]+)\[\/caption\]\s*(?:<\/p>|<br ?\/?>)*/gi, '[caption$1[/caption]' );

	// Make sure there is <p> when there is </p> inside block tags that can contain other blocks.
	text = text.replace( /(<(?:div|th|td|form|fieldset|dd)[^>]*>)(.*?)<\/p>/g, function( a, b, c ) {
		if ( c.match( /<p( [^>]*)?>/ ) ) {
			return a;
		}

		return b + '<p>' + c + '</p>';
	} );

	// Restore the line breaks in <pre> and <script> tags.
	if ( preserveLinebreaks ) {
		text = text.replace( /<wp-line-break>/g, '\n' );
	}

	// Restore the <br> tags in captions.
	if ( preserveBr ) {
		text = text.replace( /<wp-temp-br([^>]*)>/g, '<br$1>' );
	}

	return text;
}
