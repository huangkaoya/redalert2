import { WaitTicksTask } from "./WaitTicksTask";
import { GameSpeed } from "@/game/GameSpeed";
export class WaitMinutesTask extends WaitTicksTask {
    constructor(minutes: number) {
        super(Math.floor(GameSpeed.BASE_TICKS_PER_SECOND * minutes * 60));
    }
}
