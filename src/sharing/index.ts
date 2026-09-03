export {
  LEGACY_SHARE_STATE_VERSION,
  PREVIOUS_SHARE_STATE_VERSION,
  BASIS_DIMENSION_SHARE_STATE_VERSION,
  LINEAR_MAP_SHARE_STATE_VERSION,
  DEFAULT_3D_CAMERA_STATE,
  MAX_ABSOLUTE_COORDINATE,
  MAX_ABSOLUTE_CAMERA_TARGET,
  MIN_CAMERA_ZOOM,
  MAX_CAMERA_ZOOM,
  MAX_ENCODED_SHARE_STATE_LENGTH,
  MAX_SHARE_VECTOR_ID_LENGTH,
  MAX_SHARE_VECTOR_NAME_LENGTH,
  MAX_SHARE_VECTORS,
  SHARE_STATE_VERSION,
  InvalidShareStateError,
  decodeShareState,
  encodeShareState,
  validateShareState,
  validateSharedState,
  validateBasisDimensionShareState,
  validateLinearMapShareState,
} from './shareState';

export type {
  ShareState,
  ShareStateDecodeResult,
  ShareStateErrorCode,
  ShareStateV1,
  ShareStateV2,
  ShareStateV3,
  SharedState,
  BasisDimensionShareState,
  BasisDimensionShareStateV1,
  BasisRepresentation,
  LinearMapShareState,
  LinearMapShareStateV1,
  SharedCameraState,
  LegacySharedVisualizationState,
  SharedLinearCombinationState,
  SharedVisualizationState,
} from './shareState';

export {
  MAX_OPERATIONAL_SHARE_URL_LENGTH,
  SHARE_STATE_QUERY_PARAMETER,
  ShareUrlBuildError,
  buildShareUrl,
  createShareTextFileContents,
  createShareTextFileName,
  readShareStateFromUrl,
} from './shareUrl';

export type {
  ShareUrlBuildErrorCode,
  ShareUrlError,
  ShareUrlErrorCode,
  ShareUrlReadResult,
} from './shareUrl';

export {
  createShareQrCodeDataUrl,
  createShareQrCodeFileName,
} from './shareQrCode';
