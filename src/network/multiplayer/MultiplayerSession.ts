/**
 * High-level multiplayer session controller.
 * Integrates NetworkManager with MultiplayerTurnManager and provides
 * a simple API for the game UI to interact with.
 */

import { NetworkManager } from './NetworkManager';
import { MultiplayerTurnManager } from '@/network/gamestate/MultiplayerTurnManager';
import { EventDispatcher } from '@/util/event';
import {
  RoomConfig,
  RoomInfo,
  SlotData,
  ChatTarget,
} from './protocol';

export enum SessionState {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Authenticated = 'authenticated',
  InLobby = 'in-lobby',
  Loading = 'loading',
  InGame = 'in-game',
  Reconnecting = 'reconnecting',
}

export class MultiplayerSession {
  private network: NetworkManager;
  private turnManager: MultiplayerTurnManager | null = null;
  private state: SessionState = SessionState.Disconnected;
  private localPlayerId: number = -1;
  private gameSlots: SlotData[] | null = null;

  // Events for UI
  public readonly onStateChange = new EventDispatcher<this, SessionState>();
  public readonly onRoomList = new EventDispatcher<this, RoomInfo[]>();
  public readonly onRoomStateUpdate = new EventDispatcher<this, { slots: SlotData[]; hostId?: number; config?: RoomConfig }>();
  public readonly onGameStarting = new EventDispatcher<this, any>();
  public readonly onLoadProgress = new EventDispatcher<this, { playerId: number; percent: number }>();
  public readonly onPlayerLagging = new EventDispatcher<this, { playerId: number; playerName: string }>();
  public readonly onPlayerDropped = new EventDispatcher<this, { playerId: number; playerName: string; aiTakeover?: boolean }>();
  public readonly onDesyncDetected = new EventDispatcher<this, { tick: number; playerId: number }>();
  public readonly onChatMessage = new EventDispatcher<this, { playerName: string; message: string; target: ChatTarget }>();
  public readonly onError = new EventDispatcher<this, string>();
  public readonly onPingUpdate = new EventDispatcher<this, number>();

  constructor() {
    this.network = new NetworkManager();
    this.setupNetworkEvents();
  }

  private setState(state: SessionState): void {
    this.state = state;
    this.onStateChange.dispatch(this, state);
  }

  getState(): SessionState {
    return this.state;
  }

  getNetwork(): NetworkManager {
    return this.network;
  }

  // --- Connection ---

  private buildLanServerUrl(host: string, port: number): string {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${host}:${port}/ws`;
  }

  async connectLAN(host: string, port: number, playerName: string): Promise<void> {
    this.setState(SessionState.Connecting);
    try {
      await this.network.connect(this.buildLanServerUrl(host, port));
      this.network.authenticate(playerName);
    } catch (err: any) {
      this.setState(SessionState.Disconnected);
      this.onError.dispatch(this, `Connection failed: ${err.message}`);
      throw err;
    }
  }

  async connectPublic(serverUrl: string, token: string): Promise<void> {
    this.setState(SessionState.Connecting);
    try {
      await this.network.connect(serverUrl);
      this.network.authenticateWithToken(token);
    } catch (err: any) {
      this.setState(SessionState.Disconnected);
      this.onError.dispatch(this, `Connection failed: ${err.message}`);
      throw err;
    }
  }

  disconnect(): void {
    this.network.disconnect();
    this.turnManager?.dispose();
    this.turnManager = null;
    this.setState(SessionState.Disconnected);
  }

  // --- Room ---

  refreshRoomList(): void {
    this.network.requestRoomList();
  }

  createRoom(config: RoomConfig): void {
    this.network.createRoom(config);
  }

  joinRoom(roomId: string, password?: string): void {
    this.network.joinRoom(roomId, password);
  }

  leaveRoom(): void {
    this.network.leaveRoom();
    this.setState(SessionState.Authenticated);
  }

  updateSlot(slotIndex: number, action: string, data?: any): void {
    this.network.updateSlot(slotIndex, action, data);
  }

  updateMySettings(settings: { countryId?: number; colorId?: number; startPos?: number; teamId?: number }): void {
    this.network.updatePlayerSettings(settings);
  }

  updateRoomConfig(partialConfig: Partial<RoomConfig>): void {
    this.network.updateRoomConfig(partialConfig);
  }

  startGame(): void {
    this.network.startGame();
  }

  sendChat(message: string, target: ChatTarget = ChatTarget.All): void {
    this.network.sendChat(message, target);
  }

  toggleReady(): void {
    this.network.toggleReady();
  }

  // --- Game Integration ---

  /**
   * Create and wire up the MultiplayerTurnManager.
   * Called after the game is created but before it starts.
   */
  createTurnManager(
    game: any,
    inputActions: { dequeueAll(): any[] },
    actionFactory: any,
    actionSerializer: any,
    actionParser: any,
    actionLogger?: any,
    replayRecorder?: any,
  ): MultiplayerTurnManager {
    console.log('[LAN-Session] createTurnManager', {
      localPlayerId: this.localPlayerId,
      networkConnected: this.network.isConnected(),
      gameStatus: game.status,
      gameSlotsCount: this.gameSlots?.length,
    });
    this.turnManager = new MultiplayerTurnManager(
      game,
      this.localPlayerId,
      inputActions,
      actionFactory,
      actionSerializer,
      actionParser,
      actionLogger,
      replayRecorder,
    );

    // Wire turn manager to network
    this.turnManager.onSendActions.subscribe((data) => {
      if (data.tick < 5) console.log(`[LAN-Session] onSendActions tick=${data.tick}, bytes=${data.actions.byteLength}`);
      this.network.sendPlayerActions(data.tick, data.actions);
    });

    this.turnManager.onSendHash.subscribe((data) => {
      this.network.sendHashReport(data.tick, data.hash);
    });

    // Wire network to turn manager
    this.network.events.onTurnData.subscribe((data) => {
      if (data.tick < 5) console.log(`[LAN-Session] onTurnData tick=${data.tick}, players=${[...data.playerActions.keys()].join(',')}`);
      this.turnManager?.receiveServerTurn(data.tick, data.playerActions);
    });

    // Provide network state checker for stall diagnostics
    const net = this.network;
    this.turnManager.setNetworkChecker(() => ({
      connected: net.isConnected(),
      wsState: (net as any).ws?.readyState ?? -1,
    }));

    return this.turnManager;
  }

  getTurnManager(): MultiplayerTurnManager | null {
    return this.turnManager;
  }

  reportLoadProgress(percent: number): void {
    console.log(`[LAN-Session] reportLoadProgress ${percent}%, connected=${this.network.isConnected()}`);
    this.network.reportLoadProgress(percent);
  }

  /** Returns the slot snapshot from the GAME_START event (for player ID mapping). */
  getGameSlots(): SlotData[] | null {
    return this.gameSlots;
  }

  // --- Internal event wiring ---

  private setupNetworkEvents(): void {
    this.network.events.onAuthResult.subscribe((data) => {
      console.log('[LAN-Session] Auth result:', data);
      if (data.success) {
        if ((data as any).playerId != null) {
          this.localPlayerId = (data as any).playerId;
          console.log(`[LAN-Session] localPlayerId set to ${this.localPlayerId}`);
        }
        this.setState(SessionState.Authenticated);
      } else {
        this.onError.dispatch(this, `Auth failed: ${data.error}`);
        this.setState(SessionState.Disconnected);
      }
    });

    this.network.events.onRoomList.subscribe((rooms) => {
      this.onRoomList.dispatch(this, rooms);
    });

    this.network.events.onRoomCreated.subscribe((data) => {
      if (data.success) {
        this.setState(SessionState.InLobby);
      } else {
        this.onError.dispatch(this, `Create room failed: ${data.error}`);
      }
    });

    this.network.events.onRoomJoined.subscribe((data) => {
      if (data.success) {
        this.setState(SessionState.InLobby);
      } else {
        this.onError.dispatch(this, `Join failed: ${data.error}`);
      }
    });

    this.network.events.onRoomState.subscribe((data) => {
      this.onRoomStateUpdate.dispatch(this, { slots: data.slots, hostId: data.hostId, config: data.config });
    });

    this.network.events.onSlotUpdate.subscribe((data) => {
      this.onRoomStateUpdate.dispatch(this, { slots: data.slots, hostId: data.hostId });
    });

    this.network.events.onGameStart.subscribe((data) => {
      const d = data as any;
      console.log('[LAN-Session] GAME_START received:', {
        success: d.success,
        slotsCount: data.slots?.length,
        slots: data.slots?.map((s: any) => ({ idx: s.index, type: s.type, name: s.playerName, pid: s.playerId })),
        seeds: [data.randomSeed1, data.randomSeed2],
        timestamp: data.timestamp,
      });
      if (d.success === false) {
        this.onError.dispatch(this, d.error || 'Failed to start game');
        return;
      }
      this.gameSlots = data.slots ?? null;
      this.setState(SessionState.Loading);
      this.onGameStarting.dispatch(this, data);
    });

    this.network.events.onLoadProgress.subscribe((data) => {
      this.onLoadProgress.dispatch(this, data);
    });

    this.network.events.onPlayerLagging.subscribe((data) => {
      this.onPlayerLagging.dispatch(this, data);
    });

    this.network.events.onPlayerDropped.subscribe((data) => {
      this.onPlayerDropped.dispatch(this, data);
    });

    this.network.events.onDesyncAlert.subscribe((data) => {
      this.onDesyncDetected.dispatch(this, data);
    });

    this.network.events.onChat.subscribe((data) => {
      this.onChatMessage.dispatch(this, data);
    });

    this.network.events.onDisconnected.subscribe((_data) => {
      if (this.state === SessionState.InGame) {
        this.setState(SessionState.Reconnecting);
      } else {
        this.setState(SessionState.Disconnected);
      }
    });

    this.network.events.onReconnectResult.subscribe((data) => {
      if (data.success) {
        this.setState(SessionState.InGame);
        this.turnManager?.startCatchUp();
      } else {
        this.onError.dispatch(this, `Reconnect failed: ${data.error}`);
        this.setState(SessionState.Disconnected);
      }
    });

    this.network.events.onPingUpdate.subscribe((ping) => {
      this.onPingUpdate.dispatch(this, ping);
    });

    this.network.events.onGameSpeed.subscribe((_data) => {
      // Game speed change handled by the game itself via the turn manager
    });
  }

  dispose(): void {
    this.disconnect();
  }
}
