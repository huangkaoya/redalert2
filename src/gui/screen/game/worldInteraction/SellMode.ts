import { PointerType } from '@/engine/type/PointerType';
import { EventDispatcher } from '@/util/event';
import { BuildStatus } from '@/game/gameobject/Building';
import { DockableTrait } from '@/game/gameobject/trait/DockableTrait';
export class SellMode {
    private readonly _onExecute = new EventDispatcher<SellMode, any>();
    private currentHover?: any;
    private lastHover?: any;
    private lastUpdate?: number;
    get onExecute() {
        return this._onExecute.asEvent();
    }
    static factory(game: any, player: any, sidebarModel: any, pointer: any, renderer: any): SellMode {
        return new SellMode(game, player, sidebarModel, pointer, renderer);
    }
    constructor(private readonly game: any, private readonly player: any, private readonly sidebarModel: any, private readonly pointer: any, private readonly renderer: any) { }
    private readonly onFrame = (time: number): void => {
        if (this.lastHover?.tile === this.currentHover?.tile &&
            this.lastHover?.gameObject === this.currentHover?.gameObject &&
            this.lastUpdate !== undefined &&
            time - this.lastUpdate < 1000 / 15) {
            return;
        }
        this.lastHover = this.currentHover;
        this.lastUpdate = time;
        let pointerType = PointerType.Default;
        if (this.currentHover?.tile) {
            const gameObject = this.currentHover.gameObject;
            pointerType =
                gameObject && this.isRefundableObject(gameObject)
                    ? gameObject.isBuilding()
                        ? PointerType.Sell
                        : PointerType.SellMini
                    : PointerType.NoSell;
        }
        this.pointer.setPointerType(pointerType);
    };
    enter(): void {
        this.sidebarModel.sellMode = true;
        this.currentHover = undefined;
        this.lastHover = undefined;
        this.lastUpdate = undefined;
        this.renderer.onFrame.subscribe(this.onFrame);
    }
    hover(hover: any, minimap: boolean): void {
        if (!minimap) {
            this.currentHover = hover;
        }
    }
    isRefundableObject(gameObject: any): boolean {
        return !!(gameObject.isTechno?.() &&
            gameObject.owner === this.player &&
            !gameObject.rules.unsellable &&
            this.game.sellTrait.computeRefundValue(gameObject) > 0 &&
            (gameObject.isBuilding?.()
                ? gameObject.buildStatus === BuildStatus.Ready && !gameObject.warpedOutTrait.isActive()
                : gameObject.traits.find(DockableTrait)?.dock?.rules.unitSell));
    }
    execute(hover: any, minimap: boolean): boolean {
        if (minimap) {
            return false;
        }
        const gameObject = hover?.gameObject;
        if (gameObject && this.isRefundableObject(gameObject)) {
            this._onExecute.dispatch(this, gameObject);
        }
        return false;
    }
    cancel(): void {
        this.end();
    }
    private end(): void {
        this.sidebarModel.sellMode = false;
        this.renderer.onFrame.unsubscribe(this.onFrame);
    }
    dispose(): void {
        this.end();
    }
}
