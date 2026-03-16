export class CenterViewCmd {
    private unitSelectionHandler: any;
    private mapPanningHelper: any;
    private cameraPan: any;
    constructor(unitSelectionHandler: any, mapPanningHelper: any, cameraPan: any) {
        this.unitSelectionHandler = unitSelectionHandler;
        this.mapPanningHelper = mapPanningHelper;
        this.cameraPan = cameraPan;
    }
    execute(): void {
        const selectedUnits = this.unitSelectionHandler.getSelectedUnits();
        if (selectedUnits.length) {
            const panTile = this.computePanTile(selectedUnits);
            const cameraPan = this.mapPanningHelper.computeCameraPanFromTile(panTile.rx, panTile.ry);
            this.cameraPan.setPan(cameraPan);
        }
    }
    computePanTile(units: any[]): {
        rx: number;
        ry: number;
    } {
        return {
            rx: Math.floor(units.reduce((sum, unit) => sum + unit.tile.rx, 0) / units.length),
            ry: Math.floor(units.reduce((sum, unit) => sum + unit.tile.ry, 0) / units.length),
        };
    }
}
