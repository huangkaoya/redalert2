import { Action } from './Action';
import { ActionType } from './ActionType';
export class NoAction extends Action {
    constructor() {
        super(ActionType.NoAction);
    }
    process(): void { }
}
