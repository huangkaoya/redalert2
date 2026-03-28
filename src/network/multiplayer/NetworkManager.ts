/**
 * Client-side network manager for multiplayer games.
 * Handles WebSocket connection, message routing, reconnection, and heartbeat.
 */

import { EventDispatcher } from '@/util/event';
import {
  MsgType,
  RoomInfo,
  RoomConfig,
  SlotData,
  ChatTarget,
  HEARTBEAT_INTERVAL_MS,
} from '@/network/multiplayer/protocol';
import { MessageCodec } from '@/network/multiplayer/MessageCodec';

export interface MultiplayerEvents {
  onConnected: EventDispatcher<NetworkManager, void>;
  onDisconnected: EventDispatcher<NetworkManager, { code: number; reason: string }>;
  onAuthResult: EventDispatcher<NetworkManager, { success: boolean; playerName?: string; reconnectToken?: string; error?: string }>;
  onRoomList: EventDispatcher<NetworkManager, RoomInfo[]>;
  onRoomCreated: EventDispatcher<NetworkManager, { success: boolean; roomId?: string; error?: string }>;
  onRoomJoined: EventDispatcher<NetworkManager, { success: boolean; error?: string }>;
  onRoomState: EventDispatcher<NetworkManager, { roomId: string; config: RoomConfig; hostId: number; status: number; slots: SlotData[] }>;
  onSlotUpdate: EventDispatcher<NetworkManager, { slots: SlotData[]; hostId?: number; reconnected?: string }>;
  onGameStart: EventDispatcher<NetworkManager, { roomId: string; config: RoomConfig; slots: SlotData[]; randomSeed1: number; randomSeed2: number; timestamp: number; mapData?: string }>;
  onLoadProgress: EventDispatcher<NetworkManager, { playerId: number; percent: number }>;
  onTurnData: EventDispatcher<NetworkManager, { tick: number; playerActions: Map<number, Uint8Array> }>;
  onDesyncAlert: EventDispatcher<NetworkManager, { tick: number; playerId: number; expected: number; actual: number }>;
  onPlayerLagging: EventDispatcher<NetworkManager, { playerId: number; playerName: string }>;
  onPlayerDropped: EventDispatcher<NetworkManager, { playerId: number; playerName: string; aiTakeover?: boolean }>;
  onReconnectResult: EventDispatcher<NetworkManager, { success: boolean; currentTick?: number; error?: string }>;
  onReconnectData: EventDispatcher<NetworkManager, { currentTick: number; missedTurnCount: number }>;
  onChat: EventDispatcher<NetworkManager, { playerId: number; playerName: string; message: string; target: ChatTarget }>;
  onGameSpeed: EventDispatcher<NetworkManager, { speed: number }>;
  onPingUpdate: EventDispatcher<NetworkManager, number>;
}

export class NetworkManager {
  private ws: WebSocket | null = null;
  private serverUrl: string = '';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectToken: string = '';
  private roomId: string = '';
  private playerName: string = '';
  private lastTick: number = 0;
  private intentionalClose: boolean = false;
  private ping: number = 0;
  private autoReconnect: boolean = true;
  private recvBuffer: Uint8Array = new Uint8Array(0);

  // Events
  public readonly events: MultiplayerEvents = {
    onConnected: new EventDispatcher(),
    onDisconnected: new EventDispatcher(),
    onAuthResult: new EventDispatcher(),
    onRoomList: new EventDispatcher(),
    onRoomCreated: new EventDispatcher(),
    onRoomJoined: new EventDispatcher(),
    onRoomState: new EventDispatcher(),
    onSlotUpdate: new EventDispatcher(),
    onGameStart: new EventDispatcher(),
    onLoadProgress: new EventDispatcher(),
    onTurnData: new EventDispatcher(),
    onDesyncAlert: new EventDispatcher(),
    onPlayerLagging: new EventDispatcher(),
    onPlayerDropped: new EventDispatcher(),
    onReconnectResult: new EventDispatcher(),
    onReconnectData: new EventDispatcher(),
    onChat: new EventDispatcher(),
    onGameSpeed: new EventDispatcher(),
    onPingUpdate: new EventDispatcher(),
  };

  /** Connect to a multiplayer server. */
  connect(url: string): Promise<void> {
    this.serverUrl = url;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          this.startHeartbeat();
          this.events.onConnected.dispatch(this);
          resolve();
        };

        this.ws.onclose = (event) => {
          this.stopHeartbeat();
          this.events.onDisconnected.dispatch(this, {
            code: event.code,
            reason: event.reason,
          });

          if (!this.intentionalClose && this.autoReconnect && this.reconnectToken) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = () => {
          reject(new Error(`Failed to connect to ${url}`));
        };

        this.ws.onmessage = (event) => {
          this.handleRawMessage(event.data);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /** Disconnect from the server. */
  disconnect(): void {
    this.intentionalClose = true;
    this.autoReconnect = false;
    this.stopHeartbeat();
    this.stopReconnect();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  /** Check if connected. */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /** Get current ping. */
  getPing(): number {
    return this.ping;
  }

  // --- Auth ---

  /** Authenticate with player name (LAN mode). */
  authenticate(playerName: string): void {
    this.playerName = playerName;
    this.send(MsgType.AUTH_REQUEST, MessageCodec.encodeJSON({ playerName }));
  }

  /** Authenticate with token (public mode). */
  authenticateWithToken(token: string): void {
    this.send(MsgType.AUTH_REQUEST, MessageCodec.encodeJSON({ token }));
  }

  // --- Room Management ---

  /** Request room list. */
  requestRoomList(): void {
    this.send(MsgType.ROOM_LIST);
  }

  /** Create a room. */
  createRoom(config: RoomConfig): void {
    this.send(MsgType.CREATE_ROOM, MessageCodec.encodeJSON(config));
  }

  /** Join a room. */
  joinRoom(roomId: string, password?: string): void {
    this.send(MsgType.JOIN_ROOM, MessageCodec.encodeJSON({ roomId, password }));
  }

  /** Leave current room. */
  leaveRoom(): void {
    this.send(MsgType.LEAVE_ROOM);
    this.roomId = '';
  }

  /** Update a slot (host only). */
  updateSlot(slotIndex: number, action: string, data?: any): void {
    this.send(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({ slotIndex, action, data }));
  }

  /** Update own player settings. */
  updatePlayerSettings(settings: { countryId?: number; colorId?: number; startPos?: number; teamId?: number }): void {
    this.send(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({ slotIndex: -1, action: 'settings', data: settings }));
  }

  /** Update room config (host only). */
  updateRoomConfig(partialConfig: Partial<RoomConfig>): void {
    this.send(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({ slotIndex: -1, action: 'config', data: partialConfig }));
  }

  /** Toggle ready state for non-host player. */
  toggleReady(): void {
    this.send(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({ slotIndex: -1, action: 'ready' }));
  }

  /** Start game (host only). */
  startGame(): void {
    this.send(MsgType.GAME_START);
  }

  /** Report load progress. */
  reportLoadProgress(percent: number): void {
    this.send(MsgType.LOAD_PROGRESS, MessageCodec.encodeJSON({ percent }));
  }

  // --- Game ---

  /** Send player actions for a tick. */
  sendPlayerActions(tick: number, actions: Uint8Array): void {
    if (tick < 3) {
      console.log(`[LAN-Net] SEND PLAYER_ACTIONS tick=${tick}, bytes=${actions.byteLength}, wsState=${this.ws?.readyState}`);
    }
    this.lastTick = tick;
    this.send(MsgType.PLAYER_ACTIONS, MessageCodec.encodePlayerActions(tick, actions));
  }

  /** Send hash report. */
  sendHashReport(tick: number, hash: number): void {
    this.send(MsgType.HASH_REPORT, MessageCodec.encodeHashReport(tick, hash));
  }

  /** Send chat message. */
  sendChat(message: string, target: ChatTarget = ChatTarget.All): void {
    this.send(MsgType.CHAT, MessageCodec.encodeJSON({ message, target }));
  }

  /** Change game speed (host only). */
  changeGameSpeed(speed: number): void {
    this.send(MsgType.GAME_SPEED, MessageCodec.encodeJSON({ speed }));
  }

  /** Set auto-reconnect behavior. */
  setAutoReconnect(enabled: boolean): void {
    this.autoReconnect = enabled;
  }

  // --- Internal ---

  private send(type: MsgType, payload?: Uint8Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const frame = MessageCodec.encode(type, payload);
    this.ws.send(frame);
  }

  private handleRawMessage(rawData: ArrayBuffer | string): void {
    let data: Uint8Array;
    if (rawData instanceof ArrayBuffer) {
      data = new Uint8Array(rawData);
    } else if (typeof rawData === 'string') {
      data = new TextEncoder().encode(rawData);
    } else {
      return;
    }

    // Append to buffer and decode
    if (this.recvBuffer.byteLength > 0) {
      const combined = new Uint8Array(this.recvBuffer.byteLength + data.byteLength);
      combined.set(this.recvBuffer);
      combined.set(data, this.recvBuffer.byteLength);
      data = combined;
    }

    const { messages, remaining } = MessageCodec.decodeAll(data);
    this.recvBuffer = remaining;

    for (const msg of messages) {
      this.handleMessage(msg.type, msg.payload);
    }
  }

  private handleMessage(type: MsgType, payload: Uint8Array): void {
    switch (type) {
      case MsgType.HEARTBEAT: {
        const timestamp = MessageCodec.decodeHeartbeat(payload);
        this.ping = Math.max(0, Date.now() - timestamp);
        this.events.onPingUpdate.dispatch(this, this.ping);
        break;
      }

      case MsgType.AUTH_RESPONSE: {
        const data = MessageCodec.decodeJSON<any>(payload);
        if (data.success) {
          this.playerName = data.playerName;
          this.reconnectToken = data.reconnectToken;
        }
        this.events.onAuthResult.dispatch(this, data);
        break;
      }

      case MsgType.ROOM_LIST: {
        const data = MessageCodec.decodeJSON<{ rooms: RoomInfo[] }>(payload);
        this.events.onRoomList.dispatch(this, data.rooms);
        break;
      }

      case MsgType.CREATE_ROOM: {
        const data = MessageCodec.decodeJSON<any>(payload);
        if (data.success) this.roomId = data.roomId;
        this.events.onRoomCreated.dispatch(this, data);
        break;
      }

      case MsgType.JOIN_ROOM: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onRoomJoined.dispatch(this, data);
        break;
      }

      case MsgType.ROOM_STATE: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.roomId = data.roomId;
        this.events.onRoomState.dispatch(this, data);
        break;
      }

      case MsgType.SLOT_UPDATE: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onSlotUpdate.dispatch(this, data);
        break;
      }

      case MsgType.GAME_START: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onGameStart.dispatch(this, data);
        break;
      }

      case MsgType.LOAD_PROGRESS: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onLoadProgress.dispatch(this, data);
        break;
      }

      case MsgType.TURN_DATA: {
        const { tick, playerActions } = MessageCodec.decodeTurnData(payload);
        if (tick < 3) {
          console.log(`[LAN-Net] TURN_DATA received tick=${tick}, payloadBytes=${payload.byteLength}, players=[${[...playerActions.keys()].join(',')}]`);
        }
        this.lastTick = tick;
        this.events.onTurnData.dispatch(this, { tick, playerActions });
        break;
      }

      case MsgType.DESYNC_ALERT: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onDesyncAlert.dispatch(this, data);
        break;
      }

      case MsgType.PLAYER_LAGGING: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onPlayerLagging.dispatch(this, data);
        break;
      }

      case MsgType.PLAYER_DROPPED: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onPlayerDropped.dispatch(this, data);
        break;
      }

      case MsgType.RECONNECT: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onReconnectResult.dispatch(this, data);
        break;
      }

      case MsgType.RECONNECT_DATA: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onReconnectData.dispatch(this, data);
        break;
      }

      case MsgType.CHAT: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onChat.dispatch(this, data);
        break;
      }

      case MsgType.GAME_SPEED: {
        const data = MessageCodec.decodeJSON<any>(payload);
        this.events.onGameSpeed.dispatch(this, data);
        break;
      }
    }
  }

  // --- Heartbeat ---

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send(MsgType.HEARTBEAT, MessageCodec.encodeHeartbeat(Date.now()));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // --- Reconnection ---

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[NetworkManager] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts - 1), 10000);

    console.log(`[NetworkManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect(this.serverUrl);

        // Re-authenticate
        this.authenticate(this.playerName);

        // Wait for auth, then send reconnect
        const authHandler = (data: any) => {
          this.events.onAuthResult.unsubscribe(authHandler);
          if (data.success && this.reconnectToken && this.roomId) {
            const token = `${this.reconnectToken}:${this.roomId}`;
            this.send(MsgType.RECONNECT, MessageCodec.encodeReconnect(this.lastTick, token));
          }
        };
        this.events.onAuthResult.subscribe(authHandler);
      } catch {
        this.attemptReconnect();
      }
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  /** Get current room ID. */
  getRoomId(): string {
    return this.roomId;
  }

  /** Get player name. */
  getPlayerName(): string {
    return this.playerName;
  }

  /** Get reconnect token. */
  getReconnectToken(): string {
    return this.reconnectToken;
  }
}
