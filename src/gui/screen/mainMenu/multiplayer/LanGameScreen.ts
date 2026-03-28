import { Screen } from '../../Controller';
import { MainMenuController } from '../MainMenuController';
import { MainMenuScreenType } from '../../ScreenType';
import { Strings } from '../../../../data/Strings';
import { StorageKey } from '@/LocalPrefs';
import { jsx } from '@/gui/jsx/jsx';
import { HtmlView } from '@/gui/jsx/HtmlView';
import { LanBrowser, LanBrowserProps, LanRoom } from './component/LanBrowser';
import { MultiplayerSession, SessionState } from '@/network/multiplayer/MultiplayerSession';
import { DEFAULT_LAN_PORT, RoomInfo, RoomConfig } from '@/network/multiplayer/protocol';
import { RoomLobbyParams } from './RoomLobbyScreen';
import { PreferredHostOpts } from '../lobby/PreferredHostOpts';
import { MapDigest } from '@/engine/MapDigest';

interface GameMode {
  id: number;
  label: string;
  mpDialogSettings: any;
}

interface GameModes {
  getAll(): GameMode[];
  getById(id: number): GameMode;
  hasId(id: number): boolean;
}

interface MapListEntry {
  fileName: string;
  maxSlots: number;
  official?: boolean;
  gameModes: GameMode[];
  getFullMapTitle(strings: Strings): string;
}

interface MapList {
  getAll(): MapListEntry[];
  getByName(name: string): MapListEntry | undefined;
}

interface MapFileLoader {
  load(mapName: string): Promise<any>;
}

interface LocalPrefsLike {
  getItem(key: StorageKey | string): string | undefined;
  setItem(key: StorageKey | string, value: string): boolean;
}

interface SidebarButton {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  isBottom?: boolean;
  onClick: () => void | Promise<void>;
}

export class LanGameScreen implements Screen {
  private strings: Strings;
  private jsxRenderer: any;
  private controller?: MainMenuController;
  private session: MultiplayerSession;
  private lanBrowserRef: any = null;
  private rooms: LanRoom[] = [];
  private isConnecting: boolean = false;
  private errorMessage: string = '';
  private playerName: string = 'Player';
  private serverAddress: string = '';
  private serverPort: number = DEFAULT_LAN_PORT;
  private pendingRoomEntry: boolean = false;
  private isRoomCreator: boolean = false;
  private createRoomModes: { id: number; label: string }[] = [];
  private createRoomMaps: { fileName: string; title: string; maxPlayers: number; modeIds: number[] }[] = [];
  private defaultGameModeId: number = 1;
  private defaultMapName: string = '';

  public title: string;

  constructor(
    strings: Strings,
    _messageBoxApi: unknown,
    jsxRenderer: any,
    private mapList?: MapList,
    private gameModes?: GameModes,
    private mapFileLoader?: MapFileLoader,
    private localPrefs?: LocalPrefsLike,
  ) {
    this.strings = strings;
    this.jsxRenderer = jsxRenderer;
    this.title = '局域网联机';
    this.session = new MultiplayerSession();
    this.playerName = this.localPrefs?.getItem(StorageKey.LastLanPlayerName)?.trim() || 'Player';
    this.serverAddress = this.resolveInitialServerAddress();
    this.serverPort = this.resolveInitialServerPort();
    this.initCreateRoomOptions();
    this.setupSessionEvents();
  }

  private resolveInitialServerAddress(): string {
    const savedAddress = this.localPrefs?.getItem(StorageKey.LastLanServerAddress)?.trim();
    if (savedAddress) {
      return savedAddress;
    }

    if (typeof window === 'undefined') {
      return '';
    }

    const hostname = window.location.hostname?.trim();
    return hostname && !this.isLoopbackAddress(hostname) ? hostname : '';
  }

  private resolveInitialServerPort(): number {
    const savedPort = Number(this.localPrefs?.getItem(StorageKey.LastLanServerPort));
    if (Number.isInteger(savedPort) && savedPort > 0 && savedPort <= 65535) {
      return savedPort;
    }

    return DEFAULT_LAN_PORT;
  }

  private isLoopbackAddress(address: string): boolean {
    const normalized = address.trim().toLowerCase();
    return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1' || normalized === '[::1]';
  }

  private persistLanServer(address: string, port: number): void {
    this.localPrefs?.setItem(StorageKey.LastLanServerAddress, address);
    this.localPrefs?.setItem(StorageKey.LastLanServerPort, String(port));
  }

  private getLanConnectionFailureMessage(err: any): string {
    const detail = err?.message || '无法连接到服务器';
    const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:';

    if (isHttpsPage) {
      return `连接失败: ${detail}。当前页面使用 HTTPS，局域网服务器也必须启用 TLS 证书并通过 wss:// 提供服务；否则请改用 HTTP 页面访问游戏。`;
    }

    return `连接失败: ${detail}`;
  }

  private initCreateRoomOptions(): void {
    const modes = this.gameModes?.getAll() ?? [];
    const maps = this.mapList?.getAll() ?? [];

    this.createRoomModes = modes.map((mode) => ({
      id: mode.id,
      label: this.strings.get(mode.label),
    }));

    this.createRoomMaps = maps
      .map((map) => ({
        fileName: map.fileName,
        title: map.getFullMapTitle(this.strings),
        maxPlayers: map.maxSlots,
        modeIds: map.gameModes.map((mode) => mode.id),
      }))
      .sort((left, right) => left.title.localeCompare(right.title));

    const savedModeId = Number(this.localPrefs?.getItem(StorageKey.LastMode));
    const savedMapName = this.localPrefs?.getItem(StorageKey.LastMap);
    const selectedModeId = Number.isFinite(savedModeId) && this.gameModes?.hasId(savedModeId)
      ? savedModeId
      : this.createRoomModes[0]?.id ?? 1;
    const savedMap = savedMapName
      ? this.createRoomMaps.find((map) => map.fileName === savedMapName && map.modeIds.includes(selectedModeId))
      : undefined;
    const fallbackMap = this.createRoomMaps.find((map) => map.modeIds.includes(selectedModeId)) ?? this.createRoomMaps[0];

    this.defaultGameModeId = selectedModeId;
    this.defaultMapName = savedMap?.fileName ?? fallbackMap?.fileName ?? '';
  }

  private setupSessionEvents(): void {
    this.session.onStateChange.subscribe((state) => {
      console.log('[LanGameScreen] Session state:', state);
      this.isConnecting = state === SessionState.Connecting;
      this.refreshUI();
    });

    this.session.onRoomList.subscribe((rooms: RoomInfo[]) => {
      this.rooms = rooms.map(r => ({
        roomId: r.roomId,
        name: r.name,
        hostName: r.hostName,
        gameMode: r.gameMode,
        mapName: r.mapName,
        mapTitle: r.mapTitle,
        playerCount: r.playerCount,
        maxPlayers: r.maxPlayers,
        hasPassword: r.hasPassword,
        status: r.status,
        gameSpeed: r.gameSpeed,
      }));
      this.refreshUI();
    });

    this.session.onError.subscribe((error: string) => {
      this.errorMessage = error;
      this.refreshUI();
    });

    this.session.onRoomStateUpdate.subscribe((data) => {
      if (this.pendingRoomEntry && data.config) {
        this.pendingRoomEntry = false;
        const params: RoomLobbyParams = {
          session: this.session,
          isHost: this.isRoomCreator,
          config: data.config,
          playerName: this.playerName,
          initialSlots: data.slots,
          initialHostId: data.hostId,
        };
        this.controller?.pushScreen(MainMenuScreenType.RoomLobby, params);
      }
    });
  }

  setController(controller: MainMenuController): void {
    this.controller = controller;
  }

  onEnter(): void {
    console.log('[LanGameScreen] Entering LAN game screen');
    this.controller?.toggleMainVideo(false);
    this.initUI();
    this.refreshSidebarButtons();
    this.controller?.showSidebarButtons();
  }

  private initUI(): void {
    const props: LanBrowserProps = {
      rooms: this.rooms,
      playerName: this.playerName,
      serverAddress: this.serverAddress,
      serverPort: this.serverPort,
      gameModes: this.createRoomModes,
      mapOptions: this.createRoomMaps,
      defaultGameModeId: this.defaultGameModeId,
      defaultMapName: this.defaultMapName,
      isConnected: this.session.getState() === SessionState.Authenticated ||
                   this.session.getState() === SessionState.InLobby,
      isConnecting: this.isConnecting,
      errorMessage: this.errorMessage,
      onConnect: (address, port, name) => this.handleConnect(address, port, name),
      onDisconnect: () => this.handleDisconnect(),
      onCreateRoom: (request) => this.handleCreateRoom(request),
      onJoinRoom: (roomId, password) => this.handleJoinRoom(roomId, password),
      onRefresh: () => this.handleRefresh(),
    };

    const [component] = this.jsxRenderer.render(jsx(HtmlView, {
      innerRef: (ref: any) => (this.lanBrowserRef = ref),
      component: LanBrowser,
      props,
    }));
    this.controller?.setMainComponent(component);
  }

  private refreshUI(): void {
    if (this.lanBrowserRef) {
      this.lanBrowserRef.applyOptions((opts: LanBrowserProps) => {
        opts.rooms = this.rooms;
        opts.isConnected = this.session.getState() === SessionState.Authenticated ||
                          this.session.getState() === SessionState.InLobby;
        opts.isConnecting = this.isConnecting;
        opts.errorMessage = this.errorMessage;
        opts.playerName = this.playerName;
        opts.serverAddress = this.serverAddress;
        opts.serverPort = this.serverPort;
        opts.gameModes = this.createRoomModes;
        opts.mapOptions = this.createRoomMaps;
        opts.defaultGameModeId = this.defaultGameModeId;
        opts.defaultMapName = this.defaultMapName;
      });
    }
  }

  private refreshSidebarButtons(): void {
    const buttons: SidebarButton[] = [
      {
        label: this.strings.get('GUI:Back') || '返回',
        isBottom: true,
        onClick: () => {
          this.handleDisconnect();
          this.controller?.goToScreen(MainMenuScreenType.MultiplayerMenu);
        },
      },
    ];
    this.controller?.setSidebarButtons(buttons);
  }

  private async handleConnect(address: string, port: number, name: string): Promise<void> {
    this.playerName = name;
    this.serverAddress = address;
    this.serverPort = port;
    this.errorMessage = '';
    this.isConnecting = true;
    this.refreshUI();

    try {
      await this.session.connectLAN(address, port, name);
      this.persistLanServer(address, port);
      this.localPrefs?.setItem(StorageKey.LastLanPlayerName, name);
      // Clear stale rooms from previous games
      await this.clearServerRooms(address, port).catch(() => {});
      // Request room list after connecting
      this.session.getNetwork().requestRoomList();
    } catch (err: any) {
      this.errorMessage = this.getLanConnectionFailureMessage(err);
      this.isConnecting = false;
      this.refreshUI();
    }
  }

  private handleDisconnect(): void {
    this.session.disconnect();
    this.rooms = [];
    this.errorMessage = '';
    this.refreshUI();
  }

  private async handleCreateRoom(request: { name: string; password?: string; gameModeId: number; mapName: string }): Promise<void> {
    try {
      const selectedMode = this.gameModes?.getById(request.gameModeId);
      const selectedMap = this.mapList?.getByName(request.mapName);
      if (!selectedMode || !selectedMap || !this.mapFileLoader) {
        throw new Error('无法加载所选地图或游戏类型');
      }

      const mapFile = await this.mapFileLoader.load(selectedMap.fileName);
      const preferredOpts = new PreferredHostOpts();
      const savedOpts = this.localPrefs?.getItem(StorageKey.PreferredGameOpts);
      if (savedOpts) {
        preferredOpts.unserialize(savedOpts);
      } else {
        preferredOpts.applyMpDialogSettings(selectedMode.mpDialogSettings);
      }

      const config: Partial<RoomConfig> = {
        name: request.name,
        password: request.password,
        maxPlayers: selectedMap.maxSlots,
        gameMode: selectedMode.id,
        mapName: selectedMap.fileName,
        mapTitle: selectedMap.getFullMapTitle(this.strings),
        mapDigest: MapDigest.compute(mapFile),
        mapSizeBytes: mapFile.getSize(),
        mapOfficial: selectedMap.official ?? false,
        gameSpeed: preferredOpts.gameSpeed,
        credits: preferredOpts.credits,
        unitCount: preferredOpts.unitCount,
        shortGame: preferredOpts.shortGame,
        superWeapons: preferredOpts.superWeapons,
        buildOffAlly: preferredOpts.buildOffAlly,
        mcvRepacks: preferredOpts.mcvRepacks,
        cratesAppear: preferredOpts.cratesAppear,
        destroyableBridges: preferredOpts.destroyableBridges,
        multiEngineer: preferredOpts.multiEngineer,
        noDogEngiKills: preferredOpts.noDogEngiKills,
      };
      this.localPrefs?.setItem(StorageKey.LastMode, String(selectedMode.id));
      this.localPrefs?.setItem(StorageKey.LastMap, selectedMap.fileName);
      this.defaultGameModeId = selectedMode.id;
      this.defaultMapName = selectedMap.fileName;
      this.pendingRoomEntry = true;
      this.isRoomCreator = true;
      this.session.getNetwork().createRoom(config as RoomConfig);
    } catch (err: any) {
      this.errorMessage = `创建房间失败: ${err.message}`;
      this.refreshUI();
    }
  }

  private async handleJoinRoom(roomId: string, password?: string): Promise<void> {
    try {
      this.pendingRoomEntry = true;
      this.isRoomCreator = false;
      this.session.getNetwork().joinRoom(roomId, password);
    } catch (err: any) {
      this.errorMessage = `加入房间失败: ${err.message}`;
      this.refreshUI();
    }
  }

  private handleRefresh(): void {
    this.session.getNetwork().requestRoomList();
  }

  private async clearServerRooms(address: string, port: number): Promise<void> {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
    const resp = await fetch(`${protocol}://${address}:${port}/api/rooms/clear`, { method: 'POST' });
    if (!resp.ok) throw new Error(`Clear rooms failed: ${resp.status}`);
    const data = await resp.json();
    console.log('[LanGameScreen] Cleared stale rooms:', data.cleared);
  }

  async onLeave(): Promise<void> {
    console.log('[LanGameScreen] Leaving LAN game screen');
    if (this.controller) {
      await this.controller.hideSidebarButtons();
    }
    this.controller?.setMainComponent();
    this.lanBrowserRef = null;
  }

  async onStack(): Promise<void> {
    await this.onLeave();
  }

  onUnstack(): void {
    this.onEnter();
  }

  update(_deltaTime: number): void {}

  destroy(): void {
    // Don't disconnect if the session is actively being used by GameScreen
    // (MainMenuRootScreen.onLeave → controller.destroy calls this during game transition)
    const state = this.session.getState();
    if (state === SessionState.Loading || state === SessionState.InGame) {
      console.log(`[LanGameScreen] destroy() skipping disconnect (session state=${state})`);
      return;
    }
    this.handleDisconnect();
  }
}
