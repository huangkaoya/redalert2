import { Screen } from '../../Controller';
import { MainMenuScreenType } from '../../ScreenType';
import { MainMenuController } from '../MainMenuController';
import { Strings } from '../../../../data/Strings';
import { MessageBoxApi } from '../../../component/MessageBoxApi';
interface SidebarButton {
    label: string;
    tooltip?: string;
    disabled?: boolean;
    isBottom?: boolean;
    onClick: () => void | Promise<void>;
}
export class TestEntryScreen implements Screen {
    private strings: Strings;
    private messageBoxApi: MessageBoxApi;
    private appVersion: string;
    private controller?: MainMenuController;
    public title: string = '底层测试入口';
    constructor(strings: Strings, messageBoxApi: MessageBoxApi, appVersion: string) {
        this.strings = strings;
        this.messageBoxApi = messageBoxApi;
        this.appVersion = appVersion;
    }
    setController(controller: MainMenuController): void {
        this.controller = controller;
    }
    onEnter(): void {
        console.log('[TestEntryScreen] Entering test entry screen');
        const buttons: SidebarButton[] = [
            {
                label: 'VXL测试',
                tooltip: '打开 VXL 测试工具',
                onClick: () => {
                    console.log('[TestEntryScreen] VXL测试 clicked');
                    window.location.hash = '/vxltest';
                }
            },
            {
                label: 'SHP测试',
                tooltip: '打开 SHP 测试工具',
                onClick: () => {
                    console.log('[TestEntryScreen] SHP测试 clicked');
                    window.location.hash = '/shptest';
                }
            },
            {
                label: '建筑测试',
                tooltip: '打开 建筑 测试工具',
                onClick: () => {
                    console.log('[TestEntryScreen] 建筑测试 clicked');
                    window.location.hash = '/buildtest';
                }
            },
            {
                label: '载具测试',
                tooltip: '打开 载具 测试工具',
                onClick: () => {
                    console.log('[TestEntryScreen] 载具测试 clicked');
                    window.location.hash = '/vehicletest';
                }
            },
            {
                label: '飞机测试',
                tooltip: '打开 飞机 测试工具',
                onClick: () => {
                    console.log('[TestEntryScreen] 飞机测试 clicked');
                    window.location.hash = '/airtest';
                }
            },
            {
                label: '步兵测试',
                tooltip: '打开 步兵 测试工具',
                onClick: () => {
                    console.log('[TestEntryScreen] 步兵测试 clicked');
                    window.location.hash = '/inftest';
                }
            },
            {
                label: 'WAV测试',
                tooltip: '打开 WAV 测试工具',
                onClick: () => {
                    console.log('[TestEntryScreen] WAV测试 clicked');
                    window.location.hash = '/soundtest';
                }
            },
            {
                label: '大厅测试',
                tooltip: '打开 大厅 测试工具',
                onClick: () => {
                    console.log('[TestEntryScreen] 大厅测试 clicked');
                    window.location.hash = '/lobbytest';
                }
            },
            {
                label: this.strings.get('GUI:Back') || 'Back',
                isBottom: true,
                onClick: () => {
                    console.log('[TestEntryScreen] Back clicked');
                    this.controller?.leaveCurrentScreen();
                }
            }
        ];
        if (this.controller) {
            this.controller.setSidebarButtons(buttons);
            this.controller.showSidebarButtons();
            this.controller.toggleMainVideo(false);
            this.controller.showVersion(this.appVersion);
            this.controller.setSidebarTitle(this.title);
        }
    }
    async onLeave(): Promise<void> {
        console.log('[TestEntryScreen] Leaving test entry screen');
        if (this.controller) {
            await this.controller.hideSidebarButtons();
            this.controller.setSidebarTitle('');
            this.controller.hideVersion();
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
}
