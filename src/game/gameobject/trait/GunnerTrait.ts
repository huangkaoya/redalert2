import { VeteranLevel } from '@/game/gameobject/unit/VeteranLevel';
import { NotifyTick } from './interface/NotifyTick';
export class GunnerTrait {
    private lastHadGunner: boolean = false;
    [NotifyTick.onTick](unit: Unit): void {
        const hasGunner = !!unit.transportTrait.units.length;
        if (hasGunner !== this.lastHadGunner) {
            this.lastHadGunner = hasGunner;
            const ifvMode = unit.transportTrait.units[0]?.rules.ifvMode ?? 0;
            const turretIndex = unit.rules.turretIndexesByIfvMode.get(ifvMode) ?? 0;
            if (turretIndex < unit.rules.turretCount) {
                unit.turretNo = turretIndex;
                unit.armedTrait?.selectSpecialWeapon(ifvMode, unit.veteranLevel === VeteranLevel.Elite);
            }
        }
    }
    getUiNameForIfvMode(mode: number, name?: string): string | undefined {
        switch (mode) {
            case 0:
                return "tip:rocket";
            case 1:
                return "tip:repair";
            case 2:
            case 4:
            case 5:
                return "tip:machinegun";
            default:
                return name ? `name:${name.toLowerCase()}` : undefined;
        }
    }
}
