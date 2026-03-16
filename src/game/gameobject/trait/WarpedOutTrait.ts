import { NotifyWarpChange } from "@/game/gameobject/trait/interface/NotifyWarpChange";
import { NotifyTick } from "@/game/gameobject/trait/interface/NotifyTick";
export class WarpedOutTrait implements NotifyTick {
    private gameObject: any;
    private ticksWhenWarpedOut: boolean = true;
    private remainingTicks: number = 0;
    private invulnerable: boolean = false;
    constructor(gameObject: any) {
        this.gameObject = gameObject;
    }
    isActive(): boolean {
        return this.remainingTicks > 0;
    }
    setActive(active: boolean, invulnerable: boolean, context: any): void {
        this.remainingTicks = active ? Number.POSITIVE_INFINITY : 0;
        this.invulnerable = invulnerable;
        this.notifyChange(active, context);
    }
    setTimed(ticks: number, invulnerable: boolean, context: any): void {
        this.remainingTicks = ticks;
        this.invulnerable = invulnerable;
        this.notifyChange(true, context);
    }
    debugSetActive(active: boolean): void {
        this.remainingTicks = active ? Number.POSITIVE_INFINITY : 0;
    }
    private notifyChange(isWarpedOut: boolean, context: any): void {
        context.traits
            .filter(NotifyWarpChange)
            .forEach(trait => {
            trait[NotifyWarpChange.onChange](this.gameObject, context, isWarpedOut);
        });
        this.gameObject.traits
            .filter(NotifyWarpChange)
            .forEach(trait => {
            trait[NotifyWarpChange.onChange](this.gameObject, context, isWarpedOut);
        });
    }
    expire(context: any): void {
        this.remainingTicks = 0;
        this.notifyChange(false, context);
    }
    isInvulnerable(): boolean {
        return this.isActive() && this.invulnerable;
    }
    [NotifyTick.onTick](gameObject: any, context: any): void {
        if (this.remainingTicks > 0) {
            this.remainingTicks--;
            if (this.remainingTicks <= 0) {
                this.notifyChange(false, context);
            }
        }
    }
    dispose(): void {
        this.gameObject = undefined;
    }
}
