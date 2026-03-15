import { PlacementGrid } from '@/gui/screen/game/worldInteraction/placementMode/PlacementGrid';
import { circleIntersect } from '@/util/geometry';
import { EventDispatcher } from '@/util/event';
import { ObjectType } from '@/engine/type/ObjectType';

export class PlacementMode {
  private defenseMode = false;
  private readonly buildingRanges = new Map<any, { center: { x: number; y: number }; radius: number }>();
  private readonly _onBuildingPlaceRequest = new EventDispatcher<PlacementMode, { rules: any; tile: any }>();
  private placementGridModel: any;
  private currentBuilding?: any;
  private currentTile?: any;
  private lastTile?: any;
  private lastUpdate?: number;
  private currentRangeCircleRadius?: number;

  get onBuildingPlaceRequest() {
    return this._onBuildingPlaceRequest.asEvent();
  }

  static factory(game: any, player: any, renderer: any, worldScene: any, eva: any): PlacementMode {
    const constructionWorker = game.getConstructionWorker(player);
    const placementGridModel = {
      tiles: [],
      visible: false,
      rangeIndicator: undefined,
      rangeIndicatorColor: undefined,
    };
    const placementGrid = new PlacementGrid(placementGridModel, worldScene.camera, game.map.tiles);
    const placementMode = new PlacementMode(
      game,
      player,
      constructionWorker,
      renderer,
      eva,
      placementGrid,
      worldScene,
    );
    placementMode.placementGridModel = placementGridModel;
    return placementMode;
  }

  constructor(
    private readonly game: any,
    private readonly player: any,
    private readonly constructionWorker: any,
    private readonly renderer: any,
    private readonly eva: any,
    private readonly placementGrid: PlacementGrid,
    private readonly worldScene: any,
  ) {}

  private readonly onFrame = (time: number): void => {
    if (this.lastTile === this.currentTile && this.lastUpdate !== undefined && time - this.lastUpdate < 1000 / 15) {
      return;
    }

    this.lastTile = this.currentTile;
    this.lastUpdate = time;
    if (this.currentBuilding) {
      this.updateGridModel(this.currentBuilding.name);
    }
  };

  init(): void {
    this.worldScene.add(this.placementGrid);
  }

  dispose(): void {
    this.worldScene.remove(this.placementGrid);
    this.placementGrid.dispose();
    this.endConstructionMode();
  }

  enter(): void {
    this.currentTile = undefined;
    this.lastTile = undefined;
    this.lastUpdate = undefined;
    this.renderer.onFrame.subscribe(this.onFrame);
  }

  setBuilding(buildingRules: any): void {
    this.currentBuilding = buildingRules;
    if (buildingRules.primary || buildingRules.hasRadialIndicator) {
      this.defenseMode = true;
      this.prepareBuildingRanges(buildingRules);
    } else {
      this.defenseMode = false;
    }
  }

  getBuilding(): any {
    return this.currentBuilding;
  }

  hover(hover: any, minimap: boolean): void {
    if (!minimap && hover?.tile !== this.currentTile) {
      this.currentTile = hover?.tile;
    }
  }

  private updateGridModel(buildingName: string): void {
    const tile = this.currentTile;
    if (!tile) {
      this.placementGridModel.visible = false;
      return;
    }

    const preview = this.constructionWorker.getPlacementPreview(buildingName, tile);
    this.placementGridModel.tiles = preview;
    this.placementGridModel.visible = true;

    if (this.defenseMode) {
      this.showBuildingRangeOverlays(tile, buildingName);
      this.placementGridModel.rangeIndicator = this.getBuildingRangeCircle(tile, buildingName);
      this.placementGridModel.rangeIndicatorColor = this.player.color.asHex();
    } else {
      this.placementGridModel.rangeIndicator = undefined;
    }
  }

  execute(hover: any, minimap: boolean): false | void {
    if (!this.currentBuilding || minimap) {
      return false;
    }

    const tile = hover?.tile;
    if (!tile) {
      return false;
    }

    if (this.player.production.isAvailableForProduction(this.currentBuilding)) {
      if (!this.constructionWorker.canPlaceAt(this.currentBuilding.name, tile)) {
        this.eva.play('EVA_CannotDeployHere');
        return false;
      }

      this._onBuildingPlaceRequest.dispatch(this, {
        rules: this.currentBuilding,
        tile: this.constructionWorker.normalizePlacementTile(this.currentBuilding.name, tile),
      });
      this.endConstructionMode();
      return;
    }

    this.endConstructionMode();
    return;
  }

  cancel(): void {
    this.endConstructionMode();
  }

  private endConstructionMode(): void {
    this.defenseMode = false;
    this.placementGridModel.visible = false;
    this.placementGridModel.rangeIndicator = undefined;
    this.hideBuildingRangeOverlays();
    this.buildingRanges.clear();
    this.currentBuilding = undefined;
    this.renderer.onFrame.unsubscribe(this.onFrame);
  }

  private hideBuildingRangeOverlays(): void {
    this.buildingRanges.forEach((_, building) => {
      building.showWeaponRange = false;
    });
  }

  private showBuildingRangeOverlays(tile: any, buildingName: string): void {
    const circle = this.getBuildingRangeCircle(tile, buildingName);
    this.buildingRanges.forEach((range, building) => {
      building.showWeaponRange = circleIntersect(circle, range);
    });
  }

  private getBuildingRangeCircle(tile: any, buildingName: string): { center: { x: number; y: number }; radius: number } {
    const foundation = this.game.art.getObject(buildingName, ObjectType.Building).foundation;
    return {
      center: {
        x: tile.rx + (foundation.width % 2 !== 0 ? 0.5 : 0),
        y: tile.ry + (foundation.height % 2 !== 0 ? 0.5 : 0),
      },
      radius: this.currentRangeCircleRadius,
    };
  }

  private prepareBuildingRanges(buildingRules: any): void {
    const matchingBuildings = [...this.player.buildings].filter((building: any) => building.name === buildingRules.name);
    if (buildingRules.psychicDetectionRadius) {
      this.currentRangeCircleRadius = buildingRules.psychicDetectionRadius;
    } else if (buildingRules.gapGenerator) {
      this.currentRangeCircleRadius = buildingRules.gapRadiusInCells;
    } else if (buildingRules.primary) {
      this.currentRangeCircleRadius = this.game.rules.getWeapon(buildingRules.primary).range;
    }

    this.buildingRanges.clear();
    matchingBuildings.forEach((building: any) => {
      const tile = building.tile;
      const foundation = this.game.art.getObject(building.name, ObjectType.Building).foundation;
      const center = {
        x: tile.rx + foundation.width / 2,
        y: tile.ry + foundation.height / 2,
      };
      const radius =
        building.psychicDetectorTrait?.radiusTiles ??
        building.gapGeneratorTrait?.radiusTiles ??
        building.primaryWeapon?.range;
      if (radius) {
        this.buildingRanges.set(building, { center, radius });
      }
    });
  }
}
