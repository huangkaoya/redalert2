import { IsoCoords } from '@/engine/IsoCoords';

export class MinimapHandler {
    constructor(public readonly minimap: any, private readonly map: any, private shroud: any, private readonly worldScene: any, private readonly mapPanningHelper: any) { }
    setShroud(shroud: any): void {
        this.shroud = shroud;
    }
    panToTile(tile: any): void {
        this.worldScene.cameraPan.setPan(this.mapPanningHelper.computeCameraPanFromTile(tile.rx, tile.ry));
    }
    isTileWithinViewport(tile: any, padding: number = 2): boolean {
        if (!tile) {
            return false;
        }
        const pan = this.worldScene.cameraPan.getPan();
        const viewport = this.worldScene.viewport;
        const zoom = this.worldScene.cameraZoom?.getZoom?.() ?? 1;
        const origin = this.mapPanningHelper.getScreenPanOrigin();
        const visibleRect = {
            x: origin.x + pan.x - viewport.width / (2 * zoom),
            y: origin.y + pan.y - viewport.height / (2 * zoom),
            width: viewport.width / zoom,
            height: viewport.height / zoom,
        };
        const topLeft = IsoCoords.screenToScreenTile(visibleRect.x, visibleRect.y);
        const bottomRight = IsoCoords.screenToScreenTile(
            visibleRect.x + visibleRect.width,
            visibleRect.y + visibleRect.height,
        );
        return tile.dx >= topLeft.x - padding &&
            tile.dx <= bottomRight.x + padding &&
            tile.dy >= topLeft.y - padding &&
            tile.dy <= bottomRight.y + padding;
    }
    getHover(tile: any): any {
        return {
            entity: undefined,
            gameObject: this.shroud?.isShrouded(tile)
                ? undefined
                : this.map
                    .getObjectsOnTile(tile)
                    .sort((a: any, b: any) => Number(b.isTechno?.()) - Number(a.isTechno?.()))
                    .shift(),
            tile,
        };
    }
}
