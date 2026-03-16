import { ActionType } from './ActionType';
export class ActionFactory {
    private factories: Map<ActionType, any>;
    constructor() {
        this.factories = new Map();
    }
    registerFactory(actionType: ActionType, factory: any): void {
        this.factories.set(actionType, factory);
    }
    create(actionType: ActionType): any {
        const factory = this.factories.get(actionType);
        if (!factory) {
            throw new Error(`No factory registered for action type ${actionType}`);
        }
        return factory.create();
    }
}
