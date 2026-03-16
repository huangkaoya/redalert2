import { Task } from "./Task";
export class TaskGroup extends Task {
    constructor(...tasks: Task[]) {
        super();
        this.children.push(...tasks);
    }
    onTick(object: any): boolean {
        return true;
    }
}
