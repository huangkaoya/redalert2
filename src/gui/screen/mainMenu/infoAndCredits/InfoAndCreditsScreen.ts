import { Screen } from '../../Controller';
import { MainMenuController } from '../MainMenuController';
import { MainMenuScreenType } from '../../ScreenType';
import { Strings } from '../../../../data/Strings';
import { MessageBoxApi } from '../../../component/MessageBoxApi';
import { Config } from '../../../../Config';
import { ReportBug } from '../main/ReportBug';
import React from 'react';
interface SidebarButton {
    label: string;
    tooltip?: string;
    disabled?: boolean;
    isBottom?: boolean;
    onClick: () => void | Promise<void>;
}
export class InfoAndCreditsScreen implements Screen {
    private strings: Strings;
    private messageBoxApi: MessageBoxApi;
    private controller?: MainMenuController;
    public title: string;
    constructor(strings: Strings, messageBoxApi: MessageBoxApi) {
        this.strings = strings;
        this.messageBoxApi = messageBoxApi;
        this.title = this.strings.get("TS:InfoAndCredits") || "Info & Credits";
    }
    setController(controller: MainMenuController): void {
        this.controller = controller;
    }
    onEnter(): void {
        console.log('[InfoAndCreditsScreen] Entering info and credits screen');
        const buttons: SidebarButton[] = [];
        buttons.push({
            label: this.strings.get("GUI:ViewCredits") || "View Credits",
            onClick: () => {
                console.log('[InfoAndCreditsScreen] View Credits clicked');
                this.controller?.pushScreen(MainMenuScreenType.Credits);
            }
        });
        buttons.push({
            label: this.strings.get("GUI:Back") || "Back",
            isBottom: true,
            onClick: () => {
                console.log('[InfoAndCreditsScreen] Back clicked');
                this.controller?.leaveCurrentScreen();
            }
        });
        this.controller?.setSidebarButtons(buttons);
        this.controller?.showSidebarButtons();
        this.controller?.toggleMainVideo(true);
        this.controller?.setMainComponent();
    }
    async onLeave(): Promise<void> {
        console.log('[InfoAndCreditsScreen] Leaving info and credits screen');
        if (this.controller) {
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
}
