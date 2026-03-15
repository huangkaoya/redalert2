import { Task } from "@/game/gameobject/task/system/Task";
import { Building, BuildStatus } from "@/game/gameobject/Building";
import { WaitMinutesTask } from "@/game/gameobject/task/system/WaitMinutesTask";

export class PackBuildingTask extends Task {
  private game: any;

  constructor(game: any) {
    super();
    this.game = game;
  }

  onTick(unit: any): boolean {
    if (unit.buildStatus !== BuildStatus.BuildDown && !unit.rules.wall) {
      unit.setBuildStatus(BuildStatus.BuildDown, this.game);
      this.children.push(
        new WaitMinutesTask(this.game.rules.general.buildupTime)
      );
      return false;
    }
    return true;
  }
}
