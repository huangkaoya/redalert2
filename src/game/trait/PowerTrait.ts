import { NotifySpawn } from './interface/NotifySpawn';
import { NotifyHealthChange } from './interface/NotifyHealthChange';
import { NotifyUnspawn } from './interface/NotifyUnspawn';
import { NotifyOwnerChange } from './interface/NotifyOwnerChange';
import { NotifyWarpChange } from './interface/NotifyWarpChange';
import { NotifyTick } from './interface/NotifyTick';
export class PowerTrait {
    [NotifySpawn.onSpawn](entity: any, timestamp: number): void {
        if (entity.isTechno() &&
            entity.rules.power &&
            !this.isCapturablePower(entity, entity.owner)) {
            entity.owner.powerTrait?.updateFrom(entity, "add", timestamp);
        }
    }
    [NotifyUnspawn.onUnspawn](entity: any, timestamp: number): void {
        if (entity.isTechno() &&
            entity.rules.power &&
            !entity.warpedOutTrait.isActive() &&
            !this.isCapturablePower(entity, entity.owner)) {
            entity.owner.powerTrait?.updateFrom(entity, "remove", timestamp);
        }
    }
    [NotifyHealthChange.onChange](entity: any, timestamp: number): void {
        if (entity.isTechno() &&
            entity.rules.power &&
            !entity.warpedOutTrait.isActive() &&
            !this.isCapturablePower(entity, entity.owner)) {
            entity.owner.powerTrait?.updateFrom(entity, "update", timestamp);
        }
    }
    [NotifyOwnerChange.onChange](entity: any, oldOwner: any, timestamp: number): void {
        if (entity.rules.power && !entity.warpedOutTrait.isActive()) {
            if (!this.isCapturablePower(entity, oldOwner)) {
                oldOwner.powerTrait?.updateFrom(entity, "remove", timestamp);
            }
            if (!this.isCapturablePower(entity, entity.owner)) {
                entity.owner.powerTrait?.updateFrom(entity, "add", timestamp);
            }
        }
    }
    [NotifyWarpChange.onChange](entity: any, timestamp: number, isWarping: boolean): void {
        if (entity.rules.power && !this.isCapturablePower(entity, entity.owner)) {
            entity.owner.powerTrait?.updateFrom(entity, isWarping ? "remove" : "add", timestamp);
        }
    }
    [NotifyTick.onTick](game: any): void {
        for (const combatant of game.getCombatants()) {
            combatant.powerTrait.updateBlackout(game);
        }
    }
    private isCapturablePower(entity: any, owner: any): boolean {
        return entity.rules.power > 0 && owner.isNeutral && entity.rules.needsEngineer;
    }
}
