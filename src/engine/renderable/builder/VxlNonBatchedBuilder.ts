import { TextureUtils } from '@/engine/gfx/TextureUtils';
import { VxlBuilder } from '@/engine/renderable/builder/VxlBuilder';
import { PalettePhongMaterial } from '@/engine/gfx/material/PalettePhongMaterial';
import { Palette } from '@/data/Palette';
import * as THREE from 'three';

// 定义相关类型接口
interface VxlSection {
  name: string;
  transfMatrix: THREE.Matrix4;
  scaleHvaMatrix(matrix: THREE.Matrix4): THREE.Matrix4;
}

interface VxlFile {
  sections: VxlSection[];
}

interface HvaSection {
  getMatrix(index: number): THREE.Matrix4;
}

interface HvaFile {
  sections: HvaSection[];
}

interface VxlGeometryPool {
  get(section: VxlSection): THREE.BufferGeometry;
}

export class VxlNonBatchedBuilder extends VxlBuilder {
  private vxlFile: VxlFile;
  private hvaFile: HvaFile | null;
  private palette: Palette;
  private vxlGeometryPool: VxlGeometryPool;
  private clippingPlanes: THREE.Plane[];
  private castShadow: boolean;
  private material?: PalettePhongMaterial;
  private extraLight?: any; // 根据实际类型定义

  constructor(
    vxlFile: VxlFile,
    palette: Palette,
    hvaFile: HvaFile | null,
    vxlGeometryPool: VxlGeometryPool,
    parent: THREE.Camera
  ) {
    super(parent);
    this.vxlFile = vxlFile;
    this.hvaFile = hvaFile;
    this.palette = palette;
    this.vxlGeometryPool = vxlGeometryPool;
    this.clippingPlanes = [];
    this.castShadow = true;
  }

  createVxlMeshes(): Map<string, THREE.Mesh> {
    const paletteTexture = TextureUtils.textureFromPalette(this.palette);
    
    const material = this.material = new PalettePhongMaterial({
      palette: paletteTexture,
      vertexColors: true,
    });

    if (this.extraLight) {
      material.extraLight = this.extraLight;
    }
    
    material.clippingPlanes = this.clippingPlanes;

    const sections = this.vxlFile.sections;
    const meshMap = new Map<string, THREE.Mesh>();

    sections.forEach((section, index) => {
      const geometry = this.vxlGeometryPool.get(section);
      const mesh = new THREE.Mesh(geometry, material);
      
      let transformMatrix = section.transfMatrix;
      const hvaSection = this.hvaFile?.sections[index];
      
      if (hvaSection) {
        transformMatrix = section.scaleHvaMatrix(hvaSection.getMatrix(0));
      }
      
      mesh.applyMatrix4(transformMatrix);
      meshMap.set(section.name, mesh);
      mesh.castShadow = this.castShadow;
    });

    this.sections = meshMap;
    return meshMap;
  }

  setPalette(palette: Palette): void {
    this.palette = palette;
    
    if (this.object && this.material) {
      const paletteTexture = TextureUtils.textureFromPalette(palette);
      this.material.palette = paletteTexture;
    }
  }

  setExtraLight(extraLight: any): void {
    this.extraLight = extraLight;
    
    if (this.object && this.material) {
      this.material.extraLight = extraLight;
    }
  }

  setShadow(castShadow: boolean): void {
    this.castShadow = castShadow;
    
    if (this.sections) {
      this.sections.forEach((mesh) => {
        mesh.castShadow = castShadow;
      });
    }
  }

  setClippingPlanes(clippingPlanes: THREE.Plane[]): void {
    this.clippingPlanes = clippingPlanes;
    
    if (this.object && this.material) {
      this.material.clippingPlanes = clippingPlanes;
    }
  }

  setOpacity(opacity: number): void {
    if (this.material) {
      this.material.transparent = opacity < 1;
      this.material.opacity = opacity;
    }
  }

  dispose(): void {
    if (this.object && this.material) {
      this.material.dispose();
    }
  }
}
