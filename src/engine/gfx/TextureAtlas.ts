import { IndexedBitmap } from '../../data/Bitmap';
import * as THREE from 'three';
import { GrowingPacker } from './GrowingPacker';

function createAtlasBitmap(
  blocks: any[], 
  width: number, 
  height: number, 
  imageRects?: Map<IndexedBitmap, any>
): IndexedBitmap {
  const atlasBitmap = new IndexedBitmap(width, height);
  
  blocks.forEach(block => {
    if (!block.fit) {
      throw new Error("Couldn't fit all images in a single texture");
    }
    
    const image = block.image;
    const x = block.fit.x;
    const y = block.fit.y;
    
    imageRects?.set(image, { x, y, width: block.w, height: block.h });
    atlasBitmap.drawIndexedImage(image, x, y);
  });
  
  return atlasBitmap;
}

function createAtlasRgbaData(bitmap: IndexedBitmap): Uint8Array {
  const rgbaData = new Uint8Array(bitmap.width * bitmap.height * 4);

  for (let i = 0; i < bitmap.data.length; i++) {
    const rgbaIndex = i * 4;
    const paletteIndex = bitmap.data[i];
    rgbaData[rgbaIndex] = 0;
    rgbaData[rgbaIndex + 1] = 0;
    rgbaData[rgbaIndex + 2] = 0;
    rgbaData[rgbaIndex + 3] = paletteIndex;
  }

  return rgbaData;
}

export class TextureAtlas {
  private texture?: THREE.DataTexture;
  private imageRects?: Map<IndexedBitmap, any>;
  private width: number = 0;
  private height: number = 0;

  getTexture(): THREE.DataTexture {
    if (!this.texture) {
      throw new Error('Texture atlas not initialized');
    }
    return this.texture;
  }

  getImageRect(image: IndexedBitmap): any {
    if (!this.imageRects) {
      throw new Error('Texture atlas not initialized');
    }
    const rect = this.imageRects.get(image);
    if (!rect) {
      throw new Error('Image not found in atlas');
    }
    return rect;
  }

  pack(images: IndexedBitmap[]): void {
    const blocks: any[] = [];
    
    images.forEach(image => {
      blocks.push({
        w: image.width + (image.width % 2),
        h: image.height + (image.height % 2),
        image: image
      });
    });
    
    // Sort blocks by size (largest first)
    blocks.sort((a, b) => (b.w - a.w) * 10000 + b.h - a.h);
    
    const packer = new GrowingPacker();
    packer.fit(blocks);
    
    const width = packer.root.w;
    const height = packer.root.h;
    const imageRects = new Map<IndexedBitmap, any>();
    
    const atlasBitmap = createAtlasBitmap(blocks, width, height, imageRects);
    
    const rgbaData = createAtlasRgbaData(atlasBitmap);
    
    const texture = new THREE.DataTexture(
      rgbaData, 
      width, 
      height, 
      THREE.RGBAFormat
    );
    
    texture.needsUpdate = true;
    texture.flipY = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.colorSpace = THREE.NoColorSpace;
    
    this.width = width;
    this.height = height;
    this.imageRects = imageRects;
    this.texture = texture;
  }

  dispose(): void {
    this.texture?.dispose();
  }
} 
