export class SelectGroupCmd {
    private groupNum: number;
    private unitSelectionHandler: any;
    private targetLines: any;
    private mapPanningHelper: any;
    private cameraPan: any;
    private lastSelectTime?: number;
    constructor(groupNum: number, unitSelectionHandler: any, targetLines: any, mapPanningHelper: any, cameraPan: any) {
        this.groupNum = groupNum;
        this.unitSelectionHandler = unitSelectionHandler;
        this.targetLines = targetLines;
        this.mapPanningHelper = mapPanningHelper;
        this.cameraPan = cameraPan;
    }
    execute(): void {
        this.unitSelectionHandler.selectGroup(this.groupNum);
        this.targetLines.forceShow();
        const now = performance.now();
        let shouldCenter = true;
        if (!this.lastSelectTime || now - this.lastSelectTime > 400) {
            shouldCenter = false;
            this.lastSelectTime = now;
        }
        if (shouldCenter) {
            const selectedUnits = this.unitSelectionHandler.getSelectedUnits();
            if (selectedUnits.length) {
                const panTile = this.computePanTile(selectedUnits);
                const cameraPan = this.mapPanningHelper.computeCameraPanFromTile(panTile.rx, panTile.ry);
                this.cameraPan.setPan(cameraPan);
            }
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
