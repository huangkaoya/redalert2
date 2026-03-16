import { TextureUtils } from "@/engine/gfx/TextureUtils";
import { BatchedMesh } from "@/engine/gfx/batch/BatchedMesh";
import { VxlBuilder } from "@/engine/renderable/builder/VxlBuilder";
import { PalettePhongMaterial } from "@/engine/gfx/material/PalettePhongMaterial";
import { VxlFile } from "@/data/VxlFile";
import { HvaFile } from "@/data/HvaFile";
import { Palette } from "@/data/Palette";
import * as THREE from "three";

export class VxlBatchedBuilder extends VxlBuilder {
  private static materialCache = new Map<THREE.Texture, { material: PalettePhongMaterial; usages: number }>();

  private vxlFile: VxlFile;
  private hvaFile?: HvaFile;
  private palettes: Palette[];
  private palette: Palette;
  private vxlGeometryPool: any;
  private clippingPlanes: THREE.Plane[] = [];
  private opacity: number = 1;
  private castShadow: boolean = true;
  private materialCacheKey?: THREE.Texture;
  private extraLight: any;

  constructor(vxlFile: VxlFile, hvaFile: HvaFile | undefined, palettes: Palette[], palette: Palette, vxlGeometryPool: any, camera: any) {
    super(camera);
    this.vxlFile = vxlFile;
    this.hvaFile = hvaFile;
    this.palettes = palettes;
    this.palette = palette;
    this.vxlGeometryPool = vxlGeometryPool;
  }

  createVxlMeshes(): Map<string, BatchedMesh> {
    const texture = TextureUtils.textureFromPalettes(this.palettes);
    const material = this.useMaterial(texture);
    this.materialCacheKey = texture;
    const paletteIndex = this.getPaletteIndex(this.palette);
    const sections = this.vxlFile.sections;
    const meshes = new Map<string, BatchedMesh>();

    sections.forEach((section: any, index: number) => {
      const geometry = this.vxlGeometryPool.get(section);
      const mesh = new BatchedMesh(geometry, material);
      let matrix = section.transfMatrix;
      const hvaSection = this.hvaFile?.sections[index];
      
      if (hvaSection) {
        matrix = section.scaleHvaMatrix(hvaSection.getMatrix(0));
      }
      
      mesh.applyMatrix4(matrix);
      meshes.set(section.name, mesh);
      mesh.castShadow = this.castShadow;
      mesh.setPaletteIndex(paletteIndex);
      
      if (this.extraLight) {
        mesh.setExtraLight(this.extraLight);
      }
      
      mesh.setOpacity(this.opacity);
      mesh.setClippingPlanes(this.clippingPlanes);
    });

    return meshes;
  }

  private useMaterial(texture: THREE.Texture): PalettePhongMaterial {
    let cached = VxlBatchedBuilder.materialCache.get(texture);
    let material: PalettePhongMaterial;

    if (cached) {
      material = cached.material;
      cached.usages++;
    } else {
      material = new PalettePhongMaterial({
        palette: texture,
        paletteCount: this.palettes.length,
        vertexColors: true,
        transparent: true
      });
      cached = { material, usages: 1 };
      VxlBatchedBuilder.materialCache.set(texture, cached);
    }

    return material;
  }

  private freeMaterial(): void {
    const cached = VxlBatchedBuilder.materialCache.get(this.materialCacheKey);
    if (cached) {
      if (cached.usages === 1) {
        VxlBatchedBuilder.materialCache.delete(this.materialCacheKey);
        cached.material.dispose();
      } else {
        cached.usages--;
      }
    }
  }

  private getPaletteIndex(palette: Palette): number {
    const index = this.palettes.findIndex((p) => p.hash === palette.hash);
    if (index === -1) {
      throw new Error("Provided palette not found in the list of available palettes");
    }
    return index;
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    if (this.object && this.sections) {
      const index = this.getPaletteIndex(palette);
      this.sections.forEach((section: any) => section.setPaletteIndex(index));
    }
  }

  setExtraLight(light: any): void {
    this.extraLight = light;
    if (this.object && this.sections) {
      this.sections.forEach((section: any) => section.setExtraLight(light));
    }
  }

  setShadow(castShadow: boolean): void {
    this.castShadow = castShadow;
    this.sections?.forEach((section: any) => {
      section.castShadow = castShadow;
    });
  }

  setClippingPlanes(planes: any[]): void {
    this.clippingPlanes = planes;
    if (this.object && this.sections) {
      this.sections.forEach((section: any) => section.setClippingPlanes(planes));
    }
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity;
    if (this.object && this.sections) {
      this.sections.forEach((section: any) => section.setOpacity(opacity));
    }
  }

  dispose(): void {
    if (this.object) {
      this.freeMaterial();
      this.object = undefined;
    }
  }
}
