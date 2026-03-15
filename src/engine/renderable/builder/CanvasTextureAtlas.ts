import * as THREE from 'three';
import { GrowingPacker } from '@/engine/gfx/GrowingPacker';

export class CanvasTextureAtlas {
  private texture?: THREE.Texture;
  private imageRects?: Map<HTMLImageElement, { x: number; y: number; width: number; height: number }>;

  getTexture(): THREE.Texture {
    if (!this.texture) {
      throw new Error("Texture atlas not initialized");
    }
    return this.texture;
  }

  getImageRect(image: HTMLImageElement): { x: number; y: number; width: number; height: number } {
    if (!this.imageRects) {
      throw new Error("Texture atlas not initialized");
    }
    const rect = this.imageRects.get(image);
    if (!rect) {
      throw new Error("Image not found in atlas");
    }
    return rect;
  }

  pack(images: HTMLImageElement[]): void {
    let blocks: Array<{ w: number; h: number; image: HTMLImageElement; fit?: { x: number; y: number } }> = [];
    
    images.forEach((image) => {
      blocks.push({ w: image.width, h: image.height, image: image });
    });
    
    blocks.sort((a, b) => 1000 * (b.w - a.w) + b.h - a.h);

    let packer = new GrowingPacker();
    packer.fit(blocks);

    const atlasWidth = packer.root.w;
    const atlasHeight = packer.root.h;

    let canvas = document.createElement("canvas");
    let context = canvas.getContext("2d", { alpha: true })!;
    canvas.width = atlasWidth;
    canvas.height = atlasHeight;

    let imageRects = new Map<HTMLImageElement, { x: number; y: number; width: number; height: number }>();
    
    blocks.forEach((block) => {
      if (!block.fit) {
        throw new Error("Couldn't fit all images in a single texture");
      }
      
      const image = block.image;
      const x = block.fit.x;
      const y = block.fit.y;
      
      imageRects.set(image, { x: x, y: y, width: block.w, height: block.h });
      context.drawImage(image, x, y);
    });

    let texture = new THREE.Texture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    
    this.texture = texture;
    this.imageRects = imageRects;
  }
} 
