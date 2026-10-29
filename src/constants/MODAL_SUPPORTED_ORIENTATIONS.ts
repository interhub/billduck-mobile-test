import {ModalProps} from 'react-native';

/** The app runs in portrait only; a modal that lists other orientations crashes a release build. */
export const MODAL_SUPPORTED_ORIENTATIONS: ModalProps['supportedOrientations'] = ['portrait'];
