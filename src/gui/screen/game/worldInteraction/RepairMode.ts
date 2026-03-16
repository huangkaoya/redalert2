import { PointerType } from '@/engine/type/PointerType';
import { EventDispatcher } from '@/util/event';
export class RepairMode {
    private readonly _onExecute = new EventDispatcher<RepairMode, any>();
    private currentTile?: any;
    private lastTile?: any;
    private lastUpdate?: number;
    get onExecute() {
        return this._onExecute.asEvent();
    }
    static factory(game: any, player: any, sidebarModel: any, pointer: any, renderer: any): RepairMode {
        return new RepairMode(game, player, sidebarModel, pointer, renderer);
    }
    constructor(private readonly game: any, private readonly player: any, private readonly sidebarModel: any, private readonly pointer: any, private readonly renderer: any) { }
    private readonly onFrame = (time: number): void => {
        if (this.lastTile === this.currentTile && this.lastUpdate !== undefined && time - this.lastUpdate < 1000 / 15) {
            return;
        }
        this.lastTile = this.currentTile;
        this.lastUpdate = time;
        const tile = this.currentTile;
        const hasRepairableBuilding = !!(tile && this.findRepairableBuilding(tile));
        this.pointer.setPointerType(tile ? (hasRepairableBuilding ? PointerType.SideRepair : PointerType.NoRepair) : PointerType.Default);
    };
    enter(): void {
        this.sidebarModel.repairMode = true;
        this.currentTile = undefined;
        this.lastTile = undefined;
        this.lastUpdate = undefined;
        this.renderer.onFrame.subscribe(this.onFrame);
    }
    hover(hover: any, minimap: boolean): void {
        if (!minimap) {
            this.currentTile = hover?.tile;
        }
    }
    private findRepairableBuilding(tile: any): any {
        return this.game.map
            .getObjectsOnTile(tile)
            .find((gameObject: any) => gameObject.isBuilding?.() &&
            gameObject.owner === this.player &&
            gameObject.healthTrait.health < 100 &&
            gameObject.rules.repairable &&
            gameObject.rules.clickRepairable);
    }
    execute(hover: any, minimap: boolean): boolean {
        if (minimap) {
            return false;
        }
        const tile = hover?.tile;
        if (!tile) {
            return false;
        }
        const building = this.findRepairableBuilding(tile);
        if (building) {
            this._onExecute.dispatch(this, building);
        }
        return false;
    }
    cancel(): void {
        this.end();
    }
    private end(): void {
        this.sidebarModel.repairMode = false;
        this.renderer.onFrame.unsubscribe(this.onFrame);
    }
    dispose(): void {
        this.end();
    }
}
