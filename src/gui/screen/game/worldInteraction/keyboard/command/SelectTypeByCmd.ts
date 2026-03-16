import { TriggerMode } from '../KeyCommand';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
export class SelectByTypeCmd {
    public triggerMode = TriggerMode.KeyDownUp;
    private unitSelectionHandler: any;
    private disposables: any;
    private keyDownTime?: number;
    private handleUserSelectionUpdate: (e: any) => void;
    constructor(unitSelectionHandler: any) {
        this.unitSelectionHandler = unitSelectionHandler;
        this.disposables = new CompositeDisposable();
        this.handleUserSelectionUpdate = (selectionUpdate: any) => {
            if (!selectionUpdate.queryType &&
                this.keyDownTime) {
                this.unitSelectionHandler.selectByType();
            }
        };
    }
    init(): void {
        this.unitSelectionHandler.onUserSelectionUpdate.subscribe(this.handleUserSelectionUpdate);
        this.disposables.add(() => this.unitSelectionHandler.onUserSelectionUpdate.unsubscribe(this.handleUserSelectionUpdate));
    }
    execute(isKeyUp: boolean): void {
        const now = Date.now();
        if (isKeyUp) {
            if (this.keyDownTime &&
                now - this.keyDownTime <= 1000) {
                this.unitSelectionHandler.selectByType();
            }
            this.keyDownTime = undefined;
        }
        else {
            if (this.keyDownTime === undefined) {
                this.keyDownTime = now;
            }
        }
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
