import * as THREE from 'three';
import { pointEquals } from '@/util/geometry';
import { clamp } from '@/util/math';
import { PointerType } from '@/engine/type/PointerType';

export class MapScrollHandler {
  private isActive = false;
  private paused = false;
  private forceScrollCancelRequested = false;
  private panDirection?: THREE.Vector2;
  private pointerFrameNo = 0;
  private forceScrollDirection?: THREE.Vector2;
  private lastUpdate?: number;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly cameraPan: any,
    private readonly pointer: any,
    private readonly scrollRate: any,
    private readonly worldScene: any,
  ) {}

  private readonly onFrame = (time: number): void => {
    if (
      this.paused ||
      !this.isActive ||
      (this.lastUpdate !== undefined && time - this.lastUpdate < 1000 / 60)
    ) {
      return;
    }

    this.lastUpdate = time;
    const currentPan = this.cameraPan.getPan();
    const panLimits = this.cameraPan.getPanLimits();
    let nextPan: { x: number; y: number } | undefined;
    let keepActive = false;

    if (this.panDirection?.x || this.panDirection?.y) {
      const rate = (this.scrollRate.value / 5) * 10;
      nextPan = {
        x: clamp(currentPan.x + this.panDirection.x * rate, panLimits.x, panLimits.x + panLimits.width),
        y: clamp(currentPan.y + this.panDirection.y * rate, panLimits.y, panLimits.y + panLimits.height),
      };
      const moved = !pointEquals(nextPan, currentPan);
      this.pointer.setPointerType(moved ? PointerType.Scroll : PointerType.NoScroll, this.pointerFrameNo);
      if (moved) {
        keepActive = true;
      }
    }

    if (this.forceScrollDirection) {
      nextPan = {
        x: clamp(currentPan.x + 30 * this.forceScrollDirection.x, panLimits.x, panLimits.x + panLimits.width),
        y: clamp(currentPan.y + 30 * this.forceScrollDirection.y, panLimits.y, panLimits.y + panLimits.height),
      };
      if (!pointEquals(nextPan, currentPan)) {
        keepActive = true;
      }
    }

    this.isActive = keepActive;
    if (nextPan) {
      this.cameraPan.setPan(nextPan);
    }

    if (!this.isActive) {
      this.worldScene.onBeforeCameraUpdate.unsubscribe(this.onFrame);
    }

    if (this.forceScrollCancelRequested) {
      this.forceScrollCancelRequested = false;
      this.forceScrollDirection = undefined;
    }
  };

  isScrolling(): boolean {
    return !!this.panDirection && (!!this.panDirection.x || !!this.panDirection.y);
  }

  requestForceScroll(direction: THREE.Vector2): void {
    this.forceScrollDirection = direction.clone?.() ?? new THREE.Vector2(direction.x, direction.y);
    this.forceScrollCancelRequested = false;
    if (!this.isActive) {
      this.isActive = true;
      this.worldScene.onBeforeCameraUpdate.subscribe(this.onFrame);
    }
  }

  cancelForceScroll(): void {
    this.forceScrollCancelRequested = true;
  }

  update(pointer: { x: number; y: number }): void {
    const height = this.canvas.height;
    const width = this.canvas.width;

    let directionX = pointer.x < 3 ? -1 : pointer.x > width - 4 ? 1 : 0;
    let directionY = pointer.y < 3 ? -1 : pointer.y > height - 4 ? 1 : 0;

    if (directionX) {
      if (pointer.y < Math.min(300, height / 3)) {
        directionY = -1;
      } else if (pointer.y > Math.max(height - 300, (2 * height) / 3)) {
        directionY = 1;
      }
    } else if (directionY) {
      if (pointer.x < Math.min(300, width / 3)) {
        directionX = -1;
      } else if (pointer.x > Math.max(width - 300, (2 * width) / 3)) {
        directionX = 1;
      }
    }

    this.panDirection = new THREE.Vector2(directionX, directionY);
    this.pointerFrameNo = ((THREE.MathUtils.radToDeg(this.panDirection.angle()) + 90) % 360) / 45;

    if (!this.isActive) {
      this.isActive = true;
      this.worldScene.onBeforeCameraUpdate.subscribe(this.onFrame);
    }
  }

  cancel(): void {
    this.cancelForceScroll();
    if (this.isActive) {
      this.worldScene.onBeforeCameraUpdate.unsubscribe(this.onFrame);
      this.isActive = false;
    }
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  dispose(): void {
    this.cancel();
  }
}
