export class CenterGroupCmd {
    private groupNum: number;
    private unitSelectionHandler: any;
    private mapPanningHelper: any;
    private cameraPan: any;
    constructor(groupNum: number, unitSelectionHandler: any, mapPanningHelper: any, cameraPan: any) {
        this.groupNum = groupNum;
        this.unitSelectionHandler = unitSelectionHandler;
        this.mapPanningHelper = mapPanningHelper;
        this.cameraPan = cameraPan;
    }
    execute(): void {
        this.unitSelectionHandler.selectGroup(this.groupNum);
        const units = this.unitSelectionHandler.getGroupUnits(this.groupNum);
        if (units.length) {
            const panTile = this.computePanTile(units);
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
