import { NotifyTick } from "@/game/gameobject/trait/interface/NotifyTick";
import { NotifyOwnerChange } from "@/game/gameobject/trait/interface/NotifyOwnerChange";
import { GameSpeed } from "@/game/GameSpeed";
interface GameObject {
    healthTrait: {
        health: number;
        maxHitPoints: number;
        getHitPoints(): number;
        healBy(amount: number, gameObject: GameObject, game: any): void;
    };
    isInfantry(): boolean;
    isBuilding(): boolean;
    owner: {
        credits: number;
    };
    purchaseValue: number;
}
export class AutoRepairTrait implements NotifyTick, NotifyOwnerChange {
    private freeRepair: boolean;
    private disabled: boolean;
    private cooldownTicks: number;
    private healLeftover: number;
    constructor(freeRepair: boolean = false) {
        this.freeRepair = freeRepair;
        this.disabled = true;
        this.cooldownTicks = 0;
        this.healLeftover = 0;
    }
    isDisabled(): boolean {
        return this.disabled;
    }
    setDisabled(disabled: boolean): void {
        this.disabled = disabled;
    }
    [NotifyTick.onTick](gameObject: GameObject, game: any): void {
        if (this.isDisabled())
            return;
        if (gameObject.healthTrait.health === 100) {
            this.setDisabled(true);
            return;
        }
        if (this.cooldownTicks <= 0) {
            const repairRules = game.rules.general.repair;
            const repairRate = gameObject.isInfantry()
                ? repairRules.iRepairRate
                : gameObject.isBuilding()
                    ? repairRules.repairRate
                    : repairRules.uRepairRate;
            this.cooldownTicks += GameSpeed.BASE_TICKS_PER_SECOND * repairRate * 60;
            const repairStep = gameObject.isInfantry() ? repairRules.iRepairStep : repairRules.repairStep;
            const repairPercent = this.freeRepair ? 0 : repairRules.repairPercent;
            let healAmount: number;
            if (repairPercent) {
                const costPerHP = (repairPercent * gameObject.purchaseValue) / gameObject.healthTrait.maxHitPoints;
                const maxAffordable = Math.min(gameObject.owner.credits, Math.max(1, Math.floor(costPerHP * repairStep)));
                if (maxAffordable) {
                    healAmount = costPerHP ? maxAffordable / costPerHP : repairStep;
                    gameObject.owner.credits -= maxAffordable;
                }
                else {
                    healAmount = 0;
                    this.setDisabled(true);
                }
            }
            else {
                healAmount = repairStep;
            }
            if (healAmount) {
                healAmount += this.healLeftover;
                healAmount = Math.min(gameObject.healthTrait.maxHitPoints - gameObject.healthTrait.getHitPoints(), healAmount);
                if (healAmount) {
                    const wholeHeal = Math.floor(healAmount);
                    this.healLeftover = healAmount - wholeHeal;
                    if (wholeHeal) {
                        gameObject.healthTrait.healBy(wholeHeal, gameObject, game);
                    }
                }
            }
        }
        else {
            this.cooldownTicks--;
        }
    }
    [NotifyOwnerChange.onChange](): void {
        this.setDisabled(true);
    }
}
