import { BuildingGarrisonEvent } from "@/game/event/BuildingGarrisonEvent";
import { EnterBuildingTask } from "@/game/gameobject/task/EnterBuildingTask";
export class GarrisonBuildingTask extends EnterBuildingTask {
    isAllowed(e: any): boolean {
        return (!this.target.isDestroyed &&
            !!this.target.garrisonTrait?.canBeOccupied() &&
            this.target.garrisonTrait.units.length <
                this.target.garrisonTrait.maxOccupants &&
            !(this.target.garrisonTrait.units.length &&
                this.target.garrisonTrait.units[0].owner !== e.owner) &&
            !e.mindControllableTrait?.isActive());
    }
    onEnter(e: any): void {
        this.game.limboObject(e, {
            selected: false,
            controlGroup: this.game
                .getUnitSelection()
                .getOrCreateSelectionModel(e)
                .getControlGroupNumber(),
        });
        let t = this.target.garrisonTrait;
        if (!t.units.length) {
            e.owner.buildingsCaptured++;
            this.game.changeObjectOwner(this.target, e.owner);
            this.game.events.dispatch(new BuildingGarrisonEvent(this.target));
        }
        t.units.push(e);
    }
}
