import { Task } from "@puzzl/core/lib/async/Task";
import { CancellationTokenSource, OperationCanceledError } from "@puzzl/core/lib/async/cancellation";
import { jsx } from "@/gui/jsx/jsx";
import { HtmlView } from "@/gui/jsx/HtmlView";
import { MusicType } from "@/engine/sound/Music";
import { MainMenuScreen } from "@/gui/screen/mainMenu/MainMenuScreen";
import { ScreenType } from "@/gui/screen/mainMenu/ScreenType";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { RANDOM_COUNTRY_ID, RANDOM_COLOR_ID, OBS_COUNTRY_ID } from "@/game/gameopts/constants";
import { SoundKey } from "@/engine/sound/SoundKey";
import { ChannelType } from "@/engine/sound/ChannelType";
import { MainMenuRoute } from "@/gui/screen/mainMenu/MainMenuRoute";
import { QuickGameForm } from "@/gui/screen/mainMenu/quickGame/component/QuickGameForm";
import { StorageKey } from "LocalPrefs";
import { WLadderService } from "@/network/ladder/WLadderService";
import { LadderQueueType } from "@/network/ladder/wladderConfig";
import { WolError } from "@/network/WolError";
import { RPL_QUEUE_LIST, RPL_WORKING, RPL_BAD_VERS, RPL_BAD_HASH, RPL_MODE_UNAVAIL, RPL_MATCHED, RPL_REQUEUE, RPL_STATS } from "@/network/qmCodes";
import { ChatUi } from "@/gui/screen/mainMenu/quickGame/ChatUi";
enum QueueState {
    None = 0,
    Initializing = 1,
    WaitingForMatch = 2,
    WaitingForStartTimer = 3,
    WaitingForGameStart = 4
}
interface QueueOptions {
    type: LadderQueueType;
    ranked: boolean;
    countryId: number;
    colorId: number;
}
interface QuickGameScreenParams {
    messages: any[];
}
interface WolConnection {
    getCurrentUser(): string | undefined;
    isOpen(): boolean;
    close(): void;
    onClose: {
        subscribe(handler: () => void): void;
        unsubscribe(handler: () => void): void;
    };
    onChatMessage: {
        subscribe(handler: (msg: any) => void): void;
        unsubscribe(handler: (msg: any) => void): void;
    };
    onLeaveChannel: {
        subscribe(handler: (event: any) => void): void;
        unsubscribe(handler: (event: any) => void): void;
    };
    onGameStart: {
        subscribe(handler: (event: any) => void): void;
        unsubscribe(handler: (event: any) => void): void;
    };
}
interface WolService {
    isConnected(): boolean;
    getConnection(): WolConnection;
    getConfig(): any;
    onWolConnectionLost: {
        subscribe(handler: (error: any) => void): void;
        unsubscribe(handler: (error: any) => void): void;
    };
}
interface RootController {
    joinGame(gameId: string, timestamp: number, gservUrl: string, username: string, tournament: boolean, mapTransfer: boolean, fallbackRoute: MainMenuRoute): void;
}
interface MessageBoxApi {
    show(message: string, buttonText?: string, onClose?: () => void): void;
    destroy(): void;
}
interface ErrorHandler {
    handle(error: any, message: string, onClose: () => void): void;
}
interface LocalPrefs {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
}
interface Sound {
    play(key: SoundKey, channel: ChannelType): void;
}
interface Rules {
    getMultiplayerCountries(): any[];
    getMultiplayerColors(): Map<number, any>;
}
export class QuickGameScreen extends MainMenuScreen {
    private unrankedEnabled: boolean;
    private engineVersion: string;
    private engineModHash: string;
    private clientLocale: string;
    private rules: Rules;
    private wolService: WolService;
    private wolCon: WolConnection;
    private wladderService: WLadderService;
    private serverRegions: any;
    private rootController: RootController;
    private messageBoxApi: MessageBoxApi;
    private jsxRenderer: any;
    private strings: any;
    private localPrefs: LocalPrefs;
    private sound: Sound;
    private errorHandler: ErrorHandler;
    private partySize: number = 1;
    private availableQueueTypes: LadderQueueType[] = Object.values(LadderQueueType);
    private disposables: CompositeDisposable = new CompositeDisposable();
    private queueState: QueueState = QueueState.None;
    private queueOpts!: QueueOptions;
    private playerProfile?: any;
    private wolConfig?: any;
    private chatUi?: ChatUi;
    private form?: any;
    private quickMatchChannelName?: string;
    private countdownSeconds?: number;
    private countdownIntervalId?: number;
    constructor(unrankedEnabled: boolean, engineVersion: string, engineModHash: string, clientLocale: string, rules: Rules, wolService: WolService, wolCon: WolConnection, wladderService: WLadderService, serverRegions: any, rootController: RootController, messageBoxApi: MessageBoxApi, jsxRenderer: any, strings: any, localPrefs: LocalPrefs, sound: Sound, errorHandler: ErrorHandler) {
        super();
        this.unrankedEnabled = unrankedEnabled;
        this.engineVersion = engineVersion;
        this.engineModHash = engineModHash;
        this.clientLocale = clientLocale;
        this.rules = rules;
        this.wolService = wolService;
        this.wolCon = wolCon;
        this.wladderService = wladderService;
        this.serverRegions = serverRegions;
        this.rootController = rootController;
        this.messageBoxApi = messageBoxApi;
        this.jsxRenderer = jsxRenderer;
        this.strings = strings;
        this.localPrefs = localPrefs;
        this.sound = sound;
        this.errorHandler = errorHandler;
        this.title = this.strings.get("GUI:WolMatch");
        this.musicType = MusicType.NormalShuffle;
        this.handleChatMessage = (message: any) => {
            if (message.text.startsWith(RPL_QUEUE_LIST + " ") &&
                this.queueState === QueueState.None) {
                const queueListText = message.text.split(" ").slice(1).join(" ");
                const availableTypes = queueListText
                    .split(",")
                    .filter((type: string) => Object.values(LadderQueueType).includes(type as LadderQueueType));
                this.availableQueueTypes = availableTypes;
                if (!availableTypes.includes(this.queueOpts.type) && availableTypes.length) {
                    this.queueOpts.type = availableTypes[0];
                    if (this.form) {
                        this.requestPlayerProfileRefresh();
                    }
                }
                this.form?.applyOptions((options: any) => {
                    options.enabledTypes = availableTypes;
                    options.type = this.queueOpts.type;
                });
            }
            if (this.queueState !== QueueState.None &&
                message.from === this.wolConfig.getQuickMatchBotName()) {
                if ([RPL_WORKING, RPL_BAD_VERS, RPL_BAD_HASH, RPL_MODE_UNAVAIL].includes(message.text)) {
                    if (this.queueState === QueueState.Initializing) {
                        if (message.text === RPL_WORKING) {
                            this.updateQueueState(QueueState.WaitingForMatch);
                        }
                        else {
                            let errorMessage: string;
                            let isFatal = true;
                            if (message.text === RPL_BAD_VERS) {
                                errorMessage = this.strings.get("TS:OutdatedClient");
                            }
                            else if (message.text === RPL_BAD_HASH) {
                                errorMessage = this.strings.get("TXT_MISMATCH");
                            }
                            else if (message.text === RPL_MODE_UNAVAIL) {
                                errorMessage = this.strings.get("WOL:MatchModeUnavail");
                                isFatal = false;
                            }
                            else {
                                errorMessage = this.strings.get("WOL:MatchBadParameters");
                            }
                            if (!isFatal) {
                                this.leaveQueue();
                            }
                            this.handleError(message.text, errorMessage, { fatal: isFatal });
                        }
                    }
                    else {
                        console.warn(`Unexpected reply "${message.text}" from match bot (qs: ${QueueState[this.queueState]})`);
                    }
                }
                else if (message.text.startsWith(RPL_MATCHED + " ")) {
                    if (this.queueState === QueueState.WaitingForMatch) {
                        this.sound.play(SoundKey.PlayerJoined, ChannelType.Ui);
                        const countdownStr = message.text.split(" ")[1];
                        this.countdownSeconds = Number(countdownStr);
                        this.updateQueueState(QueueState.WaitingForStartTimer);
                    }
                    else {
                        console.warn(`Unexpected reply "${message.text}" from match bot (qs: ${QueueState[this.queueState]})`);
                    }
                }
                else if (message.text === RPL_REQUEUE) {
                    if ([QueueState.WaitingForGameStart, QueueState.WaitingForStartTimer].includes(this.queueState)) {
                        console.log("A player left. Returned to queue.");
                        this.updateQueueState(QueueState.WaitingForMatch);
                    }
                }
                else if (message.text.startsWith(RPL_STATS + " ") &&
                    this.queueState === QueueState.WaitingForMatch) {
                    const statsText = message.text.split(" ").slice(1).join(" ");
                    const [, avgWaitSecondsStr] = statsText.split(",");
                    const avgWaitSeconds = avgWaitSecondsStr !== "-1" ? Number(avgWaitSecondsStr) : undefined;
                    this.updateSidebarText(this.strings.get("TXT_SEARCHING_FOR", this.queueOpts.type) +
                        "\n\n" +
                        this.strings.get("WOL:MatchAvgWaitTime") +
                        "\n" +
                        (avgWaitSeconds !== undefined && avgWaitSeconds < 3600
                            ? this.strings.get("WOL:MatchAvgWaitTimeMinutes", avgWaitSeconds < 60 ? "<1" : "~" + Math.ceil(avgWaitSeconds / 60))
                            : this.strings.get("WOL:MatchAvgWaitTimeUnavail")));
                }
            }
        };
        this.handleLeaveChannel = async (event: any) => {
            if (event.user.name === this.wolCon.getCurrentUser() &&
                event.channel === this.quickMatchChannelName) {
                this.quickMatchChannelName = undefined;
                if (this.queueState !== QueueState.None) {
                    this.updateQueueState(QueueState.None);
                    this.wolCon.close();
                }
            }
        };
        this.handleGameStart = async (event: any) => {
            if (this.queueState === QueueState.WaitingForGameStart ||
                this.queueState === QueueState.WaitingForStartTimer) {
                try {
                    const username = this.wolCon.getCurrentUser();
                    if (username === undefined) {
                        throw new Error("User should be logged in");
                    }
                    this.updateQueueState(QueueState.None);
                    const fallbackRoute = new MainMenuRoute(ScreenType.Login, {
                        afterLogin: (messages: any[]) => new MainMenuRoute(ScreenType.QuickGame, { messages }),
                    });
                    if (!this.form) {
                        await this.controller?.popScreen();
                    }
                    this.rootController.joinGame(event.gameId, event.timestamp, event.gservUrl, username, true, false, fallbackRoute);
                }
                catch (error) {
                    await this.leaveQueue();
                    if (!this.wolCon.isOpen()) {
                        return;
                    }
                    this.handleError(error, this.strings.get("WOL:MatchTimeout"), { fatal: false });
                }
            }
        };
        this.onWolClose = () => {
            this.updateQueueState(QueueState.None);
        };
        this.onWolConLost = (error: any) => {
            this.handleError(error, this.strings.get("TXT_YOURE_DISCON"), { fatal: true });
        };
    }
    private handleChatMessage: (message: any) => void;
    private handleLeaveChannel: (event: any) => Promise<void>;
    private handleGameStart: (event: any) => Promise<void>;
    private onWolClose: () => void;
    private onWolConLost: (error: any) => void;
    async onEnter(params: QuickGameScreenParams): Promise<void> {
        this.updateQueueState(QueueState.None);
        const savedCountry = this.localPrefs.getItem(StorageKey.LastPlayerCountry);
        const savedColor = this.localPrefs.getItem(StorageKey.LastPlayerColor);
        const savedRanked = this.localPrefs.getItem(StorageKey.LastQueueRanked);
        const savedType = this.localPrefs.getItem(StorageKey.LastQueueType);
        const countryId = savedCountry !== undefined &&
            Number(savedCountry) < this.getAvailablePlayerCountries().length
            ? Number(savedCountry)
            : RANDOM_COUNTRY_ID;
        const colorId = savedColor !== undefined &&
            Number(savedColor) < this.getAvailablePlayerColors().length
            ? Number(savedColor)
            : RANDOM_COLOR_ID;
        const ranked = savedRanked === undefined || !this.unrankedEnabled || Boolean(Number(savedRanked));
        const queueType = savedType !== undefined &&
            Object.values(LadderQueueType).includes(savedType as LadderQueueType)
            ? (savedType as LadderQueueType)
            : LadderQueueType.Solo1v1;
        this.queueOpts = {
            type: queueType,
            ranked: ranked,
            countryId: countryId,
            colorId: colorId,
        };
        this.playerProfile = undefined;
        this.controller.toggleMainVideo(false);
        if (this.wolService.isConnected() && this.wolCon.getCurrentUser()) {
            this.wolConfig = this.wolService.getConfig();
            this.wolCon.onClose.subscribe(this.onWolClose);
            this.disposables.add(() => this.wolCon.onClose.unsubscribe(this.onWolClose));
            this.wolService.onWolConnectionLost.subscribe(this.onWolConLost);
            this.disposables.add(() => this.wolService.onWolConnectionLost.unsubscribe(this.onWolConLost));
            this.wolCon.onChatMessage.subscribe(this.handleChatMessage);
            this.disposables.add(() => this.wolCon.onChatMessage.unsubscribe(this.handleChatMessage));
            this.wolCon.onLeaveChannel.subscribe(this.handleLeaveChannel);
            this.disposables.add(() => this.wolCon.onLeaveChannel.unsubscribe(this.handleLeaveChannel));
            this.wolCon.onGameStart.subscribe(this.handleGameStart);
            this.disposables.add(() => this.wolCon.onGameStart.unsubscribe(this.handleGameStart));
            const messages = params.messages;
            this.chatUi = new ChatUi(messages, (updateData: any) => {
                this.form?.applyOptions((options: any) => {
                    const chatProps = options.chatProps;
                    options.chatProps = { ...chatProps, ...updateData };
                });
            }, this.wolConfig, this.wolCon, this.wolService, this.wladderService, this.strings, this.sound);
            this.initForm();
            this.initSidebar();
            this.requestPlayerProfileRefresh();
            await this.joinQuickMatchChannel();
        }
        else {
            this.messageBoxApi.show(this.strings.get("TXT_YOURE_DISCON"), this.strings.get("GUI:Ok"), () => {
                this.controller?.goToScreen(ScreenType.Home);
            });
        }
    }
    private getAvailablePlayerCountries(): any[] {
        return this.rules.getMultiplayerCountries();
    }
    private getAvailablePlayerColors(): any[] {
        return [...this.rules.getMultiplayerColors().values()];
    }
    private updateQueueState(newState: QueueState): void {
        this.queueState = newState;
        this.updateSidebarButtons();
        this.form?.applyOptions((options: any) => {
            options.searchState = newState;
        });
        if (newState === QueueState.WaitingForStartTimer) {
            this.startCountdown();
        }
        else {
            this.stopCountdown();
        }
    }
    private updateSidebarText(text: string): void {
        this.controller?.setSidebarMpContent({ text });
    }
    private startCountdown(): void {
        this.stopCountdown();
        this.countdownIntervalId = window.setInterval(() => {
            if (this.countdownSeconds !== undefined && this.countdownSeconds > 0) {
                this.countdownSeconds--;
                this.updateSidebarText(this.strings.get("GUI:MatchFound") +
                    "\n\n" +
                    this.strings.get("GUI:StartingIn", this.countdownSeconds));
                if (this.countdownSeconds === 0) {
                    this.updateQueueState(QueueState.WaitingForGameStart);
                }
            }
        }, 1000);
    }
    private stopCountdown(): void {
        if (this.countdownIntervalId) {
            clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = undefined;
        }
    }
    private async joinQuickMatchChannel(): Promise<void> {
    }
    private initForm(): void {
    }
    private initSidebar(): void {
        this.updateSidebarButtons();
        this.controller.showSidebarButtons();
    }
    private updateSidebarButtons(): void {
    }
    private requestPlayerProfileRefresh(): void {
    }
    private async leaveQueue(): Promise<void> {
    }
    private handleError(error: any, message: string, { fatal }: {
        fatal: boolean;
    }): void {
        this.errorHandler.handle(error, message, () => {
            if (fatal) {
                this.controller?.goToScreen(ScreenType.Home);
            }
        });
    }
    async onLeave(): Promise<void> {
        await this.leaveQueue();
        this.chatUi?.leave();
        this.chatUi?.dispose();
        this.disposables.dispose();
        this.stopCountdown();
        this.form = undefined;
        await this.controller.hideSidebarButtons();
    }
}
