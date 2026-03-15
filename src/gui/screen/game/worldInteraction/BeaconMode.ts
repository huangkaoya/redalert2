import { PointerType } from '@/engine/type/PointerType';
import { EventDispatcher } from '@/util/event';

export class BeaconMode {
  private readonly _onExecute = new EventDispatcher<BeaconMode, any>();
  private currentTile?: any;
  private lastTile?: any;
  private lastUpdate?: number;

  get onExecute() {
    return this._onExecute.asEvent();
  }

  static factory(pointer: any, renderer: any): BeaconMode {
    return new BeaconMode(pointer, renderer);
  }

  constructor(
    private readonly pointer: any,
    private readonly renderer: any,
  ) {}

  private readonly onFrame = (time: number): void => {
    if (this.lastTile === this.currentTile && this.lastUpdate !== undefined && time - this.lastUpdate < 1000 / 15) {
      return;
    }

    this.lastTile = this.currentTile;
    this.lastUpdate = time;
    this.pointer.setPointerType(this.currentTile ? PointerType.Beacon : PointerType.Default);
  };

  enter(): void {
    this.currentTile = undefined;
    this.lastTile = undefined;
    this.lastUpdate = undefined;
    this.renderer.onFrame.subscribe(this.onFrame);
  }

  hover(hover: any, minimap: boolean): void {
    if (!minimap) {
      this.currentTile = hover?.tile;
    }
  }

  execute(hover: any, minimap: boolean): false | void {
    if (minimap) {
      return false;
    }

    const tile = hover?.tile;
    if (!tile) {
      return false;
    }

    this._onExecute.dispatch(this, tile);
    this.end();
    return;
  }

  cancel(): void {
    this.end();
  }

  private end(): void {
    this.renderer.onFrame.unsubscribe(this.onFrame);
  }

  dispose(): void {
    this.end();
  }
}
