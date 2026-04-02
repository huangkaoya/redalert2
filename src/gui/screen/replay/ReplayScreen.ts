import { Engine } from '@/engine/Engine';
import { SidebarModel } from '@/gui/screen/game/component/hud/viewmodel/SidebarModel';
import { DevToolsApi } from '@/tools/DevToolsApi';
import { GameAnimationLoop } from '@/engine/GameAnimationLoop';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { SoundHandler } from '@/gui/screen/game/SoundHandler';
import { WorldInteractionFactory } from '@/gui/screen/game/worldInteraction/WorldInteractionFactory';
import { ObserverUi } from '@/gui/screen/game/ObserverUi';
import { GameMenu } from '@/gui/screen/game/GameMenu';
import { WorldView } from '@/gui/screen/game/WorldView';
import { Eva } from '@/engine/sound/Eva';
import { EvaSpecs } from '@/engine/sound/EvaSpecs';
import { HudFactory } from '@/gui/screen/game/HudFactory';
import { Minimap } from '@/gui/screen/game/component/Minimap';
import { SideType } from '@/game/SideType';
import { ReplayTurnManager } from '@/network/gamestate/ReplayTurnManager';
import { ActionFactory } from '@/game/action/ActionFactory';
import { ActionFactoryReg } from '@/game/action/ActionFactoryReg';
import { MessageList } from '@/gui/screen/game/component/hud/viewmodel/MessageList';
import { Music, MusicType } from '@/engine/sound/Music';
import { ChatMessageReplayEvent } from '@/network/gamestate/replay/ChatMessageReplayEvent';
import { SoundKey } from '@/engine/sound/SoundKey';
import { ChannelType } from '@/engine/sound/ChannelType';
import { TauntReplayEvent } from '@/network/gamestate/replay/TauntReplayEvent';
import { TauntPlayback } from '@/gui/screen/game/TauntPlayback';
import { CommandBarButtonType } from '@/gui/screen/game/component/hud/commandBar/CommandBarButtonType';
import { isIpad } from '@/util/userAgent';
import { RootScreen } from '@/gui/screen/RootScreen';
import { LoadingScreenApiFactory, LoadingScreenType } from '@/gui/screen/game/loadingScreen/LoadingScreenApiFactory';
import { MapFile } from '@/data/MapFile';
import { ResourceLoader } from '@/engine/ResourceLoader';
import { MapDigest } from '@/engine/MapDigest';
import { ChatHistory } from '@/gui/chat/ChatHistory';
interface Replay {
    gameId: string;
    gameTimestamp: number;
    gameOpts: GameOpts;
    engineVersion: string;
    modHash: string;
}
interface GameOpts {
    mapName: string;
    mapDigest: string;
    mapOfficial: boolean;
    humanPlayers: Array<{
        name: string;
        countryId: number;
        colorId: number;
    }>;
}
interface ReplayParams {
    replay: Replay;
}
interface Config {
    devMode: boolean;
    discordUrl?: string;
}
interface Strings {
    get(key: string, ...args: any[]): string;
}
interface Renderer {
    removeScene(scene: any): void;
    addScene(scene: any): void;
}
interface UiScene {
    viewport: any;
    add(object: any): void;
    remove(object: any): void;
}
interface RuntimeVars {
    debugText: any;
    freeCamera: any;
    debugPaths: any;
}
interface MessageBoxApi {
    show(message: string, buttonText: string, onClose?: () => void): void;
}
interface UiAnimationLoop {
    stop(): void;
    start(): void;
}
interface Viewport {
    value: any;
}
interface JsxRenderer {
    render(jsx: any): any[];
}
interface Pointer {
    lock(): void;
    unlock(): void;
    setVisible(visible: boolean): void;
    pointerEvents: any;
}
interface Sound {
    play(key: SoundKey, channel: ChannelType): void;
    audioSystem: any;
}
interface KeyBinds {
}
interface GeneralOptions {
}
interface ActionLogger {
}
interface FullScreen {
    onChange: {
        subscribe(callback: (value: any) => void): void;
        unsubscribe(callback: (value: any) => void): void;
    };
}
interface MapFileLoader {
    load(mapName: string): Promise<any>;
}
interface GameLoader {
    load(gameId: string, gameTimestamp: number, gameOpts: GameOpts, mapFile: MapFile, localPlayer?: any, isSinglePlayer?: boolean, loadingScreenApi?: any): Promise<{
        game: Game;
        theater: Theater;
        hudSide: any;
        cameoFilenames: string[];
    }>;
    clearStaticCaches(): void;
}
interface VxlGeometryPool {
}
interface BuildingImageDataCache {
}
interface ErrorHandler {
    handle(error: any, message: string, onClose?: () => void): void;
}
interface Game {
    speed: {
        value: number;
    };
    desiredSpeed: {
        value: number;
    };
    rules: {
        audioVisual: {
            messageDuration: number;
        };
        general: {
            radar: any;
        };
    };
    debugText: any;
    getCombatants(): any[];
    stalemateDetectTrait: any;
    countdownTimer: any;
    start(): void;
    getPlayer(playerId: number): Player;
    events: any;
    gameOpts: GameOpts;
    getUnitSelection(): any;
}
interface Player {
    name: string;
    color: {
        asHexString(): string;
    };
}
interface Theater {
    type: any;
}
interface LoadingScreenApi {
    updateViewport(): void;
    dispose(): void;
}
interface Hud {
    sidebarWidth: number;
    actionBarHeight: number;
    onCommandBarButtonClick: {
        subscribe(callback: (buttonType: CommandBarButtonType) => void): void;
    };
    getTextColor(): string;
    setMinimap(minimap: Minimap): void;
    destroy(): void;
}
interface WorldInteraction {
    setEnabled(enabled: boolean): void;
}
interface PlayerUi {
    onPlayerChange: {
        subscribe(callback: (data: {
            player: Player;
            sidebarModel: SidebarModel;
        }) => void): void;
    };
    worldInteraction: WorldInteraction;
    init(hud: Hud): void;
    handleHudChange(hud: Hud): void;
    dispose(): void;
}
interface GameMenuType {
    onOpen: {
        subscribe(callback: () => void): void;
    };
    onQuit: {
        subscribe(callback: () => void): void;
    };
    onCancel: {
        subscribe(callback: () => void): void;
    };
    handleHudChange(hud: Hud): void;
}
export class ReplayScreen extends RootScreen {
    public preventUnload = true;
    private disposables = new CompositeDisposable();
    private params?: ReplayParams;
    private game?: Game;
    private baseSpeed = 0;
    private sidebarModel?: SidebarModel;
    private messageList?: MessageList;
    private hudFactory?: HudFactory;
    private hud?: Hud;
    private minimap?: Minimap;
    private worldView?: WorldView;
    private activeWorldScene?: any;
    private gameTurnMgr?: ReplayTurnManager;
    private gameAnimationLoop?: GameAnimationLoop;
    private menu?: GameMenuType;
    private playerUi?: PlayerUi;
    private loadingScreenApi?: LoadingScreenApi;
    private replayEndHandled = false;
    constructor(private engineVersion: string, private engineModHash: string, private errorHandler: ErrorHandler, private gameMenuSubScreens: any, private loadingScreenApiFactory: LoadingScreenApiFactory, private config: Config, private strings: Strings, private renderer: Renderer, private uiScene: UiScene, private runtimeVars: RuntimeVars, private messageBoxApi: MessageBoxApi, private uiAnimationLoop: UiAnimationLoop, private viewport: Viewport, private jsxRenderer: JsxRenderer, private pointer: Pointer, private sound: Sound, private music: Music, private keyBinds: KeyBinds, private generalOptions: GeneralOptions, private actionLogger: ActionLogger, private fullScreen: FullScreen, private mapFileLoader: MapFileLoader, private gameLoader: GameLoader, private vxlGeometryPool: VxlGeometryPool, private buildingImageDataCache: BuildingImageDataCache, private leaveAction: (params?: any) => void, private battleControlApi: any) {
        super();
    }
    async onEnter(params: ReplayParams): Promise<void> {
        this.replayEndHandled = false;
        this.params = params;
        this.disposables.add(() => (this.params = undefined));
        this.pointer.lock();
        this.pointer.setVisible(false);
        await this.music?.play(MusicType.Loading);
        const { gameId, gameTimestamp, gameOpts, engineVersion, modHash } = params.replay;
        let errorMessage: string | undefined;
        if (engineVersion !== this.engineVersion) {
            errorMessage = this.strings.get("GUI:ReplayVersionMismatch", engineVersion);
        }
        else if (modHash !== this.engineModHash) {
            errorMessage = this.strings.get("GUI:ReplayModMismatch");
        }
        if (errorMessage) {
            this.messageBoxApi.show(errorMessage, this.strings.get("GUI:Ok"), () => {
                this.leaveAction();
            });
            return;
        }
        const loadingScreenApi = this.loadingScreenApiFactory.create(LoadingScreenType.Replay);
        this.loadingScreenApi = loadingScreenApi;
        this.disposables.add(loadingScreenApi, () => (this.loadingScreenApi = undefined));
        let gameData: {
            game: Game;
            theater: Theater;
            hudSide: any;
            cameoFilenames: string[];
        };
        const mapName = gameOpts.mapName;
        try {
            const mapFileData = await this.mapFileLoader.load(mapName);
            if (MapDigest.compute(mapFileData) !== gameOpts.mapDigest) {
                this.handleError("Map digest mismatch", this.strings.get("TS:MapMismatch", mapName));
                return;
            }
            const mapFile = new MapFile(mapFileData);
            gameData = await this.gameLoader.load(gameId, gameTimestamp, gameOpts, mapFile, undefined, gameOpts.humanPlayers.length === 1, loadingScreenApi);
        }
        catch (error: any) {
            let message: string;
            if (error.message?.match(/memory|allocation/i)) {
                message = this.strings.get("TS:GameInitOom");
            }
            else if (error.name === 'DownloadError') {
                message = this.strings.get("TS:MapNotFound", mapName);
            }
            else {
                message = this.strings.get("TS:GameInitError");
                if (!gameOpts.mapOfficial) {
                    message += "\n\n" + this.strings.get("TS:CustomMapCrash");
                }
            }
            this.handleError(error, message);
            return;
        }
        const { game, theater, hudSide, cameoFilenames } = gameData;
        this.game = game;
        this.baseSpeed = this.game.speed.value;
        this.disposables.add(() => (this.game = undefined));
        this.disposables.add(() => {
            Engine.unloadTheater(theater.type);
            this.gameLoader.clearStaticCaches();
        });
        this.disposables.add(game as any);
        const sidebarModel = new SidebarModel(game, params.replay);
        const messageList = new MessageList(game.rules.audioVisual.messageDuration, 6, undefined);
        const chatHistory = new ChatHistory();
        this.sidebarModel = sidebarModel;
        this.disposables.add(() => (this.sidebarModel = undefined));
        this.messageList = messageList;
        this.disposables.add(() => (this.messageList = undefined));
        const replayCommandButtons = [
            CommandBarButtonType.ReplayRewind,
            CommandBarButtonType.ReplayPlay,
            CommandBarButtonType.ReplayPause,
            CommandBarButtonType.ReplaySpeed
        ];
        this.hudFactory = new HudFactory(hudSide, this.viewport.value, sidebarModel, messageList, chatHistory, game.debugText, this.runtimeVars.debugText, undefined, game.getCombatants(), game.stalemateDetectTrait, game.countdownTimer, cameoFilenames, this.jsxRenderer, this.strings, replayCommandButtons, undefined);
        this.disposables.add(() => (this.hudFactory = undefined));
        const hud = this.hudFactory.create();
        this.hud = hud;
        const minimap = this.minimap = new Minimap(game, undefined, hud.getTextColor() as any, game.rules.general.radar as any);
        hud.setMinimap(minimap);
        this.disposables.add(minimap, () => (this.minimap = undefined));
        minimap.setPointerEvents(this.pointer.pointerEvents);
        const hudDimensions = { width: hud.sidebarWidth, height: hud.actionBarHeight };
        const worldView = new WorldView(hudDimensions, game, this.sound, this.renderer, this.runtimeVars, minimap, this.strings, this.generalOptions, this.vxlGeometryPool, this.buildingImageDataCache);
        const { worldScene, worldSound, renderableManager } = worldView.init(undefined, this.viewport.value, theater);
        this.worldView = worldView;
        this.disposables.add(worldView, () => (this.worldView = undefined));
        worldScene.create3DObject();
        const actionFactory = new ActionFactory();
        new ActionFactoryReg().register(actionFactory, game, undefined);
        const gameTurnMgr = this.gameTurnMgr = new ReplayTurnManager(game, params.replay, actionFactory, this.actionLogger as any);
        this.gameTurnMgr.init();
        const tauntPlayback = new TauntPlayback(this.sound.audioSystem, Engine.getTaunts());
        const handleReplayEvent = (event: any) => {
            if (event instanceof ChatMessageReplayEvent) {
                const payload = event.payload;
                const player = game.getPlayer(payload.playerId);
                const message = this.strings.get("TS:ReplayChatFrom", player.name) + " " + payload.message;
                const color = player.color.asHexString();
                messageList.addChatMessage(message, color);
            }
            else if (event instanceof TauntReplayEvent) {
                const payload = event.payload;
                const player = game.getPlayer(payload.playerId);
                const tauntNo = payload.tauntNo;
                tauntPlayback.playTaunt(player, tauntNo).catch((error: any) => console.error(error));
            }
        };
        gameTurnMgr.onReplayEvent.subscribe(handleReplayEvent);
        this.disposables.add(() => gameTurnMgr.onReplayEvent.unsubscribe(handleReplayEvent));
        this.onGameStart(game, minimap, messageList, worldScene, worldSound, renderableManager);
        DevToolsApi.registerCommand("reset", async () => {
            await this.onLeave();
            await this.onEnter(params);
        });
        DevToolsApi.registerVar("speed", game.desiredSpeed as any);
        this.disposables.add(() => DevToolsApi.unregisterCommand("reset"), () => DevToolsApi.unregisterVar("speed"));
    }
    onViewportChange(): void {
        this.loadingScreenApi?.updateViewport();
        this.rerenderHud();
    }
    private rerenderHud(): void {
        if (!this.hud)
            return;
        this.uiScene.remove(this.hud);
        this.hud.destroy();
        this.hudFactory!.setSidebarModel(this.sidebarModel!);
        this.hudFactory!.setViewport(this.viewport.value);
        const hud = this.hudFactory!.create();
        this.hud = hud;
        hud.setMinimap(this.minimap!);
        this.worldView?.handleViewportChange(this.viewport.value);
        if (this.worldView) {
            this.uiScene.add(hud);
            this.menu?.handleHudChange(hud);
            this.playerUi?.handleHudChange(hud);
            this.initHudEvents(hud, this.messageList!);
        }
    }
    private onGameStart(game: Game, minimap: Minimap, messageList: MessageList, worldScene: any, worldSound: any, renderableManager: any): void {
        this.loadingScreenApi?.dispose();
        this.music?.play(MusicType.Normal);
        const evaSpecs = new EvaSpecs(SideType.GDI).readIni(Engine.getIni("eva.ini"));
        const eva = new Eva(evaSpecs, this.sound as any, this.renderer as any);
        eva.init();
        this.disposables.add(eva);
        try {
            this.initUi(game, worldScene, worldSound, eva, renderableManager, minimap, messageList);
        }
        catch (error: any) {
            const message = error.message?.match(/memory|allocation/i)
                ? this.strings.get("TS:GameInitOom")
                : this.strings.get("TS:GameInitError");
            this.handleError(error, message);
            return;
        }
        this.activeWorldScene = worldScene;
        this.renderer.removeScene(this.uiScene);
        this.renderer.addScene(worldScene);
        this.renderer.addScene(this.uiScene);
        this.pointer.setVisible(true);
        game.start();
        this.gameAnimationLoop = new GameAnimationLoop(undefined, this.renderer as any, this.sound, this.gameTurnMgr!, {
            skipFrames: true,
            skipBudgetMillis: 8,
            onError: this.config.devMode ? undefined : (error: any, isCritical?: boolean) => this.handleError(error, this.strings.get("TS:GameCrashed") +
                (isCritical || game.gameOpts.mapOfficial
                    ? ""
                    : "\n\n" + this.strings.get("TS:CustomMapCrash")), isCritical)
        });
        this.uiAnimationLoop.stop();
        this.gameAnimationLoop.start();
        const handleReplayFinished = () => this.onReplayEnd();
        this.gameTurnMgr!.onFinished.subscribe(handleReplayFinished);
        this.disposables.add(() => this.gameTurnMgr?.onFinished.unsubscribe(handleReplayFinished));
    }
    private initUi(game: Game, worldScene: any, worldSound: any, eva: Eva, renderableManager: any, minimap: Minimap, messageList: MessageList): void {
        const soundHandler = new SoundHandler(game, worldSound, eva, this.sound, game.events, messageList, this.strings, undefined);
        soundHandler.init();
        this.disposables.add(soundHandler);
        messageList.onNewMessage.subscribe((message: any) => {
            if (message.animate) {
                this.sound.play(SoundKey.IncomingMessage, ChannelType.Ui);
            }
        });
        if (isIpad()) {
            const handleFullScreenChange = (value: boolean) => {
                this.sidebarModel!.topTextLeftAlign = value;
            };
            this.fullScreen.onChange.subscribe(handleFullScreenChange);
            this.disposables.add(() => this.fullScreen.onChange.unsubscribe(handleFullScreenChange));
        }
        this.uiScene.add(this.hud!);
        this.initHudEvents(this.hud!, messageList);
        const menu = this.menu = new GameMenu(this.gameMenuSubScreens, game, undefined, undefined, undefined, true);
        menu.init(this.hud!);
        this.initGameMenuEvents(menu);
        this.disposables.add(menu, () => (this.menu = undefined));
        const unitSelection = game.getUnitSelection();
        const freeCamera = this.runtimeVars.freeCamera;
        const debugPaths = this.runtimeVars.debugPaths;
        const debugText = this.runtimeVars.debugText;
        const devMode = this.config.devMode;
        const worldInteractionFactory = new WorldInteractionFactory(undefined, game, unitSelection, renderableManager, this.uiScene, worldScene, this.pointer, this.renderer, this.keyBinds, this.generalOptions, freeCamera, debugPaths, devMode, document, minimap, this.strings, this.hud!.getTextColor(), debugText, this.battleControlApi);
        const discordUrl = this.config.discordUrl;
        const playerUi = this.playerUi = new ObserverUi(game, undefined, this.sidebarModel!, this.params!.replay, this.renderer, worldScene, this.sound, worldInteractionFactory, menu, this.runtimeVars, this.strings, renderableManager, this.messageBoxApi, discordUrl) as any;
        playerUi.onPlayerChange.subscribe(({ player, sidebarModel }) => {
            this.sidebarModel = sidebarModel;
            this.rerenderHud();
            this.worldView?.changeLocalPlayer(player);
            this.minimap!.changeLocalPlayer(player);
        });
        this.playerUi.init(this.hud!);
        this.disposables.add(this.playerUi, () => (this.playerUi = undefined));
    }
    private initGameMenuEvents(menu: GameMenuType): void {
        menu.onOpen.subscribe(() => {
            this.pointer.unlock();
            this.playerUi!.worldInteraction.setEnabled(false);
        });
        menu.onQuit.subscribe(async () => {
            this.playerUi!.dispose();
            this.gameTurnMgr!.dispose();
            this.leaveAction();
        });
        menu.onCancel.subscribe(() => {
            this.pointer.lock();
            this.playerUi!.worldInteraction.setEnabled(true);
        });
    }
    private initHudEvents(hud: Hud, messageList: MessageList): void {
        hud.onCommandBarButtonClick.subscribe((buttonType: CommandBarButtonType) => {
            this.sound.play(SoundKey.GenericClick, ChannelType.Ui);
            switch (buttonType) {
                case CommandBarButtonType.ReplayRewind:
                    (async () => {
                        const params = this.params!;
                        await this.onLeave();
                        await this.onEnter(params);
                    })().catch((error: any) => console.error(error));
                    break;
                case CommandBarButtonType.ReplayPlay:
                    this.game!.desiredSpeed.value = this.baseSpeed;
                    if (this.game!.speed.value === Number.EPSILON) {
                        this.gameTurnMgr!.doGameTurn(performance.now());
                    }
                    else if (this.game!.speed.value !== this.baseSpeed) {
                        messageList.addSystemMessage(this.strings.get("TS:ReplaySpeedConfirm", "1x"), "grey");
                    }
                    break;
                case CommandBarButtonType.ReplayPause:
                    this.game!.desiredSpeed.value = Number.EPSILON;
                    break;
                case CommandBarButtonType.ReplaySpeed: {
                    if (this.game!.speed.value === Number.EPSILON) {
                        this.game!.desiredSpeed.value = this.baseSpeed;
                        this.gameTurnMgr!.doGameTurn(performance.now());
                    }
                    let speedMultiplier = Math.floor(this.game!.desiredSpeed.value / this.baseSpeed);
                    speedMultiplier = speedMultiplier === 16 ? 1 : 2 * speedMultiplier;
                    this.game!.desiredSpeed.value = speedMultiplier * this.baseSpeed;
                    messageList.addSystemMessage(this.strings.get("TS:ReplaySpeedConfirm", speedMultiplier + "x"), "grey");
                    break;
                }
                default:
                    console.warn("Unhandled command type " + buttonType);
            }
        });
    }
    async onLeave(): Promise<void> {
        this.pointer.unlock();
        if (this.gameAnimationLoop) {
            this.gameAnimationLoop.destroy();
            this.gameAnimationLoop = undefined;
            this.uiAnimationLoop.start();
        }
        if (this.activeWorldScene) {
            this.renderer.removeScene(this.activeWorldScene);
            this.activeWorldScene = undefined;
        }
        if (this.hud) {
            this.uiScene.remove(this.hud);
            this.hud.destroy();
            this.hud = undefined;
        }
        this.gameTurnMgr?.dispose();
        this.gameTurnMgr = undefined;
        this.disposables.dispose();
    }
    private onReplayEnd(): void {
        if (this.replayEndHandled) {
            return;
        }
        this.replayEndHandled = true;
    }
    private handleError(error: any, message: string, isCritical?: boolean): void {
        if (this.gameTurnMgr) {
            this.gameTurnMgr.setErrorState();
        }
        this.pointer.unlock();
        this.errorHandler.handle(error, message, isCritical ? undefined : () => {
            this.leaveAction();
        });
        if (isCritical) {
            this.playerUi?.dispose();
        }
    }
}
