import { EventType } from '@/game/event/EventType';
import { CompositeDisposable } from '@/util/disposable/CompositeDisposable';
import { PlacementGrid } from '@/gui/screen/game/worldInteraction/placementMode/PlacementGrid';

export class PendingPlacementHandler {
  private readonly placements: any[] = [];
  private readonly gridModels = new Map<any, any>();
  private readonly grids = new Map<any, PlacementGrid>();
  private readonly disposables = new CompositeDisposable();

  static factory(game: any, player: any, renderer: any, worldScene: any): PendingPlacementHandler {
    const constructionWorker = game.getConstructionWorker(player);
    return new PendingPlacementHandler(game, constructionWorker, renderer, worldScene);
  }

  constructor(
    private readonly game: any,
    private readonly constructionWorker: any,
    private readonly renderer: any,
    private readonly worldScene: any,
  ) {}

  private readonly onFrame = (): void => {
    for (const placement of this.placements) {
      const gridModel = this.gridModels.get(placement);
      if (gridModel) {
        gridModel.tiles = this.constructionWorker.getPlacementPreview(placement.rules.name, placement.tile, {
          normalizedTile: true,
        });
      }
    }
  };

  pushPlacementInfo(placement: any): void {
    this.placements.push(placement);
    this.addGrid(placement);
  }

  init(): void {
    this.renderer.onFrame.subscribe(this.onFrame);
    this.disposables.add(() => this.renderer.onFrame.unsubscribe(this.onFrame));
    this.disposables.add(
      this.game.events.subscribe(EventType.BuildingPlace, (event: any) => {
        this.removePendingPlacement(event.target.tile);
      }),
      this.game.events.subscribe(EventType.BuildingFailedPlace, (event: any) => {
        this.removePendingPlacement(event.tile);
      }),
    );
  }

  private removePendingPlacement(tile: any): void {
    const index = this.placements.findIndex((placement) => placement.tile === tile);
    const placement = this.placements[index];
    if (index !== -1) {
      this.placements.splice(index, 1);
      this.removeGrid(placement);
    }
  }

  private addGrid(placement: any): void {
    const gridModel = {
      tiles: this.constructionWorker.getPlacementPreview(placement.rules.name, placement.tile, {
        normalizedTile: true,
      }),
      visible: true,
      rangeIndicator: undefined,
      rangeIndicatorColor: undefined,
      showBusy: true,
    };
    const grid = new PlacementGrid(gridModel, this.worldScene.camera, this.game.map.tiles);
    this.worldScene.add(grid);
    this.gridModels.set(placement, gridModel);
    this.grids.set(placement, grid);
  }

  private removeGrid(placement: any): void {
    const grid = this.grids.get(placement);
    if (!grid) {
      return;
    }

    this.worldScene.remove(grid);
    grid.dispose();
    this.grids.delete(placement);
    this.gridModels.delete(placement);
  }

  dispose(): void {
    for (const placement of [...this.placements]) {
      this.removeGrid(placement);
    }
    this.placements.length = 0;
    this.disposables.dispose();
  }
}
