import { Controller } from '@/gui/screen/Controller';
interface SidebarButton {
    label: string;
    isBottom?: boolean;
    onClick: () => void;
}
interface Hud {
    showSidebarMenu(buttons: SidebarButton[]): void;
    hideSidebarMenu(): void;
    setMenuContentComponent(component?: any): void;
    toggleMenuContentVisibility(visible: boolean): void;
}
export class GameMenuController extends Controller {
    private hud: Hud;
    private contentAreaVisible = false;
    private sidebarButtons?: SidebarButton[];
    private mainContentComponent?: any;
    constructor(hud: Hud) {
        super();
        this.hud = hud;
        this.contentAreaVisible = false;
    }
    async goToScreenBlocking(screenType: any, params?: any): Promise<any> {
        return super.goToScreenBlocking(screenType, params);
    }
    goToScreen(screenType: any, params?: any): void {
        super.goToScreen(screenType, params);
    }
    async pushScreen(screenType: any, params?: any): Promise<void> {
        this.setMainComponent();
        await super.pushScreen(screenType, params);
    }
    async popScreen(result?: any): Promise<any> {
        this.setMainComponent();
        return await super.popScreen(result);
    }
    async close(): Promise<void> {
        while (this.getCurrentScreen() || this.screenStack.length) {
            await this.popScreen();
        }
    }
    setHud(hud: Hud): void {
        this.hud = hud;
    }
    setSidebarButtons(buttons: SidebarButton[]): void {
        this.sidebarButtons = buttons;
    }
    showSidebarButtons(): void {
        if (this.sidebarButtons === undefined) {
            throw new Error("Sidebar buttons should be set first");
        }
        this.hud.showSidebarMenu(this.sidebarButtons);
    }
    hideSidebarButtons(): void {
        this.sidebarButtons = undefined;
        this.hud.hideSidebarMenu();
    }
    setMainComponent(component?: any): void {
        this.mainContentComponent = component;
        this.hud.setMenuContentComponent(this.mainContentComponent);
    }
    toggleContentAreaVisibility(visible: boolean): void {
        this.contentAreaVisible = visible;
        this.hud.toggleMenuContentVisibility(visible);
    }
    rerenderCurrentScreen(): void {
        if (this.sidebarButtons) {
            this.hud.showSidebarMenu(this.sidebarButtons);
        }
        this.hud.setMenuContentComponent(this.mainContentComponent);
        this.hud.toggleMenuContentVisibility(this.contentAreaVisible);
    }
    destroy(): void {
        super.destroy();
        this.setMainComponent(undefined);
    }
}
