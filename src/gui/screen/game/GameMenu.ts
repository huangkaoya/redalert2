import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { GameMenuController } from '@/gui/screen/game/gameMenu/GameMenuController';
import { ScreenType } from '@/gui/screen/game/gameMenu/ScreenType';
import { EventDispatcher } from '@/util/event';
export class GameMenu {
    private _onOpen = new EventDispatcher<GameMenu, void>();
    private _onQuit = new EventDispatcher<GameMenu, void>();
    private _onObserve = new EventDispatcher<GameMenu, void>();
    private _onCancel = new EventDispatcher<GameMenu, void>();
    private _onToggleAlliance = new EventDispatcher<GameMenu, any>();
    private _onSendMessage = new EventDispatcher<GameMenu, any>();
    private disposables = new CompositeDisposable();
    private controller?: GameMenuController;
    get onOpen() {
        return this._onOpen.asEvent();
    }
    get onQuit() {
        return this._onQuit.asEvent();
    }
    get onObserve() {
        return this._onObserve.asEvent();
    }
    get onCancel() {
        return this._onCancel.asEvent();
    }
    get onToggleAlliance() {
        return this._onToggleAlliance.asEvent();
    }
    get onSendMessage() {
        return this._onSendMessage.asEvent();
    }
    constructor(private screens: Map<number, any>, private game: any, private localPlayer: any, private chatHistory: any, private gservCon?: any, private isSinglePlayer: boolean = false, private isTournament: boolean = false) { }
    init(hud: any): void {
        const controller = this.controller = new GameMenuController(hud);
        for (const [screenType, screen] of this.screens) {
            screen.setController?.(controller);
            controller.addScreen(screenType, screen);
        }
        this.disposables.add(controller, () => (this.controller = undefined));
        this.bindHudEvents(hud);
    }
    open(): void {
        if (!this.controller)
            return;
        this._onOpen.dispatch(this);
        this.controller.goToScreen(ScreenType.Home, {
            observeAllowed: !(this.isTournament ||
                this.isSinglePlayer ||
                this.localPlayer === undefined ||
                this.localPlayer.isObserver ||
                this.localPlayer.defeated),
            onQuit: async () => {
                this.controller!.close();
                this._onQuit.dispatch(this);
            },
            onObserve: () => {
                this.controller!.close();
                this._onObserve.dispatch(this);
            },
            onCancel: () => {
                this.controller!.close();
                this._onCancel.dispatch(this);
            }
        });
    }
    close(): void {
        if (!this.controller)
            return;
        if (this.controller.getCurrentScreen()) {
            this.controller.close();
            this._onCancel.dispatch(this);
        }
    }
    openDiplo(): void {
        if (!this.controller)
            return;
        this._onOpen.dispatch(this);
        this.controller.goToScreen(ScreenType.Diplo, {
            game: this.game,
            localPlayer: this.localPlayer,
            isSinglePlayer: this.isSinglePlayer,
            chatHistory: this.chatHistory,
            gservCon: this.gservCon,
            onToggleAlliance: (player: any, enabled: boolean) => {
                this._onToggleAlliance.dispatch(player, enabled);
            },
            onSendMessage: (message: any) => this._onSendMessage.dispatch(this, message),
            onCancel: () => {
                this.controller!.close();
                this._onCancel.dispatch(this);
            }
        });
    }
    openConnectionInfo(combatants: any, gservCon: any, chatNetHandler: any): void {
        if (!this.controller)
            return;
        this._onOpen.dispatch(this);
        this.controller.goToScreen(ScreenType.ConnectionInfo, {
            players: combatants,
            localPlayer: this.localPlayer,
            chatHistory: this.chatHistory,
            chatNetHandler: chatNetHandler,
            gservCon: gservCon,
            onQuit: async () => {
                this.controller!.close();
                this._onQuit.dispatch(this);
            }
        });
    }
    handleHudChange(hud: any): void {
        if (!this.controller)
            return;
        this.controller.setHud(hud);
        this.bindHudEvents(hud);
        this.controller.rerenderCurrentScreen();
    }
    getCurrentScreen(): any {
        return this.controller?.getCurrentScreen();
    }
    dispose(): void {
        this.disposables.dispose();
    }
    private bindHudEvents(hud: any): void {
        hud.onOptButtonClick.subscribe(() => this.open());
        hud.onDiploButtonClick.subscribe(() => this.openDiplo());
    }
}
