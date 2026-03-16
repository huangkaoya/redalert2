import { EventDispatcher } from '../../util/event';
export interface Screen {
    title?: string;
    musicType?: any;
    onEnter(params?: any): void | Promise<void>;
    onLeave(): void | Promise<void>;
    onStack?(): void | Promise<void>;
    onUnstack?(params?: any): void | Promise<void>;
    update?(deltaTime: number): void;
    destroy?(): void;
}
export abstract class Controller {
    protected screens = new Map<number, Screen>();
    protected currentScreen?: Screen;
    protected screenStack: Array<{
        screen: Screen;
        screenType: number;
    }> = [];
    protected _onScreenChange = new EventDispatcher<Controller, number | undefined>();
    get onScreenChange() {
        return this._onScreenChange.asEvent();
    }
    addScreen(screenType: number, screen: Screen): void {
        this.screens.set(screenType, screen);
    }
    async goToScreenBlocking(screenType: number, params?: any): Promise<void> {
        console.log(`[Controller] Going to screen: ${screenType}`);
        while (this.currentScreen || this.screenStack.length) {
            await this.leaveCurrentScreen();
        }
        await this.pushScreen(screenType, params);
    }
    async leaveCurrentScreen(): Promise<void> {
        await this.popScreen();
    }
    goToScreen(screenType: number, params?: any): void {
        this.goToScreenBlocking(screenType, params).catch(error => {
            console.error('[Controller] Error navigating to screen:', error);
        });
    }
    async pushScreen(screenType: number, params?: any): Promise<void> {
        console.log(`[Controller] Pushing screen: ${screenType}`);
        if (this.currentScreen) {
            const currentScreenType = this.getCurrentScreenType();
            if (currentScreenType !== undefined) {
                await this.currentScreen.onStack?.();
                this.screenStack.push({
                    screen: this.currentScreen,
                    screenType: currentScreenType
                });
            }
        }
        const screen = this.screens.get(screenType);
        if (!screen) {
            throw new Error(`Screen ${screenType} not found`);
        }
        this.currentScreen = screen;
        await screen.onEnter(params);
        this._onScreenChange.dispatch(this, screenType);
    }
    async popScreen(params?: any): Promise<void> {
        console.log('[Controller] Popping screen');
        if (this.currentScreen) {
            await this.currentScreen.onLeave();
        }
        const previousScreenInfo = this.screenStack.pop();
        if (previousScreenInfo) {
            this.currentScreen = previousScreenInfo.screen;
            await previousScreenInfo.screen.onUnstack?.(params);
            this._onScreenChange.dispatch(this, previousScreenInfo.screenType);
        }
        else {
            this.currentScreen = undefined;
            this._onScreenChange.dispatch(this, undefined);
        }
    }
    getCurrentScreen(): Screen | undefined {
        return this.currentScreen;
    }
    getCurrentScreenType(): number | undefined {
        if (!this.currentScreen)
            return undefined;
        for (const [screenType, screen] of this.screens.entries()) {
            if (screen === this.currentScreen) {
                return screenType;
            }
        }
        return undefined;
    }
    update(deltaTime: number): void {
        if (this.currentScreen?.update) {
            this.currentScreen.update(deltaTime);
        }
    }
    destroy(): void {
        for (const screen of this.screens.values()) {
            screen.destroy?.();
        }
        this.screens.clear();
        this.screenStack = [];
        this.currentScreen = undefined;
    }
    abstract rerenderCurrentScreen(): void;
}
