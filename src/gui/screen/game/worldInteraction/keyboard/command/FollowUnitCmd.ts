import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
export class FollowUnitCmd {
    private unitSelectionHandler: any;
    private renderableManager: any;
    private worldInteraction: any;
    private mapPanningHelper: any;
    private cameraPan: any;
    private worldScene: any;
    private disposables: any;
    private unit?: any;
    private handleUserSelectionChange: () => void;
    private handleFrame: () => void;
    constructor(unitSelectionHandler: any, renderableManager: any, worldInteraction: any, mapPanningHelper: any, cameraPan: any, worldScene: any) {
        this.unitSelectionHandler = unitSelectionHandler;
        this.renderableManager = renderableManager;
        this.worldInteraction = worldInteraction;
        this.mapPanningHelper = mapPanningHelper;
        this.cameraPan = cameraPan;
        this.worldScene = worldScene;
        this.disposables = new CompositeDisposable();
        this.handleUserSelectionChange = () => {
            this.updateUnit(undefined);
        };
        this.handleFrame = () => {
            const selectedUnits = this.unitSelectionHandler.getSelectedUnits();
            if (this.unit && !selectedUnits.includes(this.unit)) {
                this.updateUnit(undefined);
            }
            if (this.unit) {
                this.updatePan(this.unit);
            }
        };
    }
    init(): void {
        this.unitSelectionHandler.onUserSelectionUpdate.subscribe(this.handleUserSelectionChange);
        this.disposables.add(() => this.unitSelectionHandler.onUserSelectionUpdate.unsubscribe(this.handleUserSelectionChange));
        this.worldScene.onBeforeCameraUpdate.subscribe(this.handleFrame);
        this.disposables.add(() => this.worldScene.onBeforeCameraUpdate.unsubscribe(this.handleFrame));
    }
    execute(): void {
        const selectedUnits = this.unitSelectionHandler.getSelectedUnits();
        if (this.unit && !selectedUnits.includes(this.unit)) {
            this.updateUnit(undefined);
        }
        this.updateUnit(this.unit ? undefined : selectedUnits[0]);
        if (this.unit) {
            this.updatePan(this.unit);
        }
    }
    updateUnit(unit: any): void {
        this.unit = unit;
        if (unit) {
            this.worldInteraction.pausePanning();
        }
        else {
            this.worldInteraction.unpausePanning();
        }
    }
    updatePan(unit: any): void {
        const renderable = this.renderableManager.getRenderableByGameObject(unit);
        if (renderable) {
            const cameraPan = this.mapPanningHelper.computeCameraPanFromWorld(renderable.getPosition());
            this.cameraPan.setPan(cameraPan);
        }
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
