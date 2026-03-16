import { TaskStatus } from "./TaskStatus";
export class Task {
    protected status: TaskStatus;
    protected children: Task[];
    protected cancellable: boolean;
    protected useChildTargetLines: boolean;
    protected blocking: boolean;
    protected waitingForChildrenToFinish: boolean;
    protected preventOpportunityFire: boolean;
    protected preventLanding: boolean;
    protected isAttackMove: boolean;
    constructor() {
        this.status = TaskStatus.NotStarted;
        this.children = [];
        this.cancellable = true;
        this.useChildTargetLines = false;
        this.blocking = true;
        this.waitingForChildrenToFinish = false;
        this.preventOpportunityFire = true;
        this.preventLanding = true;
        this.isAttackMove = false;
    }
    isRunning(): boolean {
        return this.status === TaskStatus.Running;
    }
    isCancelling(): boolean {
        return this.status === TaskStatus.Cancelling;
    }
    setCancellable(value: boolean): this {
        this.cancellable = value;
        return this;
    }
    setBlocking(value: boolean): this {
        this.blocking = value;
        return this;
    }
    onStart(object: any): void { }
    onEnd(object: any): void { }
    cancel(): void {
        if (this.cancellable) {
            if (this.status === TaskStatus.Running) {
                this.status = TaskStatus.Cancelling;
                if (this.children.length) {
                    this.children.forEach(child => child.cancel());
                }
            }
            else if (this.status === TaskStatus.NotStarted &&
                this.children.length) {
                this.status = TaskStatus.Cancelled;
                throw new Error("Should't have any children before starting a task");
            }
        }
    }
    getTargetLinesConfig(object: any): any { }
}
