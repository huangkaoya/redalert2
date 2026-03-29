import { MainMenuScreen } from '@/gui/screen/mainMenu/MainMenuScreen';
import { HtmlView } from '@/gui/jsx/HtmlView';
import { jsx } from '@/gui/jsx/jsx';
import { LanSetup } from '@/gui/screen/mainMenu/lan/component/LanSetup';
import { MusicType } from '@/engine/sound/Music';
import { LanMatchSession } from '@/network/lan/LanMatchSession';
import { LanMeshSession } from '@/network/lan/LanMeshSession';
import { ChatHistory } from '@/gui/chat/ChatHistory';
import { LanRoomSession } from '@/network/lan/LanRoomSession';
import { PregameController, PregameMapSelectionResult } from '@/gui/screen/mainMenu/lobby/PregameController';
import { MainMenuScreenType, ScreenType } from '@/gui/screen/ScreenType';
import { LobbyType } from '@/gui/screen/mainMenu/lobby/component/viewmodel/lobby';
import { MapPreviewRenderer } from '@/gui/screen/mainMenu/lobby/MapPreviewRenderer';
import { MapFile } from '@/data/MapFile';
import { MainMenuRoute } from '@/gui/screen/mainMenu/MainMenuRoute';
import { uint8ArrayToBase64String } from '@/util/string';

interface RootController {
    goToScreen(screenType: number, params?: any): void;
}

interface Rules {
    getMultiplayerCountries(): any[];
    getMultiplayerColors(): Map<number, any>;
    mpDialogSettings: any;
    general?: any;
}

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
    addFromMapFile(file: any): void;
}

interface MapFileLoader {
    load(mapName: string): Promise<any>;
}

interface LocalPrefs {
    getItem(key: string): string | undefined;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

interface MessageBoxApi {
    show(message: string, buttonText?: string, onClose?: () => void): void;
}

interface MapDirectory {
    containsEntry(entryName: string): Promise<boolean>;
    writeFile(file: any): Promise<void>;
}

export class LanSetupScreen extends MainMenuScreen {
    declare public title: string;
    declare public musicType: MusicType;

    private form?: any;
    private resetNonce = 0;
    private inviteNonce = 0;
    private previewRequestId = 0;

    private readonly meshSession = new LanMeshSession();
    private readonly chatHistory = new ChatHistory();
    private readonly roomSession: LanRoomSession;
    private pregameController: PregameController;
    private activeMatchSession?: LanMatchSession;

    constructor(
        private readonly rootController: RootController,
        private readonly strings: any,
        private readonly jsxRenderer: any,
        private readonly rules: Rules,
        private readonly mapFileLoader: MapFileLoader,
        private readonly mapList: MapList,
        private readonly gameModes: GameModes,
        private readonly localPrefs: LocalPrefs,
        private readonly messageBoxApi: MessageBoxApi,
        private readonly mapDir?: MapDirectory
    ) {
        super();
        this.title = '';
        this.musicType = MusicType.Intro;
        this.pregameController = this.createPregameController();
        this.roomSession = new LanRoomSession(this.meshSession, this.gameModes, this.mapFileLoader, this.mapDir, this.mapList);
    }

    onEnter(): void {
        this.controller.toggleMainVideo(false);
        this.initView();
        this.subscribeRoomEvents();
        this.refreshSidebarButtons();
        this.refreshSidebarMpText();
        void this.refreshSidebarPreview();
        this.controller.showSidebarButtons();
    }

    async onLeave(): Promise<void> {
        this.previewRequestId += 1;
        this.roomSession.onSnapshotChange.unsubscribe(this.handleRoomSnapshot);
        this.meshSession.onSnapshotChange.unsubscribe(this.handleMeshSnapshot);
        this.roomSession.onLaunch.unsubscribe(this.handleLaunch);
        await this.controller.hideSidebarButtons();
        this.form = undefined;
    }

    async onStack(): Promise<void> {
        await this.onLeave();
    }

    onUnstack(params?: PregameMapSelectionResult): void {
        this.subscribeRoomEvents();
        if (params) {
            this.pregameController.applyMapSelection(params);
            this.pregameController.updateSelfName(this.meshSession.getSelf().name);
            this.roomSession.startHosting(this.pregameController.getSnapshot());
        }
        this.refreshSidebarButtons();
        this.refreshSidebarMpText();
        void this.refreshSidebarPreview();
        this.refreshView();
        this.controller.showSidebarButtons();
    }

    private handleMeshSnapshot = () => {
        this.refreshSidebarButtons();
    };

    private handleRoomSnapshot = () => {
        this.refreshSidebarButtons();
        this.refreshSidebarMpText();
        void this.refreshSidebarPreview();
    };

    private handleLaunch = (descriptor: any) => {
        this.activeMatchSession?.dispose();
        this.activeMatchSession = new LanMatchSession(this.meshSession, descriptor);
        const currentCustomMap = this.roomSession.getResolvedCustomMapFile();
        this.rootController.goToScreen(ScreenType.Game, {
            create: true,
            lanLaunch: descriptor,
            lanMatchSession: this.activeMatchSession,
            lanMapDataBase64: currentCustomMap ? uint8ArrayToBase64String(currentCustomMap.getBytes()) : undefined,
            returnTo: new MainMenuRoute(MainMenuScreenType.LanSetup, {}),
        });
    };

    private subscribeRoomEvents(): void {
        this.roomSession.onSnapshotChange.unsubscribe(this.handleRoomSnapshot);
        this.meshSession.onSnapshotChange.unsubscribe(this.handleMeshSnapshot);
        this.roomSession.onLaunch.unsubscribe(this.handleLaunch);
        this.roomSession.onSnapshotChange.subscribe(this.handleRoomSnapshot);
        this.meshSession.onSnapshotChange.subscribe(this.handleMeshSnapshot);
        this.roomSession.onLaunch.subscribe(this.handleLaunch);
    }

    private createPregameController(): PregameController {
        return new PregameController(
            this.strings,
            this.rules,
            this.mapFileLoader,
            this.mapList,
            this.gameModes,
            this.localPrefs,
            this.meshSession.getSelf().name
        );
    }

    private initView(): void {
        const [component] = this.jsxRenderer.render(jsx(HtmlView, {
            innerRef: (ref: any) => (this.form = ref),
            component: LanSetup,
            props: this.buildComponentProps(),
        }));
        this.controller.setMainComponent(component);
    }

    private refreshView(): void {
        if (!this.form) {
            this.initView();
            return;
        }
        this.form.applyOptions((options: any) => {
            Object.assign(options, this.buildComponentProps());
        });
    }

    private buildComponentProps(): any {
        return {
            strings: this.strings,
            meshSession: this.meshSession,
            roomSession: this.roomSession,
            chatHistory: this.chatHistory,
            pregameController: this.pregameController,
            resetNonce: this.resetNonce,
            inviteNonce: this.inviteNonce,
            onCreateRoom: async () => {
                await this.handleCreateRoom();
            },
            onStartGame: async () => {
                await this.startLanGame();
            },
            onLeaveRoom: async () => {
                await this.handleLeaveRoom();
            },
            onChangeMap: async () => {
                await this.handleChangeMap();
            },
            onToggleReady: async () => {
                const selfMember = this.roomSession.getSnapshot().members.find((member) => member.isSelf);
                if (!selfMember) {
                    return;
                }
                await this.roomSession.setReady(!selfMember.ready);
            },
            onHostPregameChanged: () => {
                this.roomSession.applyHostPregameSnapshot(this.pregameController.getSnapshot());
                this.refreshSidebarMpText();
                void this.refreshSidebarPreview();
            },
        };
    }

    private async handleCreateRoom(): Promise<void> {
        if (!this.pregameController.isInitialized()) {
            await this.pregameController.initialize();
        }
        this.pregameController.updateSelfName(this.meshSession.getSelf().name);
        await this.controller.pushScreen(MainMenuScreenType.MapSelection, {
            lobbyType: LobbyType.MultiplayerHost,
            gameOpts: this.pregameController.getGameOpts(),
            usedSlots: () => this.pregameController.getUsedSlots(),
        });
    }

    private async handleChangeMap(): Promise<void> {
        if (!this.roomSession.getSnapshot().isHost || !this.roomSession.getSnapshot().roomState) {
            return;
        }
        await this.controller.pushScreen(MainMenuScreenType.MapSelection, {
            lobbyType: LobbyType.MultiplayerHost,
            gameOpts: this.pregameController.getGameOpts(),
            usedSlots: () => this.pregameController.getUsedSlots(),
        });
    }

    private async handleLeaveRoom(): Promise<void> {
        this.roomSession.leaveRoom();
        if (this.meshSession.getSnapshot().isInRoom) {
            this.meshSession.leaveRoom();
        }
        else {
            this.meshSession.reset();
        }
        this.chatHistory.reset();
        this.pregameController = this.createPregameController();
        this.resetNonce += 1;
        this.refreshSidebarButtons();
        this.refreshSidebarMpText();
        this.controller.setSidebarPreview();
        this.refreshView();
    }

    private openInviteDialog(): void {
        this.inviteNonce += 1;
        this.form?.applyOptions?.((options: any) => {
            options.inviteNonce = this.inviteNonce;
        });
    }

    private async startLanGame(): Promise<void> {
        const roomSnapshot = this.roomSession.getSnapshot();
        if (!roomSnapshot.isHost) {
            return;
        }
        if (!roomSnapshot.canStart) {
            this.messageBoxApi.show('当前还有成员未完成连接或地图同步。');
            return;
        }
        this.roomSession.startGame({
            screenType: MainMenuScreenType.LanSetup,
            params: {},
        });
    }

    private refreshSidebarButtons(): void {
        const meshSnapshot = this.meshSession.getSnapshot();
        const roomSnapshot = this.roomSession.getSnapshot();
        const inWaitingRoom = roomSnapshot.isRoomActive || meshSnapshot.isInRoom;

        if (!inWaitingRoom) {
            this.controller.setSidebarButtons([
                {
                    label: '返回',
                    tooltip: '返回主菜单',
                    isBottom: true,
                    onClick: () => this.controller.popScreen(),
                },
            ]);
            return;
        }

        const selfMember = roomSnapshot.members.find((member) => member.isSelf);
        const buttons: any[] = [];

        if (meshSnapshot.isInRoom) {
            buttons.push({
                label: '邀请玩家',
                tooltip: '打开二维码邀请弹窗',
                onClick: () => this.openInviteDialog(),
            });
        }

        buttons.push({
            label: '开始游戏',
            tooltip: roomSnapshot.isHost
                ? roomSnapshot.canStart
                    ? '向所有成员广播开局描述'
                    : '等待连接和地图同步完成'
                : '只有当前房主可以开始游戏',
            disabled: !roomSnapshot.isHost || !roomSnapshot.canStart,
            onClick: () => {
                void this.startLanGame();
            },
        });

        if (roomSnapshot.isRoomActive && roomSnapshot.isHost) {
            buttons.push({
                label: '更换地图',
                tooltip: '重新选择模式和地图',
                onClick: () => {
                    void this.handleChangeMap();
                },
            });
        }
        else if (roomSnapshot.isRoomActive && selfMember) {
            buttons.push({
                label: selfMember.ready ? '取消准备' : '准备',
                tooltip: '切换自己的等待状态',
                onClick: () => {
                    void this.roomSession.setReady(!selfMember.ready);
                },
            });
        }

        buttons.push({
            label: '离开房间',
            tooltip: '离开当前局域网房间并回到入口页',
            isBottom: true,
            onClick: () => {
                void this.handleLeaveRoom();
            },
        });

        this.controller.setSidebarButtons(buttons, true);
    }

    private refreshSidebarMpText(): void {
        const roomSnapshot = this.roomSession.getSnapshot();
        if (roomSnapshot.roomState) {
            const gameOpts = roomSnapshot.roomState.gameOpts;
            this.controller.setSidebarMpContent({
                text: this.strings.get(this.gameModes.getById(gameOpts.gameMode).label) + '\n\n' + gameOpts.mapTitle,
                icon: gameOpts.mapOfficial ? 'gt18.pcx' : 'settings.png',
                tooltip: gameOpts.mapOfficial ? '当前房间使用官方地图' : '当前房间使用自定义地图',
            });
            return;
        }
        this.controller.setSidebarMpContent({
            text: '',
        });
    }

    private async refreshSidebarPreview(): Promise<void> {
        const roomSnapshot = this.roomSession.getSnapshot();
        const roomState = roomSnapshot.roomState;
        if (!roomState) {
            this.controller.toggleSidebarPreview(false);
            this.controller.setSidebarPreview();
            return;
        }

        const requestId = ++this.previewRequestId;
        try {
            let mapFile = this.roomSession.getResolvedCustomMapFile() ?? this.pregameController.getCurrentMapFile();
            if (!mapFile) {
                mapFile = await this.mapFileLoader.load(roomState.gameOpts.mapName);
            }
            if (requestId !== this.previewRequestId) {
                return;
            }
            const preview = new MapPreviewRenderer(this.strings).render(
                new MapFile(mapFile),
                roomSnapshot.isHost ? LobbyType.MultiplayerHost : LobbyType.MultiplayerGuest,
                this.controller.getSidebarPreviewSize()
            );
            this.controller.toggleSidebarPreview(true);
            this.controller.setSidebarPreview(preview);
        }
        catch (error) {
            if (requestId !== this.previewRequestId) {
                return;
            }
            console.warn('[LanSetupScreen] Failed to refresh sidebar preview', error);
            this.controller.setSidebarPreview();
        }
    }
}
