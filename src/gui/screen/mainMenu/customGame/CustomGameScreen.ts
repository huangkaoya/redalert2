import { GameBrowser } from './component/GameBrowser';
import { ScreenType } from '../../ScreenType';
import { CompositeDisposable } from '../../../../util/disposable/CompositeDisposable';
import { jsx } from '../../../jsx/jsx';
import { HtmlView } from '../../../jsx/HtmlView';
import { SoundKey } from '../../../../engine/sound/SoundKey';
import { ChannelType } from '../../../../engine/sound/ChannelType';
import { MusicType } from '../../../../engine/sound/Music';
import { IrcConnection } from '../../../../network/IrcConnection';
import { MainMenuScreen } from '../MainMenuScreen';
import { Task } from '@puzzl/core/lib/async/Task';
import { OperationCanceledError } from '@puzzl/core/lib/async/cancellation/OperationCanceledError';
import { MAX_LIST_SEARCH_COUNT } from '../../../../network/ladder/wladderConfig';
import { MainMenuRoute } from '../MainMenuRoute';
import { ChatMessage, ChatRecipientType } from '../../../../network/chat/ChatMessage';
import { ChatHistory } from '../../../chat/ChatHistory';
import { WolError } from '../../../../network/WolError';
import { CancellationTokenSource, CancellationToken } from '@puzzl/core/lib/async/cancellation';
interface Game {
    name: string;
    mapName: string;
    description: string;
    hostName: string;
    hostPing?: number;
    hostMuted: boolean;
    humanPlayers: number;
    aiPlayers: number;
    maxPlayers: number;
    passLocked: boolean;
    observable: boolean;
    observers?: number;
    tournament?: boolean;
    modName?: string;
    modHash?: string;
}
interface User {
    name: string;
    operator: boolean;
}
interface PlayerProfile {
    name: string;
    rank?: number;
}
interface ServerRegion {
    name: string;
}
interface ServerRegions {
    getSize(): number;
}
interface WolService {
    getConfig(): {
        getClientChannelType(): number;
        getGlobalChannelPass(): string;
    };
    closeWolConnection(): void;
    onWolConnectionLost: {
        subscribe(handler: (error: any) => void): void;
        unsubscribe(handler: (error: any) => void): void;
    };
}
interface WladderService {
    getUrl(): string | null;
    listSearch(names: string[], cancellationToken: CancellationToken): Promise<PlayerProfile[]>;
}
interface MapList {
    getByName(name: string): any;
}
interface Sound {
    play(key: SoundKey, channel: ChannelType): void;
}
interface JsxRenderer {
    render(jsx: any): any[];
}
interface ErrorHandler {
    handle(error: any, message: string, onClose: () => void): void;
}
export class CustomGameScreen extends MainMenuScreen {
    public title: string;
    public musicType: MusicType;
    private engineModHash: string;
    private strings: any;
    private wolCon: IrcConnection;
    private wolService: WolService;
    private wladderService: WladderService;
    private jsxRenderer: JsxRenderer;
    private sound: Sound;
    private serverRegions: ServerRegions;
    private mapList: MapList;
    private errorHandler: ErrorHandler;
    private playerProfiles = new Map<string, PlayerProfile>();
    private disposables = new CompositeDisposable();
    private channelName?: string;
    private users: User[] = [];
    private games: Game[] = [];
    private selectedGame?: Game;
    private messages: any[] = [];
    private chatHistory?: ChatHistory;
    private gameBrowser?: any;
    private refreshTimeoutId?: number;
    private ranksUpdateTask?: Task<void>;
    constructor(engineModHash: string, strings: any, wolCon: IrcConnection, wolService: WolService, wladderService: WladderService, jsxRenderer: JsxRenderer, sound: Sound, serverRegions: ServerRegions, mapList: MapList, errorHandler: ErrorHandler) {
        super();
        this.engineModHash = engineModHash;
        this.strings = strings;
        this.wolCon = wolCon;
        this.wolService = wolService;
        this.wladderService = wladderService;
        this.jsxRenderer = jsxRenderer;
        this.sound = sound;
        this.serverRegions = serverRegions;
        this.mapList = mapList;
        this.errorHandler = errorHandler;
        this.title = this.strings.get("GUI:CustomMatch");
        this.musicType = MusicType.NormalShuffle;
    }
    private onChannelJoinLeave = (event: any) => {
        let channelName = event.channel;
        const lobbyMatch = channelName.match(/#Lob \d+ (\d)/i);
        if (lobbyMatch) {
            const [, lobbyNum] = lobbyMatch.map(Number);
            channelName = this.strings.get("TXT_LOB_" + (lobbyNum + 1));
        }
        if (event.user.name === this.wolCon.getCurrentUser()) {
            this.addSystemMessage(this.strings.get(event.type === "join" ? "TXT_JOINED_S" : "TXT_YOULEFT", channelName));
        }
        else if (event.channel === this.channelName) {
            if (event.type === "join") {
                this.users.push(event.user);
                this.users.sort((a, b) => Number(b.operator) - Number(a.operator));
            }
            else {
                const index = this.users.findIndex(user => user.name === event.user.name);
                if (index !== -1) {
                    this.users.splice(index, 1);
                }
            }
            this.gameBrowser?.refresh();
        }
    };
    private onChannelUsers = (event: any) => {
        if (event.channelName === this.channelName) {
            this.users = event.users;
            this.gameBrowser?.applyOptions((options: any) => {
                options.users = this.users;
            });
        }
    };
    private onChannelMessage = (message: any) => {
        if (message.to.type === ChatRecipientType.Page || message.to.type === ChatRecipientType.Whisper) {
            this.sound.play(SoundKey.IncomingMessage, ChannelType.Ui);
        }
        const messageWithOperator = {
            ...message,
            operator: this.users.find(user => user.name === message.from)?.operator,
        };
        this.messages.push(messageWithOperator);
        this.gameBrowser?.refresh();
        if (message.to.type === ChatRecipientType.Whisper &&
            message.to.name !== this.wolCon.getServerName() &&
            message.from !== this.wolCon.getCurrentUser()) {
            this.chatHistory!.lastWhisperFrom.value = message.from;
        }
    };
    private onWolClose = () => {
        if (this.refreshTimeoutId) {
            clearInterval(this.refreshTimeoutId);
        }
    };
    private onWolConLost = (error: any) => {
        this.handleError(error, this.strings.get("TXT_YOURE_DISCON"));
    };
    private addSystemMessage(text: string) {
        this.messages.push({ text });
        this.gameBrowser?.refresh();
    }
    private async refreshGames(cancellationToken: CancellationToken) {
        if (!this.wolCon.isOpen()) {
            this.onWolClose();
            return;
        }
        if (!this.channelName || !this.wolCon.getCurrentUser()) {
            return;
        }
        try {
            const clientChannelType = this.wolService.getConfig().getClientChannelType();
            const games = await this.wolCon.listGames(clientChannelType, clientChannelType);
            if (cancellationToken?.isCancelled()) {
                return;
            }
            games.sort((a, b) => Number(a.passLocked) - Number(b.passLocked));
            this.games = games;
            const currentSelection = this.selectedGame;
            if (currentSelection) {
                this.onGameSelectionChange(games.find(game => game.name === currentSelection.name));
            }
            this.gameBrowser?.applyOptions((options: any) => {
                options.games = games;
            });
            this.refreshPlayerRanks();
        }
        catch (error) {
            if (error instanceof IrcConnection.SocketError || error instanceof IrcConnection.NoReplyError) {
                return;
            }
            throw error;
        }
    }
    private refreshPlayerRanks() {
        if (!this.wladderService.getUrl()) {
            return;
        }
        this.ranksUpdateTask?.cancel();
        const task = new Task<void>(async (cancellationToken) => {
            const uniqueNames = [
                ...new Set([
                    ...this.users.map(user => user.name),
                    ...this.games.map(game => game.hostName),
                ])
            ].filter(name => !this.playerProfiles.has(name));
            if (uniqueNames.length > 0) {
                while (uniqueNames.length > 0) {
                    const batch = uniqueNames.splice(0, MAX_LIST_SEARCH_COUNT);
                    const profiles = await this.wladderService.listSearch(batch, cancellationToken);
                    if (cancellationToken.isCancelled()) {
                        return;
                    }
                    for (const profile of profiles) {
                        this.playerProfiles.set(profile.name, profile);
                    }
                }
                this.gameBrowser?.refresh();
            }
        });
        this.ranksUpdateTask = task;
        task.start().catch(error => {
            if (!(error instanceof OperationCanceledError)) {
                console.error(error);
            }
        });
    }
    private onGameSelectionChange(game?: Game) {
        this.selectedGame = game;
        this.refreshSidebarButtons();
    }
    private gameIsFull(game: Game): boolean {
        return game.humanPlayers + game.aiPlayers === game.maxPlayers - (game.observable ? 1 : 0);
    }
    private refreshSidebarButtons() {
        const game = this.selectedGame;
        const buttons = [
            {
                label: this.strings.get("GUI:CreateGame"),
                tooltip: this.strings.get("STT:LobbyButtonNew"),
                onClick: () => this.createGame(),
            },
            {
                label: this.strings.get("GUI:JoinGame"),
                tooltip: this.strings.get("STT:LobbyButtonJoin"),
                disabled: !game || this.gameIsFull(game),
                onClick: () => this.joinGame(game!),
            },
            {
                label: this.strings.get("GUI:Observe"),
                tooltip: this.strings.get("STT:LobbyButtonObserve"),
                disabled: !game || !game.observable || !!game.observers,
                onClick: () => this.observeGame(game!),
            },
            ...(this.serverRegions.getSize() > 1 ? [{
                    label: this.strings.get("GUI:ChangeServer"),
                    tooltip: this.strings.get("STT:ChangeServer"),
                    onClick: () => {
                        this.wolService.closeWolConnection();
                        this.controller?.goToScreen(ScreenType.Login, {
                            clearCredentials: true,
                            afterLogin: (messages: any) => new MainMenuRoute(ScreenType.CustomGame, { messages }),
                        });
                    },
                }] : []),
            {
                label: this.strings.get("GUI:Back"),
                tooltip: this.strings.get("STT:LobbyButtonBack"),
                isBottom: true,
                onClick: () => {
                    this.wolService.closeWolConnection();
                    this.controller?.goToScreen(ScreenType.Home);
                },
            },
        ];
        this.controller.setSidebarButtons(buttons);
    }
    private initView(cancellationToken: CancellationToken) {
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            innerRef: (ref: any) => (this.gameBrowser = ref),
            component: GameBrowser,
            props: {
                strings: this.strings,
                messages: this.messages,
                chatHistory: this.chatHistory,
                channels: [this.channelName!],
                localUsername: this.wolCon.getCurrentUser(),
                users: this.users,
                games: this.games,
                playerProfiles: this.playerProfiles,
                mapList: this.mapList,
                onSendMessage: (message: any) => {
                    if (message.value.length) {
                        if (this.wolCon.isOpen()) {
                            this.wolCon.sendChatMessage(message.value, message.recipient);
                            if (message.recipient.type === ChatRecipientType.Whisper) {
                                this.chatHistory!.lastWhisperTo.value = message.recipient.name;
                            }
                        }
                    }
                    else {
                        this.addSystemMessage(this.strings.get("TXT_ENTER_MESSAGE"));
                    }
                },
                onRefreshClick: () => this.refreshGames(cancellationToken),
                onSelectGame: (game: Game) => this.onGameSelectionChange(game),
                onDoubleClickGame: (game: Game) => {
                    if (!this.gameIsFull(game)) {
                        this.joinGame(game);
                    }
                },
            },
        }));
        this.controller.setMainComponent(component);
        this.refreshSidebarButtons();
        this.controller.showSidebarButtons();
    }
    async onEnter(params?: any): Promise<void> {
        this.messages = params?.messages ?? [];
        this.chatHistory = new ChatHistory();
        this.controller.toggleMainVideo(false);
        const tokenSource = new CancellationTokenSource();
        this.disposables.add(() => tokenSource.cancel());
        const cancellationToken = tokenSource.token;
        if (this.wolCon.getCurrentUser()) {
            await this.loadChannel(cancellationToken);
        }
        else {
            this.controller.goToScreen(ScreenType.Login, {
                afterLogin: (messages: any) => new MainMenuRoute(ScreenType.CustomGame, { messages }),
            });
        }
    }
    private async loadChannel(cancellationToken: CancellationToken) {
        this.channelName = undefined;
        this.users = [];
        this.games = [];
        this.selectedGame = undefined;
        this.wolCon.onJoinChannel.subscribe(this.onChannelJoinLeave);
        this.wolCon.onLeaveChannel.subscribe(this.onChannelJoinLeave);
        this.wolCon.onChannelUsers.subscribe(this.onChannelUsers);
        this.wolCon.onChatMessage.subscribe(this.onChannelMessage);
        this.wolCon.onClose.subscribe(this.onWolClose);
        this.wolService.onWolConnectionLost.subscribe(this.onWolConLost);
        try {
            const config = this.wolService.getConfig();
            const channelName = `#Lob ${config.getClientChannelType()} 0`;
            await this.wolCon.joinChannel(channelName, config.getGlobalChannelPass());
            if (cancellationToken.isCancelled()) {
                return;
            }
            this.channelName = channelName;
            this.playerProfiles.clear();
            this.initView(cancellationToken);
            this.gameBrowser?.applyOptions((options: any) => {
                options.users = this.users;
            });
            this.refreshGames(cancellationToken);
            this.refreshTimeoutId = setInterval(() => this.refreshGames(cancellationToken), 5000);
        }
        catch (error) {
            let message = this.strings.get("WOL:MatchBadParameters");
            if (error instanceof WolError) {
                const errorMessages = new Map([
                    [WolError.Code.NoSuchChannel, "WOL:ChannelJoinFailure"],
                    [WolError.Code.BadChannelPass, "TXT_BADPASS"],
                    [WolError.Code.ChannelFull, "TXT_CHANNEL_FULL"],
                    [WolError.Code.BannedFromChannel, "TXT_JOINBAN"],
                ]);
                const errorMessage = errorMessages.get(error.code);
                if (errorMessage) {
                    message = this.strings.get(errorMessage);
                }
            }
            this.handleError(error, message);
        }
    }
    async onLeave(): Promise<void> {
        this.disposables.dispose();
        if (this.refreshTimeoutId) {
            clearInterval(this.refreshTimeoutId);
        }
        if (this.ranksUpdateTask) {
            this.ranksUpdateTask.cancel();
            this.ranksUpdateTask = undefined;
        }
        if (this.wolCon.isOpen() && this.channelName) {
            this.wolCon.leaveChannel(this.channelName);
        }
        this.wolCon.onJoinChannel.unsubscribe(this.onChannelJoinLeave);
        this.wolCon.onLeaveChannel.unsubscribe(this.onChannelJoinLeave);
        this.wolCon.onChannelUsers.unsubscribe(this.onChannelUsers);
        this.wolCon.onChatMessage.unsubscribe(this.onChannelMessage);
        this.wolCon.onClose.unsubscribe(this.onWolClose);
        this.wolService.onWolConnectionLost.unsubscribe(this.onWolConLost);
        await this.controller.hideSidebarButtons();
        this.channelName = undefined;
        this.gameBrowser = undefined;
        this.messages = [];
        this.users = [];
        this.playerProfiles.clear();
        this.games = [];
        this.selectedGame = undefined;
    }
    private async createGame() {
        this.controller.goToScreen(ScreenType.Lobby, { create: true });
    }
    private async joinGame(game: Game) {
        this.joinRoom(game, false);
    }
    private observeGame(game: Game) {
        this.joinRoom(game, true);
    }
    private joinRoom(game: Game, observe: boolean) {
        if (game.modHash === this.engineModHash) {
            this.controller.goToScreen(ScreenType.Lobby, {
                game,
                observe,
            });
        }
        else if (game.modHash !== undefined) {
            this.addSystemMessage(this.strings.get("TXT_MISMATCH"));
        }
    }
    private handleError(error: any, message: string) {
        this.errorHandler.handle(error, message, () => {
            this.wolService.closeWolConnection();
            this.controller?.goToScreen(ScreenType.Home);
        });
        if (this.refreshTimeoutId) {
            clearInterval(this.refreshTimeoutId);
        }
    }
}
