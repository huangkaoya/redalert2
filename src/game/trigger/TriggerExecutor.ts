export class TriggerExecutor {
    protected action: any;
    protected trigger: any;
    constructor(action: any, trigger: any) {
        this.action = action;
        this.trigger = trigger;
    }
    getDebugName(): string {
        return `${this.action.triggerId}[${this.action.index}] (${this.trigger.name}).`;
    }
}
