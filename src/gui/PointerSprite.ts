import { UiObject } from "./UiObject";
import { ImageUtils } from "../engine/gfx/ImageUtils";
import { HtmlContainer } from "./HtmlContainer";
import * as THREE from "three";

interface Size {
  width: number;
  height: number;
}

export class PointerSprite extends UiObject {
  private images: HTMLCanvasElement;
  private size: Size;
  private frameCount: number;
  private currentFrame: number = 0;
  private animationRunner?: any;
  private targetContext?: CanvasRenderingContext2D;
  
  static readonly HTML_ZINDEX = 100;

  static fromShpFile(shpFile: any, palette: any): PointerSprite {
    return new PointerSprite(
      ImageUtils.convertShpToCanvas(shpFile, palette),
      { width: shpFile.width, height: shpFile.height },
      shpFile.numImages
    );
  }

  constructor(images: HTMLCanvasElement, size: Size, frameCount: number) {
    super(new THREE.Object3D(), new HtmlContainer());
    this.images = images;
    this.size = size;
    this.frameCount = frameCount;
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

  getSize(): Size {
    return this.size;
  }

  setFrame(frameIndex: number): void {
    if (frameIndex !== this.currentFrame) {
      if (frameIndex < 0 || this.frameCount <= frameIndex) {
        throw new RangeError(
          `Pointer frame index out of bounds (index=${frameIndex}, length=${this.frameCount})`
        );
      }
      this.currentFrame = frameIndex;
      this.drawFrame(frameIndex);
    }
  }

  private drawFrame(frameIndex: number): void {
    if (this.targetContext) {
      this.targetContext.clearRect(
        0,
        0,
        this.size.width,
        this.size.height
      );
      this.targetContext.drawImage(
        this.images,
        frameIndex * this.size.width,
        0,
        this.size.width,
        this.size.height,
        0,
        0,
        this.size.width,
        this.size.height
      );
    }
  }

  getFrame(): number {
    return this.currentFrame;
  }

  getFrameCount(): number {
    return this.frameCount;
  }

  create3DObject(): void {
    super.create3DObject();
    
    if (!this.targetContext) {
      const canvas = document.createElement("canvas");
      const htmlContainer = this.getHtmlContainer();
      htmlContainer.setTranslateMode(true);
      
      const element = htmlContainer.getElement();
      element.appendChild(canvas);
      element.style.zIndex = String(PointerSprite.HTML_ZINDEX);
      
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) {
        throw new Error("Couldn't create pointer canvas context");
      }
      
      this.targetContext = context;
      this.drawFrame(this.currentFrame);
    }
  }

  destroy(): void {
    super.destroy();
  }
}
