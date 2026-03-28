/**
 * Multiplayer protocol definitions shared between client and server.
 * Binary message format: [MsgType: 1B][Flags: 1B][PayloadLen: 2B][Payload: variable]
 */

export enum MsgType {
  // Connection & Room (0x01 - 0x0F)
  JOIN_ROOM       = 0x01,
  ROOM_STATE      = 0x02,
  GAME_START      = 0x03,
  LEAVE_ROOM      = 0x04,
  SLOT_UPDATE     = 0x05,
  KICK_PLAYER     = 0x06,
  ROOM_LIST       = 0x07,
  CREATE_ROOM     = 0x08,
  AUTH_REQUEST     = 0x09,
  AUTH_RESPONSE    = 0x0A,
  LOAD_PROGRESS   = 0x0B,

  // Game Sync (0x10 - 0x1F)
  PLAYER_ACTIONS  = 0x10,
  TURN_DATA       = 0x11,
  HASH_REPORT     = 0x12,
  DESYNC_ALERT    = 0x13,
  GAME_SPEED      = 0x14,

  // Connection Management (0x20 - 0x2F)
  HEARTBEAT       = 0x20,
  PLAYER_LAGGING  = 0x21,
  PLAYER_DROPPED  = 0x22,
  RECONNECT       = 0x23,
  RECONNECT_DATA  = 0x24,
  PLAYER_READY    = 0x25,

  // Chat (0x30)
  CHAT            = 0x30,
}

export enum MsgFlag {
  NONE        = 0x00,
  COMPRESSED  = 0x01,
  RELIABLE    = 0x02,
}

export enum RoomStatus {
  Waiting   = 0,
  Loading   = 1,
  InGame    = 2,
  Finished  = 3,
}

export enum SlotType {
  Closed       = 0,
  Open         = 1,
  OpenObserver = 2,
  Player       = 3,
  Ai           = 4,
}

export enum PlayerState {
  Connected    = 0,
  Loading      = 1,
  Ready        = 2,
  InGame       = 3,
  Lagging      = 4,
  Disconnected = 5,
  AiTakeover   = 6,
}

export enum ChatTarget {
  All  = 0,
  Team = 1,
}

export const MAX_PLAYERS = 8;
export const MAX_OBSERVERS = 2;
export const MAX_SLOTS = MAX_PLAYERS + MAX_OBSERVERS;

export const HEARTBEAT_INTERVAL_MS = 1000;
export const HEARTBEAT_TIMEOUT_MS = 3000;
export const RECONNECT_WINDOW_MS = 60000;
export const TURN_HISTORY_BUFFER = 900; // ~60s at 15 ticks/s
export const HASH_CHECKPOINT_INTERVAL = 300; // ~20s at 15 ticks/s
export const DEFAULT_LAN_PORT = 9527;
export const DEFAULT_TURN_WINDOW = 2; // ticks per turn batch

export interface SlotData {
  index: number;
  type: SlotType;
  playerName?: string;
  playerId?: number;
  countryId: number;
  colorId: number;
  startPos: number;
  teamId: number;
  aiDifficulty?: number;
  state: PlayerState;
  ping: number;
  loadPercent: number;
}

export interface RoomInfo {
  roomId: string;
  name: string;
  hostName: string;
  gameMode?: number;
  mapName: string;
  mapTitle: string;
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  hasPassword: boolean;
  gameSpeed: number;
  createdAt: number;
}

export interface RoomConfig {
  name: string;
  password?: string;
  maxPlayers: number;
  gameMode?: number;
  mapName: string;
  mapTitle: string;
  mapDigest: string;
  mapSizeBytes: number;
  mapOfficial: boolean;
  gameSpeed: number;
  credits: number;
  unitCount: number;
  shortGame: boolean;
  superWeapons: boolean;
  buildOffAlly: boolean;
  mcvRepacks: boolean;
  cratesAppear: boolean;
  destroyableBridges: boolean;
  multiEngineer: boolean;
  noDogEngiKills: boolean;
}
