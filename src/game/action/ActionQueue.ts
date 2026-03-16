import { Action } from './Action';
export class ActionQueue {
    private actions: Action[];
    constructor() {
        this.actions = [];
    }
    push(...actions: Action[]): void {
        this.actions.push(...actions);
    }
    getLast(): Action | undefined {
        return this.actions[this.actions.length - 1];
    }
    dequeueAll(): Action[] {
        const actions = [...this.actions];
        this.actions.length = 0;
        return actions;
    }
    dequeueLast(): Action | undefined {
        return this.actions.pop();
    }
    clear(): void {
        this.actions.length = 0;
    }
}
