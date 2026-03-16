import * as THREE from 'three';
import { ShpTextureAtlas } from './ShpTextureAtlas';
import { SpriteUtils } from '../../gfx/SpriteUtils';
import { TextureUtils } from '../../gfx/TextureUtils';
import { PaletteBasicMaterial } from '../../gfx/material/PaletteBasicMaterial';
import { ShpFile } from '../../../data/ShpFile';

interface BatchItem {
  position: THREE.Vector3;
  shpFile: ShpFile;
  depth: boolean;
  flat: boolean;
  frameNo: number;
  offset: { x: number; y: number };
  lightMult?: THREE.Vector3;
}

export class BatchShpBuilder {
  private shpFile: ShpFile;
  private palette: any;
  private camera: THREE.Camera;
  private textureCache: Map<ShpFile, ShpTextureAtlas>;
  private opacity: number;
  private transparent: boolean;
  private batchSize: number;
  private scale: number;
  private specIndexes: Map<BatchItem, number | undefined>;
  private atlas?: ShpTextureAtlas;
  private mesh?: THREE.Mesh;
  private positionAttribute?: THREE.BufferAttribute;
  private colorMultAttribute?: THREE.BufferAttribute;
  private firstFreeSpriteIdx: number = -1;

  get verticesPerSprite(): number {
    return SpriteUtils.VERTICES_PER_SPRITE;
  }

  get trianglesPerSprite(): number {
    return SpriteUtils.TRIANGLES_PER_SPRITE;
  }

  constructor(
    shpFile: ShpFile,
    palette: any,
    camera: THREE.Camera,
    textureCache: Map<ShpFile, ShpTextureAtlas>,
    opacity: number = 1,
    transparent: boolean = false,
    batchSize: number = 10000,
    scale: number = 1
  ) {
    this.shpFile = shpFile;
    this.palette = palette;
    this.camera = camera;
    this.textureCache = textureCache;
    this.opacity = opacity;
    this.transparent = transparent;
    this.batchSize = batchSize;
    this.scale = scale;
    this.specIndexes = new Map();
  }

  private initTexture(): void {
    if (this.textureCache.has(this.shpFile)) {
      this.atlas = this.textureCache.get(this.shpFile)!;
    } else {
      const atlas = new ShpTextureAtlas().fromShpFile(this.shpFile);
      this.textureCache.set(this.shpFile, atlas);
      this.atlas = atlas;
    }
  }

  private getSpriteGeometryOptions(item: BatchItem) {
    const image = this.shpFile.getImage(item.frameNo);
    const offset = {
      x: image.x - item.shpFile.width / 2 + item.offset.x,
      y: image.y - item.shpFile.height / 2 + item.offset.y,
    };

    return {
      texture: this.atlas!.getTexture(),
      textureArea: this.atlas!.getTextureArea(item.frameNo),
      flat: item.flat,
      depth: item.depth,
      align: { x: 1, y: -1 },
      offset: offset,
      camera: this.camera,
      scale: this.scale,
    };
  }

  setPalette(palette: any): void {
    this.palette = palette;
    if (this.mesh) {
      const paletteTexture = TextureUtils.textureFromPalette(palette);
      let material = this.mesh.material as PaletteBasicMaterial;
      material.palette = paletteTexture;
    }
  }

  build(): THREE.Mesh {
    if (this.mesh) {
      return this.mesh;
    }

    this.initTexture();

    const paletteTexture = TextureUtils.textureFromPalette(this.palette);
    let geometry = new THREE.BufferGeometry();

    const vertexCount = this.batchSize * this.verticesPerSprite;
    const positionAttribute = new THREE.BufferAttribute(new Float32Array(3 * vertexCount), 3);
    geometry.setAttribute("position", positionAttribute);
    this.positionAttribute = positionAttribute;

    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array(2 * vertexCount), 2)
    );

    if (SpriteUtils.USE_INDEXED_GEOMETRY) {
      const indexCount = this.batchSize * this.trianglesPerSprite * 3;
      geometry.setIndex(
        new THREE.BufferAttribute(new Uint32Array(1 * indexCount), 1)
      );
    }

    const colorMultAttribute = new THREE.BufferAttribute(new Float32Array(4 * vertexCount), 4);
    geometry.setAttribute("vertexColorMult", colorMultAttribute);
    this.colorMultAttribute = colorMultAttribute;

    let spriteIndex = 0;
    for (const item of this.specIndexes.keys()) {
      this.specIndexes.set(item, spriteIndex);
      this.setSpecGeometry(item, geometry, spriteIndex);
      spriteIndex++;
    }

    this.firstFreeSpriteIdx = spriteIndex < this.batchSize ? spriteIndex : -1;

    if (spriteIndex < this.batchSize) {
      let posArray = positionAttribute.array as Float32Array;
      for (let i = spriteIndex; i < this.batchSize - 1; i++) {
        posArray[i * this.verticesPerSprite * 3] = i + 1;
      }
      posArray[(this.batchSize - 1) * this.verticesPerSprite * 3] = -1;
    }

    const material = new PaletteBasicMaterial({
      map: this.atlas!.getTexture(),
      palette: paletteTexture,
      alphaTest: this.transparent ? 0.05 : 0.5,
      flatShading: true,
      transparent: this.transparent,
      opacity: this.opacity,
      useVertexColorMult: true,
    });

    let mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.frustumCulled = false;
    this.mesh = mesh;

    return mesh;
  }

  add(item: BatchItem): void {
    if (!this.specIndexes.has(item)) {
      if (this.isFull()) {
        throw new Error("Batch is full");
      }

      const geometry = this.mesh?.geometry;
      if (geometry) {
        const spriteIndex = this.firstFreeSpriteIdx;
        if (spriteIndex === -1) {
          throw new Error("No free sprite index found");
        }

        this.specIndexes.set(item, spriteIndex);
        const nextFreeIndex = (this.positionAttribute?.array as Float32Array)[
          spriteIndex * this.verticesPerSprite * 3
        ];
        this.setSpecGeometry(item, geometry, spriteIndex);
        this.firstFreeSpriteIdx = nextFreeIndex;
      } else {
        this.specIndexes.set(item, undefined);
      }
    }
  }

  private setSpecGeometry(item: BatchItem, geometry: THREE.BufferGeometry, spriteIndex: number): void {
    const options = this.getSpriteGeometryOptions(item);
    let spriteGeometry = SpriteUtils.createSpriteGeometry(options);

    const position = item.position;
    spriteGeometry.applyMatrix4(
      new THREE.Matrix4().makeTranslation(position.x, position.y, position.z)
    );

    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const uvAttr = geometry.getAttribute("uv") as THREE.BufferAttribute;
    const dstPosArray = posAttr.array as Float32Array;
    const dstUvArray = uvAttr.array as Float32Array;

    const srcPosAttr = spriteGeometry.getAttribute("position") as THREE.BufferAttribute;
    const srcUvAttr = spriteGeometry.getAttribute("uv") as THREE.BufferAttribute;

    if (srcPosAttr.count !== this.verticesPerSprite) {
      throw new Error("Vertex count mismatch");
    }

    // Copy vertex positions
    for (let i = 0; i < this.verticesPerSprite; i++) {
      const dstBase = (spriteIndex * this.verticesPerSprite + i) * 3;
      dstPosArray[dstBase + 0] = srcPosAttr.getX(i);
      dstPosArray[dstBase + 1] = srcPosAttr.getY(i);
      dstPosArray[dstBase + 2] = srcPosAttr.getZ(i);
    }

    // Copy uvs if available
    if (srcUvAttr) {
      for (let i = 0; i < this.verticesPerSprite; i++) {
        const dstBase = (spriteIndex * this.verticesPerSprite + i) * 2;
        dstUvArray[dstBase + 0] = srcUvAttr.getX(i);
        dstUvArray[dstBase + 1] = srcUvAttr.getY(i);
      }
    }

    // Update index buffer if indexed geometry is enabled and temp has index
    if (SpriteUtils.USE_INDEXED_GEOMETRY && spriteGeometry.index) {
      const dstIndex = geometry.getIndex();
      if (dstIndex) {
        const dstIndexArray = dstIndex.array as Uint32Array;
        const srcIndexArray = spriteGeometry.index.array as Uint16Array | Uint32Array;
        const base = spriteIndex * this.verticesPerSprite;
        const offset = spriteIndex * spriteGeometry.index.count;
        for (let i = 0; i < spriteGeometry.index.count; i++) {
          dstIndexArray[offset + i] = base + (srcIndexArray as any)[i];
        }
        dstIndex.needsUpdate = true;
      }
    }

    const lightMult = item.lightMult ?? new THREE.Vector3(1, 1, 1);
    this.setLightingAt(spriteIndex, lightMult, this.colorMultAttribute!.array as Float32Array);
    this.setVisibilityAt(spriteIndex, true, this.colorMultAttribute!.array as Float32Array);

    posAttr.needsUpdate = true;
    uvAttr.needsUpdate = true;
  }

  has(item: BatchItem): boolean {
    return this.specIndexes.has(item);
  }

  remove(item: BatchItem): void {
    if (this.specIndexes.has(item)) {
      if (this.mesh) {
        const spriteIndex = this.specIndexes.get(item)!;
        this.setVisibilityAt(spriteIndex, false, this.colorMultAttribute!.array as Float32Array);
        this.colorMultAttribute!.needsUpdate = true;

        let posArray = this.positionAttribute!.array as Float32Array;
        posArray[spriteIndex * this.verticesPerSprite * 3] = this.firstFreeSpriteIdx;
        this.firstFreeSpriteIdx = spriteIndex;
      }
      this.specIndexes.delete(item);
    }
  }

  update(item: BatchItem): void {
    if (!this.specIndexes.has(item)) {
      return;
    }

    const geometry = this.mesh?.geometry;
    if (geometry) {
      this.setSpecGeometry(item, geometry, this.specIndexes.get(item)!);
    }
  }

  isFull(): boolean {
    return this.specIndexes.size === this.batchSize;
  }

  isEmpty(): boolean {
    return this.specIndexes.size === 0;
  }

  private setLightingAt(spriteIndex: number, lightMult: THREE.Vector3, array: Float32Array): void {
    for (let i = 0; i < this.verticesPerSprite; i++) {
      array[spriteIndex * this.verticesPerSprite * 4 + 4 * i] = lightMult.x;
      array[spriteIndex * this.verticesPerSprite * 4 + 4 * i + 1] = lightMult.y;
      array[spriteIndex * this.verticesPerSprite * 4 + 4 * i + 2] = lightMult.z;
    }
  }

  private setVisibilityAt(spriteIndex: number, visible: boolean, array: Float32Array): void {
    for (let i = 0; i < this.verticesPerSprite; i++) {
      array[spriteIndex * this.verticesPerSprite * 4 + 4 * i + 3] = visible ? 1 : 0;
    }
  }

  updateLighting(): void {
    if (this.mesh) {
      let colorArray = this.colorMultAttribute!.array as Float32Array;
      this.specIndexes.forEach((spriteIndex, item) => {
        const lightMult = item.lightMult ?? new THREE.Vector3(1, 1, 1);
        this.setLightingAt(spriteIndex!, lightMult, colorArray);
      });
      this.colorMultAttribute!.needsUpdate = true;
    }
  }

  dispose(): void {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      const { material } = this.mesh;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    }
  }
}
