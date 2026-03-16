import { Palette } from "@/data/Palette";
import { DebugUtils } from "@/engine/gfx/DebugUtils";
import { TextureUtils } from "@/engine/gfx/TextureUtils";
import { PaletteBasicMaterial } from "@/engine/gfx/material/PaletteBasicMaterial";
import { Mesh, Texture, BufferGeometry } from "three";
import { BatchedMesh, BatchMode } from "@/engine/gfx/batch/BatchedMesh";

interface Foundation {
  width: number;
  height: number;
}

interface DebugRenderableOptions {
  centerFoundation?: boolean;
}

interface MaterialCacheEntry {
  material: PaletteBasicMaterial;
  usages: number;
}

export class DebugRenderable {
  private static checkerboardTex?: Texture;
  private static geometryCache = new Map<string, BufferGeometry>();
  private static materialCache = new Map<string, MaterialCacheEntry>();

  private foundation: Foundation;
  private height: number;
  private palette: Palette;
  private options?: DebugRenderableOptions;
  private batchPalettes: Palette[] = [];
  private useMeshBatching: boolean = false;
  private opacity: number = 1;
  private mesh?: Mesh | BatchedMesh;
  private materialCacheKey?: string;

  static getOrCreateTexture(): Texture {
    let texture = DebugRenderable.checkerboardTex;
    if (!texture) {
      texture = DebugUtils.createIndexedCheckerTex(
        Palette.REMAP_START_IDX - 1,
        Palette.REMAP_START_IDX
      );
      DebugRenderable.checkerboardTex = texture;
    }
    return texture;
  }

  static clearCaches(): void {
    DebugRenderable.checkerboardTex?.dispose();
    DebugRenderable.geometryCache.forEach((geometry) => geometry.dispose());
    DebugRenderable.geometryCache.clear();
  }

  constructor(
    foundation: Foundation,
    height: number,
    palette: Palette,
    options?: DebugRenderableOptions
  ) {
    this.foundation = foundation;
    this.height = height;
    this.palette = palette;
    this.options = options;
  }

  private useMaterial(paletteTexture: Texture): PaletteBasicMaterial {
    this.materialCacheKey = paletteTexture.uuid;
    let cacheEntry = DebugRenderable.materialCache.get(this.materialCacheKey);
    let material: PaletteBasicMaterial;

    if (cacheEntry) {
      material = cacheEntry.material;
      cacheEntry.usages++;
    } else {
      material = new PaletteBasicMaterial({
        map: DebugRenderable.getOrCreateTexture(),
        palette: paletteTexture,
        alphaTest: 0.05,
        paletteCount: this.batchPalettes.length,
        flatShading: true,
        transparent: true,
      });
      cacheEntry = { material, usages: 1 };
      DebugRenderable.materialCache.set(this.materialCacheKey, cacheEntry);
    }

    return material;
  }

  private freeMaterial(): void {
    if (!this.materialCacheKey) {
      throw new Error("Material cache key not set");
    }

    const cacheEntry = DebugRenderable.materialCache.get(this.materialCacheKey);
    if (cacheEntry) {
      if (cacheEntry.usages === 1) {
        DebugRenderable.materialCache.delete(this.materialCacheKey);
        cacheEntry.material.dispose();
      } else {
        cacheEntry.usages--;
      }
    }
  }

  private getGeometryCacheKey(): string {
    return `${this.foundation.width}_${this.foundation.height}_${this.height}`;
  }

  setBatched(useBatching: boolean): void {
    if (this.mesh) {
      throw new Error("Batching can only be set before calling build()");
    }
    this.useMeshBatching = useBatching;
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
        const material = (this.mesh as Mesh).material as PaletteBasicMaterial;
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

  setOpacity(opacity: number): void {
    if (this.opacity !== opacity) {
      this.opacity = opacity;
      this.updateOpacity();
    }
  }

  private updateOpacity(): void {
    if (this.mesh) {
      if (this.useMeshBatching) {
        (this.mesh as BatchedMesh).setOpacity(this.opacity);
      } else {
        ((this.mesh as Mesh).material as PaletteBasicMaterial).opacity = this.opacity;
      }
    }
  }

  create3DObject(): void {
    if (!this.mesh) {
      const cacheKey = this.getGeometryCacheKey();
      const geometryCache = DebugRenderable.geometryCache;
      let geometry = geometryCache.get(cacheKey);

      if (!geometry) {
        geometry = DebugUtils.createBoxGeometry(
          this.foundation,
          this.height,
          this.options?.centerFoundation
        );
        geometryCache.set(cacheKey, geometry);
      }

      let mesh: Mesh | BatchedMesh;

      if (this.useMeshBatching) {
        const paletteTexture = TextureUtils.textureFromPalettes(this.batchPalettes);
        const material = this.useMaterial(paletteTexture);
        mesh = new BatchedMesh(geometry, material, BatchMode.Merging);
        mesh.castShadow = false;
      } else {
        const paletteTexture = TextureUtils.textureFromPalette(this.palette);
        const checkerTexture = DebugRenderable.getOrCreateTexture();
        const material = new PaletteBasicMaterial({
          palette: paletteTexture,
          map: checkerTexture,
          alphaTest: 0.05,
          transparent: true,
        });
        mesh = new Mesh(geometry, material);
      }

      mesh.matrixAutoUpdate = false;
      this.mesh = mesh;
      this.setPalette(this.palette);
      this.updateOpacity();
    }
  }

  get3DObject(): Mesh | BatchedMesh | undefined {
    return this.mesh;
  }

  update(deltaTime: number): void {
    // Implementation can be added here if needed
  }

  dispose(): void {
    if (this.mesh) {
      if (this.useMeshBatching) {
        this.freeMaterial();
      } else {
        ((this.mesh as Mesh).material as PaletteBasicMaterial).dispose();
      }
      this.mesh = undefined;
    }
  }
}
