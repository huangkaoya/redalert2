import { Task } from "./Task";
export class WaitTicksTask extends Task {
    private ticks: number;
    constructor(ticks: number) {
        super();
        this.ticks = ticks;
    }
    onTick(): boolean {
        return this.isCancelling() || !(this.ticks-- > 0);
    }
}
