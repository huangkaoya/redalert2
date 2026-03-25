import { Screen } from '../../Controller';
import { MainMenuScreenType } from '../../ScreenType';
import { MainMenuController } from '../MainMenuController';
import { Strings } from '../../../../data/Strings';
import { MusicType } from '../../../../engine/sound/Music';
import { MessageBoxApi } from '../../../component/MessageBoxApi';
import { FullScreen } from '../../../FullScreen';
interface SidebarButton {
    label: string;
    tooltip?: string;
    disabled?: boolean;
    isBottom?: boolean;
    onClick: () => void | Promise<void>;
}
export class HomeScreen implements Screen {
    private strings: Strings;
    private messageBoxApi: MessageBoxApi;
    private appVersion: string;
    private storageEnabled: boolean;
    private quickMatchEnabled: boolean;
    private fullScreen?: FullScreen;
    private controller?: MainMenuController;
    public title: string;
    public musicType: MusicType;
    constructor(strings: Strings, messageBoxApi: MessageBoxApi, appVersion: string, storageEnabled: boolean = false, quickMatchEnabled: boolean = false, fullScreen?: FullScreen) {
        this.strings = strings;
        this.messageBoxApi = messageBoxApi;
        this.appVersion = appVersion;
        this.storageEnabled = storageEnabled;
        this.quickMatchEnabled = quickMatchEnabled;
        this.fullScreen = fullScreen;
        this.title = this.strings.get("GUI:MainMenu") || "Main Menu";
        this.musicType = MusicType.Intro;
    }
    setController(controller: MainMenuController): void {
        this.controller = controller;
    }
    onEnter(): void {
        console.log('[HomeScreen] Entering home screen');
        const buttons: SidebarButton[] = [
            {
                label: '遭遇战',
                tooltip: '与AI进行单人遭遇战',
                onClick: async () => {
                    console.log('[HomeScreen] 遭遇战 clicked');
                    try {
                        if (this.controller) {
                            this.controller.goToScreen(MainMenuScreenType.Skirmish);
                        }
                    }
                    catch (error) {
                        console.error('[HomeScreen] Failed to navigate to Skirmish:', error);
                        await this.messageBoxApi.alert('遭遇战 - 功能开发中\n\n基本框架已配置，但仍需完善以下组件：\n• 游戏规则系统\n• 地图加载器\n• AI对手系统\n• 游戏模式管理器', this.strings.get('GUI:OK') || 'OK');
                    }
                }
            },
            {
                label: '录像回放',
                tooltip: '查看和回放游戏录像',
                onClick: () => {
                    console.log('[HomeScreen] Replays clicked');
                    if (this.controller) {
                        this.controller.pushScreen(MainMenuScreenType.ReplaySelection);
                    }
                }
            },
        ];
        if (this.storageEnabled) {
            buttons.push({
                label: this.strings.get('GUI:Mods') || 'Mods',
                tooltip: this.strings.get('STT:Mods') || 'Manage and play modified versions of the base game',
                onClick: async () => {
                    console.log('[HomeScreen] Mods clicked');
                    await this.messageBoxApi.alert('Mods - 功能开发中\n\n需要模组管理系统', this.strings.get('GUI:OK') || 'OK');
                }
            });
        }
        buttons.push({
            label: this.strings.get('TS:InfoAndCredits') || 'Info & Credits',
            tooltip: this.strings.get('STT:InfoAndCredits') || 'Information and credits',
            onClick: () => {
                console.log('[HomeScreen] Info & Credits clicked');
                if (this.controller) {
                    this.controller.pushScreen(MainMenuScreenType.InfoAndCredits);
                }
            }
        }, {
            label: this.strings.get('GUI:Options') || 'Options',
            tooltip: this.strings.get('STT:MainButtonOptions') || 'Game options and settings',
            onClick: () => {
                console.log('[HomeScreen] Options clicked');
                if (this.controller) {
                    this.controller.pushScreen(MainMenuScreenType.Options);
                }
            }
        }, {
            label: '底层测试入口',
            tooltip: '进入底层文件系统与测试工具',
            onClick: () => {
                console.log('[HomeScreen] Test Entry clicked');
                if (this.controller) {
                    this.controller.pushScreen(MainMenuScreenType.TestEntry);
                }
            }
        }, {
            label: this.strings.get('GUI:Fullscreen') || 'Fullscreen',
            tooltip: this.strings.get('STT:Fullscreen') || 'Toggle full screen mode',
            isBottom: true,
            disabled: this.fullScreen ? !this.fullScreen.isAvailable() : false,
            onClick: () => {
                console.log('[HomeScreen] Fullscreen clicked');
                this.toggleFullscreen();
            }
        });
        if (this.controller) {
            this.controller.setSidebarButtons(buttons);
            this.controller.showSidebarButtons();
            this.controller.toggleMainVideo(true);
            this.controller.showVersion(this.appVersion);
        }
    }
    async onLeave(): Promise<void> {
        console.log('[HomeScreen] Leaving home screen');
        if (this.controller) {
            this.controller.hideVersion();
            await this.controller.hideSidebarButtons();
        }
    }
    async onStack(): Promise<void> {
        await this.onLeave();
    }
    onUnstack(): void {
        this.onEnter();
    }
    update(deltaTime: number): void {
    }
    destroy(): void {
    }
    private async toggleFullscreen(): Promise<void> {
        try {
            if (this.fullScreen?.isAvailable()) {
                await this.fullScreen.toggleAsync();
            }
            else if (document.fullscreenElement) {
                await document.exitFullscreen();
            }
            else {
                await document.documentElement.requestFullscreen();
            }
        }
        catch (err) {
            console.error('Error toggling fullscreen:', err);
            await this.messageBoxApi.alert(document.fullscreenElement
                ? '无法退出全屏模式'
                : '无法进入全屏模式\n\n请检查浏览器权限设置', this.strings.get('GUI:OK') || 'OK');
        }
    }
}
