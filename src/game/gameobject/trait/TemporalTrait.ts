import { DeathType } from '@/game/gameobject/common/DeathType';
import { AttackTask } from '@/game/gameobject/task/AttackTask';
import { MoveTask } from '@/game/gameobject/task/move/MoveTask';
import { NotifyDestroy } from './interface/NotifyDestroy';
import { NotifyTick } from './interface/NotifyTick';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class TemporalTrait {
    private gameObject: GameObject;
    private ticksWhenWarpedOut: boolean = true;
    private attackers: Set<GameObject> = new Set();
    private currentTarget?: GameObject;
    private currentWeapon?: any;
    private eraseTicks?: number;
    constructor(gameObject: GameObject) {
        this.gameObject = gameObject;
    }
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        if (gameObject.attackTrait &&
            ((gameObject.attackTrait.currentTarget &&
                !gameObject.warpedOutTrait.isActive()) ||
                this.releaseCurrentTarget(world))) {
            if (this.eraseTicks !== undefined) {
                for (const attacker of this.attackers) {
                    const weapon = attacker.temporalTrait.currentWeapon;
                    if (!weapon) {
                        throw new Error(`Attacker "${attacker.name}" is no longer targeting "${gameObject.name}"`);
                    }
                    const damage = weapon.rules.damage;
                    this.eraseTicks -= damage;
                    if (this.eraseTicks <= 0) {
                        gameObject.deathType = DeathType.Temporal;
                        world.destroyObject(gameObject, { player: attacker.owner, obj: attacker, weapon }, true);
                        this.eraseTicks = undefined;
                        break;
                    }
                }
            }
        }
    }
    getTarget(): GameObject | undefined {
        return this.currentTarget;
    }
    updateTarget(target: GameObject, weapon: any, world: World): void {
        if (this.currentTarget !== target) {
            this.releaseCurrentTarget(world);
            this.currentTarget = target;
            this.currentWeapon = weapon;
            const attackerCount = target.temporalTrait.attackers.size;
            target.temporalTrait.attackers.add(this.gameObject);
            if (!attackerCount) {
                target.warpedOutTrait.setActive(true, true, world);
                const currentTask = target.unitOrderTrait.getCurrentTask();
                if ((currentTask && currentTask instanceof AttackTask) ||
                    currentTask instanceof MoveTask) {
                    currentTask.cancel();
                }
                target.temporalTrait.eraseTicks = 10 * target.healthTrait.maxHitPoints;
            }
        }
    }
    releaseCurrentTarget(world: World): void {
        if (this.currentTarget) {
            if (!this.currentTarget.isDisposed) {
                const attackers = this.currentTarget.temporalTrait.attackers;
                attackers.delete(this.gameObject);
                if (!attackers.size) {
                    this.currentTarget.warpedOutTrait.expire(world);
                    this.currentTarget.temporalTrait.eraseTicks = undefined;
                }
            }
            this.currentTarget = undefined;
            this.currentWeapon = undefined;
        }
    }
    [NotifyDestroy.onDestroy](gameObject: GameObject, world: World): void {
        this.releaseCurrentTarget(world);
    }
    dispose(): void {
        this.gameObject = undefined;
        this.attackers.clear();
    }
}
