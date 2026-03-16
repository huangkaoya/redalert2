import { MoveTask } from "@/game/gameobject/task/move/MoveTask";
import { MoveState, CollisionState } from "@/game/gameobject/trait/MoveTrait";
import { MovementZone } from "@/game/type/MovementZone";
export class AttackMoveTask extends MoveTask {
    private isAttackMove: boolean = true;
    private attackPerformed: boolean = false;
    private passedFirstWaypoint: boolean = false;
    constructor(game: any, targetTile: any, toBridge: boolean, options?: any) {
        super(game, targetTile, toBridge, options);
    }
    duplicate(): AttackMoveTask {
        return new AttackMoveTask(this.game, this.targetTile, this.toBridge, this.options);
    }
    onTick(unit: any): boolean {
        if (unit.moveTrait.moveState === MoveState.Moving) {
            this.passedFirstWaypoint = true;
        }
        if (unit.moveTrait.moveState === MoveState.ReachedNextWaypoint &&
            unit.attackTrait &&
            !unit.attackTrait.isDisabled() &&
            (unit.rules.movementZone !== MovementZone.Fly || !unit.rules.balloonHover) &&
            (!unit.ammoTrait || unit.ammoTrait.ammo || !unit.rules.manualReload) &&
            !this.isCancelling()) {
            const weapon = unit.attackTrait.selectDefaultWeapon(unit);
            if (weapon && (this.passedFirstWaypoint || !weapon.getCooldownTicks())) {
                const scanResult = unit.attackTrait.scanForTarget(unit, weapon, this.game);
                if (scanResult.target) {
                    const { target, weapon: targetWeapon } = scanResult;
                    if (!targetWeapon.getCooldownTicks()) {
                        const attackTask = unit.attackTrait.createAttackTask(this.game, target, target.tile, targetWeapon, { holdGround: true, passive: true });
                        this.children.push(attackTask);
                        this.useChildTargetLines = true;
                        this.attackPerformed = true;
                        unit.moveTrait.velocity.set(0, 0, 0);
                        unit.moveTrait.currentWaypoint = undefined;
                        unit.moveTrait.collisionState = CollisionState.Waiting;
                        return false;
                    }
                }
            }
            if (this.attackPerformed) {
                if (!unit.isSpawned) {
                    if (!this.forceCancel(unit)) {
                        throw new Error("Force cancel failed");
                    }
                    return true;
                }
                this.attackPerformed = false;
                this.passedFirstWaypoint = false;
                this.useChildTargetLines = false;
                unit.moveTrait.collisionState = CollisionState.Resolved;
                this.updateTarget(this.targetTile, this.toBridge);
            }
        }
        return super.onTick(unit);
    }
}
