import { IndexedBitmap } from "../../../data/Bitmap";
import { TextureAtlas } from "../../gfx/TextureAtlas";
import * as THREE from 'three';

// 定义SHP文件中图像的接口
interface ShpImage {
  width: number;
  height: number;
  imageData: Uint8Array | number[]; // 根据实际数据类型调整
}

// 定义SHP文件的接口
interface ShpFile {
  numImages: number;
  getImage(index: number): ShpImage;
}

// 定义纹理区域的接口（根据TextureAtlas.getImageRect的返回值调整）
interface TextureArea {
  x: number;
  y: number;
  width: number;
  height: number;
  // 可能还有其他属性，根据实际TextureAtlas实现调整
}

export class ShpTextureAtlas {
  private images: IndexedBitmap[] = [];
  private atlas: TextureAtlas | null = null;

  fromShpFile(shpFile: ShpFile): this {
    const bitmaps: IndexedBitmap[] = [];
    
    for (let i = 0; i < shpFile.numImages; i++) {
      const image = shpFile.getImage(i);
      // Ensure the bitmap data is a Uint8Array before passing to IndexedBitmap
      const dataArray: Uint8Array =
        image.imageData instanceof Uint8Array
          ? image.imageData
          : new Uint8Array(image.imageData);
      bitmaps.push(new IndexedBitmap(image.width, image.height, dataArray));
    }
    
    const atlas = new TextureAtlas();
    atlas.pack(bitmaps);
    this.images = bitmaps;
    this.atlas = atlas;
    return this;
  }

  getTextureArea(imageIndex: number): TextureArea {
    if (!this.atlas) {
      throw new Error("Atlas not initialized. Call fromShpFile first.");
    }
    if (imageIndex < 0 || imageIndex >= this.images.length) {
      throw new Error(`Image index ${imageIndex} out of bounds. Valid range: 0-${this.images.length - 1}`);
    }
    
    return this.atlas.getImageRect(this.images[imageIndex]);
  }

  getTexture(): THREE.Texture {
    if (!this.atlas) {
      throw new Error("Atlas not initialized. Call fromShpFile first.");
    }
    
    return this.atlas.getTexture();
  }

  dispose(): void {
    if (this.atlas) {
      this.atlas.dispose();
      this.atlas = null;
    }
    this.images = [];
  }

  // 获取图像数量的便捷方法
  get imageCount(): number {
    return this.images.length;
  }

  // 检查是否已初始化的便捷方法
  get isInitialized(): boolean {
    return this.atlas !== null;
  }
}