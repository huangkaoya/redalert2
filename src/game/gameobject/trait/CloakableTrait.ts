import { ObjectCloakChangeEvent } from "@/game/event/ObjectCloakChangeEvent";
import { GameSpeed } from "@/game/GameSpeed";
import { NotifyDamage } from "@/game/gameobject/trait/interface/NotifyDamage";
import { NotifySpawn } from "@/game/gameobject/trait/interface/NotifySpawn";
import { NotifyTick } from "@/game/gameobject/trait/interface/NotifyTick";
export class CloakableTrait {
    private gameObject: any;
    private cloakDelayMinutes: number;
    private isActive: boolean;
    private cooldownTicks: number;
    constructor(gameObject: any, cloakDelayMinutes: number) {
        this.gameObject = gameObject;
        this.cloakDelayMinutes = cloakDelayMinutes;
        this.isActive = false;
        this.resetCloakCooldown();
    }
    isCloaked(): boolean {
        return this.isActive;
    }
    uncloak(context: any): void {
        const wasActive = this.isActive;
        this.resetCloakCooldown();
        if (wasActive) {
            this.isActive = false;
            context.events.dispatch(new ObjectCloakChangeEvent(this.gameObject));
        }
    }
    resetCloakCooldown(): void {
        this.cooldownTicks = Math.floor(60 * this.cloakDelayMinutes * GameSpeed.BASE_TICKS_PER_SECOND);
    }
    [NotifySpawn.onSpawn](target: any, context: any): void {
        this.resetCloakCooldown();
    }
    [NotifyTick.onTick](target: any, context: any): void {
        if (this.cooldownTicks > 0) {
            this.cooldownTicks--;
        }
        if (this.cooldownTicks <= 0 &&
            !this.isActive &&
            !(target.isVehicle() &&
                target.submergibleTrait &&
                !target.submergibleTrait.isSubmerged()) &&
            !target.temporalTrait.getTarget()) {
            this.isActive = true;
            context.events.dispatch(new ObjectCloakChangeEvent(this.gameObject));
        }
    }
    [NotifyDamage.onDamage](target: any, context: any): void {
        this.uncloak(context);
    }
    dispose(): void {
        this.gameObject = undefined;
    }
}
