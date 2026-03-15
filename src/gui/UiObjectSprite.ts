import { UiObject } from './UiObject';
import { ShpFile } from '../data/ShpFile';
import { Palette } from '../data/Palette';
import { ShpBuilder } from '../engine/renderable/builder/ShpBuilder';
import * as THREE from 'three';

export class UiObjectSprite extends UiObject {
  private builder: any;
  private animationRunner?: any;
  private initialTransparency?: boolean;
  private initialOpacity?: number;
  private initialLightMult?: number;

  static fromShpFile(shpFile: ShpFile, palette: Palette, camera: THREE.Camera): UiObjectSprite {
    const builder = new ShpBuilder(shpFile, palette, camera);
    builder.setBatched(true);
    builder.setBatchPalettes([palette]);
    // Match original project: center the sprite by default for UI geometry.
    builder.setOffset({
      x: Math.floor(shpFile.width / 2),
      y: Math.floor(shpFile.height / 2)
    });
    return new UiObjectSprite(builder);
  }

  constructor(builder: any) {
    super();
    this.builder = builder;
  }

  setAnimationRunner(animationRunner: any): void {
    this.animationRunner = animationRunner;
  }

  getAnimationRunner(): any {
    return this.animationRunner;
  }

  update(deltaTime: number): void {
    super.update(deltaTime);
    
    if (this.animationRunner) {
      this.animationRunner.tick(deltaTime);
      if (this.animationRunner.shouldUpdate()) {
        this.setFrame(this.animationRunner.getCurrentFrame());
      }
    }
  }

  getSize(): { width: number; height: number } {
    return this.builder.getSize();
  }

  setFrame(frame: number): void {
    this.builder.setFrame(frame);
  }

  getFrame(): number {
    return this.builder.getFrame();
  }

  getFrameCount(): number {
    return this.builder.frameCount;
  }

  setTransparent(transparent: boolean): void {
    if (this.get3DObject()) {
      this.builder.setForceTransparent(transparent);
    } else {
      this.initialTransparency = transparent;
    }
  }

  setOpacity(opacity: number): void {
    if (this.get3DObject()) {
      this.builder.setOpacity(opacity);
    } else {
      this.initialOpacity = opacity;
    }
  }

  setLightMult(lightMult: number): void {
    if (this.get3DObject() && typeof this.builder.setExtraLight === 'function') {
      this.builder.setExtraLight(new THREE.Vector3().addScalar(-1 + lightMult));
    } else {
      this.initialLightMult = lightMult;
    }
  }

  create3DObject(): void {
    //console.log('[UiObjectSprite] create3DObject() called');
    //console.log('[UiObjectSprite] Builder:', this.builder);
    
    const mesh = this.builder.build();
    //console.log('[UiObjectSprite] Builder.build() returned:', mesh);
    
    this.set3DObject(mesh);
    //console.log('[UiObjectSprite] Set 3D object, calling super.create3DObject()');
    
    super.create3DObject();
    
    if (this.initialTransparency !== undefined) {
      this.builder.setForceTransparent(this.initialTransparency);
    }
    if (this.initialOpacity !== undefined) {
      this.builder.setOpacity(this.initialOpacity);
    }
    if (this.initialLightMult !== undefined) {
      if (typeof this.builder.setExtraLight === 'function') {
        this.builder.setExtraLight(new THREE.Vector3().addScalar(this.initialLightMult));
      }
    }
    
    //console.log('[UiObjectSprite] create3DObject() completed');
  }

  destroy(): void {
    super.destroy();
    this.builder.dispose();
  }
} 
