import { GameSpeed } from '@/game/GameSpeed';
import { ZoneType } from '@/game/gameobject/unit/ZoneType';
import { NotifyTick } from './interface/NotifyTick';
import { GameObject } from '@/game/gameobject/GameObject';
import { World } from '@/game/World';
export class UnitReloadTrait {
    private cooldownTicks?: number;
    [NotifyTick.onTick](gameObject: GameObject, world: World): void {
        if (gameObject.dockTrait &&
            gameObject.dockTrait.hasDockedUnits() &&
            !gameObject.dockTrait.getDockedUnits().every((unit) => !this.canReloadUnit(unit))) {
            if (this.cooldownTicks === undefined) {
                this.cooldownTicks =
                    GameSpeed.BASE_TICKS_PER_SECOND *
                        world.rules.general.repair.reloadRate *
                        60;
            }
            if (this.cooldownTicks <= 0) {
                this.cooldownTicks =
                    GameSpeed.BASE_TICKS_PER_SECOND *
                        world.rules.general.repair.reloadRate *
                        60;
                const dockedUnits = gameObject.dockTrait.getDockedUnits();
                const unitsToReload = dockedUnits[0].ammo === 0 ? dockedUnits.slice(0, 1) : dockedUnits;
                for (const unit of unitsToReload) {
                    if (this.canReloadUnit(unit)) {
                        unit.ammoTrait.ammo++;
                    }
                }
            }
            else {
                this.cooldownTicks--;
            }
        }
    }
    canReloadUnit(unit: GameObject): boolean {
        return !(!unit.ammoTrait ||
            !unit.rules.manualReload ||
            unit.ammoTrait.isFull() ||
            unit.zone === ZoneType.Air);
    }
}
