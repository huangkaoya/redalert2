/**
 * Game room - manages a single multiplayer game session.
 * Handles lobby, loading, game, and finished states.
 */

import {
  MsgType,
  RoomStatus,
  RoomInfo,
  RoomConfig,
  PlayerState,
  SlotType,
  RECONNECT_WINDOW_MS,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_TIMEOUT_MS,
} from '../src/network/multiplayer/protocol';
import { MessageCodec } from '../src/network/multiplayer/MessageCodec';
import { ClientConnection } from './ClientConnection';
import { SlotManager } from './SlotManager';
import { LockstepManager } from './LockstepManager';

export class Room {
  readonly roomId: string;
  config: RoomConfig;
  status: RoomStatus = RoomStatus.Waiting;
  hostId: number;
  createdAt: number = Date.now();

  private slotManager: SlotManager;
  private lockstep: LockstepManager;
  private connections: Map<number, ClientConnection> = new Map();
  private disconnectedPlayers: Map<number, { conn: ClientConnection; disconnectedAt: number; reconnectToken: string }> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectCheckTimer: ReturnType<typeof setInterval> | null = null;
  private gameStartTimestamp: number = 0;
  private randomSeed1: number = 0;
  private randomSeed2: number = 0;
  private mapData: string | null = null;
  // Buffer for PLAYER_ACTIONS received before beginGame() sets status=InGame
  private preLockstepActions: Map<number, { tick: number; actions: Uint8Array }> = new Map();

  private onLog: (level: string, msg: string) => void;
  private onEmpty: (roomId: string) => void;

  constructor(
    roomId: string,
    config: RoomConfig,
    host: ClientConnection,
    onLog: (level: string, msg: string) => void,
    onEmpty: (roomId: string) => void,
  ) {
    this.roomId = roomId;
    this.config = config;
    this.hostId = host.id;
    this.onLog = (level, msg) => onLog(level, `[Room:${roomId}] ${msg}`);
    this.onEmpty = onEmpty;

    this.slotManager = new SlotManager(config.maxPlayers);
    this.lockstep = new LockstepManager(
      (type, payload, exclude) => this.broadcast(type, payload, exclude),
      (playerId, type, payload) => this.sendToPlayer(playerId, type, payload),
      this.onLog,
    );
    this.lockstep.setDesyncHandler((tick, playerId, expected, actual) => {
      this.onLog('error', `Desync: tick=${tick} player=${playerId} expected=${expected} actual=${actual}`);
    });

    // Add host
    this.addPlayer(host);

    // Start heartbeat
    this.heartbeatTimer = setInterval(() => this.heartbeatCheck(), HEARTBEAT_INTERVAL_MS);
  }

  /** Add a player to the room. */
  addPlayer(conn: ClientConnection): { success: boolean; error?: string } {
    if (this.status !== RoomStatus.Waiting) {
      return { success: false, error: 'Game already in progress' };
    }

    const slotIndex = this.slotManager.findOpenSlot();
    if (slotIndex === -1) {
      return { success: false, error: 'Room is full' };
    }

    // Check duplicate name
    for (const [, c] of this.connections) {
      if (c.playerName === conn.playerName) {
        return { success: false, error: 'Player name already taken' };
      }
    }

    this.slotManager.assignPlayer(slotIndex, conn);
    this.connections.set(conn.id, conn);
    conn.roomId = this.roomId;
    conn.playerId = conn.id;

    this.onLog('info', `Player ${conn.playerName} joined (slot ${slotIndex})`);

    // Send room state to new player
    conn.sendJSON(MsgType.ROOM_STATE, this.getRoomState());

    // Notify others
    this.broadcast(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({
      slots: this.slotManager.getSnapshot(),
    }), conn.id);

    return { success: true };
  }

  /** Remove a player from the room. */
  removePlayer(connId: number): void {
    const conn = this.connections.get(connId);
    if (!conn) return;

    if (this.status === RoomStatus.InGame) {
      // During game, handle as disconnect
      this.handlePlayerDisconnect(connId);
      return;
    }

    this.connections.delete(connId);
    this.slotManager.removePlayer(connId);
    conn.roomId = null;

    this.onLog('info', `Player ${conn.playerName} left`);

    // If host left in lobby, transfer host
    if (connId === this.hostId) {
      const remaining = [...this.connections.values()];
      if (remaining.length > 0) {
        this.hostId = remaining[0].id;
        this.onLog('info', `Host transferred to ${remaining[0].playerName}`);
      }
    }

    // Notify remaining players
    this.broadcast(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({
      slots: this.slotManager.getSnapshot(),
      hostId: this.hostId,
    }));

    if (this.connections.size === 0) {
      this.dispose();
      this.onEmpty(this.roomId);
    }
  }

  /** Handle player disconnect during game. */
  private handlePlayerDisconnect(connId: number): void {
    const conn = this.connections.get(connId);
    if (!conn) return;

    this.onLog('warn', `Player ${conn.playerName} disconnected during game`);

    // Store for reconnect
    this.disconnectedPlayers.set(connId, {
      conn,
      disconnectedAt: Date.now(),
      reconnectToken: conn.reconnectToken,
    });

    this.connections.delete(connId);
    this.slotManager.updatePlayerState(connId, PlayerState.Disconnected);
    this.lockstep.playerDisconnected(connId);

    // Notify remaining players
    this.broadcast(MsgType.PLAYER_DROPPED, MessageCodec.encodeJSON({
      playerId: connId,
      playerName: conn.playerName,
    }));

    // If no active connections remain, self-destruct
    if (this.connections.size === 0) {
      this.onLog('info', `All players disconnected during game, destroying room`);
      this.dispose();
      this.onEmpty(this.roomId);
      return;
    }

    // Start reconnect check if not already running
    if (!this.reconnectCheckTimer) {
      this.reconnectCheckTimer = setInterval(() => this.checkReconnectTimeouts(), 5000);
    }
  }

  /** Attempt to reconnect a player. */
  tryReconnect(conn: ClientConnection, lastTick: number, token: string): { success: boolean; error?: string } {
    // Find the disconnected player entry
    let reconnectEntry: { conn: ClientConnection; disconnectedAt: number; reconnectToken: string } | undefined;
    let originalConnId: number | undefined;

    for (const [connId, entry] of this.disconnectedPlayers) {
      if (entry.reconnectToken === token && entry.conn.playerName === conn.playerName) {
        reconnectEntry = entry;
        originalConnId = connId;
        break;
      }
    }

    if (!reconnectEntry || originalConnId === undefined) {
      return { success: false, error: 'Invalid reconnect token' };
    }

    // Check if within reconnect window
    if (Date.now() - reconnectEntry.disconnectedAt > RECONNECT_WINDOW_MS) {
      return { success: false, error: 'Reconnect window expired' };
    }

    // Check if history is available
    const oldestTick = this.lockstep.getOldestHistoryTick();
    if (lastTick < oldestTick) {
      return { success: false, error: 'Turn history no longer available' };
    }

    this.onLog('info', `Player ${conn.playerName} reconnecting from tick ${lastTick}`);

    // Transfer identity
    conn.playerId = originalConnId;
    conn.roomId = this.roomId;
    conn.reconnectToken = reconnectEntry.reconnectToken;
    this.connections.set(originalConnId, conn);
    this.disconnectedPlayers.delete(originalConnId);

    // Send missed turns
    const missedTurns = this.lockstep.getTurnHistoryFrom(lastTick);
    conn.sendJSON(MsgType.RECONNECT_DATA, {
      currentTick: this.lockstep.getCurrentTick(),
      missedTurnCount: missedTurns.length,
    });

    // Send each missed turn
    for (const turnData of missedTurns) {
      conn.send(MsgType.TURN_DATA, turnData);
    }

    // Mark reconnected
    this.slotManager.updatePlayerState(originalConnId, PlayerState.InGame);
    this.lockstep.playerReconnected(originalConnId, conn);

    // Notify others
    this.broadcast(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({
      slots: this.slotManager.getSnapshot(),
      reconnected: conn.playerName,
    }), conn.id);

    return { success: true };
  }

  /** Check for expired reconnect windows → AI takeover. */
  private checkReconnectTimeouts(): void {
    const now = Date.now();
    for (const [connId, entry] of this.disconnectedPlayers) {
      if (now - entry.disconnectedAt > RECONNECT_WINDOW_MS) {
        this.onLog('info', `Player ${entry.conn.playerName} reconnect window expired, AI takeover`);
        this.disconnectedPlayers.delete(connId);
        this.slotManager.updatePlayerState(connId, PlayerState.AiTakeover);
        this.lockstep.playerAiTakeover(connId);

        this.broadcast(MsgType.PLAYER_DROPPED, MessageCodec.encodeJSON({
          playerId: connId,
          playerName: entry.conn.playerName,
          aiTakeover: true,
        }));
      }
    }

    // If all real connections gone and no pending reconnects, self-destruct
    if (this.connections.size === 0 && this.disconnectedPlayers.size === 0) {
      this.onLog('info', `No active or pending players remain, destroying room`);
      if (this.reconnectCheckTimer) {
        clearInterval(this.reconnectCheckTimer);
        this.reconnectCheckTimer = null;
      }
      this.dispose();
      this.onEmpty(this.roomId);
      return;
    }

    // Stop timer if no one is disconnected
    if (this.disconnectedPlayers.size === 0 && this.reconnectCheckTimer) {
      clearInterval(this.reconnectCheckTimer);
      this.reconnectCheckTimer = null;
    }
  }

  /** Host updates slot config. */
  updateSlot(hostConnId: number, slotIndex: number, action: string, data?: any): boolean {
    if (hostConnId !== this.hostId || this.status !== RoomStatus.Waiting) return false;

    // Config update applies to the room, not a specific slot
    if (action === 'config') {
      return this.updateConfig(data);
    }

    let result = false;
    switch (action) {
      case 'close':
        result = this.slotManager.closeSlot(slotIndex);
        break;
      case 'open':
        result = this.slotManager.openSlot(slotIndex);
        break;
      case 'ai':
        result = this.slotManager.setAi(slotIndex, data?.difficulty ?? 0);
        break;
      case 'settings':
        result = this.slotManager.updateSlotSettings(slotIndex, data);
        break;
      default:
        return false;
    }

    if (result) {
      this.broadcast(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({
        slots: this.slotManager.getSnapshot(),
      }));
    }
    return result;
  }

  /** Player updates their own slot settings. */
  updatePlayerSettings(connId: number, settings: { countryId?: number; colorId?: number; startPos?: number; teamId?: number }): void {
    const slot = this.slotManager.getSlotByConnId(connId);
    if (!slot || this.status !== RoomStatus.Waiting) return;
    this.slotManager.updateSlotSettings(slot.index, settings);
    this.broadcast(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({
      slots: this.slotManager.getSnapshot(),
    }));
  }

  /** Player toggles their ready state. */
  togglePlayerReady(connId: number): void {
    const slot = this.slotManager.getSlotByConnId(connId);
    if (!slot || this.status !== RoomStatus.Waiting) return;
    const newState = slot.state === PlayerState.Ready ? PlayerState.Connected : PlayerState.Ready;
    this.slotManager.updatePlayerState(connId, newState);
    this.broadcast(MsgType.SLOT_UPDATE, MessageCodec.encodeJSON({
      slots: this.slotManager.getSnapshot(),
    }));
  }

  /** Host updates room config (game settings). */
  updateConfig(partial: Partial<RoomConfig>): boolean {
    if (this.status !== RoomStatus.Waiting) return false;
    const allowed: (keyof RoomConfig)[] = [
      'gameSpeed', 'credits', 'unitCount', 'shortGame', 'superWeapons',
      'buildOffAlly', 'mcvRepacks', 'cratesAppear', 'destroyableBridges',
      'multiEngineer', 'noDogEngiKills',
    ];
    for (const key of allowed) {
      if (partial[key] !== undefined) {
        (this.config as any)[key] = partial[key];
      }
    }
    // Broadcast updated room state so all clients get the new config
    this.broadcast(MsgType.ROOM_STATE, MessageCodec.encodeJSON(this.getRoomState()));
    return true;
  }

  /** Host starts the game. */
  startGame(hostConnId: number): { success: boolean; error?: string } {
    if (hostConnId !== this.hostId) {
      return { success: false, error: 'Only host can start' };
    }
    if (this.status !== RoomStatus.Waiting) {
      return { success: false, error: 'Game already started' };
    }

    const players = this.slotManager.getOccupiedSlots();
    if (players.length < 2) {
      return { success: false, error: 'Need at least 2 players/AI' };
    }

    // Generate seeds
    this.randomSeed1 = Math.floor(Math.random() * 0xFFFFFFFF);
    this.randomSeed2 = Math.floor(Math.random() * 0xFFFFFFFF);
    this.gameStartTimestamp = Date.now();

    this.status = RoomStatus.Loading;

    // Set all players to Loading state
    for (const [connId] of this.connections) {
      this.slotManager.updatePlayerState(connId, PlayerState.Loading);
    }

    // Build game opts from room config & slots
    const gameStartData = {
      roomId: this.roomId,
      config: this.config,
      slots: this.slotManager.getSnapshot(),
      randomSeed1: this.randomSeed1,
      randomSeed2: this.randomSeed2,
      timestamp: this.gameStartTimestamp,
      mapData: this.mapData,
    };

    this.broadcast(MsgType.GAME_START, MessageCodec.encodeJSON(gameStartData));

    this.onLog('info', `Game starting with ${players.length} players`);
    return { success: true };
  }

  /** Receive player actions during game. */
  receiveActions(connId: number, tick: number, actions: Uint8Array): void {
    if (this.status !== RoomStatus.InGame) {
      // Buffer tick-0 actions that may arrive before beginGame() is called
      if (tick === 0) {
        this.onLog('debug', `Buffering pre-lockstep tick-0 actions from player ${connId} (status=${this.status})`);
        this.preLockstepActions.set(connId, { tick, actions });
      } else {
        this.onLog('warn', `Dropping actions from ${connId} tick=${tick} (status=${this.status})`);
      }
      return;
    }
    this.lockstep.receivePlayerActions(connId, tick, actions);
  }

  /** Player reports load progress. */
  reportLoadProgress(connId: number, percent: number): void {
    this.slotManager.updateLoadPercent(connId, percent);
    this.onLog('debug', `Player ${connId} load progress: ${percent}%, status=${this.status}`);

    // Broadcast load state
    this.broadcast(MsgType.LOAD_PROGRESS, MessageCodec.encodeJSON({
      playerId: connId,
      percent,
    }));

    // Check if all loaded
    if (this.status === RoomStatus.Loading && this.slotManager.allPlayersLoaded()) {
      this.onLog('info', 'All players loaded, calling beginGame()');
      this.beginGame();
    }
  }

  /** All players loaded — start lockstep synchronization. */
  private beginGame(): void {
    this.status = RoomStatus.InGame;

    const playerMap = new Map<number, ClientConnection>();
    for (const slot of this.slotManager.getPlayerSlots()) {
      const conn = this.connections.get(slot.playerId!);
      if (conn) {
        playerMap.set(slot.playerId!, conn);
        this.slotManager.updatePlayerState(conn.id, PlayerState.InGame);
      }
    }

    this.onLog('info', `beginGame: playerMap=[${[...playerMap.keys()].join(',')}], preLockstepBuffered=${this.preLockstepActions.size}`);
    this.lockstep.start(playerMap, this.config.gameSpeed);
    // Replay any tick-0 actions that arrived before status became InGame
    for (const [connId, { tick, actions }] of this.preLockstepActions) {
      this.onLog('debug', `Replaying buffered tick-0 actions from player ${connId}`);
      this.lockstep.receivePlayerActions(connId, tick, actions);
    }
    this.preLockstepActions.clear();
    this.onLog('info', 'All players loaded, lockstep started');
  }

  /** Receive hash report during game. */
  receiveHashReport(connId: number, tick: number, hash: number): void {
    if (this.status !== RoomStatus.InGame) return;
    this.lockstep.receiveHashReport(connId, tick, hash);
  }

  /** Handle chat message. */
  handleChat(connId: number, message: string, target: number): void {
    const conn = this.connections.get(connId);
    if (!conn) return;
    this.broadcast(MsgType.CHAT, MessageCodec.encodeJSON({
      playerId: connId,
      playerName: conn.playerName,
      message,
      target,
    }));
  }

  /** Store map data (host sends map to server). */
  setMapData(data: string): void {
    this.mapData = data;
  }

  /** Change game speed (host only). */
  setGameSpeed(hostConnId: number, speed: number): boolean {
    if (hostConnId !== this.hostId) return false;
    this.config.gameSpeed = speed;
    this.lockstep.setGameSpeed(speed);
    this.broadcast(MsgType.GAME_SPEED, MessageCodec.encodeJSON({ speed }));
    return true;
  }

  /** Heartbeat check — detect timeouts. */
  private heartbeatCheck(): void {
    for (const [connId, conn] of this.connections) {
      conn.sendHeartbeat();

      if (conn.isTimedOut(HEARTBEAT_TIMEOUT_MS)) {
        this.onLog('warn', `Player ${conn.playerName} heartbeat timeout`);
        if (this.status === RoomStatus.InGame) {
          this.handlePlayerDisconnect(connId);
          conn.close(4001, 'Heartbeat timeout');
        } else {
          this.removePlayer(connId);
          conn.close(4001, 'Heartbeat timeout');
        }
      } else {
        // Update ping in slot
        this.slotManager.updatePlayerPing(connId, conn.ping);
      }
    }

    // Update turn window based on pings
    if (this.status === RoomStatus.InGame) {
      this.lockstep.updateTurnWindow();
    }
  }

  /** Broadcast a message to all connections in this room. */
  private broadcast(type: MsgType, payload: Uint8Array, excludeConnId?: number): void {
    for (const [connId, conn] of this.connections) {
      if (connId !== excludeConnId) {
        conn.send(type, payload);
      }
    }
  }

  /** Send a message to a specific player. */
  private sendToPlayer(playerId: number, type: MsgType, payload: Uint8Array): void {
    const conn = this.connections.get(playerId);
    if (conn) {
      conn.send(type, payload);
    }
  }

  /** Get room state for a joining player. */
  private getRoomState(): object {
    return {
      roomId: this.roomId,
      config: this.config,
      hostId: this.hostId,
      status: this.status,
      slots: this.slotManager.getSnapshot(),
    };
  }

  /** Get public room info. */
  getRoomInfo(): RoomInfo {
    return {
      roomId: this.roomId,
      name: this.config.name,
      hostName: this.connections.get(this.hostId)?.playerName ?? 'Unknown',
      gameMode: this.config.gameMode,
      mapName: this.config.mapName,
      mapTitle: this.config.mapTitle,
      status: this.status,
      playerCount: this.slotManager.getPlayerCount(),
      maxPlayers: this.config.maxPlayers,
      hasPassword: Boolean(this.config.password),
      gameSpeed: this.config.gameSpeed,
      createdAt: this.createdAt,
    };
  }

  /** Check if a password is correct. */
  checkPassword(password?: string): boolean {
    if (!this.config.password) return true;
    return this.config.password === password;
  }

  /** Get connected player count. */
  getPlayerCount(): number {
    return this.connections.size;
  }

  hasPlayer(connId: number): boolean {
    return this.connections.has(connId);
  }

  /** Cleanup. */
  dispose(): void {
    this.lockstep.stop();
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.reconnectCheckTimer) {
      clearInterval(this.reconnectCheckTimer);
      this.reconnectCheckTimer = null;
    }
    this.connections.clear();
    this.disconnectedPlayers.clear();
  }
}
