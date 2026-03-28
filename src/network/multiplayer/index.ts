/**
 * Multiplayer module - public API.
 */
export { NetworkManager } from './NetworkManager';
export { MultiplayerSession, SessionState } from './MultiplayerSession';
export { MessageCodec } from './MessageCodec';
export {
  MsgType,
  MsgFlag,
  RoomStatus,
  SlotType,
  PlayerState,
  ChatTarget,
  MAX_PLAYERS,
  MAX_OBSERVERS,
  MAX_SLOTS,
  DEFAULT_LAN_PORT,
  HASH_CHECKPOINT_INTERVAL,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
  RECONNECT_WINDOW_MS,
  TURN_HISTORY_BUFFER,
  DEFAULT_TURN_WINDOW,
} from './protocol';
export type {
  SlotData,
  RoomInfo,
  RoomConfig,
} from './protocol';
