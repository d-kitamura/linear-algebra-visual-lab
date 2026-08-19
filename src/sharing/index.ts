export {
  LEGACY_SHARE_STATE_VERSION,
  MAX_ABSOLUTE_COORDINATE,
  MAX_ENCODED_SHARE_STATE_LENGTH,
  MAX_SHARE_VECTOR_ID_LENGTH,
  MAX_SHARE_VECTOR_NAME_LENGTH,
  MAX_SHARE_VECTORS,
  SHARE_STATE_VERSION,
  InvalidShareStateError,
  decodeShareState,
  encodeShareState,
  validateShareState,
} from './shareState';

export type {
  ShareState,
  ShareStateDecodeResult,
  ShareStateErrorCode,
  ShareStateV1,
  ShareStateV2,
  SharedLinearCombinationState,
  SharedVisualizationState,
} from './shareState';

export {
  SHARE_STATE_QUERY_PARAMETER,
  buildShareUrl,
  createShareTextFileContents,
  createShareTextFileName,
  readShareStateFromUrl,
} from './shareUrl';

export type {
  ShareUrlError,
  ShareUrlErrorCode,
  ShareUrlReadResult,
} from './shareUrl';
