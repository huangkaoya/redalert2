/**
 * Multiplayer turn manager — client-side lockstep synchronization.
 * Waits for server-broadcasted TURN_DATA before advancing each game tick.
 * Handles sending local actions, hash reporting, and reconnection fast-forward.
 */

import { GameStatus } from '@/game/Game';
import { GameSpeed } from '@/game/GameSpeed';
import { EventDispatcher } from '@/util/event';
import { HASH_CHECKPOINT_INTERVAL } from '@/network/multiplayer/protocol';

export interface MultiplayerActionRecord {
  playerId: number;
  actionType: number;
  data: Uint8Array;
}

export class MultiplayerTurnManager {
  private gameTurnMillis = 1000 / GameSpeed.BASE_TICKS_PER_SECOND;
  private errorState = false;
  private expectedTick = 0;
  private serverTurns: Map<number, Map<number, Uint8Array>> = new Map();
  private catching = false; // true during reconnect fast-forward
  private _lastWaitLog: number = 0;
  private _waitLogCount: number = 0;
  private _waitStartTime: number = 0;
  private _stallDiagnosticDone: boolean = false;
  private _networkChecker: (() => { connected: boolean; wsState: number }) | null = null;

  public readonly onActionsSent = new EventDispatcher<this, void>();
  public readonly onDesync = new EventDispatcher<this, { tick: number; expected: number; actual: number }>();
  public readonly onCatchUpComplete = new EventDispatcher<this, void>();

  /** Called when local actions need to be sent to server. Payload: { tick, actions } */
  public readonly onSendActions = new EventDispatcher<this, { tick: number; actions: Uint8Array }>();
  /** Called when hash needs to be sent to server. Payload: { tick, hash } */
  public readonly onSendHash = new EventDispatcher<this, { tick: number; hash: number }>();

  constructor(
    private readonly game: any,
    public readonly localPlayerId: number,
    private readonly inputActions: { dequeueAll(): any[] },
    private readonly actionFactory: any,
    private readonly actionSerializer: { serializePlayerActions(actions: Array<{ id: number; params: Uint8Array }>): Uint8Array },
    private readonly actionParser: { parsePlayerActions(data: Uint8Array): Array<{ id: number; params: Uint8Array }> },
    private readonly actionLogger?: { debug(message: string): void },
    private readonly replayRecorder?: { recordActions?(tick: number, actions: any[]): void },
  ) {}

  /** Register a network checker for stall diagnostics. */
  setNetworkChecker(checker: () => { connected: boolean; wsState: number }): void {
    this._networkChecker = checker;
  }

  init(): void {
    this.computeGameTurn(this.game.speed?.value ?? 1);
    this.expectedTick = 0;
    console.log('[LAN-TurnMgr] init', {
      localPlayerId: this.localPlayerId,
      gameTurnMillis: this.gameTurnMillis,
      gameStatus: this.game.status,
      gameSpeed: this.game.speed?.value,
    });
  }

  private computeGameTurn(speed: number): void {
    this.gameTurnMillis = 1000 / (speed * GameSpeed.BASE_TICKS_PER_SECOND);
  }

  setRate(rate: number): void {
    const r = Number(rate) > 0 ? Number(rate) : 1;
    this.gameTurnMillis = Math.max(1, Math.floor(1000 / r));
  }

  setErrorState(): void {
    this.errorState = true;
  }

  getErrorState(): boolean {
    return this.errorState;
  }

  getTurnMillis(): number {
    // During catch-up, run as fast as possible
    if (this.catching) return 1;
    return this.gameTurnMillis;
  }

  /**
   * Receive merged turn data from the server.
   * Called by the NetworkManager when TURN_DATA is received.
   */
  receiveServerTurn(tick: number, playerActions: Map<number, Uint8Array>): void {
    this.serverTurns.set(tick, playerActions);
    if (tick < 5 || tick % 100 === 0) {
      const summary: Record<number, number> = {};
      for (const [pid, data] of playerActions) summary[pid] = data.byteLength;
      console.log(`[LAN-TurnMgr] receiveServerTurn tick=${tick}`, summary, `queued=${this.serverTurns.size}`, `expected=${this.expectedTick}`);
    }
  }

  /** Check if we have server data for the expected tick. */
  hasServerTurn(): boolean {
    return this.serverTurns.has(this.expectedTick);
  }

  /**
   * Main game loop callback.
   * Returns true if a turn was executed, false if waiting.
   */
  doGameTurn(_timestamp: number): boolean {
    if (this.errorState) return false;
    if (this.game.status === GameStatus.Ended) return false;

    // Wait for server data
    if (!this.serverTurns.has(this.expectedTick)) {
      // Send our local actions for the current tick while we wait
      this.sendLocalActions();
      const now = Date.now();
      if (this._waitStartTime === 0) this._waitStartTime = now;
      // Throttled wait log: max once per 3 seconds
      if (now - this._lastWaitLog > 3000) {
        console.log(`[LAN-TurnMgr] WAITING for tick=${this.expectedTick}, queued=[${[...this.serverTurns.keys()].join(',')}], localSent=${this.localActionsSentForTick}, waitingFor=${((now - this._waitStartTime) / 1000).toFixed(1)}s`);
        this._lastWaitLog = now;
        this._waitLogCount++;
      }
      // One-time stall diagnostic after 3 seconds of waiting
      if (!this._stallDiagnosticDone && now - this._waitStartTime > 3000) {
        this._stallDiagnosticDone = true;
        const netState = this._networkChecker?.();
        console.warn(
          `%c[LAN-TurnMgr] STALL DIAGNOSTIC — stuck at tick ${this.expectedTick} for ${((now - this._waitStartTime) / 1000).toFixed(1)}s`,
          'color: red; font-weight: bold',
          '\n  WebSocket:', netState ? `connected=${netState.connected}, readyState=${netState.wsState} (0=CONNECTING,1=OPEN,2=CLOSING,3=CLOSED)` : 'no checker registered',
          '\n  localPlayerId:', this.localPlayerId,
          '\n  localActionsSentForTick:', this.localActionsSentForTick,
          '\n  serverTurns queued:', [...this.serverTurns.keys()],
          '\n  gameStatus:', this.game.status,
          '\n  errorState:', this.errorState,
          '\nPossible causes:',
          '\n  1. Server did not receive LOAD_PROGRESS(100%) — check server logs for "load progress" messages',
          '\n  2. Server lockstep not started — check server logs for "beginGame" / "Lockstep started"',
          '\n  3. WebSocket disconnected during loading — check readyState above',
          '\n  4. Server waiting for other player\'s PLAYER_ACTIONS — check server for "requestActionsForTick"',
        );
      }
      return false; // Block until server sends turn data
    }
    // Reset wait tracking when we get data
    this._waitStartTime = 0;
    this._stallDiagnosticDone = false;

    // Get the server turn data
    const turnData = this.serverTurns.get(this.expectedTick)!;
    this.serverTurns.delete(this.expectedTick);

    if (this.expectedTick < 5 || this.expectedTick % 200 === 0) {
      const summary: Record<number, number> = {};
      for (const [pid, data] of turnData) summary[pid] = data.byteLength;
      console.log(`[LAN-TurnMgr] ADVANCING tick=${this.expectedTick}`, summary);
    }

    // Apply all players' actions
    this.applyTurnActions(turnData);

    // Advance game state
    this.game.update();

    // Hash checkpoint
    if (this.expectedTick > 0 && this.expectedTick % HASH_CHECKPOINT_INTERVAL === 0) {
      const hash = this.game.getHash();
      this.onSendHash.dispatch(this, { tick: this.expectedTick, hash });
    }

    this.expectedTick++;

    // During catch-up, check if we've caught up
    if (this.catching && !this.serverTurns.has(this.expectedTick)) {
      this.catching = false;
      this.onCatchUpComplete.dispatch(this);
      this.actionLogger?.debug(`[MP] Catch-up complete at tick ${this.expectedTick}`);
    }

    return true;
  }

  /** Send local player's actions to the server. */
  private localActionsSentForTick = -1;

  private sendLocalActions(): void {
    if (this.localActionsSentForTick >= this.expectedTick) return;
    this.localActionsSentForTick = this.expectedTick;

    const rawActions = this.inputActions.dequeueAll();
    let serializedActions: Uint8Array;

    if (this.expectedTick < 5) {
      console.log(`[LAN-TurnMgr] sendLocalActions tick=${this.expectedTick}, rawActions=${rawActions.length}`);
    }

    if (rawActions.length > 0) {
      // Serialize actions for network transmission
      const actionEntries: Array<{ id: number; params: Uint8Array }> = [];
      for (const action of rawActions) {
        const serialized = action.serialize?.();
        if (serialized) {
          actionEntries.push({ id: action.actionType ?? 0, params: serialized });
        }
      }
      serializedActions = this.actionSerializer.serializePlayerActions(actionEntries);
      this.onActionsSent.dispatch(this);
    } else {
      // NoAction
      serializedActions = new Uint8Array([0]); // 0 = no actions
    }

    this.onSendActions.dispatch(this, { tick: this.expectedTick, actions: serializedActions });
  }

  /** Deserialize and apply all players' actions for a turn. */
  private applyTurnActions(turnData: Map<number, Uint8Array>): void {
    const allActions: any[] = [];

    for (const [playerId, actionData] of turnData) {
      if (actionData.byteLength <= 1 && actionData[0] === 0) {
        // NoAction — skip
        continue;
      }

      try {
        const parsedActions = this.actionParser.parsePlayerActions(actionData);
        const player = this.getPlayerById(playerId);

        for (const { id: actionType, params } of parsedActions) {
          try {
            const action = this.actionFactory.create(actionType);
            action.unserialize(params);
            action.player = player;
            action.process();

            allActions.push(action);

            const printable = action.print?.();
            if (printable) {
              this.actionLogger?.debug(`[MP](${player?.name})@${this.expectedTick}: ${printable}`);
            }
          } catch (error) {
            console.warn(`[MultiplayerTurnManager] Failed to process action type ${actionType} for player ${playerId}:`, error);
          }
        }
      } catch (error) {
        console.warn(`[MultiplayerTurnManager] Failed to parse actions for player ${playerId}:`, error);
      }
    }

    // Record to replay if available
    if (allActions.length > 0) {
      this.replayRecorder?.recordActions?.(this.expectedTick, allActions);
    }
  }

  /** Get a player object by their connection/player ID. */
  private getPlayerById(playerId: number): any {
    // In multiplayer, players are indexed by their slot order
    // The player list maintains players in the order they were added
    const players = this.game.playerList?.getAll?.() ?? [];
    // Try to find by matching the multiplayer player ID
    // The playerId from network corresponds to connection ID, which maps to slot index
    for (const player of players) {
      if (player.multiplayerId === playerId) return player;
    }
    // Fallback: use combatants list indexed by position
    const combatants = this.game.playerList?.getCombatants?.() ?? [];
    return combatants[playerId] ?? players[playerId] ?? null;
  }

  /**
   * Start catch-up mode for reconnection.
   * Queued server turns will be processed as fast as possible.
   */
  startCatchUp(): void {
    this.catching = true;
    this.actionLogger?.debug(`[MP] Starting catch-up from tick ${this.expectedTick}`);
  }

  /** Get the expected (next) tick. */
  getExpectedTick(): number {
    return this.expectedTick;
  }

  /** Set passive mode (unused in multiplayer, kept for interface compat). */
  setPassiveMode(_passive: boolean): void {
    // Not applicable in multiplayer
  }

  dispose(): void {
    this.serverTurns.clear();
  }
}
