export class PlacementGridModel {
    public visible = false;
    public showBusy = false;
    public tiles: Array<{
        rx: number;
        ry: number;
        buildable: boolean;
    }> = [];
    public rangeIndicator?: {
        center: {
            x: number;
            y: number;
        };
        radius: number;
    };
    public rangeIndicatorColor = 0x00ff00;
    constructor() { }
    setTiles(tiles: Array<{
        rx: number;
        ry: number;
        buildable: boolean;
    }>): void {
        this.tiles = tiles;
    }
    setRangeIndicator(center: {
        x: number;
        y: number;
    }, radius: number): void {
        this.rangeIndicator = { center, radius };
    }
    clearRangeIndicator(): void {
        this.rangeIndicator = undefined;
    }
    show(): void {
        this.visible = true;
    }
    hide(): void {
        this.visible = false;
    }
    setBusyState(busy: boolean): void {
        this.showBusy = busy;
    }
}
