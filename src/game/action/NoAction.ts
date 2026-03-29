import { Action } from './Action';
import { ActionType } from './ActionType';
export class NoAction extends Action {
    constructor() {
        super(ActionType.NoAction);
    }
    unserialize(_data: Uint8Array): void { }
    serialize(): Uint8Array {
        return new Uint8Array();
    }
    process(): void { }
}
