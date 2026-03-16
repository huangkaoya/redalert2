import { AttackTask } from "@/game/gameobject/task/AttackTask";
import { MoveState } from "@/game/gameobject/trait/MoveTrait";
export class AttackMoveTargetTask extends AttackTask {
    private isAttackMove: boolean = true;
    private attackPerformed: boolean = false;
    private passedFirstWaypoint: boolean = false;
    private internalTargetUpdateRequested: boolean = false;
    private scanCooldownTicks: number = 0;
    private initialTarget: any;
    private initialWeapon: any;
    private requestedTarget: any;
    private lastScanTile: any;
    constructor(game: any, target: any, weapon: any) {
        super(game, target, weapon);
        if (!target.obj?.isTechno()) {
            throw new Error("Target must be a techno object");
        }
        this.initialTarget = target;
        this.initialWeapon = weapon;
        this.requestedTarget = target;
    }
    duplicate(): AttackMoveTargetTask {
        return new AttackMoveTargetTask(this.game, this.initialTarget, this.initialWeapon);
    }
    requestTargetUpdate(target: any): void {
        if (this.internalTargetUpdateRequested) {
            this.requestedTarget = target;
            this.internalTargetUpdateRequested = false;
        }
        else {
            if (this.requestedTarget === this.initialTarget) {
                this.requestedTarget = target;
            }
            else {
                this.attackPerformed = true;
            }
            this.initialTarget = target;
        }
        super.requestTargetUpdate(target);
    }
    onTargetChange(unit: any): void {
        super.onTargetChange(unit);
        const currentTarget = unit.attackTrait.currentTarget;
        if (currentTarget &&
            currentTarget.obj !== this.initialTarget.obj &&
            currentTarget.obj !== this.requestedTarget.obj) {
            if (this.requestedTarget === this.initialTarget) {
                this.requestedTarget = currentTarget;
            }
            this.initialTarget = currentTarget;
        }
    }
    onTick(unit: any): boolean {
        if (unit.moveTrait.moveState === MoveState.Moving) {
            this.passedFirstWaypoint = true;
        }
        this.scanCooldownTicks = Math.max(0, this.scanCooldownTicks - 1);
        if (unit.attackTrait &&
            !unit.attackTrait.isDisabled() &&
            !this.isCancelling() &&
            (this.requestedTarget === this.initialTarget || this.attackPerformed)) {
            if (!(unit.moveTrait.isIdle() ||
                (unit.tile === this.lastScanTile && this.scanCooldownTicks))) {
                this.lastScanTile = unit.tile;
                this.scanCooldownTicks = this.game.rules.general.normalTargetingDelay;
                const weapon = unit.attackTrait.selectDefaultWeapon(unit);
                if (weapon && (this.passedFirstWaypoint || !weapon.getCooldownTicks())) {
                    const scanResult = unit.attackTrait.scanForTarget(unit, weapon, this.game);
                    if (scanResult.target) {
                        const { target, weapon } = scanResult;
                        if (!weapon.getCooldownTicks()) {
                            this.options.holdGround = true;
                            this.options.passive = true;
                            this.setWeapon(weapon);
                            const newTarget = this.game.createTarget(target, target.tile);
                            this.internalTargetUpdateRequested = true;
                            this.requestTargetUpdate(newTarget);
                            this.attackPerformed = false;
                            return false;
                        }
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
                this.options.holdGround = false;
                this.options.passive = false;
                this.setWeapon(this.initialWeapon);
                this.internalTargetUpdateRequested = true;
                this.requestTargetUpdate(this.initialTarget);
            }
        }
        const result = super.onTick(unit);
        if (result && this.requestedTarget !== this.initialTarget) {
            this.attackPerformed = true;
            return this.isCancelling() || unit.attackTrait.isDisabled();
        }
        return result;
    }
}
