/**
 * External dependencies
 */
import { isEqual } from 'lodash';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { Component, findDOMNode } from '@wordpress/element';
import { Panel, PanelBody } from '@wordpress/components';

// @TODO add error handling.
class MetaboxIframe extends Component {
	constructor() {
		super( ...arguments );

		this.state = {
			width: 0,
			height: 0,
			isOpen: false,
		};

		this.formData = [];
		this.originalFormData = [];
		this.form = null;
		this.hasLoaded = false;

		this.toggle = this.toggle.bind( this );
		this.checkMessageForResize = this.checkMessageForResize.bind( this );
		this.handleDoubleBuffering = this.handleDoubleBuffering.bind( this );
		this.handleMetaboxReload = this.handleMetaboxReload.bind( this );
		this.checkMetaboxState = this.checkMetaboxState.bind( this );
		this.isFrameAccessible = this.isFrameAccessible.bind( this );
		this.observeChanges = this.observeChanges.bind( this );
	}

	toggle() {
		this.setState( {
			isOpen: ! this.state.isOpen,
		} );
	}

	isFrameAccessible() {
		try {
			return !! this.node.contentDocument.body;
		} catch ( e ) {
			return false;
		}
	}

	shouldComponentUpdate( nextProps ) {
		// Metabox updating. Don't have React take over if updating.
		if ( ( this.props.isUpdating === false && nextProps.isUpdating === true )
			|| ( this.props.isUpdating === true && nextProps.isUpdating === true ) ) {
			return false;
		}

		return true;
	}

	componentDidMount() {
		if ( this.isFrameAccessible() ) {
			/**
			 * Sets up an event listener for resizing. The resizing occurs inside
			 * the iframe, see gutenberg/assets/js/metabox.js
			 */
			window.addEventListener( 'message', this.checkMessageForResize, false );

			// Initially set node to not display anything so that when it loads, we can see it.
			this.node.style.display = 'none';
			this.node.addEventListener( 'load', this.observeChanges );
		}
	}

	componentWillReceiveProps( nextProps ) {
		// Metabox updating.
		if ( this.props.isUpdating === false && nextProps.isUpdating === true ) {
			const iframe = findDOMNode( this.node );

			//iframe.addEventListener( 'load', this.handleMetaboxReload );

			this.clonedNode = iframe.cloneNode( true );
			this.hideNode( this.clonedNode );
			const parent = iframe.parentNode;

			parent.appendChild( this.clonedNode );

			/**
			 * When the dom content has loaded for the cloned iframe handle the
			 * double buffering.
			 */
			this.clonedNode.addEventListener( 'load', this.handleDoubleBuffering );
		}
	}

	componentDidUpdate() {
		if ( this.isFrameAccessible() ) {
			/**
			 * Sets up an event listener for resizing. The resizing occurs inside
			 * the iframe, see gutenberg/assets/js/metabox.js
			 */
			window.addEventListener( 'message', this.checkMessageForResize, false );

			// Initially set node to not display anything so that when it loads, we can see it.
			//this.node.style.display = 'none';
			this.node.addEventListener( 'load', this.observeChanges );
		}
	}

	handleDoubleBuffering() {
		const iframe = findDOMNode( this.node );
		const cloneIframe = findDOMNode( this.clonedNode );
		// The standard post.php form ID post should probably be mimicked.
		const form = iframe.contentWindow.document.getElementById( 'post' );

		form.submit();

		const cloneForm = cloneIframe.contentWindow.document.getElementById( 'post' );

		cloneForm.parentNode.replaceChild( form, cloneForm );

		this.showNode( this.clonedNode );
		this.hideNode( this.node );

		this.node.addEventListener( 'load', this.handleMetaboxReload );
	}

	hideNode( node ) {
		node.style.visibility = 'hidden';
		node.style.position = 'absolute';
		node.style.top = '0';
		node.style.left = '0';
	}

	showNode( node ) {
		node.style.visibility = null;
		node.style.position = null;
		node.style.top = null;
		node.style.left = null;
	}

	componentWillUnmount() {
		if ( this.isFrameAccessible() ) {
			const iframe = findDOMNode( this.node );
			iframe.removeEventListener( 'message', this.checkMessageForResize );

			if ( this.dirtyObserver ) {
				this.dirtyObserver.disconnect();
			}

			if ( this.form !== null ) {
				this.form.removeEventListener( 'input', this.checkMetaboxState );
				this.form.removeEventListener( 'change', this.checkMetaboxState );
			}

			this.node.removeEventListener( 'load', this.observeChanges );
		}
	}

	observeChanges() {
		const node = findDOMNode( this.node );

		// If the iframe has not already loaded before.
		if ( this.hasLoaded === false ) {
			node.style.display = 'block';
			this.hasLoaded = true;
		}

		this.originalFormData = this.getFormData( node );

		const form = node.contentWindow.document.getElementById( 'post' );
		this.form = form;
		// Add event listeners to handle dirty checking.
		this.dirtyObserver = new window.MutationObserver( this.checkMetaboxState );
		this.dirtyObserver.observe( findDOMNode( form ), {
			attributes: true,
			attributeOldValue: true,
			characterData: true,
			characterDataOldValue: true,
			childList: true,
			subtree: true,
		} );
		form.addEventListener( 'change', this.checkMetaboxState );
		form.addEventListener( 'input', this.checkMetaboxState );
	}

	getFormData( node ) {
		if ( ! this.isFrameAccessible() ) {
			return;
		}

		const form = node.contentWindow.document.getElementById( 'post' );

		const data = new window.FormData( form );
		const entries = Array.from( data.entries() );
		return entries;
	}

	checkMetaboxState() {
		if ( this.props.isUpdating !== true ) {
			const entries = this.getFormData( this.node );

			if ( ! isEqual( this.originalFormData, entries ) ) {
				if ( this.props.isDirty === false ) {
					this.props.changedMetaboxState( this.props.location, true );
				}

				return;
			}

			// If the data is the same as the original and we have metabox marked as dirty.
			if ( this.props.isDirty === true ) {
				this.props.changedMetaboxState( this.props.location, false );
			}
		}
	}

	handleMetaboxReload( event ) {
		event.target.removeEventListener( 'load', this.handleMetaboxReload );

		if ( this.clonedNode ) {
			this.showNode( this.node );
			this.hideNode( this.clonedNode );
			this.clonedNode.removeEventListener( 'load', this.handleDoubleBuffering );
			this.clonedNode.parentNode.removeChild( this.clonedNode );
			delete this.clonedNode;
		}

		this.props.metaboxReloaded( this.props.location );
	}

	checkMessageForResize( event ) {
		const iframe = this.node;

		// Attempt to parse the message data as JSON if passed as string
		let data = event.data || {};
		if ( 'string' === typeof data ) {
			try {
				data = JSON.parse( data );
			} catch ( e ) {} // eslint-disable-line no-empty
		}

		if ( data.source !== 'metabox' || data.location !== this.props.location ) {
			return;
		}

		// Verify that the mounted element is the source of the message
		if ( ! iframe || iframe.contentWindow !== event.source ) {
			return;
		}

		// Update the state only if the message is formatted as we expect, i.e.
		// as an object with a 'resize' action, width, and height
		const { action, width, height } = data;
		const { width: oldWidth, height: oldHeight } = this.state;

		if ( 'resize' === action && ( oldWidth !== width || oldHeight !== height ) ) {
			this.setState( { width, height } );
		}
	}

	render() {
		const { location, className, id } = this.props;
		const { isOpen } = this.state;

		return (
			<Panel className="editor-meta-boxes">
				<PanelBody
					title={ __( 'Extended Settings' ) }
					opened={ isOpen }
					onToggle={ this.toggle }>
					<div id="iframe-container" className={ className }>
						<iframe
							ref={ ( node ) => {
								this.node = node;
							} }
							title={ __( 'Extended Settings' ) }
							key="metabox"
							id={ id }
							src={ `${ window._wpMetaboxUrl }&metabox=${ location }` }
							width={ Math.ceil( this.state.width ) }
							height={ Math.ceil( this.state.height ) } />
					</div>
				</PanelBody>
			</Panel>
		);
	}
}

export default MetaboxIframe;
