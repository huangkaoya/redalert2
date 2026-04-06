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
type TestEntryView = 'home' | 'asset' | 'mechanic' | 'scene';
export class TestEntryScreen implements Screen {
    private strings: Strings;
    private messageBoxApi: MessageBoxApi;
    private appVersion: string;
    private controller?: MainMenuController;
    private view: TestEntryView = 'home';
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
        this.view = 'home';
        this.renderButtons();
        if (this.controller) {
            this.controller.toggleMainVideo(false);
            this.controller.showVersion(this.appVersion);
        }
    }
    private setView(view: TestEntryView): void {
        this.view = view;
        this.renderButtons();
    }
    private getSidebarTitle(): string {
        switch (this.view) {
            case 'asset':
                return '素材测试';
            case 'mechanic':
                return '机制测试';
            case 'scene':
                return '场景测试';
            default:
                return this.title;
        }
    }
    private createRouteButton(label: string, tooltip: string, route: string): SidebarButton {
        return {
            label,
            tooltip,
            onClick: () => {
                console.log(`[TestEntryScreen] ${label} clicked`);
                window.location.hash = route;
            }
        };
    }
    private createBackToCategoriesButton(): SidebarButton {
        return {
            label: '返回测试分类',
            onClick: () => this.setView('home')
        };
    }
    private createBackToMenuButton(): SidebarButton {
        return {
            label: '返回主菜单',
            isBottom: true,
            onClick: () => {
                console.log('[TestEntryScreen] Back clicked');
                this.controller?.leaveCurrentScreen();
            }
        };
    }
    private renderButtons(): void {
        const homeButtons: SidebarButton[] = [
            {
                label: '素材测试',
                tooltip: '查看 VXL、SHP、音频素材测试',
                onClick: () => this.setView('asset')
            },
            {
                label: '机制测试',
                tooltip: '查看 建筑、载具、步兵、飞行器测试',
                onClick: () => this.setView('mechanic')
            },
            {
                label: '场景测试',
                tooltip: '查看 大厅、世界、移动测试',
                onClick: () => this.setView('scene')
            },
            this.createBackToMenuButton()
        ];
        const assetButtons: SidebarButton[] = [
            this.createRouteButton('VXL测试', '打开 VXL 测试工具', '/vxltest'),
            this.createRouteButton('SHP测试', '打开 SHP 测试工具', '/shptest'),
            this.createRouteButton('音频测试', '打开 音频 测试工具', '/soundtest'),
            this.createBackToCategoriesButton(),
            this.createBackToMenuButton()
        ];
        const mechanicButtons: SidebarButton[] = [
            this.createRouteButton('建筑测试', '打开 建筑 测试工具', '/buildtest'),
            this.createRouteButton('载具测试', '打开 载具 测试工具', '/vehicletest'),
            this.createRouteButton('步兵测试', '打开 步兵 测试工具', '/inftest'),
            this.createRouteButton('飞行器测试', '打开 飞行器 测试工具', '/airtest'),
            this.createBackToCategoriesButton(),
            this.createBackToMenuButton()
        ];
        const sceneButtons: SidebarButton[] = [
            this.createRouteButton('大厅测试', '打开 大厅 测试工具', '/lobbytest'),
            this.createRouteButton('世界测试', '打开 世界场景 测试工具', '/worldscenetest'),
            this.createRouteButton('移动测试', '打开 单位移动 测试工具', '/unitmovementtest'),
            this.createRouteButton('性能测试', '打开 性能 基准 测试工具', '/perftest'),
            this.createBackToCategoriesButton(),
            this.createBackToMenuButton()
        ];
        const buttons = this.view === 'asset'
            ? assetButtons
            : this.view === 'mechanic'
                ? mechanicButtons
                : this.view === 'scene'
                    ? sceneButtons
                    : homeButtons;
        if (this.controller) {
            this.controller.setSidebarTitle(this.getSidebarTitle());
            this.controller.setSidebarButtons(buttons);
            this.controller.showSidebarButtons();
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
