import { Screen } from '../../Controller';
import { MainMenuController } from '../MainMenuController';
import { MainMenuScreenType } from '../../ScreenType';
import { Strings } from '../../../../data/Strings';
import { jsx } from '@/gui/jsx/jsx';
import { HtmlView } from '@/gui/jsx/HtmlView';
import { PublicLobbyBrowser, PublicLobbyBrowserProps, PublicRoom } from './component/PublicLobbyBrowser';
import { MultiplayerSession, SessionState } from '@/network/multiplayer/MultiplayerSession';
import { RoomInfo, RoomConfig } from '@/network/multiplayer/protocol';
import { RoomLobbyParams } from './RoomLobbyScreen';

interface SidebarButton {
  label: string;
  tooltip?: string;
  disabled?: boolean;
  isBottom?: boolean;
  onClick: () => void | Promise<void>;
}

export class PublicLobbyScreen implements Screen {
  private strings: Strings;
  private jsxRenderer: any;
  private controller?: MainMenuController;
  private session: MultiplayerSession;
  private browserRef: any = null;
  private rooms: PublicRoom[] = [];
  private isConnecting: boolean = false;
  private errorMessage: string = '';
  private playerName: string = 'Player';
  private serverUrl: string = '';
  private pendingRoomEntry: boolean = false;
  private isRoomCreator: boolean = false;

  public title: string;

  constructor(strings: Strings, _messageBoxApi: unknown, jsxRenderer: any) {
    this.strings = strings;
    this.jsxRenderer = jsxRenderer;
    this.title = '游戏大厅';
    this.session = new MultiplayerSession();
    this.setupSessionEvents();
  }

  private setupSessionEvents(): void {
    this.session.onStateChange.subscribe((state) => {
      console.log('[PublicLobbyScreen] Session state:', state);
      this.isConnecting = state === SessionState.Connecting;
      this.refreshUI();
    });

    this.session.onRoomList.subscribe((rooms: RoomInfo[]) => {
      this.rooms = rooms.map(r => ({
        roomId: r.roomId,
        name: r.name,
        hostName: r.hostName,
        mapName: r.mapName,
        mapTitle: r.mapTitle,
        playerCount: r.playerCount,
        maxPlayers: r.maxPlayers,
        hasPassword: r.hasPassword,
        status: r.status,
        gameSpeed: r.gameSpeed,
        ping: 0,
      }));
      this.refreshUI();
    });

    this.session.onPingUpdate.subscribe((ping: number) => {
      // Update ping for all rooms (server-level ping)
      this.rooms = this.rooms.map(r => ({ ...r, ping }));
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
    console.log('[PublicLobbyScreen] Entering public lobby screen');
    this.controller?.toggleMainVideo(false);
    this.initUI();
    this.refreshSidebarButtons();
    this.controller?.showSidebarButtons();
  }

  private initUI(): void {
    const props: PublicLobbyBrowserProps = {
      rooms: this.rooms,
      playerName: this.playerName,
      serverUrl: this.serverUrl,
      isConnected: this.session.getState() === SessionState.Authenticated ||
                   this.session.getState() === SessionState.InLobby,
      isConnecting: this.isConnecting,
      errorMessage: this.errorMessage,
      onConnect: (url, name) => this.handleConnect(url, name),
      onDisconnect: () => this.handleDisconnect(),
      onCreateRoom: (name, password) => this.handleCreateRoom(name, password),
      onJoinRoom: (roomId, password) => this.handleJoinRoom(roomId, password),
      onRefresh: () => this.handleRefresh(),
    };

    const [component] = this.jsxRenderer.render(jsx(HtmlView, {
      innerRef: (ref: any) => (this.browserRef = ref),
      component: PublicLobbyBrowser,
      props,
    }));
    this.controller?.setMainComponent(component);
  }

  private refreshUI(): void {
    if (this.browserRef) {
      this.browserRef.applyOptions((opts: PublicLobbyBrowserProps) => {
        opts.rooms = this.rooms;
        opts.isConnected = this.session.getState() === SessionState.Authenticated ||
                          this.session.getState() === SessionState.InLobby;
        opts.isConnecting = this.isConnecting;
        opts.errorMessage = this.errorMessage;
        opts.playerName = this.playerName;
        opts.serverUrl = this.serverUrl;
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
          this.controller?.leaveCurrentScreen();
        },
      },
    ];
    this.controller?.setSidebarButtons(buttons);
  }

  private async handleConnect(url: string, name: string): Promise<void> {
    this.playerName = name;
    this.serverUrl = url;
    this.errorMessage = '';
    this.isConnecting = true;
    this.refreshUI();

    try {
      // For public servers, connect via WSS with token auth
      await this.session.connectPublic(url, '');
      this.session.getNetwork().requestRoomList();
    } catch (err: any) {
      this.errorMessage = `连接失败: ${err.message || '无法连接到服务器'}`;
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

  private async handleCreateRoom(name: string, password?: string): Promise<void> {
    try {
      const config: Partial<RoomConfig> = {
        name,
        password,
        maxPlayers: 8,
        mapName: '',
        gameSpeed: 4,
        credits: 10000,
        unitCount: 0,
        shortGame: false,
        superWeapons: true,
        buildOffAlly: true,
        mcvRepacks: true,
        cratesAppear: false,
        destroyableBridges: true,
        multiEngineer: false,
        noDogEngiKills: false,
      };
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

  async onLeave(): Promise<void> {
    console.log('[PublicLobbyScreen] Leaving public lobby screen');
    if (this.controller) {
      await this.controller.hideSidebarButtons();
    }
    this.controller?.setMainComponent();
    this.browserRef = null;
  }

  async onStack(): Promise<void> {
    await this.onLeave();
  }

  onUnstack(): void {
    this.onEnter();
  }

  update(_deltaTime: number): void {}

  destroy(): void {
    this.handleDisconnect();
  }
}
