import { Task } from "@puzzl/core/lib/async/Task";
import { WolConnection } from "@/network/WolConnection";
import { WolError } from "@/network/WolError";
import { SlotType, SlotInfo } from "@/network/gameopt/SlotInfo";
import { GameOpts } from "@/game/gameopts/GameOpts";
import { RANDOM_COUNTRY_ID, RANDOM_COLOR_ID, RANDOM_START_POS, NO_TEAM_ID, OBS_COUNTRY_ID, OBS_COLOR_ID, RANDOM_COUNTRY_NAME, OBS_COUNTRY_NAME, RANDOM_COLOR_NAME, RANDOM_COUNTRY_UI_NAME, OBS_COUNTRY_UI_NAME, RANDOM_COUNTRY_UI_TOOLTIP, OBS_COUNTRY_UI_TOOLTIP, aiUiNames } from "@/game/gameopts/constants";
import { LobbyForm } from "@/gui/screen/mainMenu/lobby/component/LobbyForm";
import { LobbyType, SlotOccupation, SlotType as ViewModelSlotType, PlayerStatus } from "@/gui/screen/mainMenu/lobby/component/viewmodel/lobby";
import { PasswordBox } from "@/gui/screen/mainMenu/lobby/component/PasswordBox";
import { CreateGameBox } from "@/gui/screen/mainMenu/lobby/component/CreateGameBox";
import { ScreenType } from "@/gui/screen/mainMenu/ScreenType";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { DownloadError } from "@/engine/ResourceLoader";
import { CancellationTokenSource, OperationCanceledError } from "@puzzl/core/lib/async/cancellation";
import { MapPreviewRenderer } from "@/gui/screen/mainMenu/lobby/MapPreviewRenderer";
import { findIndexReverse } from "@/util/array";
import { SoundKey } from "@/engine/sound/SoundKey";
import { ChannelType } from "@/engine/sound/ChannelType";
import { StorageKey } from "LocalPrefs";
import { PreferredHostOpts } from "@/gui/screen/mainMenu/lobby/PreferredHostOpts";
import { isNotNullOrUndefined } from "@/util/typeGuard";
import { GameOptSanitizer } from "@/game/gameopts/GameOptSanitizer";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { MapFile } from "data/MapFile";
import { MapDigest } from "@/engine/MapDigest";
import { MAX_MAP_TRANSFER_BYTES } from "@/network/gservConfig";
import { WolHasMapStatus } from "@/network/WolConfig";
import { MainMenuRoute } from "@/gui/screen/mainMenu/MainMenuRoute";
import { sleep } from "@puzzl/core/lib/async/sleep";
import { ChatRecipientType } from "@/network/chat/ChatMessage";
import { ChatHistory } from "@/gui/chat/ChatHistory";
import { Throttle } from "@/util/time";
interface GameMode {
    id: number;
    label: string;
    mpDialogSettings: any;
}
interface GameModes {
    getById(id: number): GameMode;
}
interface MapListEntry {
    fileName: string;
    maxSlots: number;
    official: boolean;
    getFullMapTitle(strings: any): string;
}
interface MapList {
    getByName(name: string): MapListEntry;
}
interface MapFileLoader {
    load(mapName: string): Promise<any>;
}
interface WolService {
    getConfig(): any;
    onWolConnectionLost: {
        subscribe(handler: (error: any) => void): void;
        unsubscribe(handler: (error: any) => void): void;
    };
}
interface WladderService {
    getUrl(): string;
    listSearch(playerNames: string[], cancellationToken: any): Promise<any[]>;
}
interface MapTransferService {
    getUrl(): string;
}
interface GservConnection {
    connect(url: string, options: any): Promise<void>;
    ping(timeout: number): Promise<number>;
    close(): void;
}
interface RootController {
    createGame(gameId: string, timestamp: number, gservUrl: string, username: string, gameOpts: GameOpts, singlePlayer: boolean, tournament: boolean, mapTransfer: boolean, privateGame: boolean, fallbackRoute: MainMenuRoute): void;
    joinGame(gameId: string, timestamp: number, gservUrl: string, username: string, tournament: boolean, mapTransfer: boolean, fallbackRoute: MainMenuRoute): void;
}
interface ErrorHandler {
    handle(error: any, message: string, onClose: () => void): void;
}
interface MessageBoxApi {
    show(message: string, buttonText?: string, onClose?: () => void): void;
    confirm(message: string, confirmText: string, cancelText: string): Promise<boolean>;
}
interface Sound {
    play(key: SoundKey, channel: ChannelType): void;
}
interface LocalPrefs {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}
interface Rules {
    getMultiplayerCountries(): any[];
    getMultiplayerColors(): Map<number, any>;
    mpDialogSettings: any;
    general: any;
}
interface LobbyScreenParams {
    create?: boolean;
    game?: any;
    observe?: boolean;
}
interface CreateGameOptions {
    roomDesc: string;
    observe: boolean;
    pass?: string;
    tournament: boolean;
}
interface PlayerPing {
    playerName: string;
    ping: number;
}
export class LobbyScreen extends MainMenuScreen {
    private botsEnabled: boolean;
    private engineModHash: string;
    private activeModMeta?: any;
    private rootController: RootController;
    private errorHandler: ErrorHandler;
    private messageBoxApi: MessageBoxApi;
    private strings: any;
    private uiScene: any;
    private wolCon: WolConnection;
    private wolService: WolService;
    private wladderService: WladderService;
    private mapTransferService: MapTransferService;
    private gservCon: GservConnection;
    private rules: Rules;
    private gameOptParser: any;
    private gameOptSerializer: any;
    private jsxRenderer: any;
    private mapFileLoader: MapFileLoader;
    private mapList: MapList;
    private gameModes: GameModes;
    private sound: Sound;
    private localPrefs: LocalPrefs;
    private messages: any[] = [];
    private playerReadyStatus: Map<string, boolean> = new Map();
    private playerHasMapStatus: Map<string, WolHasMapStatus> = new Map();
    private playerProfiles: Map<string, any> = new Map();
    private disposables: CompositeDisposable = new CompositeDisposable();
    private playerPings: PlayerPing[] = [];
    private gameChannelName?: string;
    private hostMode: boolean = false;
    private hostPlayerName?: string;
    private hostIsFreshAccount?: boolean;
    private hostRoomDesc: string = "";
    private isTournament: boolean = false;
    private hostPrivateGame: boolean = false;
    private observerSlotIndex: number = 8;
    private gameOpts?: GameOpts;
    private frozenGameOpts?: GameOpts;
    private slotsInfo?: SlotInfo[];
    private currentMapFile?: any;
    private preferredHostOpts?: PreferredHostOpts;
    private formModel?: any;
    private lobbyForm?: any;
    private passBox?: any;
    private createGameBox?: any;
    private currentGameServer?: any;
    private pingsUpdateTask?: Task<void>;
    private ranksUpdateTask?: Task<void>;
    private gservPingUpdateTask?: Task<void>;
    private mapLoadTask?: Task<void>;
    private hostOptsIntervalId?: number;
    private gservPingIntervalId?: number;
    constructor(botsEnabled: boolean, engineModHash: string, activeModMeta: any, rootController: RootController, errorHandler: ErrorHandler, messageBoxApi: MessageBoxApi, strings: any, uiScene: any, wolCon: WolConnection, wolService: WolService, wladderService: WladderService, mapTransferService: MapTransferService, gservCon: GservConnection, rules: Rules, gameOptParser: any, gameOptSerializer: any, jsxRenderer: any, mapFileLoader: MapFileLoader, mapList: MapList, gameModes: GameModes, sound: Sound, localPrefs: LocalPrefs) {
        super();
        this.botsEnabled = botsEnabled;
        this.engineModHash = engineModHash;
        this.activeModMeta = activeModMeta;
        this.rootController = rootController;
        this.errorHandler = errorHandler;
        this.messageBoxApi = messageBoxApi;
        this.strings = strings;
        this.uiScene = uiScene;
        this.wolCon = wolCon;
        this.wolService = wolService;
        this.wladderService = wladderService;
        this.mapTransferService = mapTransferService;
        this.gservCon = gservCon;
        this.rules = rules;
        this.gameOptParser = gameOptParser;
        this.gameOptSerializer = gameOptSerializer;
        this.jsxRenderer = jsxRenderer;
        this.mapFileLoader = mapFileLoader;
        this.mapList = mapList;
        this.gameModes = gameModes;
        this.sound = sound;
        this.localPrefs = localPrefs;
        this.updatePings = () => {
            if (this.wolCon.isOpen()) {
                if (this.gameChannelName && this.wolCon.isInChannel(this.gameChannelName)) {
                    this.pingsUpdateTask?.cancel();
                    const task = (this.pingsUpdateTask = new Task(async (cancellationToken) => {
                        const users = await this.wolCon.listUsers(this.gameChannelName!);
                        if (!cancellationToken.isCancelled()) {
                            for (const user of users) {
                                this.updatePlayerPing(user.name, user.ping);
                            }
                            this.sendPingData();
                        }
                    }));
                    task.start().catch((error) => {
                        if (!(error instanceof OperationCanceledError)) {
                            console.error(error);
                        }
                    });
                }
            }
            else {
                this.onWolClose();
            }
        };
        this.updateRanks = () => {
            if (this.wladderService.getUrl() && this.slotsInfo) {
                this.ranksUpdateTask?.cancel();
                const task = (this.ranksUpdateTask = new Task(async (cancellationToken) => {
                    await sleep(5000, cancellationToken);
                    const playerNames = this.slotsInfo!
                        .map((slot) => (slot.type === SlotType.Player ? slot.name : undefined))
                        .filter(isNotNullOrUndefined);
                    const profiles = await this.wladderService.listSearch(playerNames, cancellationToken);
                    if (!cancellationToken.isCancelled()) {
                        for (const profile of profiles) {
                            this.playerProfiles.set(profile.name, profile);
                        }
                        this.updateFormModel();
                    }
                }));
                task.start().catch((error) => {
                    if (!(error instanceof OperationCanceledError)) {
                        console.error(error);
                    }
                });
            }
        };
        this.onChannelLeave = (event: any) => {
            if (event.channel === this.gameChannelName) {
                if (this.hostMode) {
                    if (event.user.name !== this.wolCon.getCurrentUser()) {
                        this.handlePlayerJoinLeave(event);
                    }
                }
                else {
                    if (event.user.name !== this.hostPlayerName && event.user.name !== this.wolCon.getCurrentUser()) {
                        return;
                    }
                    this.controller?.goToScreen(ScreenType.CustomGame, {});
                }
            }
        };
        this.onChannelJoin = (event: any) => {
            if (this.wolCon.isOpen() &&
                this.gameChannelName &&
                event.user.name !== this.wolCon.getCurrentUser()) {
                this.sound.play(event.type === "join" ? SoundKey.PlayerJoined : SoundKey.PlayerLeft, ChannelType.Ui);
                if (event.type === "join") {
                    this.updatePlayerPing(event.user.name, event.user.ping);
                }
                if (this.hostMode) {
                    this.handlePlayerJoinLeave(event);
                }
                else {
                    this.wolCon.sendPlayerReady(false);
                }
                if (!this.playerProfiles.has(event.user.name)) {
                    this.updateRanks();
                }
            }
        };
        this.onChannelMessage = (message: any) => {
            if (this.lobbyForm) {
                if (message.to.type === ChatRecipientType.Page ||
                    message.to.type === ChatRecipientType.Whisper) {
                    this.sound.play(SoundKey.IncomingMessage, ChannelType.Ui);
                }
                this.messages.push(message);
                this.lobbyForm.refresh();
            }
            if (message.to.type === ChatRecipientType.Whisper &&
                message.to.name !== this.wolCon.getServerName() &&
                message.from !== this.wolCon.getCurrentUser()) {
                this.chatHistory.lastWhisperFrom.value = message.from;
            }
        };
        this.handleGameStart = (event: any) => {
            const username = this.wolCon.getCurrentUser();
            const fallbackRoute = new MainMenuRoute(ScreenType.Login, {
                afterLogin: (messages: any[]) => new MainMenuRoute(ScreenType.CustomGame, { messages }),
            });
            if (this.hostMode) {
                const gameOpts = this.frozenGameOpts ?? this.gameOpts;
                const mapTransfer = [...this.playerHasMapStatus.values()].includes(WolHasMapStatus.MapTransfer);
                this.rootController.createGame(event.gameId, event.timestamp, event.gservUrl, username!, gameOpts!, false, this.isTournament, mapTransfer, this.hostPrivateGame, fallbackRoute);
            }
            else {
                const mapTransfer = this.playerHasMapStatus.get(username!) === WolHasMapStatus.MapTransfer;
                this.rootController.joinGame(event.gameId, event.timestamp, event.gservUrl, username!, this.isTournament, mapTransfer, fallbackRoute);
            }
        };
        this.handleGameServer = (event: any) => {
            if (this.currentGameServer?.id !== event.id) {
                this.currentGameServer = event;
                this.formModel.selectedGameServer = event.id;
                this.playerPings.length = 0;
                this.lobbyForm?.refresh();
                if (this.hostMode) {
                    this.updatePings();
                }
                this.updateGservPing();
            }
        };
        this.handleGameOpt = (event: any) => {
            const opt = event.opt;
            const optType = opt[0];
            if (this.hostMode) {
                if (event.user !== this.hostPlayerName) {
                    if (optType === "A") {
                        this.handleGameOptReady(event.user, opt[1]);
                    }
                    else if (optType === "R") {
                        this.handlePlayerOptsChange(event.user, opt);
                    }
                    else if (optType === "K") {
                        this.handleGameOptHasMap(event.user, opt[1]);
                    }
                    else {
                        throw new Error("Unknown GAMEOPT string " + opt);
                    }
                }
            }
            else {
                if (optType === "L") {
                    this.handleGameOptSlots(opt);
                    if (this.slotsInfo!.some((slot) => slot.type === SlotType.Player &&
                        !this.playerProfiles.has(slot.name!))) {
                        this.updateRanks();
                    }
                }
                else if (optType === "P") {
                    this.handleGameOptPing(opt.slice(1));
                }
                else if (optType === "O") {
                    this.handleGameOptObserver(opt[1]);
                }
                else if (optType === "A") {
                    this.handleGameOptReady(event.user, opt[1]);
                }
                else if (optType === "K") {
                    this.handleGameOptHasMap(event.user, opt[1]);
                }
                else if (optType === "R") {
                    return;
                }
                else if (optType === "G") {
                    if (!this.playerReadyStatus.get(this.wolCon.getCurrentUser())) {
                        this.addSystemMessage(this.strings.get("GUI:HostGameStartJoiner"));
                    }
                    return;
                }
                else if (!optType.match(/^-|\d+/)) {
                    throw new Error("Unknown GAMEOPT string " + opt);
                }
                else {
                    this.handleGameOptOptions(opt);
                }
            }
            this.updateFormModel();
        };
        this.onWolClose = () => {
            if (this.hostOptsIntervalId) {
                clearInterval(this.hostOptsIntervalId);
            }
            if (this.gservPingIntervalId) {
                clearInterval(this.gservPingIntervalId);
            }
        };
        this.onWolConLost = (error: any) => {
            this.errorHandler.handle(error, this.strings.get("TXT_YOURE_DISCON"), () => {
                this.controller?.goToScreen(ScreenType.Home);
            });
        };
    }
    private updatePings: () => void;
    private updateRanks: () => void;
    private onChannelLeave: (event: any) => void;
    private onChannelJoin: (event: any) => void;
    private onChannelMessage: (message: any) => void;
    private handleGameStart: (event: any) => void;
    private handleGameServer: (event: any) => void;
    private handleGameOpt: (event: any) => void;
    private onWolClose: () => void;
    private onWolConLost: (error: any) => void;
    private chatHistory!: ChatHistory;
    async onEnter(params: LobbyScreenParams): Promise<void> {
        if (!this.wolCon.getCurrentUser()) {
            this.messageBoxApi.show(this.strings.get("TXT_YOURE_DISCON"), this.strings.get("GUI:Ok"), () => {
                this.controller?.goToScreen(ScreenType.Home);
            });
            return;
        }
        const cancellationSource = new CancellationTokenSource();
        this.disposables.add(() => cancellationSource.cancel());
        const cancellationToken = cancellationSource.token;
        this.gameChannelName = undefined;
        this.lobbyForm = undefined;
        this.chatHistory = new ChatHistory();
        this.playerPings = [];
        this.initFormModel();
        this.wolCon.onGameOpt.subscribe(this.handleGameOpt);
        this.wolCon.onGameStart.subscribe(this.handleGameStart);
        this.wolCon.onGameServer.subscribe(this.handleGameServer);
        this.wolCon.onLeaveChannel.subscribe(this.onChannelLeave);
        this.wolCon.onJoinChannel.subscribe(this.onChannelJoin);
        this.wolCon.onChatMessage.subscribe(this.onChannelMessage);
        this.wolCon.onClose.subscribe(this.onWolClose);
        this.wolService.onWolConnectionLost.subscribe(this.onWolConLost);
        this.hostMode = !!params.create;
        if (this.hostMode) {
            this.title = this.strings.get("GUI:HostScreen");
            this.createGame(cancellationToken);
        }
        else {
            this.title = this.strings.get("GUI:JoinScreen");
            const { game, observe } = params;
            this.joinGame(game!, !!observe, undefined, cancellationToken);
        }
    }
    private async joinGame(game: any, observe: boolean, password?: string, cancellationToken?: any): Promise<void> {
        if (password || !game.passLocked) {
            const channelName = game.name;
            try {
                const hostPlayerPromise = this.waitForHostPlayer(channelName, cancellationToken).catch((error) => {
                    if (!(error instanceof OperationCanceledError))
                        throw error;
                });
                await this.wolCon.joinGame(channelName, password, observe);
                if (cancellationToken?.isCancelled())
                    return;
                this.gameChannelName = channelName;
                const hostPlayer = await hostPlayerPromise;
                if (cancellationToken?.isCancelled())
                    return;
                this.hostPlayerName = hostPlayer.name;
                this.hostIsFreshAccount = hostPlayer.fresh;
                this.isTournament = game.tournament;
                this.formModel.channels = [this.gameChannelName];
                if (observe) {
                    this.sendPlayerInfo(OBS_COUNTRY_ID, RANDOM_COLOR_ID, RANDOM_START_POS, NO_TEAM_ID);
                }
                else {
                    const savedCountry = this.localPrefs.getItem(StorageKey.LastPlayerCountry);
                    const savedColor = this.localPrefs.getItem(StorageKey.LastPlayerColor);
                    const countryId = savedCountry !== undefined &&
                        Number(savedCountry) < this.getAvailablePlayerCountries().length
                        ? Number(savedCountry)
                        : RANDOM_COUNTRY_ID;
                    const colorId = savedColor !== undefined &&
                        Number(savedColor) < this.getAvailablePlayerColors().length &&
                        this.getSelectablePlayerColors().includes(this.getColorNameById(Number(savedColor)))
                        ? Number(savedColor)
                        : RANDOM_COLOR_ID;
                    if (!(countryId === RANDOM_COUNTRY_ID && colorId === RANDOM_COLOR_ID)) {
                        this.sendPlayerInfo(countryId, colorId, RANDOM_START_POS, NO_TEAM_ID);
                    }
                }
                this.observerSlotIndex = 8;
            }
            catch (error) {
                if (error instanceof WolError) {
                    const errorMessages = new Map<string, string>()
                        .set(WolError.Code.BadChannelPass, "TXT_BADPASS")
                        .set(WolError.Code.GameHasClosed, "TXT_GAME_CLOSED")
                        .set(WolError.Code.ChannelFull, "TXT_CHANNEL_FULL")
                        .set(WolError.Code.BannedFromChannel, "TXT_JOINBAN");
                    const messageKey = errorMessages.get(error.code);
                    if (messageKey) {
                        this.messageBoxApi.show(this.strings.get(messageKey), this.strings.get("GUI:Ok"), () => {
                            this.controller?.goToScreen(ScreenType.CustomGame, {});
                        });
                        return;
                    }
                }
                else if (error instanceof OperationCanceledError) {
                    return;
                }
                this.handleError(error, this.strings.get("WOL:MatchBadParameters"));
                return;
            }
            this.controller.toggleSidebarPreview(true);
            this.initView();
        }
        else {
            this.showPasswordBox((password: string) => {
                this.joinGame(game, observe, password, cancellationToken);
            }, () => {
                this.controller?.goToScreen(ScreenType.CustomGame, {});
            });
        }
    }
    private waitForHostPlayer(channelName: string, cancellationToken: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const handler = (event: any) => {
                if (event.channelName === channelName) {
                    this.wolCon.onChannelUsers.unsubscribe(handler);
                    const hostPlayer = event.users.find((user: any) => user.operator);
                    if (hostPlayer) {
                        resolve(hostPlayer);
                    }
                    else {
                        reject(new Error("Host player not found"));
                    }
                }
            };
            this.wolCon.onChannelUsers.subscribe(handler);
            cancellationToken?.register(() => {
                this.wolCon.onChannelUsers.unsubscribe(handler);
                reject(new OperationCanceledError(cancellationToken));
            });
        });
    }
    private async createGame(cancellationToken: any, options?: CreateGameOptions): Promise<void> {
        if (options) {
            try {
                const { roomDesc, tournament, observe, pass } = options;
                const channelName = this.wolCon.makeGameChannelName();
                const hostPlayerPromise = this.waitForHostPlayer(channelName, cancellationToken).catch((error) => {
                    if (!(error instanceof OperationCanceledError))
                        throw error;
                });
                await this.wolCon.createGame(channelName, 1, 9, this.wolService.getConfig().getClientChannelType(), tournament, pass);
                if (cancellationToken?.isCancelled())
                    return;
                this.gameChannelName = channelName;
                const hostPlayer = await hostPlayerPromise;
                if (cancellationToken?.isCancelled())
                    return;
                this.hostPlayerName = this.wolCon.getCurrentUser();
                this.hostIsFreshAccount = hostPlayer.fresh;
                this.hostRoomDesc = roomDesc;
                this.isTournament = tournament;
                this.hostPrivateGame = !!pass;
                this.observerSlotIndex = observe ? 0 : 8;
                this.formModel.lobbyType = LobbyType.MultiplayerHost;
                this.formModel.activeSlotIndex = observe ? -1 : 0;
                this.formModel.channels = [this.gameChannelName];
                await this.initHostOptions(observe, cancellationToken);
                if (cancellationToken?.isCancelled())
                    return;
                this.updateMapPreview(this.currentMapFile);
                this.updateFormModel();
                this.updatePings();
                this.updateRanks();
                this.sendGameOpts();
                this.sendModeMaxSlots();
                this.hostOptsIntervalId = window.setInterval(() => {
                    if (this.wolCon.isOpen() && this.gameChannelName) {
                        this.sendGameOpts();
                        this.updatePings();
                    }
                }, 5000);
            }
            catch (error) {
                this.handleError(error, error instanceof DownloadError
                    ? this.strings.get("TXT_DOWNLOAD_FAILED")
                    : this.strings.get("WOL:MatchBadParameters"));
                return;
            }
            this.controller.toggleSidebarPreview(true);
            this.initView();
        }
        else {
            this.showCreateGameBox((roomDesc: string, pass: string, observe: boolean) => {
                this.createGame(cancellationToken, {
                    roomDesc,
                    observe,
                    pass,
                    tournament: false,
                });
            }, () => {
                this.controller?.goToScreen(ScreenType.CustomGame, {});
            });
        }
    }
    private getAvailablePlayerCountryRules(): any[] {
        return this.rules.getMultiplayerCountries();
    }
    private getAvailablePlayerCountries(): string[] {
        return this.getAvailablePlayerCountryRules().map((country) => country.name);
    }
    private getAvailablePlayerColors(): string[] {
        return [...this.rules.getMultiplayerColors().values()].map((color) => color.asHexString());
    }
    private getSelectablePlayerColors(): string[] {
        const usedColors: string[] = [];
        if (this.formModel?.playerSlots) {
            this.formModel.playerSlots.forEach((slot: any) => {
                if (slot)
                    usedColors.push(slot.color);
            });
        }
        const availableColors = this.getAvailablePlayerColors();
        return [RANDOM_COLOR_NAME].concat(availableColors.filter((color) => color && !usedColors.includes(color)));
    }
    private getColorNameById(colorId: number): string {
        return colorId === RANDOM_COLOR_ID
            ? RANDOM_COLOR_NAME
            : this.getAvailablePlayerColors()[colorId];
    }
    private getColorIdByName(colorName: string): number {
        if (colorName === RANDOM_COLOR_NAME)
            return RANDOM_COLOR_ID;
        const availableColors = this.getAvailablePlayerColors();
        const colorId = availableColors.indexOf(colorName);
        if (colorId === -1) {
            throw new Error(`Color ${colorName} not found in available player colors`);
        }
        return colorId;
    }
    private initFormModel(): void {
    }
    private updateFormModel(): void {
    }
    private initView(): void {
        this.initLobbyForm();
        this.refreshSidebarButtons();
        this.refreshSidebarMpText();
        this.controller.showSidebarButtons();
    }
    private initLobbyForm(): void {
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            innerRef: (ref: any) => (this.lobbyForm = ref),
            component: LobbyForm,
            props: this.formModel,
        }));
        this.controller.setMainComponent(component);
    }
    private refreshSidebarButtons(): void {
    }
    private refreshSidebarMpText(): void {
    }
    private sendPlayerInfo(countryId: number, colorId: number, startPos: number, teamId: number, slotIndex?: number): void {
    }
    private updatePlayerPing(playerName: string, ping: number): void {
        const existingPing = this.playerPings.find((p) => p.playerName === playerName);
        if (existingPing) {
            existingPing.ping = ping;
        }
        else {
            this.playerPings.push({ ping, playerName });
        }
    }
    @Throttle(350)
    private sendGameOpts(): void {
    }
    @Throttle(350)
    private sendGameSlotInfo(): void {
    }
    private sendPingData(): void {
    }
    private sendModeMaxSlots(): void {
    }
    private handlePlayerJoinLeave(event: any): void {
    }
    private handleGameOptReady(playerName: string, ready: string): void {
    }
    private handleGameOptHasMap(playerName: string, hasMap: string): void {
    }
    private handleGameOptSlots(opt: string): void {
    }
    private handleGameOptPing(opt: string): void {
    }
    private handleGameOptObserver(opt: string): void {
    }
    private handleGameOptOptions(opt: string): void {
    }
    private handlePlayerOptsChange(playerName: string, opt: string[]): void {
    }
    private addSystemMessage(text: string): void {
        if (this.lobbyForm) {
            this.messages.push({ text });
            this.lobbyForm.refresh();
        }
    }
    private showPasswordBox(onSubmit: (password: string) => void, onDismiss: () => void): void {
    }
    private showCreateGameBox(onSubmit: (roomDesc: string, pass: string, observe: boolean) => void, onDismiss: () => void): void {
    }
    private async initHostOptions(observe: boolean, cancellationToken: any): Promise<void> {
    }
    @Throttle(5000)
    private updateGservPing(): void {
    }
    private updateMapPreview(mapFile?: any): void {
        try {
            if (mapFile) {
                const preview = new MapPreviewRenderer(this.strings).render(new MapFile(mapFile), this.hostMode ? LobbyType.MultiplayerHost : LobbyType.MultiplayerGuest, this.controller.getSidebarPreviewSize());
                this.controller.setSidebarPreview(preview);
            }
        }
        catch (error) {
            console.error("Failed to render map preview");
            console.error(error);
            this.controller.setSidebarPreview();
        }
    }
    private handleError(error: any, message: string): void {
        this.errorHandler.handle(error, message, () => {
            this.controller?.goToScreen(ScreenType.CustomGame, {});
        });
        if (this.hostOptsIntervalId) {
            clearInterval(this.hostOptsIntervalId);
        }
        if (this.gservPingIntervalId) {
            clearInterval(this.gservPingIntervalId);
        }
    }
    async onLeave(): Promise<void> {
        if (this.wolCon.isOpen() && this.wolCon.getCurrentUser() && this.gameChannelName) {
            this.wolCon.leaveChannel(this.gameChannelName);
        }
        this.disposables.dispose();
        this.mapLoadTask?.cancel();
        this.mapLoadTask = undefined;
        this.ranksUpdateTask?.cancel();
        this.ranksUpdateTask = undefined;
        this.pingsUpdateTask?.cancel();
        this.pingsUpdateTask = undefined;
        this.gservPingUpdateTask?.cancel();
        this.gservPingUpdateTask = undefined;
        this.currentMapFile = undefined;
        this.gameChannelName = undefined;
        this.hostPlayerName = undefined;
        this.hostIsFreshAccount = undefined;
        this.hostRoomDesc = "";
        this.gameOpts = undefined;
        this.frozenGameOpts = undefined;
        this.preferredHostOpts = undefined;
        this.slotsInfo = undefined;
        this.playerProfiles.clear();
        this.currentGameServer = undefined;
        if (this.hostOptsIntervalId) {
            clearInterval(this.hostOptsIntervalId);
        }
        if (this.gservPingIntervalId) {
            clearInterval(this.gservPingIntervalId);
        }
        this.wolCon.onGameOpt.unsubscribe(this.handleGameOpt);
        this.wolCon.onGameStart.unsubscribe(this.handleGameStart);
        this.wolCon.onGameServer.unsubscribe(this.handleGameServer);
        this.wolCon.onLeaveChannel.unsubscribe(this.onChannelLeave);
        this.wolCon.onJoinChannel.unsubscribe(this.onChannelJoin);
        this.wolCon.onChatMessage.unsubscribe(this.onChannelMessage);
        this.wolCon.onClose.unsubscribe(this.onWolClose);
        this.wolService.onWolConnectionLost.unsubscribe(this.onWolConLost);
        this.controller.toggleSidebarPreview(false);
        await this.unrender();
    }
    private async unrender(): Promise<void> {
        await this.controller.hideSidebarButtons();
        this.lobbyForm = undefined;
    }
}
