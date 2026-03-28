import { Screen } from '../../Controller';
import { MainMenuController } from '../MainMenuController';
import { Strings } from '../../../../data/Strings';
import { jsx } from '@/gui/jsx/jsx';
import { HtmlView } from '@/gui/jsx/HtmlView';
import { RoomLobby, RoomLobbyProps } from './component/RoomLobby';
import { MultiplayerSession, SessionState } from '@/network/multiplayer/MultiplayerSession';
import { RoomConfig, SlotData, SlotType, ChatTarget } from '@/network/multiplayer/protocol';
import { GameOpts, HumanPlayerInfo, AiPlayerInfo, AiDifficulty } from '@/game/gameopts/GameOpts';
import { RANDOM_COLOR_ID, RANDOM_COUNTRY_ID, RANDOM_START_POS, NO_TEAM_ID } from '@/game/gameopts/constants';
import { MainMenuRoute } from '../MainMenuRoute';
import { MainMenuScreenType } from '../../ScreenType';

interface RootController {
  createGame(gameId: string, timestamp: number, gservUrl: string, username: string,
    gameOpts: GameOpts, singlePlayer: boolean, tournament: boolean,
    mapTransfer: boolean, privateGame: boolean, fallbackRoute: any,
    lanSession?: MultiplayerSession): void;
}

interface SidebarButton {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  isBottom?: boolean;
  onClick: () => void | Promise<void>;
}

export interface RoomLobbyParams {
  session: MultiplayerSession;
  isHost: boolean;
  config: RoomConfig;
  playerName: string;
  initialSlots?: SlotData[];
  initialHostId?: number;
}

export class RoomLobbyScreen implements Screen {
  private strings: Strings;
  private jsxRenderer: any;
  private controller?: MainMenuController;

  private session: MultiplayerSession | null = null;
  private isHost: boolean = false;
  private config: RoomConfig | null = null;
  private playerName: string = '';
  private hostId: number = -1;
  private slots: SlotData[] = [];
  private chatMessages: { playerName: string; message: string }[] = [];
  private lobbyRef: any = null;
  private gameStarting: boolean = false;
  private eventSubscriptions: (() => void)[] = [];

  public title: string;

  // Default country/color lists (fallback when rules aren't available)
  private countries = [
    { id: 0, name: '美国' },
    { id: 1, name: '英国' },
    { id: 2, name: '法国' },
    { id: 3, name: '德国' },
    { id: 4, name: '韩国' },
    { id: 5, name: '苏俄' },
    { id: 6, name: '古巴' },
    { id: 7, name: '伊拉克' },
    { id: 8, name: '利比亚' },
    { id: 9, name: '尤里' },
  ];

  private colors = [
    { id: 0, hex: '#FFD700' },
    { id: 1, hex: '#FF0000' },
    { id: 2, hex: '#0000FF' },
    { id: 3, hex: '#00FF00' },
    { id: 4, hex: '#FF8C00' },
    { id: 5, hex: '#00FFFF' },
    { id: 6, hex: '#FF00FF' },
    { id: 7, hex: '#808080' },
  ];

  constructor(strings: Strings, _messageBoxApi: unknown, jsxRenderer: any, private rootController?: RootController) {
    this.strings = strings;
    this.jsxRenderer = jsxRenderer;
    this.title = '房间大厅';
  }

  setController(controller: MainMenuController): void {
    this.controller = controller;
  }

  onEnter(params?: RoomLobbyParams): void {
    console.log('[RoomLobbyScreen] Entering room lobby', params);

    if (params) {
      this.session = params.session;
      this.isHost = params.isHost;
      this.config = params.config;
      this.playerName = params.playerName;
      this.hostId = params.initialHostId ?? -1;
      this.chatMessages = [];
      this.slots = params.initialSlots ?? [];
      this.gameStarting = false;
    }

    if (!this.session || !this.config) {
      console.error('[RoomLobbyScreen] Missing session or config');
      this.controller?.leaveCurrentScreen();
      return;
    }

    this.controller?.toggleMainVideo(false);
    this.unsubscribeEvents();
    this.subscribeSessionEvents();
    this.initUI();
    this.refreshSidebarButtons();
    this.controller?.showSidebarButtons();
  }

  private unsubscribeEvents(): void {
    for (const unsub of this.eventSubscriptions) {
      unsub();
    }
    this.eventSubscriptions = [];
  }

  private subscribeSessionEvents(): void {
    if (!this.session) return;

    const onRoomState = (data: { slots: SlotData[]; hostId?: number; config?: RoomConfig }) => {
      console.log('[RoomLobbyScreen] Room state update, slots:', data.slots.length,
        'localPlayerId:', this.getLocalPlayerId(), 'hostId:', data.hostId ?? this.hostId);
      this.slots = data.slots;
      if (data.hostId !== undefined) {
        this.hostId = data.hostId;
        this.isHost = this.getLocalPlayerId() === data.hostId;
      }
      if (data.config) {
        this.config = data.config;
      }
      this.refreshUI();
    };
    this.session.onRoomStateUpdate.subscribe(onRoomState);
    this.eventSubscriptions.push(() => this.session?.onRoomStateUpdate.unsubscribe(onRoomState));

    const onChat = (data: { playerName: string; message: string }) => {
      this.chatMessages.push({ playerName: data.playerName, message: data.message });
      if (this.chatMessages.length > 100) {
        this.chatMessages = this.chatMessages.slice(-80);
      }
      this.refreshUI();
    };
    this.session.onChatMessage.subscribe(onChat);
    this.eventSubscriptions.push(() => this.session?.onChatMessage.unsubscribe(onChat));

    const onState = (state: SessionState) => {
      if (state === SessionState.Disconnected || state === SessionState.Authenticated) {
        this.controller?.leaveCurrentScreen();
      } else if (state === SessionState.Loading) {
        this.gameStarting = true;
        this.chatMessages.push({ playerName: '[系统]', message: '游戏正在加载...' });
        this.refreshUI();
      }
    };
    this.session.onStateChange.subscribe(onState);
    this.eventSubscriptions.push(() => this.session?.onStateChange.unsubscribe(onState));

    const onError = (error: string) => {
      console.error('[RoomLobbyScreen] Error:', error);
      this.gameStarting = false;
      this.chatMessages.push({ playerName: '[系统]', message: error });
      this.refreshUI();
    };
    this.session.onError.subscribe(onError);
    this.eventSubscriptions.push(() => this.session?.onError.unsubscribe(onError));

    const onGameStarting = (data: any) => {
      console.log('[RoomLobbyScreen] Game starting, data:', data);
      this.startGameTransition(data);
    };
    this.session.onGameStarting.subscribe(onGameStarting);
    this.eventSubscriptions.push(() => this.session?.onGameStarting.unsubscribe(onGameStarting));
  }

  private initUI(): void {
    const props = this.buildProps();
    const [component] = this.jsxRenderer.render(jsx(HtmlView, {
      innerRef: (ref: any) => (this.lobbyRef = ref),
      component: RoomLobby,
      props,
      width: "100%",
      height: "100%",
    }));
    this.controller?.setMainComponent(component);
  }

  private getLocalPlayerId(): number {
    const mySlot = this.slots.find(s => s.playerName === this.playerName);
    return mySlot?.playerId ?? -1;
  }

  private buildProps(): RoomLobbyProps {
    const localPlayerId = this.getLocalPlayerId();
    console.log('[RoomLobbyScreen] buildProps: localPlayerId=', localPlayerId,
      'hostId=', this.hostId, 'isHost=', localPlayerId === this.hostId,
      'playerName=', this.playerName, 'slotsCount=', this.slots.length);
    return {
      slots: this.slots,
      config: this.config!,
      localPlayerId,
      hostId: this.hostId,
      chatMessages: this.chatMessages,
      gameStarting: this.gameStarting,
      countries: this.countries,
      colors: this.colors,
      maxStartPos: this.config?.maxPlayers ?? 8,
      maxTeams: 4,
      onUpdateMySettings: (settings) => this.handleUpdateMySettings(settings),
      onSlotAction: (slotIndex, action, data) => this.handleSlotAction(slotIndex, action, data),
      onUpdateConfig: (cfg) => this.handleUpdateConfig(cfg),
      onStartGame: () => this.handleStartGame(),
      onLeaveRoom: () => this.handleLeaveRoom(),
      onSendChat: (msg) => this.handleSendChat(msg),
      onToggleReady: () => this.handleToggleReady(),
    };
  }

  private refreshUI(): void {
    if (this.lobbyRef) {
      if (typeof this.lobbyRef.setComponent === 'function') {
        this.lobbyRef.setComponent(RoomLobby, this.buildProps());
      } else {
        this.lobbyRef.applyOptions((opts: RoomLobbyProps) => {
          Object.assign(opts, this.buildProps());
        });
      }
    }
  }

  private refreshSidebarButtons(): void {
    const buttons: SidebarButton[] = [
      {
        label: this.strings.get('GUI:Back') || '离开房间',
        isBottom: true,
        onClick: () => {
          this.handleLeaveRoom();
        },
      },
    ];
    this.controller?.setSidebarButtons(buttons);
  }

  private handleUpdateMySettings(settings: { countryId?: number; colorId?: number; startPos?: number; teamId?: number }): void {
    console.log('[RoomLobbyScreen] updateMySettings:', settings);
    this.session?.updateMySettings(settings);
  }

  private handleSlotAction(slotIndex: number, action: string, data?: any): void {
    console.log('[RoomLobbyScreen] slotAction:', slotIndex, action, data);
    this.session?.updateSlot(slotIndex, action, data);
  }

  private handleUpdateConfig(partialConfig: Partial<RoomConfig>): void {
    if (!this.config || !this.session) return;
    // Check host status using current data
    const localId = this.getLocalPlayerId();
    if (localId !== this.hostId) {
      console.warn('[RoomLobbyScreen] Config update blocked: localId=', localId, 'hostId=', this.hostId,
        'playerName=', this.playerName, 'slotNames=', this.slots.map(s => s.playerName));
      return;
    }
    Object.assign(this.config, partialConfig);
    this.refreshUI();
    this.session.updateRoomConfig(partialConfig);
  }

  private handleStartGame(): void {
    if (!this.isHost || this.gameStarting) return;
    this.gameStarting = true;
    this.refreshUI();
    this.session?.startGame();
  }

  private handleLeaveRoom(): void {
    this.session?.leaveRoom();
    this.controller?.leaveCurrentScreen();
  }

  private handleSendChat(message: string): void {
    this.session?.sendChat(message, ChatTarget.All);
  }

  private handleToggleReady(): void {
    this.session?.toggleReady();
  }

  private startGameTransition(data: any): void {
    if (!this.rootController) {
      console.error('[RoomLobbyScreen] No rootController, cannot start game');
      this.chatMessages.push({ playerName: '[系统]', message: '无法启动游戏：缺少游戏控制器' });
      this.gameStarting = false;
      this.refreshUI();
      return;
    }

    const config: RoomConfig = data.config ?? this.config!;
    const slots: SlotData[] = data.slots ?? this.slots;
    if (!config.mapName) {
      this.chatMessages.push({ playerName: '[系统]', message: '启动失败：房间未选择有效地图' });
      this.gameStarting = false;
      this.refreshUI();
      return;
    }

    // Build humanPlayers and aiPlayers from slots
    const humanPlayers: HumanPlayerInfo[] = [];
    const aiPlayers: (AiPlayerInfo | undefined)[] = [];

    for (const slot of slots) {
      if (slot.type === SlotType.Player) {
        humanPlayers.push({
          name: slot.playerName || 'Player',
          countryId: (slot.countryId ?? -1) < 0 ? RANDOM_COUNTRY_ID : slot.countryId,
          colorId: (slot.colorId ?? -1) < 0 ? RANDOM_COLOR_ID : slot.colorId,
          startPos: (slot.startPos ?? -1) < 0 ? RANDOM_START_POS : slot.startPos,
          teamId: (slot.teamId ?? -1) < 0 ? NO_TEAM_ID : slot.teamId,
        });
      } else if (slot.type === SlotType.Ai) {
        aiPlayers.push({
          difficulty: slot.aiDifficulty ?? AiDifficulty.Medium,
          countryId: (slot.countryId ?? -1) < 0 ? RANDOM_COUNTRY_ID : slot.countryId,
          colorId: (slot.colorId ?? -1) < 0 ? RANDOM_COLOR_ID : slot.colorId,
          startPos: (slot.startPos ?? -1) < 0 ? RANDOM_START_POS : slot.startPos,
          teamId: (slot.teamId ?? -1) < 0 ? NO_TEAM_ID : slot.teamId,
        });
      }
    }

    const gameOpts: GameOpts = {
      gameMode: config.gameMode ?? 1,
      gameSpeed: config.gameSpeed ?? 4,
      credits: config.credits ?? 10000,
      unitCount: config.unitCount ?? 0,
      shortGame: config.shortGame ?? false,
      superWeapons: config.superWeapons ?? true,
      buildOffAlly: config.buildOffAlly ?? true,
      mcvRepacks: config.mcvRepacks ?? true,
      cratesAppear: config.cratesAppear ?? false,
      destroyableBridges: config.destroyableBridges ?? true,
      multiEngineer: config.multiEngineer ?? false,
      noDogEngiKills: config.noDogEngiKills ?? false,
      mapName: config.mapName || '',
      mapTitle: config.mapTitle || '',
      mapDigest: config.mapDigest || '',
      mapSizeBytes: config.mapSizeBytes ?? 0,
      maxSlots: config.maxPlayers ?? slots.length,
      mapOfficial: config.mapOfficial ?? true,
      humanPlayers,
      aiPlayers,
    };

    console.log('[RoomLobbyScreen] Starting game with opts:', gameOpts);

    const gameId = data.roomId?.toString() ?? '0';
    const timestamp = data.timestamp ?? Date.now();
    const fallbackRoute = new MainMenuRoute(MainMenuScreenType.LanGame, undefined);

    try {
      this.rootController.createGame(
        gameId,
        timestamp,
        '',           // gservUrl: empty for LAN (not used)
        this.playerName,
        gameOpts,
        false,        // not singlePlayer — use LAN multiplayer lockstep
        false,        // tournament
        false,        // mapTransfer
        false,        // privateGame
        fallbackRoute,
        this.session, // lanSession: wire up MultiplayerTurnManager
      );
    } catch (e) {
      console.error('[RoomLobbyScreen] Failed to start game:', e);
      const message = (e as any)?.message ?? String(e);
      this.chatMessages.push({ playerName: '[系统]', message: '启动游戏失败: ' + message });
      this.gameStarting = false;
      this.refreshUI();
    }
  }

  async onLeave(): Promise<void> {
    console.log('[RoomLobbyScreen] Leaving room lobby');
    this.unsubscribeEvents();
    if (this.controller) {
      await this.controller.hideSidebarButtons();
    }
    this.controller?.setMainComponent();
    this.lobbyRef = null;
  }

  async onStack(): Promise<void> {
    await this.onLeave();
  }

  onUnstack(): void {
    this.onEnter();
  }

  update(_deltaTime: number): void {}

  destroy(): void {}
}
