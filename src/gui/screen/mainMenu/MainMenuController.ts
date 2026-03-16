import { Controller, Screen } from '../Controller';
import { MainMenuScreenType } from '../ScreenType';
import { EventDispatcher } from '../../../util/event';
import { SoundKey } from '../../../engine/sound/SoundKey';
import { ChannelType } from '../../../engine/sound/ChannelType';
export class MainMenuController extends Controller {
    private mainMenu: any;
    private sound?: any;
    private music?: any;
    constructor(mainMenu: any, sound?: any, music?: any) {
        super();
        this.mainMenu = mainMenu;
        this.sound = sound;
        this.music = music;
        console.log('[MainMenuController] Initialized');
    }
    async goToScreenBlocking(screenType: MainMenuScreenType, params?: any): Promise<void> {
        return super.goToScreenBlocking(screenType, params);
    }
    goToScreen(screenType: MainMenuScreenType, params?: any): void {
        return super.goToScreen(screenType, params);
    }
    async pushScreen(screenType: MainMenuScreenType, params?: any): Promise<void> {
        this.setMainComponent();
        this.setSidebarTitle("");
        await super.pushScreen(screenType, params);
        const screen = this.screens.get(screenType);
        if (screen?.title) {
            this.setSidebarTitle(screen.title);
        }
        if (screen && 'musicType' in screen && screen.musicType !== undefined && this.music) {
            console.log(`[MainMenuController] Playing music for screen ${screenType}: ${screen.musicType}`);
            try {
                await this.music.play(screen.musicType);
            }
            catch (error) {
                console.error(`[MainMenuController] Failed to play music for screen ${screenType}:`, error);
            }
        }
    }
    async popScreen(params?: any): Promise<void> {
        this.setMainComponent();
        this.setSidebarTitle("");
        await super.popScreen(params);
        const currentScreen = this.getCurrentScreen();
        if (currentScreen?.title) {
            this.setSidebarTitle(currentScreen.title);
        }
    }
    setSidebarButtons(buttons: any[], mpSlotEnabled?: boolean): void {
        console.log(`[MainMenuController] Setting ${buttons.length} sidebar buttons`);
        if (this.mainMenu && this.mainMenu.setButtons) {
            this.mainMenu.setButtons(buttons, !!mpSlotEnabled);
        }
    }
    showSidebarButtons(): void {
        console.log('[MainMenuController] Showing sidebar buttons');
        if (this.mainMenu && this.mainMenu.isSidebarCollapsed && this.mainMenu.isSidebarCollapsed()) {
            if (this.sound) {
                this.sound.play(SoundKey.GUIMoveInSound, ChannelType.Ui);
            }
            if (this.mainMenu.showButtons) {
                this.mainMenu.showButtons();
            }
        }
    }
    async hideSidebarButtons(): Promise<void> {
        console.log('[MainMenuController] Hiding sidebar buttons');
        if (this.mainMenu && this.mainMenu.isSidebarCollapsed && !this.mainMenu.isSidebarCollapsed()) {
            if (this.sound) {
                this.sound.play(SoundKey.GUIMoveOutSound, ChannelType.Ui);
            }
            return new Promise((resolve) => {
                if (this.mainMenu && this.mainMenu.onSidebarToggle) {
                    const handler = () => {
                        this.mainMenu!.onSidebarToggle.unsubscribe(handler);
                        resolve();
                    };
                    this.mainMenu.onSidebarToggle.subscribe(handler);
                    this.mainMenu.hideButtons();
                }
                else {
                    if (this.mainMenu && this.mainMenu.hideButtons) {
                        this.mainMenu.hideButtons();
                    }
                    setTimeout(resolve, 300);
                }
            });
        }
    }
    toggleMainVideo(show: boolean): void {
        console.log(`[MainMenuController] ${show ? 'Showing' : 'Hiding'} main video`);
        if (this.mainMenu && this.mainMenu.toggleVideo) {
            this.mainMenu.toggleVideo(show);
        }
    }
    showVersion(version: string): void {
        console.log(`[MainMenuController] Showing version: ${version}`);
        if (this.mainMenu && this.mainMenu.showVersion) {
            this.mainMenu.showVersion(version);
        }
    }
    hideVersion(): void {
        console.log('[MainMenuController] Hiding version');
        if (this.mainMenu && this.mainMenu.hideVersion) {
            this.mainMenu.hideVersion();
        }
    }
    setSidebarTitle(title: string): void {
        console.log(`[MainMenuController] Setting sidebar title: ${title}`);
        if (this.mainMenu && this.mainMenu.setSidebarTitle) {
            this.mainMenu.setSidebarTitle(title);
        }
    }
    setMainComponent(component?: any): void {
        if (this.mainMenu && this.mainMenu.setContentComponent) {
            this.mainMenu.setContentComponent(component);
        }
    }
    setSidebarMpContent(content: any): void {
        if (this.mainMenu && this.mainMenu.setSidebarMpContent) {
            this.mainMenu.setSidebarMpContent(content);
        }
    }
    toggleSidebarPreview(show: boolean): void {
        console.log(`[MainMenuController] ${show ? 'Showing' : 'Hiding'} sidebar preview`);
        if (this.mainMenu && this.mainMenu.toggleSidebarPreview) {
            this.mainMenu.toggleSidebarPreview(show);
        }
    }
    setSidebarPreview(preview?: any): void {
        if (this.mainMenu && this.mainMenu.setSidebarPreview) {
            this.mainMenu.setSidebarPreview(preview);
        }
    }
    getSidebarPreviewSize(): any {
        return this.mainMenu.getSidebarPreviewSize();
    }
    rerenderCurrentScreen(): void {
        console.log('[MainMenuController] Rerendering current screen');
        const currentScreen = this.getCurrentScreen();
        const currentScreenType = this.getCurrentScreenType();
        if (currentScreen && currentScreenType !== undefined) {
            currentScreen.onLeave();
            currentScreen.onEnter();
        }
    }
    destroy(): void {
        console.log('[MainMenuController] Destroying');
        super.destroy();
    }
}
