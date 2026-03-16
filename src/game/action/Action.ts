import { ActionType } from './ActionType';
export abstract class Action {
    protected actionType: ActionType;
    public player: any;
    constructor(actionType: ActionType) {
        this.actionType = actionType;
    }
    abstract unserialize(data: any): void;
    serialize(): Uint8Array {
        return new Uint8Array();
    }
    print(): string {
        return "";
    }
}
