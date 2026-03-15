export class MinimapHandler {
  constructor(
    public readonly minimap: any,
    private readonly map: any,
    private shroud: any,
    private readonly worldScene: any,
    private readonly mapPanningHelper: any,
  ) {}

  setShroud(shroud: any): void {
    this.shroud = shroud;
  }

  panToTile(tile: any): void {
    this.worldScene.cameraPan.setPan(this.mapPanningHelper.computeCameraPanFromTile(tile.rx, tile.ry));
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
