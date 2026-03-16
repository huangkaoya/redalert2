import { NoAction } from '../NoAction';
export class NoActionFactory {
    create(): NoAction {
        return new NoAction();
    }
}
