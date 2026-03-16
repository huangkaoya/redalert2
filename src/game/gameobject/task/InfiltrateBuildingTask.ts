import { Building, BuildStatus } from "@/game/gameobject/Building";
import { BuildingInfiltrationEvent } from "@/game/event/BuildingInfiltrationEvent";
import { EnterBuildingTask } from "@/game/gameobject/task/EnterBuildingTask";
export class InfiltrateBuildingTask extends EnterBuildingTask {
    isAllowed(e: any): boolean {
        return (e.rules.infiltrate &&
            this.target.rules.spyable &&
            !this.target.isDestroyed &&
            this.target.buildStatus !== BuildStatus.BuildDown &&
            !this.game.areFriendly(e, this.target));
    }
    onEnter(e: any): void {
        this.game.unspawnObject(e);
        e.agentTrait?.infiltrate(e, this.target, this.game);
        this.game.events.dispatch(new BuildingInfiltrationEvent(this.target, e));
    }
}
