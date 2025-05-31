import { RgbaBitmap } from "../../data/Bitmap";
import { fnv32a } from "../../util/math";
import { CanvasUtils } from "./CanvasUtils";
import { PalDrawable } from "./drawable/PalDrawable";
import * as THREE from 'three';

class TextureUtilsClass {
  static cache = new Map();

  static textureFromPalette(palette) {
    const hash = palette.hash;
    let texture = TextureUtilsClass.cache.get(hash);
    
    if (texture) {
      return texture;
    }
    
    const bitmap = new PalDrawable(palette).draw();
    texture = this.textureFromPalBitmap(bitmap);
    TextureUtilsClass.cache.set(hash, texture);
    return texture;
  }

  static textureFromPalettes(palettes) {
    if (!palettes.length) {
      throw new Error("At least one palette is required");
    }
    
    const hash = fnv32a(palettes.map((palette) => palette.hash));
    let texture = TextureUtilsClass.cache.get(hash);
    
    if (texture) {
      return texture;
    }
    
    const bitmaps = palettes.map((palette) => new PalDrawable(palette).draw());
    let combinedBitmap = new RgbaBitmap(bitmaps[0].width, bitmaps.length);
    
    let row = 0;
    for (const bitmap of bitmaps) {
      combinedBitmap.drawRgbaImage(bitmap, 0, row++);
    }
    
    texture = this.textureFromPalBitmap(combinedBitmap);
    TextureUtilsClass.cache.set(hash, texture);
    return texture;
  }

  static textureFromPalBitmap(bitmap) {
    const canvas = CanvasUtils.canvasFromRgbaImageData(
      bitmap.data,
      bitmap.width,
      bitmap.height,
    );
    
    let texture = new THREE.Texture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.flipY = false;
    
    // 设置为线性颜色空间，与Atlas纹理保持一致
    texture.colorSpace = THREE.LinearSRGBColorSpace;
    
    return texture;
  }
}

// Export for both import patterns
// For import * as TextureUtils pattern (ShpBuilder.js)
export const textureFromPalette = TextureUtilsClass.textureFromPalette.bind(TextureUtilsClass);
export const textureFromPalettes = TextureUtilsClass.textureFromPalettes.bind(TextureUtilsClass);
export const textureFromPalBitmap = TextureUtilsClass.textureFromPalBitmap.bind(TextureUtilsClass);

// For import { TextureUtils } pattern (TypeScript files)
export const TextureUtils = TextureUtilsClass; 