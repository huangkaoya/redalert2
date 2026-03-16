import { ShipSubmergeChangeEvent } from '@/game/event/ShipSubmergeChangeEvent';
import { GameSpeed } from '@/game/GameSpeed';
import { AttackTrait, AttackState } from '@/game/gameobject/trait/AttackTrait';
import { NotifyDamage } from '@/game/gameobject/trait/interface/NotifyDamage';
import { NotifyTick } from '@/game/gameobject/trait/interface/NotifyTick';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class SubmergibleTrait {
    private isActive: boolean = false;
    private cooldownTicks?: number;
    isSubmerged(): boolean {
        return this.isActive;
    }
    setCooldown(ticks: number): void {
        this.cooldownTicks = ticks;
    }
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        if (this.isActive || gameObject.parasiteableTrait?.isInfested()) {
            return;
        }
        if (gameObject.attackTrait &&
            gameObject.attackTrait.attackState !== AttackState.Idle &&
            !gameObject.moveTrait.isMoving()) {
            this.cooldownTicks = Math.max(this.cooldownTicks ?? 0, 5 * GameSpeed.BASE_TICKS_PER_SECOND);
        }
        else {
            this.cooldownTicks ??= Math.floor(60 * world.rules.general.cloakDelay * GameSpeed.BASE_TICKS_PER_SECOND);
        }
        if (this.cooldownTicks > 0) {
            this.cooldownTicks--;
        }
        if (this.cooldownTicks <= 0) {
            this.isActive = true;
            world.events.dispatch(new ShipSubmergeChangeEvent(gameObject));
        }
    }
    [NotifyDamage.onDamage](gameObject: GameObject, world: World): void {
        this.emerge(gameObject, world);
    }
    emerge(gameObject: GameObject, world: World): void {
        if (this.isActive) {
            this.isActive = false;
            this.cooldownTicks = undefined;
            world.events.dispatch(new ShipSubmergeChangeEvent(gameObject));
        }
    }
}
