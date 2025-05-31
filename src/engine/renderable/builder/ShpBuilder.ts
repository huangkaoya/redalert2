import { TextureUtils } from "@/engine/gfx/TextureUtils";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { ShpTextureAtlas } from "@/engine/renderable/builder/ShpTextureAtlas";
import { PaletteBasicMaterial } from "@/engine/gfx/material/PaletteBasicMaterial";
import { BatchedMesh, BatchMode } from "@/engine/gfx/batch/BatchedMesh";
import * as THREE from 'three';
import { ShpFile } from "@/data/ShpFile";

interface Palette {
  uuid: string;
  hash: string;
}

interface Camera {
  // Define camera interface properties as needed
}

interface Size {
  width: number;
  height: number;
}

interface Offset {
  x: number;
  y: number;
}

interface SpriteGeometryOptions {
  texture: THREE.Texture;
  textureArea: any;
  flat: boolean;
  align: { x: number; y: number };
  offset: Offset;
  camera: Camera;
  depth: boolean;
  depthOffset: number;
  scale: number;
}

interface MaterialCacheEntry {
  material: PaletteBasicMaterial;
  usages: number;
}

export class ShpBuilder {
  private static textureCache = new Map<ShpFile, ShpTextureAtlas>();
  private static geometryCache = new Map<ShpFile, Map<string, THREE.BufferGeometry>>();
  private static materialCache = new Map<string, MaterialCacheEntry>();

  private shpFile: ShpFile;
  private palette: Palette;
  private camera: Camera;
  private scale: number;
  private depth: boolean;
  private depthOffset: number;
  private batchPalettes: Palette[];
  private useMeshBatching: boolean;
  private opacity: number;
  private forceTransparent: boolean;
  private offset: Offset;
  private frameOffset: number;
  private flat: boolean;
  private shpSize: Size;
  private frameNo: number;
  private atlas?: ShpTextureAtlas;
  private mesh?: THREE.Mesh | BatchedMesh;
  private materialCacheKey?: string;
  private extraLight?: any;

  static prepareTexture(shpFile: ShpFile): void {
    if (!ShpBuilder.textureCache.has(shpFile)) {
      const atlas = new ShpTextureAtlas().fromShpFile(shpFile);
      ShpBuilder.textureCache.set(shpFile, atlas);
    }
  }

  static clearCaches(): void {
    ShpBuilder.textureCache.forEach((atlas) => atlas.dispose());
    ShpBuilder.textureCache.clear();
    
    ShpBuilder.geometryCache.forEach((geometryMap) => 
      geometryMap.forEach((geometry) => geometry.dispose())
    );
    ShpBuilder.geometryCache.clear();
  }

  constructor(
    shpFile: ShpFile,
    palette: Palette,
    camera: Camera,
    scale: number = 1,
    depth: boolean = false,
    depthOffset: number = 0
  ) {
    this.scale = scale;
    this.depth = depth;
    this.depthOffset = depthOffset;
    this.batchPalettes = [];
    this.useMeshBatching = false;
    this.opacity = 1;
    this.forceTransparent = false;
    this.offset = { x: 0, y: 0 };
    this.frameOffset = 0;
    this.flat = false;
    this.shpFile = shpFile;
    this.palette = palette;
    this.camera = camera;
    this.shpSize = { width: shpFile.width, height: shpFile.height };
    this.setFrame(0);
  }

  private useMaterial(
    texture: THREE.Texture,
    palette: THREE.Texture,
    transparent: boolean
  ): PaletteBasicMaterial {
    if (texture.format !== THREE.AlphaFormat) {
      throw new Error("Texture must have format THREE.AlphaFormat");
    }

    this.materialCacheKey = texture.uuid + "_" + palette.uuid + "_" + Number(transparent);
    let cacheEntry = ShpBuilder.materialCache.get(this.materialCacheKey);
    let material: PaletteBasicMaterial;

    if (cacheEntry) {
      material = cacheEntry.material;
      cacheEntry.usages++;
    } else {
      material = new PaletteBasicMaterial({
        map: texture,
        palette: palette,
        alphaTest: 0.05,
        paletteCount: this.batchPalettes.length,
        flatShading: true,
        transparent: transparent,
      });
      cacheEntry = { material: material, usages: 1 };
      ShpBuilder.materialCache.set(this.materialCacheKey, cacheEntry);
    }

    return material;
  }

  private freeMaterial(): void {
    if (!this.materialCacheKey) {
      throw new Error("Material cache key not set");
    }

    const cacheEntry = ShpBuilder.materialCache.get(this.materialCacheKey);
    if (cacheEntry) {
      if (cacheEntry.usages === 1) {
        ShpBuilder.materialCache.delete(this.materialCacheKey);
        cacheEntry.material.dispose();
      } else {
        cacheEntry.usages--;
      }
    }
  }

  setBatched(useBatching: boolean): void {
    if (this.mesh) {
      throw new Error("Batching can only be set before calling build()");
    }
    this.useMeshBatching = useBatching;
  }

  setOffset(offset: Offset): void {
    if (this.mesh) {
      throw new Error("Offset can only be set before calling build()");
    }
    this.offset = offset;
  }

  setFrameOffset(frameOffset: number): void {
    if (this.mesh) {
      throw new Error("frameOffset can only be set before calling build()");
    }
    this.frameOffset = frameOffset;
  }

  private initTexture(): void {
    ShpBuilder.prepareTexture(this.shpFile);
    this.atlas = ShpBuilder.textureCache.get(this.shpFile)!;
  }

  private getSpriteGeometryOptions(frameIndex: number): SpriteGeometryOptions {
    frameIndex += this.frameOffset;
    const image = this.shpFile.getImage(frameIndex);
    const offset = {
      x: image.x - Math.floor(this.shpSize.width / 2) + Math.floor(this.offset.x),
      y: image.y - Math.floor(this.shpSize.height / 2) + Math.floor(this.offset.y),
    };

    return {
      texture: this.atlas!.getTexture(),
      textureArea: this.atlas!.getTextureArea(frameIndex),
      flat: this.flat,
      align: { x: 1, y: -1 },
      offset: offset,
      camera: this.camera,
      depth: this.depth,
      depthOffset: this.depthOffset,
      scale: this.scale,
    };
  }

  private getGeometryCacheKey(frameIndex: number): string {
    return (
      frameIndex + this.frameOffset +
      "_" + this.shpSize.width +
      "_" + this.shpSize.height +
      "_" + this.offset.x +
      "_" + this.offset.y +
      "_" + this.flat +
      "_" + this.depth +
      "_" + this.depthOffset
    );
  }

  setFrame(frameIndex: number): void {
    if (this.frameNo !== frameIndex) {
      this.frameNo = frameIndex;
      if (this.mesh) {
        const geometryCache = this.getGeometryCache();
        const cacheKey = this.getGeometryCacheKey(frameIndex);
        let geometry = geometryCache.get(cacheKey);
        
        if (!geometry) {
          geometry = SpriteUtils.createSpriteGeometry(
            this.getSpriteGeometryOptions(frameIndex)
          );
          geometryCache.set(cacheKey, geometry);
        }
        
        this.mesh.geometry = geometry;
      }
    }
  }

  private getGeometryCache(): Map<string, THREE.BufferGeometry> {
    let geometryCache = ShpBuilder.geometryCache.get(this.shpFile);
    if (!geometryCache) {
      geometryCache = new Map();
      ShpBuilder.geometryCache.set(this.shpFile, geometryCache);
    }
    return geometryCache;
  }

  getFrame(): number {
    return this.frameNo;
  }

  setSize(size: Size): void {
    this.shpSize = { width: size.width, height: size.height };
  }

  getSize(): Size {
    return this.shpSize;
  }

  get frameCount(): number {
    return this.shpFile.numImages;
  }

  private getBatchPaletteIndex(palette: Palette): number {
    const index = this.batchPalettes.findIndex((p) => p.hash === palette.hash);
    if (index === -1) {
      throw new Error(
        "Provided palette not found in the list of batch palettes. Call setBatchPalettes first."
      );
    }
    return index;
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    if (this.mesh) {
      if (this.useMeshBatching) {
        const paletteIndex = this.getBatchPaletteIndex(palette);
        (this.mesh as BatchedMesh).setPaletteIndex(paletteIndex);
      } else {
        const paletteTexture = TextureUtils.textureFromPalette(palette);
        const material = this.mesh.material as PaletteBasicMaterial;
        material.palette = paletteTexture;
      }
    }
  }

  setBatchPalettes(palettes: Palette[]): void {
    if (!this.useMeshBatching) {
      throw new Error("Can't use multiple palettes when not batching");
    }
    if (this.mesh) {
      throw new Error("Palettes must be set before creating 3DObject");
    }
    this.batchPalettes = palettes;
  }

  setExtraLight(extraLight: any): void {
    this.extraLight = extraLight;
    if (this.mesh) {
      if (this.useMeshBatching) {
        (this.mesh as BatchedMesh).setExtraLight(extraLight);
      } else {
        const material = this.mesh.material as PaletteBasicMaterial;
        material.extraLight = extraLight;
      }
    }
  }

  setOpacity(opacity: number): void {
    const oldOpacity = this.opacity;
    if (oldOpacity !== opacity) {
      this.opacity = opacity;
      this.updateOpacity();
    }
    
    if (Math.floor(oldOpacity) !== Math.floor(opacity) && !this.forceTransparent) {
      this.updateTransparency();
    }
  }

  setForceTransparent(forceTransparent: boolean): void {
    if (forceTransparent !== this.forceTransparent) {
      this.forceTransparent = forceTransparent;
      this.updateTransparency();
    }
  }

  private updateOpacity(): void {
    if (this.mesh) {
      if (this.useMeshBatching) {
        (this.mesh as BatchedMesh).setOpacity(this.opacity);
      } else {
        (this.mesh.material as PaletteBasicMaterial).opacity = this.opacity;
      }
    }
  }

  private updateTransparency(): void {
    if (this.mesh) {
      const transparent = this.forceTransparent || this.opacity < 1;
      
      if (this.useMeshBatching) {
        const texture = (this.mesh.material as PaletteBasicMaterial).map;
        const palette = (this.mesh.material as PaletteBasicMaterial).palette;
        this.freeMaterial();
        this.mesh.material = this.useMaterial(texture, palette, transparent);
      } else {
        (this.mesh.material as PaletteBasicMaterial).transparent = transparent;
      }
    }
  }

  build(): THREE.Mesh | BatchedMesh {
    if (this.mesh) {
      return this.mesh;
    }

    this.initTexture();
    const texture = this.atlas!.getTexture();
    const cacheKey = this.getGeometryCacheKey(this.frameNo);
    const geometryCache = this.getGeometryCache();
    let geometry = geometryCache.get(cacheKey);

    if (!geometry) {
      const options = this.getSpriteGeometryOptions(this.frameNo);
      geometry = SpriteUtils.createSpriteGeometry(options);
      geometryCache.set(cacheKey, geometry);
    }

    let mesh: THREE.Mesh | BatchedMesh;
    const transparent = this.opacity < 1 || this.forceTransparent;

    if (this.useMeshBatching) {
      const paletteTexture = TextureUtils.textureFromPalettes(this.batchPalettes);
      const material = this.useMaterial(texture, paletteTexture, transparent);
      mesh = new BatchedMesh(geometry, material, BatchMode.Merging);
      mesh.castShadow = false;
    } else {
      const paletteTexture = TextureUtils.textureFromPalette(this.palette);
      const material = new PaletteBasicMaterial({
        map: texture,
        palette: paletteTexture,
        alphaTest: 0.5,
        flatShading: true,
        transparent: transparent,
      });
      mesh = new THREE.Mesh(geometry, material);
    }

    mesh.matrixAutoUpdate = false;
    this.mesh = mesh;
    this.setPalette(this.palette);
    this.updateOpacity();
    
    if (this.extraLight) {
      this.setExtraLight(this.extraLight);
    }

    return mesh;
  }

  dispose(): void {
    if (this.mesh) {
      if (this.useMeshBatching) {
        this.freeMaterial();
      } else {
        (this.mesh.material as PaletteBasicMaterial).dispose();
      }
      this.mesh = undefined;
    }
  }
}