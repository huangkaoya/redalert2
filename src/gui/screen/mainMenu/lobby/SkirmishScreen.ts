import { LobbyForm } from '@/gui/screen/mainMenu/lobby/component/LobbyForm';
import { LobbyType } from '@/gui/screen/mainMenu/lobby/component/viewmodel/lobby';
import { MainMenuScreenType } from '../../ScreenType';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { jsx } from '@/gui/jsx/jsx';
import { HtmlView } from '@/gui/jsx/HtmlView';
import { MapPreviewRenderer } from '@/gui/screen/mainMenu/lobby/MapPreviewRenderer';
import { StorageKey } from '@/LocalPrefs';
import { isNotNullOrUndefined } from '@/util/typeGuard';
import { MainMenuScreen } from '@/gui/screen/mainMenu/MainMenuScreen';
import { MainMenuRoute } from '@/gui/screen/mainMenu/MainMenuRoute';
import { MusicType } from '@/engine/sound/Music';
import { OBS_COUNTRY_ID } from '@/game/gameopts/constants';
import { MapFile } from '@/data/MapFile';
import { PregameController, PregameMapSelectionResult } from '@/gui/screen/mainMenu/lobby/PregameController';

interface GameMode {
    id: number;
    label: string;
    mpDialogSettings: any;
}

interface GameModes {
    getAll(): GameMode[];
    getById(id: number): GameMode;
}

interface MapListEntry {
    fileName: string;
    maxSlots: number;
    getFullMapTitle(strings: any): string;
}

interface MapList {
    getAll(): MapListEntry[];
    getByName(name: string): MapListEntry;
}

interface MapFileLoader {
    load(mapName: string): Promise<any>;
}

interface RootController {
    createGame(gameId: string, timestamp: number, gservUrl: string, username: string, gameOpts: any, singlePlayer: boolean, tournament: boolean, mapTransfer: boolean, privateGame: boolean, fallbackRoute: MainMenuRoute): void;
}

interface ErrorHandler {
    handle(error: any, message: string, onClose: () => void): void;
}

interface MessageBoxApi {
    show(message: string, buttonText?: string, onClose?: () => void): void;
    confirm(message: string, confirmText: string, cancelText: string): Promise<boolean>;
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
    general?: any;
}

interface SkirmishUnstackParams extends PregameMapSelectionResult {
}

export class SkirmishScreen extends MainMenuScreen {
    declare public musicType: MusicType;

    private playerName: string = 'Player 1';
    private disposables: CompositeDisposable = new CompositeDisposable();
    private pregameController?: PregameController;
    private lobbyForm?: any;

    constructor(
        private readonly rootController: RootController,
        private readonly errorHandler: ErrorHandler,
        private readonly messageBoxApi: MessageBoxApi,
        private readonly strings: any,
        private readonly rules: Rules,
        private readonly jsxRenderer: any,
        private readonly mapFileLoader: MapFileLoader,
        private readonly mapList: MapList,
        private readonly gameModes: GameModes,
        private readonly localPrefs: LocalPrefs
    ) {
        super();
        this.title = this.strings.get('GUI:SkirmishGame');
        this.musicType = MusicType.Intro;
    }

    onEnter(): void {
        this.controller.toggleMainVideo(false);
        this.lobbyForm = undefined;
        this.pregameController = new PregameController(
            this.strings,
            this.rules,
            this.mapFileLoader,
            this.mapList,
            this.gameModes,
            this.localPrefs,
            this.playerName
        );
        void this.createGame();
    }

    onViewportChange(): void {
    }

    async onStack(): Promise<void> {
        await this.unrender();
    }

    onUnstack(params?: SkirmishUnstackParams): void {
        if (params) {
            this.pregameController?.applyMapSelection(params);
        }
        this.updateMapPreview();
        this.refreshSidebarMpText();
        this.refreshLobbyForm();
    }

    async onLeave(): Promise<void> {
        this.disposables.dispose();
        this.pregameController = undefined;
        const debugRoot = (window as any).__ra2debug;
        if (debugRoot) {
            delete debugRoot.skirmishLobby;
        }
        this.controller.toggleSidebarPreview(false);
        await this.unrender();
    }

    private async createGame(): Promise<void> {
        try {
            await this.pregameController?.initialize();
        }
        catch (error) {
            this.handleError(
                error,
                (error as any)?.name === 'DownloadError'
                    ? this.strings.get('TXT_DOWNLOAD_FAILED')
                    : this.strings.get('WOL:MatchErrorCreatingGame')
            );
            return;
        }

        this.updateMapPreview();
        this.initView();
    }

    private initView(): void {
        this.initLobbyForm();
        this.refreshSidebarButtons();
        this.refreshSidebarMpText();
        this.controller.showSidebarButtons();
    }

    private buildFormProps(): any {
        const pregameController = this.requirePregameController();
        return pregameController.createLobbyFormProps({
            lobbyType: LobbyType.Singleplayer,
            activeSlotIndex: 0,
            onStateChange: () => {
                this.updateMapPreview();
                this.refreshSidebarMpText();
                this.refreshLobbyForm();
            },
        });
    }

    private initLobbyForm(): void {
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            innerRef: (ref: any) => (this.lobbyForm = ref),
            component: LobbyForm,
            props: this.buildFormProps(),
        }));
        this.controller.setMainComponent(component);
        this.syncDebugState();
    }

    private refreshLobbyForm(): void {
        const formProps = this.buildFormProps();
        if (this.lobbyForm) {
            this.lobbyForm.applyOptions((options: any) => {
                Object.assign(options, formProps);
            });
        }
        this.syncDebugState();
    }

    private refreshSidebarButtons(): void {
        this.controller.setSidebarButtons([
            {
                label: this.strings.get('GUI:StartGame'),
                tooltip: this.strings.get('STT:SkirmishButtonStartGame'),
                onClick: () => this.handleStartGame(),
            },
            {
                label: this.strings.get('GUI:ChooseMap'),
                tooltip: this.strings.get('STT:SkirmishButtonChooseMap'),
                onClick: () => {
                    const pregameController = this.requirePregameController();
                    this.controller?.pushScreen(MainMenuScreenType.MapSelection, {
                        lobbyType: LobbyType.Singleplayer,
                        gameOpts: pregameController.getGameOpts(),
                        usedSlots: () => pregameController.getUsedSlots(),
                    });
                },
            },
            {
                label: this.strings.get('GUI:BotUpload') || 'Upload AI Bot',
                tooltip: this.strings.get('STT:SkirmishButtonUploadBot') || 'Upload a custom AI bot script package',
                onClick: () => this.showBotUploadDialog(),
            },
            {
                label: this.strings.get('GUI:Back'),
                tooltip: this.strings.get('STT:SkirmishButtonBack'),
                isBottom: true,
                onClick: () => this.controller?.goToScreen(MainMenuScreenType.Home),
            },
        ], true);
    }

    private refreshSidebarMpText(): void {
        const pregameController = this.pregameController;
        if (!pregameController) {
            this.controller.setSidebarMpContent({ text: '' });
            return;
        }

        const gameOpts = pregameController.getGameOpts();
        this.controller.setSidebarMpContent({
            text: this.strings.get(this.gameModes.getById(gameOpts.gameMode).label) + '\n\n' + gameOpts.mapTitle,
            icon: gameOpts.mapOfficial ? 'gt18.pcx' : 'settings.png',
            tooltip: gameOpts.mapOfficial
                ? this.strings.get('STT:VerifiedMap')
                : this.strings.get('STT:UnverifiedMap'),
        });
    }

    private updateMapPreview(): void {
        try {
            const currentMapFile = this.requirePregameController().getCurrentMapFile();
            const preview = new MapPreviewRenderer(this.strings).render(
                new MapFile(currentMapFile),
                LobbyType.Singleplayer,
                this.controller.getSidebarPreviewSize()
            );
            this.controller.toggleSidebarPreview(true);
            this.controller.setSidebarPreview(preview);
        }
        catch (error) {
            console.error('Failed to render map preview');
            console.error(error);
            this.controller.setSidebarPreview();
        }
    }

    private handleStartGame(): void {
        const pregameController = this.requirePregameController();
        const gameOpts = pregameController.getGameOpts();
        const aiCount = gameOpts.aiPlayers.filter(isNotNullOrUndefined).length;
        const humanIsObserver = gameOpts.humanPlayers.length > 0 &&
            gameOpts.humanPlayers[0].countryId === OBS_COUNTRY_ID;
        const minAiRequired = humanIsObserver ? 2 : 1;

        if (aiCount < minAiRequired) {
            this.messageBoxApi.show(this.strings.get('TXT_NEED_AT_LEAST_TWO_PLAYERS'), this.strings.get('GUI:Ok'));
            return;
        }

        if (!pregameController.meetsMinimumTeams()) {
            this.messageBoxApi.show(this.strings.get('TXT_CANNOT_ALLY'), this.strings.get('GUI:Ok'));
            return;
        }

        const gameId = '0';
        const timestamp = Date.now();
        const fallbackRoute = new MainMenuRoute(MainMenuScreenType.Skirmish, {});
        this.rootController.createGame(gameId, timestamp, '', this.playerName, gameOpts, true, false, false, false, fallbackRoute);
    }

    private syncDebugState(): void {
        const debugRoot = ((window as any).__ra2debug ??= {});
        const snapshot = this.pregameController?.getSnapshot();
        const formProps = this.pregameController ? this.buildFormProps() : undefined;
        debugRoot.skirmishLobby = {
            gameOpts: snapshot?.gameOpts,
            slotsInfo: snapshot?.slotsInfo,
            formModel: formProps
                ? {
                    playerSlots: JSON.parse(JSON.stringify(formProps.playerSlots ?? [])),
                    availablePlayerCountries: [...(formProps.availablePlayerCountries ?? [])],
                    availablePlayerColors: [...(formProps.availablePlayerColors ?? [])],
                    availableStartPositions: [...(formProps.availableStartPositions ?? [])],
                    teamsAllowed: formProps.teamsAllowed,
                    teamsRequired: formProps.teamsRequired,
                    gameSpeed: formProps.gameSpeed,
                    credits: formProps.credits,
                    unitCount: formProps.unitCount,
                }
                : undefined,
            startGame: () => this.handleStartGame(),
        };
    }

    private handleError(error: any, message: string): void {
        this.errorHandler.handle(error, message, () => {
            this.controller?.goToScreen(MainMenuScreenType.Home);
        });
    }

    private requirePregameController(): PregameController {
        if (!this.pregameController) {
            throw new Error('Pregame controller is not initialized');
        }
        return this.pregameController;
    }

    private showBotUploadDialog(): void {
        const overlay = document.createElement('div');
        overlay.className = 'bot-upload-dialog-overlay';
        overlay.innerHTML = `
            <div class="bot-upload-dialog" onclick="event.stopPropagation()">
                <div class="bot-upload-header">
                    <h3>${this.strings.get('GUI:BotUpload:Title') || 'Upload AI Bot Script'}</h3>
                    <button class="bot-upload-close" id="bot-upload-close-btn">×</button>
                </div>
                <div class="bot-upload-body">
                    <div class="bot-upload-section">
                        <label class="bot-upload-label">${this.strings.get('GUI:BotUpload:Select') || 'Select Bot Zip File'}</label>
                        <input type="file" accept=".zip" class="bot-upload-input" id="bot-upload-file" />
                        <div class="bot-upload-hint">${this.strings.get('GUI:BotUpload:Hint') || 'Upload a .zip file containing bot.ts or index.ts'}</div>
                    </div>
                    <div id="bot-upload-message"></div>
                    <div class="bot-upload-section">
                        <h4>${this.strings.get('GUI:BotUpload:Manage') || 'Manage Bots'}</h4>
                        <div id="bot-upload-list"></div>
                    </div>
                </div>
                <div class="bot-upload-footer">
                    <button class="dialog-button" id="bot-upload-ok-btn">${this.strings.get('GUI:Ok') || 'OK'}</button>
                </div>
            </div>
        `;

        const closeDialog = () => {
            overlay.remove();
        };

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeDialog();
            }
        });

        document.getElementById('ra2web-root')?.appendChild(overlay);
        document.getElementById('bot-upload-close-btn')?.addEventListener('click', closeDialog);
        document.getElementById('bot-upload-ok-btn')?.addEventListener('click', closeDialog);

        const fileInput = document.getElementById('bot-upload-file') as HTMLInputElement;
        fileInput?.addEventListener('change', async () => {
            const file = fileInput.files?.[0];
            if (!file) {
                return;
            }

            const messageDiv = document.getElementById('bot-upload-message');
            if (messageDiv) {
                messageDiv.innerHTML = '<div class="bot-upload-status">Loading...</div>';
            }

            try {
                const { BotUploader } = await import('@/game/ai/thirdpartbot/BotUploader');
                const result = await BotUploader.processUpload(file);

                if (result.success && result.meta && messageDiv) {
                    messageDiv.innerHTML = `<div class="bot-upload-message bot-upload-message-success">${this.strings.get('GUI:BotUpload:Success') || 'Bot uploaded successfully!'}</div>`;
                    this.refreshBotList();
                }
                else if (messageDiv) {
                    messageDiv.innerHTML = `<div class="bot-upload-message bot-upload-message-error">${(result.errors || ['Upload failed']).join('\n')}</div>`;
                }
            }
            catch (error) {
                if (messageDiv) {
                    messageDiv.innerHTML = `<div class="bot-upload-message bot-upload-message-error">Error: ${(error as Error).message}</div>`;
                }
            }

            fileInput.value = '';
        });

        this.refreshBotList();
    }

    private refreshBotList(): void {
        const listDiv = document.getElementById('bot-upload-list');
        if (!listDiv) {
            return;
        }

        import('@/game/ai/thirdpartbot/BotRegistry').then(({ BotRegistry }) => {
            const bots = BotRegistry.getInstance().getUploadedBots();
            if (bots.length === 0) {
                listDiv.innerHTML = `<div class="bot-upload-empty">${this.strings.get('GUI:BotUpload:NoBot') || 'No custom bots uploaded'}</div>`;
                return;
            }

            listDiv.innerHTML = bots.map((bot) => `
                <div class="bot-upload-item">
                    <div class="bot-upload-item-info">
                        <span class="bot-upload-item-name">${bot.displayName}</span>
                        <span class="bot-upload-item-version">v${bot.version}</span>
                        <span class="bot-upload-item-author">by ${bot.author}</span>
                    </div>
                    <button class="bot-upload-item-remove" data-bot-id="${bot.id}">${this.strings.get('GUI:BotUpload:Remove') || 'Remove'}</button>
                </div>
            `).join('');

            listDiv.querySelectorAll('.bot-upload-item-remove').forEach((button) => {
                button.addEventListener('click', () => {
                    const botId = (button as HTMLElement).dataset.botId;
                    if (botId) {
                        BotRegistry.getInstance().unregister(botId);
                        this.refreshBotList();
                    }
                });
            });
        });
    }

    private async unrender(): Promise<void> {
        await this.controller.hideSidebarButtons();
        this.lobbyForm = undefined;
    }
}
