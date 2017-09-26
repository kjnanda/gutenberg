/**
 * External dependencies
 */
import { connect } from 'react-redux';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { IconButton } from '@wordpress/components';

/**
 * Internal dependencies
 */
import './style.scss';
import { isEditorSidebarOpened, getBlockMode } from '../selectors';
import { selectBlock, toggleBlockMode } from '../actions';

function BlockSettingsMenu( { mode, onDelete, onToggleMode, onSelect, isSidebarOpened, toggleSidebar, setActivePanel } ) {
	const toggleInspector = () => {
		onSelect();
		setActivePanel();
		if ( ! isSidebarOpened ) {
			toggleSidebar();
		}
	};

	return (
		<div className="editor-block-settings-menu">
			<IconButton
				className="editor-block-settings-menu__control"
				onClick={ toggleInspector }
				icon="admin-generic"
				label={ __( 'Show inspector' ) }
			/>
			<IconButton
				className="editor-block-settings-menu__control"
				onClick={ onDelete }
				icon="trash"
				label={ __( 'Delete the block' ) }
			/>
			<IconButton
				className="editor-block-settings-menu__control"
				onClick={ onToggleMode }
				icon={ mode === 'html' ? 'edit' : 'html' }
				label={ __( 'Delete the block' ) }
			/>
		</div>
	);
}

export default connect(
	( state, ownProps ) => ( {
		isSidebarOpened: isEditorSidebarOpened( state ),
		mode: getBlockMode( state, ownProps.uid ),
	} ),
	( dispatch, ownProps ) => ( {
		onDelete() {
			dispatch( {
				type: 'REMOVE_BLOCKS',
				uids: [ ownProps.uid ],
			} );
		},
		onSelect() {
			dispatch( selectBlock( ownProps.uid ) );
		},
		onToggleMode() {
			dispatch( toggleBlockMode( ownProps.uid ) );
		},
		setActivePanel() {
			dispatch( {
				type: 'SET_ACTIVE_PANEL',
				panel: 'block',
			} );
		},
		toggleSidebar() {
			dispatch( { type: 'TOGGLE_SIDEBAR' } );
		},
	} )
)( BlockSettingsMenu );
