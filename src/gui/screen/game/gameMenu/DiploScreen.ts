import { jsx } from '@/gui/jsx/jsx';
import { HtmlView } from '@/gui/jsx/HtmlView';
import { DiploForm } from '@/gui/screen/game/gameMenu/DiploForm';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { GameMenuScreen } from '@/gui/screen/game/GameMenuScreen';

// Type definitions
interface Strings {
  get(key: string, ...args: any[]): string;
}

interface Player {
  name: string;
  color: { asHexString(): string };
  country?: { name: string };
  isAi: boolean;
  isObserver?: boolean;
  defeated: boolean;
  aiDifficulty?: string;
  getUnitsKilled(): number;
  isCombatant(): boolean;
}

interface Alliance {
  status: any;
  players: {
    first: Player;
    second: Player;
  };
}

interface Alliances {
  filterByPlayer(player: Player): Alliance[];
  canRequestAlliance(player: Player): boolean;
  canFormAlliance(player1: Player, player2: Player): boolean;
}

interface Game {
  gameOpts: {
    mapTitle: string;
    gameMode: string;
    shortGame: boolean;
    cratesAppear: boolean;
    superWeapons: boolean;
    destroyableBridges: boolean;
    multiEngineer: boolean;
    noDogEngiKills: boolean;
  };
  rules: {
    mpDialogSettings: {
      alliesAllowed: boolean;
      allyChangeAllowed: boolean;
    };
  };
  alliances: Alliances;
  getNonNeutralPlayers(): Player[];
}

interface ChatHistory {
  getAll(): any[];
  onNewMessage: {
    subscribe(handler: () => void): void;
    unsubscribe(handler: () => void): void;
  };
}

interface GservConnection {
  isOpen(): boolean;
  onLoadInfo: {
    subscribe(handler: (data: any) => void): void;
    unsubscribe(handler: (data: any) => void): void;
  };
  requestLoadInfo(): void;
}

interface DiploScreenParams {
  localPlayer: Player;
  isSinglePlayer: boolean;
  game: Game;
  chatHistory?: ChatHistory;
  gservCon?: GservConnection;
  onCancel: () => void;
  onToggleAlliance: (player: Player, enabled: boolean) => void;
  onSendMessage: (message: string) => void;
}

interface SidebarButton {
  label: string;
  isBottom?: boolean;
  onClick: () => void;
}

interface GameMenuController {
  toggleContentAreaVisibility(visible: boolean): void;
  setSidebarButtons(buttons: SidebarButton[]): void;
  showSidebarButtons(): void;
  hideSidebarButtons(): void;
  setMainComponent(component: any): void;
}

interface JsxRenderer {
  render(element: any): any[];
}

interface Renderer {
  onFrame: {
    subscribe(handler: (time: number) => void): void;
    unsubscribe(handler: (time: number) => void): void;
  };
}

interface GameModes {
  getById(id: string): { label: string };
}

interface TauntsRef {
  value?: boolean;
}

interface FormRef {
  applyOptions(updater: (options: any) => void): void;
}

interface PlayerInfo {
  player: Player;
  muted: boolean;
  allianceToggleable: boolean;
  alliance?: Alliance;
}

// Mock LoadInfoParser
class LoadInfoParser {
  parse(data: any): any {
    return data;
  }
}

export class DiploScreen extends GameMenuScreen {
  private strings: Strings;
  private jsxRenderer: JsxRenderer;
  private renderer: Renderer;
  private gameModes: GameModes;
  private taunts: TauntsRef;
  private mutedPlayers: Set<string>;
  private disposables = new CompositeDisposable();
  private params?: DiploScreenParams;
  private form?: FormRef;
  private lastUpdate?: number;
  declare controller?: GameMenuController;

  constructor(
    strings: Strings,
    jsxRenderer: JsxRenderer,
    renderer: Renderer,
    gameModes: GameModes,
    taunts: TauntsRef,
    mutedPlayers: Set<string>
  ) {
    super();
    this.strings = strings;
    this.jsxRenderer = jsxRenderer;
    this.renderer = renderer;
    this.gameModes = gameModes;
    this.taunts = taunts;
    this.mutedPlayers = mutedPlayers;
    this.disposables = new CompositeDisposable();
  }

  private onFrame = (time: number): void => {
    if (!this.lastUpdate || time - this.lastUpdate > 500) {
      this.lastUpdate = time;
      this.updateForm();
    }
  };

  private handleConInfoUpdate = (data: any): void => {
    this.form?.applyOptions((options: any) => {
      options.conInfos = new LoadInfoParser().parse(data);
    });
  };

  private updateForm = (): void => {
    this.form?.applyOptions((options: any) => {
      if (this.params) {
        options.playerInfos = this.buildPlayerInfos(
          this.params.game,
          this.params.localPlayer
        );
        options.taunts = this.taunts.value;
        options.messages = this.params.chatHistory?.getAll();
      }
    });
  };

  onEnter(params: DiploScreenParams): void {
    this.controller?.toggleContentAreaVisibility(true);
    this.initView(params);
    this.params = params;
    this.renderer.onFrame.subscribe(this.onFrame);
    this.disposables.add(() =>
      this.renderer.onFrame.unsubscribe(this.onFrame)
    );

    const chatHistory = params.chatHistory;
    if (chatHistory) {
      chatHistory.onNewMessage.subscribe(this.updateForm);
      this.disposables.add(() =>
        chatHistory.onNewMessage.unsubscribe(this.updateForm)
      );
    }

    const gservCon = params.gservCon;
    if (gservCon?.isOpen()) {
      gservCon.onLoadInfo.subscribe(this.handleConInfoUpdate);
      this.disposables.add(() =>
        gservCon.onLoadInfo.unsubscribe(this.handleConInfoUpdate)
      );
      gservCon.requestLoadInfo();

      const interval = setInterval(() => {
        if (gservCon.isOpen()) {
          gservCon.requestLoadInfo();
        } else {
          this.disposables.dispose();
        }
      }, 10000);
      this.disposables.add(() => clearInterval(interval));
    }
  }

  private initView(params: DiploScreenParams): void {
    const strings = this.strings;
    const buttons: SidebarButton[] = [
      {
        label: strings.get("GUI:ResumeMission"),
        isBottom: true,
        onClick: params.onCancel,
      },
    ];

    this.controller?.setSidebarButtons(buttons);
    this.controller?.showSidebarButtons();

    const { localPlayer, isSinglePlayer, game } = params;
    const [component] = this.jsxRenderer.render(
      jsx(HtmlView, {
        width: "100%",
        height: "100%",
        component: DiploForm,
        innerRef: (form: FormRef) => (this.form = form),
        props: {
          playerInfos: this.buildPlayerInfos(game, localPlayer),
          localPlayer: localPlayer,
          gameOpts: game.gameOpts,
          gameModes: this.gameModes,
          taunts: isSinglePlayer ? undefined : this.taunts.value,
          singlePlayer: isSinglePlayer,
          alliancesAllowed:
            !isSinglePlayer &&
            game.rules.mpDialogSettings.alliesAllowed &&
            game.rules.mpDialogSettings.allyChangeAllowed,
          mapName: game.gameOpts.mapTitle,
          messages: params.chatHistory?.getAll(),
          chatHistory: params.chatHistory,
          onToggleTaunts: (enabled: boolean) => (this.taunts.value = enabled),
          onToggleAlliance: params.onToggleAlliance,
          onToggleChat: (player: Player, enabled: boolean) => {
            if (enabled) {
              this.mutedPlayers.delete(player.name);
            } else {
              this.mutedPlayers.add(player.name);
            }
          },
          onSendMessage: params.onSendMessage,
          onCancelMessage: (shouldCancel: boolean) => shouldCancel && params.onCancel(),
          strings: this.strings,
        },
      })
    );

    this.controller?.setMainComponent(component);
    this.disposables.add(() => (this.form = undefined));
  }

  private buildPlayerInfos(game: Game, localPlayer: Player): PlayerInfo[] {
    const alliances = localPlayer ? game.alliances.filterByPlayer(localPlayer) : undefined;
    
    return game
      .getNonNeutralPlayers()
      .filter((player) => player !== localPlayer)
      .map((player) => ({
        player: player,
        muted: this.mutedPlayers.has(player.name),
        allianceToggleable:
          !!localPlayer &&
          game.alliances.canRequestAlliance(player) &&
          game.alliances.canFormAlliance(localPlayer, player),
        alliance: alliances?.find(
          (alliance) => alliance.players.first === player || alliance.players.second === player
        ),
      }));
  }

  async onLeave(): Promise<void> {
    this.params = undefined;
    this.controller?.hideSidebarButtons();
    this.controller?.toggleContentAreaVisibility(false);
    this.disposables.dispose();
  }
}
  
