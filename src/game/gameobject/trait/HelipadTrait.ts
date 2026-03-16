import { ObjectType } from '@/engine/type/ObjectType';
import { NotifyOwnerChange } from './interface/NotifyOwnerChange';
import { NotifyUnspawn } from './interface/NotifyUnspawn';
export class HelipadTrait {
    [NotifyOwnerChange.onChange](unit: any, oldOwner: any, world: any): void {
        this.checkAircraftsForPlayer(oldOwner, world);
    }
    [NotifyUnspawn.onUnspawn](unit: any, world: any): void {
        this.checkAircraftsForPlayer(unit.owner, world);
    }
    private checkAircraftsForPlayer(player: any, world: any): void {
        const padAircraft = world.rules.general.padAircraft;
        for (const aircraft of player
            .getOwnedObjectsByType(ObjectType.Aircraft)
            .filter((aircraft: any) => padAircraft.includes(aircraft.name))) {
            if (aircraft.airportBoundTrait) {
                aircraft.airportBoundTrait.preferredAirport = undefined;
            }
        }
    }
}
