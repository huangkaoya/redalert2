import * as THREE from 'three';
import { EventDispatcher } from '@/util/event';
import { Coords } from '@/game/Coords';

export class MapHoverHandler {
  private readonly _onHoverChange = new EventDispatcher<any, any>();
  private isActive = false;
  private needsUpdate = false;
  private lastUpdate?: number;
  private lastPointerPos?: { x: number; y: number };
  private currentHoverEntity?: any;
  private currentHoverTile?: any;

  constructor(
    private readonly entityIntersectHelper: any,
    private readonly mapTileIntersectHelper: any,
    private readonly map: any,
    private shroud: any,
    private readonly renderer: any,
  ) {}

  get onHoverChange() {
    return this._onHoverChange.asEvent();
  }

  getCurrentHover(): any {
    if (!this.currentHoverTile) {
      return undefined;
    }

    if (this.currentHoverEntity?.gameObject?.isDestroyed || this.currentHoverEntity?.gameObject?.isCrashing) {
      return {
        entity: undefined,
        gameObject: undefined,
        tile: this.currentHoverTile,
      };
    }

    return {
      entity: this.currentHoverEntity,
      gameObject: this.currentHoverEntity?.gameObject,
      tile: this.currentHoverTile,
    };
  }

  setShroud(shroud: any): void {
    this.shroud = shroud;
  }

  update(pointer: { x: number; y: number }, immediate: boolean = false): void {
    this.lastPointerPos = pointer;

    if (immediate) {
      this.doUpdate();
      return;
    }

    if (!this.isActive) {
      this.isActive = true;
      this.needsUpdate = true;
      this.renderer.onFrame.subscribe(this.onFrame);
    } else {
      this.needsUpdate = true;
    }
  }

  private readonly onFrame = (time: number): void => {
    if (
      !this.isActive ||
      (!this.needsUpdate && this.lastUpdate !== undefined && time - this.lastUpdate < 1000 / 15)
    ) {
      return;
    }

    this.needsUpdate = false;
    this.lastUpdate = time;
    this.doUpdate();
  };

  private doUpdate(): void {
    if (!this.lastPointerPos) {
      return;
    }

    const previousEntity = this.currentHoverEntity;
    const previousTile = this.currentHoverTile;
    const intersection = this.entityIntersectHelper.getEntityAtScreenPoint(this.lastPointerPos);

    if (intersection) {
      this.currentHoverEntity = intersection.renderable;

      let tile: any;
      const gameObject = intersection.renderable.gameObject;
      const foundation = gameObject.getFoundation?.();
      if (gameObject.isBuilding?.() && foundation && (foundation.width > 1 || foundation.height > 1)) {
        tile = this.mapTileIntersectHelper.getTileAtScreenPoint(this.lastPointerPos);
      } else if (gameObject.isTechno?.() && !gameObject.art?.isVoxel) {
        tile = gameObject.tile;
      } else {
        const mapCoords = new THREE.Vector2(intersection.point.x, intersection.point.z)
          .multiplyScalar(1 / Coords.LEPTONS_PER_TILE)
          .floor();
        tile = this.map.tiles.getByMapCoords(mapCoords.x, mapCoords.y);
        if (!tile) {
          console.warn(
            `[MapHoverHandler] No tile exists at rx,ry=${JSON.stringify(mapCoords)}. Falling back to object tile.`,
          );
        }
        tile = tile ?? gameObject.tile;
      }

      const bridge = this.map.tileOccupation.getBridgeOnTile(tile);
      if (this.currentHoverEntity.gameObject.isOverlay?.() && this.currentHoverEntity.gameObject.isBridge?.() && !bridge) {
        this.currentHoverEntity = undefined;
      }
      this.currentHoverTile = tile;
    } else {
      this.currentHoverEntity = undefined;
      this.currentHoverTile = this.mapTileIntersectHelper.getTileAtScreenPoint(this.lastPointerPos);
    }

    if (
      this.shroud &&
      this.currentHoverTile &&
      this.shroud.isShrouded(this.currentHoverTile, this.currentHoverEntity?.gameObject?.tileElevation) &&
      !(this.currentHoverEntity?.gameObject?.isOverlay?.() && this.currentHoverEntity?.gameObject?.isBridge?.())
    ) {
      this.currentHoverEntity = undefined;
    }

    if (this.currentHoverEntity === previousEntity && this.currentHoverTile === previousTile) {
      return;
    }

    previousEntity?.selectionModel?.setHover(false);
    this.currentHoverEntity?.selectionModel?.setHover(true);

    if (this.currentHoverTile) {
      this._onHoverChange.dispatch(this, {
        entity: this.currentHoverEntity,
        gameObject: this.currentHoverEntity?.gameObject,
        tile: this.currentHoverTile,
      });
    }
  }

  finish(): void {
    this.currentHoverEntity?.selectionModel?.setHover(false);
    this.currentHoverEntity = undefined;
    this.currentHoverTile = undefined;
    if (this.isActive) {
      this.renderer.onFrame.unsubscribe(this.onFrame);
      this.isActive = false;
      this.needsUpdate = false;
    }
  }

  dispose(): void {
    this.finish();
  }
}
