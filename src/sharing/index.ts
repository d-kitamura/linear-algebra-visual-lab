export {
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
  ShareStateDecodeResult,
  ShareStateErrorCode,
  ShareStateV1,
  SharedVisualizationState,
} from './shareState';
