import { Task } from "@/game/gameobject/task/system/Task";
export class CallbackTask extends Task {
    private cb: (unit: any) => void;
    constructor(cb: (unit: any) => void) {
        super();
        this.cb = cb;
    }
    onTick(unit: any): boolean {
        this.cb(unit);
        return true;
    }
}
