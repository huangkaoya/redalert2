/**
 * Lockstep synchronization manager.
 * Collects player actions per tick, merges, and broadcasts.
 * Handles dynamic turn window, hash verification, and reconnect data caching.
 */

import {
  MsgType,
  PlayerState,
  TURN_HISTORY_BUFFER,
  HASH_CHECKPOINT_INTERVAL,
  DEFAULT_TURN_WINDOW,
} from '../src/network/multiplayer/protocol';
import { MessageCodec } from '../src/network/multiplayer/MessageCodec';
import { ClientConnection } from './ClientConnection';

interface TurnRecord {
  tick: number;
  data: Uint8Array; // encoded turn data for broadcast
  playerActions: Map<number, Uint8Array>;
}

interface HashRecord {
  tick: number;
  hashes: Map<number, number>; // playerId -> hash
}

export class LockstepManager {
  private currentTick: number = 0;
  private turnWindow: number = DEFAULT_TURN_WINDOW;
  private pendingActions: Map<number, Uint8Array> = new Map(); // playerId -> actions for current tick
  private pendingPlayers: Set<number> = new Set(); // players we're waiting for
  private activePlayers: Map<number, ClientConnection> = new Map();
  private turnHistory: TurnRecord[] = [];
  private hashRecords: Map<number, HashRecord> = new Map();
  private started: boolean = false;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private turnTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private maxWaitMs: number = 500; // max wait for a turn before advancing with NoAction
  private lagThresholdMs: number = 300;
  private disconnectedPlayers: Set<number> = new Set();
  private aiTakeoverPlayers: Set<number> = new Set();
  private pendingDropActions: Set<number> = new Set();
  private gameSpeed: number = 4; // default game speed

  private onDesync?: (tick: number, playerId: number, expected: number, actual: number) => void;

  constructor(
    private broadcast: (type: MsgType, payload: Uint8Array, exclude?: number) => void,
    private sendTo: (playerId: number, type: MsgType, payload: Uint8Array) => void,
    private onLog: (level: string, msg: string) => void,
  ) {}

  /** Start the lockstep loop after all players are loaded. */
  start(players: Map<number, ClientConnection>, gameSpeed: number = 4): void {
    this.activePlayers = new Map(players);
    this.gameSpeed = gameSpeed;
    this.started = true;
    this.currentTick = 0;
    this.pendingActions.clear();
    this.pendingPlayers.clear();
    this.turnHistory = [];
    this.disconnectedPlayers.clear();
    this.aiTakeoverPlayers.clear();
    this.pendingDropActions.clear();

    this.updateTurnWindow();

    // Don't use a timer-driven approach. Instead, the lockstep advances
    // when all players have submitted their actions (event-driven).
    // Set a timeout to handle slow players.
    this.requestActionsForTick(this.currentTick);

    this.onLog('info', `Lockstep started with ${players.size} players, speed=${gameSpeed}`);
  }

  /** Stop the lockstep loop. */
  stop(): void {
    this.started = false;
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.turnTimeoutTimer) {
      clearTimeout(this.turnTimeoutTimer);
      this.turnTimeoutTimer = null;
    }
    this.onLog('info', 'Lockstep stopped');
  }

  isStarted(): boolean {
    return this.started;
  }

  getCurrentTick(): number {
    return this.currentTick;
  }

  /** Request actions from all active players for the given tick. */
  private requestActionsForTick(tick: number): void {
    this.pendingActions.clear();
    this.pendingPlayers.clear();

    for (const [playerId] of this.activePlayers) {
      if (!this.disconnectedPlayers.has(playerId) && !this.aiTakeoverPlayers.has(playerId)) {
        this.pendingPlayers.add(playerId);
      }
    }

    if (tick < 5) {
      this.onLog('debug', `requestActionsForTick(${tick}), waiting for players: [${[...this.pendingPlayers].join(',')}]`);
    }

    // Set timeout for slow players
    if (this.turnTimeoutTimer) clearTimeout(this.turnTimeoutTimer);
    this.turnTimeoutTimer = setTimeout(() => this.onTurnTimeout(), this.maxWaitMs);
  }

  /** Receive actions from a player for the current tick. */
  receivePlayerActions(playerId: number, tick: number, actions: Uint8Array): void {
    if (!this.started) {
      this.onLog('warn', `receivePlayerActions from ${playerId} but lockstep not started`);
      return;
    }

    if (tick !== this.currentTick) {
      this.onLog('warn', `Player ${playerId} sent actions for tick ${tick}, expected ${this.currentTick}`);
      return;
    }

    if (tick < 5) {
      this.onLog('debug', `receivePlayerActions(player=${playerId}, tick=${tick}, bytes=${actions.byteLength}), stillWaiting=[${[...this.pendingPlayers].filter(p => p !== playerId).join(',')}]`);
    }

    this.pendingActions.set(playerId, actions);
    this.pendingPlayers.delete(playerId);

    // Check if all players have submitted
    if (this.pendingPlayers.size === 0) {
      this.advanceTurn();
    }
  }

  /** Handle turn timeout — advance with NoAction for missing players. */
  private onTurnTimeout(): void {
    if (!this.started) return;

    // Mark lagging players
    for (const playerId of this.pendingPlayers) {
      const conn = this.activePlayers.get(playerId);
      if (conn) {
        conn.state = PlayerState.Lagging;
        this.broadcast(
          MsgType.PLAYER_LAGGING,
          MessageCodec.encodeJSON({ playerId, playerName: conn.playerName }),
        );
        this.onLog('warn', `Player ${playerId} (${conn.playerName}) is lagging at tick ${this.currentTick}`);
      }
    }

    // Fill missing with empty actions and advance
    for (const playerId of this.pendingPlayers) {
      if (!this.pendingActions.has(playerId)) {
        this.pendingActions.set(playerId, new Uint8Array([0])); // NoAction: 0 actions
      }
    }
    this.pendingPlayers.clear();
    this.advanceTurn();
  }

  /** Merge all player actions and broadcast the turn. */
  private advanceTurn(): void {
    if (this.turnTimeoutTimer) {
      clearTimeout(this.turnTimeoutTimer);
      this.turnTimeoutTimer = null;
    }

    // Inject DropPlayerAction for newly disconnected players, NoAction for subsequent ticks
    // DropPlayerAction serialized: [count=1][actionType=1 as uint16LE][paramLen=0 as uint16LE]
    const DROP_PLAYER_ACTION = new Uint8Array([1, 1, 0, 0, 0]);
    for (const playerId of this.disconnectedPlayers) {
      if (!this.pendingActions.has(playerId)) {
        if (this.pendingDropActions.has(playerId)) {
          this.pendingActions.set(playerId, DROP_PLAYER_ACTION);
          this.pendingDropActions.delete(playerId);
          this.onLog('info', `Injecting DropPlayerAction for disconnected player ${playerId} at tick ${this.currentTick}`);
        } else {
          this.pendingActions.set(playerId, new Uint8Array([0]));
        }
      }
    }
    for (const playerId of this.aiTakeoverPlayers) {
      if (!this.pendingActions.has(playerId)) {
        if (this.pendingDropActions.has(playerId)) {
          this.pendingActions.set(playerId, DROP_PLAYER_ACTION);
          this.pendingDropActions.delete(playerId);
          this.onLog('info', `Injecting DropPlayerAction for AI-takeover player ${playerId} at tick ${this.currentTick}`);
        } else {
          this.pendingActions.set(playerId, new Uint8Array([0]));
        }
      }
    }

    const turnData = MessageCodec.encodeTurnData(this.currentTick, this.pendingActions);

    // Store in history for reconnect
    const record: TurnRecord = {
      tick: this.currentTick,
      data: turnData,
      playerActions: new Map(this.pendingActions),
    };
    this.turnHistory.push(record);

    // Trim history beyond buffer
    while (this.turnHistory.length > TURN_HISTORY_BUFFER) {
      this.turnHistory.shift();
    }

    // Broadcast to all players
    this.broadcast(MsgType.TURN_DATA, turnData);

    if (this.currentTick < 5 || this.currentTick % 200 === 0) {
      const actionSummary: Record<number, number> = {};
      for (const [pid, data] of this.pendingActions) actionSummary[pid] = data.byteLength;
      this.onLog('debug', `advanceTurn tick=${this.currentTick}, actions=${JSON.stringify(actionSummary)}, turnDataBytes=${turnData.byteLength}`);
    }

    this.currentTick++;

    // Request next turn immediately (event-driven lockstep).
    // Clients will have just received TURN_DATA and will submit their next
    // tick actions shortly; requesting immediately avoids a timing window
    // where early-arriving actions get cleared before they're recorded.
    if (this.started) {
      this.requestActionsForTick(this.currentTick);
    }
  }

  private computeTickMs(): number {
    // Match client's GameSpeed calculation
    // Speed 4 is default = 15 ticks/sec ≈ 66.7ms per tick
    const baseTicksPerSecond = 15;
    let ticksPerSecond: number;
    if (this.gameSpeed === 6) ticksPerSecond = 60;
    else if (this.gameSpeed === 5) ticksPerSecond = 45;
    else ticksPerSecond = 60 / (6 - this.gameSpeed);
    const speedMultiplier = ticksPerSecond / baseTicksPerSecond;
    return 1000 / (speedMultiplier * baseTicksPerSecond);
  }

  /** Receive a hash report from a player. */
  receiveHashReport(playerId: number, tick: number, hash: number): void {
    let record = this.hashRecords.get(tick);
    if (!record) {
      record = { tick, hashes: new Map() };
      this.hashRecords.set(tick, record);
    }
    record.hashes.set(playerId, hash);

    // Check for desync when we have at least 2 reports
    if (record.hashes.size >= 2) {
      const hashValues = [...record.hashes.values()];
      const referenceHash = hashValues[0];
      for (const [pid, h] of record.hashes) {
        if (h !== referenceHash) {
          this.onLog('error', `DESYNC detected at tick ${tick}: player ${pid} hash=${h}, expected=${referenceHash}`);
          this.broadcast(MsgType.DESYNC_ALERT, MessageCodec.encodeJSON({
            tick,
            playerId: pid,
            expected: referenceHash,
            actual: h,
          }));
          this.onDesync?.(tick, pid, referenceHash, h);
          break;
        }
      }
    }

    // Cleanup old records
    for (const [t] of this.hashRecords) {
      if (t < tick - HASH_CHECKPOINT_INTERVAL * 3) {
        this.hashRecords.delete(t);
      }
    }
  }

  /** Mark a player as disconnected. */
  playerDisconnected(playerId: number): void {
    this.disconnectedPlayers.add(playerId);
    this.pendingDropActions.add(playerId);
    this.pendingPlayers.delete(playerId);

    // If this was the last pending player, advance
    if (this.started && this.pendingPlayers.size === 0 && this.pendingActions.size > 0) {
      this.advanceTurn();
    }
  }

  /** Mark a player as reconnected. */
  playerReconnected(playerId: number, conn: ClientConnection): void {
    this.disconnectedPlayers.delete(playerId);
    this.aiTakeoverPlayers.delete(playerId);
    this.pendingDropActions.delete(playerId);
    this.activePlayers.set(playerId, conn);
    conn.state = PlayerState.InGame;
  }

  /** Mark a player for AI takeover (disconnect timeout exceeded). */
  playerAiTakeover(playerId: number): void {
    this.aiTakeoverPlayers.add(playerId);
    this.disconnectedPlayers.delete(playerId);
    this.onLog('info', `Player ${playerId} taken over by AI`);
  }

  /** Get turn history from a specific tick for reconnection. */
  getTurnHistoryFrom(fromTick: number): Uint8Array[] {
    const result: Uint8Array[] = [];
    for (const record of this.turnHistory) {
      if (record.tick >= fromTick) {
        result.push(record.data);
      }
    }
    return result;
  }

  /** Get the oldest tick available in history. */
  getOldestHistoryTick(): number {
    return this.turnHistory.length > 0 ? this.turnHistory[0].tick : this.currentTick;
  }

  /** Dynamically adjust turn window based on player pings. */
  updateTurnWindow(): void {
    let maxPing = 0;
    for (const [, conn] of this.activePlayers) {
      if (!this.disconnectedPlayers.has(conn.id) && conn.ping > maxPing) {
        maxPing = conn.ping;
      }
    }

    if (maxPing < 100) {
      this.turnWindow = 1;
      this.maxWaitMs = 200;
    } else if (maxPing < 200) {
      this.turnWindow = 2;
      this.maxWaitMs = 300;
    } else if (maxPing < 300) {
      this.turnWindow = 3;
      this.maxWaitMs = 400;
    } else {
      this.turnWindow = 5;
      this.maxWaitMs = 600;
    }
  }

  setDesyncHandler(handler: (tick: number, playerId: number, expected: number, actual: number) => void): void {
    this.onDesync = handler;
  }

  setGameSpeed(speed: number): void {
    this.gameSpeed = speed;
  }
}
