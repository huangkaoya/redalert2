import { NotifyUnspawn } from "@/game/gameobject/trait/interface/NotifyUnspawn";
import { NotifyOwnerChange } from "@/game/gameobject/trait/interface/NotifyOwnerChange";
import { NotifyTeleport } from "@/game/gameobject/trait/interface/NotifyTeleport";
export class DockableTrait {
    public dock?: any;
    public reservedDock?: any;
    [NotifyUnspawn.onUnspawn](target: any): void {
        this.undock(target);
        this.reservedDock?.dockTrait.unreserveDockForUnit(target);
    }
    [NotifyOwnerChange.onChange](target: any): void {
        if (target.owner !== this.dock?.owner) {
            this.undock(target);
        }
        if (target.owner !== this.reservedDock?.owner) {
            this.reservedDock?.dockTrait.unreserveDockForUnit(target);
        }
    }
    [NotifyTeleport.onBeforeTeleport](target: any, context: any, tile: any, keepDock: boolean): void {
        if (!keepDock) {
            this.undock(target);
        }
    }
    undock(target: any): void {
        if (this.dock && !this.dock.isDisposed) {
            this.dock.dockTrait.undockUnit(target);
        }
    }
    dispose(): void {
        this.dock = undefined;
        this.reservedDock = undefined;
    }
}
