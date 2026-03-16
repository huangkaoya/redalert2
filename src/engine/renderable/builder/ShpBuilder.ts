// @ts-nocheck
import * as TextureUtils from "../../gfx/TextureUtils";
import * as SpriteUtils from "../../gfx/SpriteUtils";
import { ShpTextureAtlas } from "./ShpTextureAtlas";
import { PaletteBasicMaterial } from "../../gfx/material/PaletteBasicMaterial";
import { BatchedMesh, BatchMode } from "../../gfx/batch/BatchedMesh";
import * as THREE from 'three';

export class ShpBuilder {
  static textureCache = new Map();
  static geometryCache = new Map();
  static materialCache = new Map();

  // Instance fields (migrated from dynamic assignments for proper TS typing)
  private scale!: number;
  private depth!: boolean;
  private depthOffset!: number;
  private batchPalettes!: any[];
  private useMeshBatching!: boolean;
  private opacity!: number;
  private forceTransparent!: boolean;
  private offset!: { x: number; y: number };
  private frameOffset!: number;
  public flat!: boolean;
  private uiAnchorCompensation!: boolean;
  private shpFile: any;
  private palette: any;
  private camera: any;
  private shpSize!: { width: number; height: number };
  private mesh?: any;
  private extraLight?: any;
  private materialCacheKey?: string;
  private atlas: any;
  private frameNo?: number;
  private align?: { x: number; y: number };

  static prepareTexture(shpFile) {
    if (!ShpBuilder.textureCache.has(shpFile)) {
      const atlas = new ShpTextureAtlas().fromShpFile(shpFile);
      ShpBuilder.textureCache.set(shpFile, atlas);
    }
  }

  static clearCaches() {
    ShpBuilder.textureCache.forEach((texture) => texture.dispose());
    ShpBuilder.textureCache.clear();
    ShpBuilder.geometryCache.forEach((cache) => cache.forEach((geometry) => geometry.dispose()));
    ShpBuilder.geometryCache.clear();
  }

  constructor(shpFile, palette, camera, scale = 1, depth = false, depthOffset = 0) {
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
    this.uiAnchorCompensation = false;
    this.shpFile = shpFile;
    this.palette = palette;
    this.camera = camera;
    this.shpSize = { width: shpFile.width, height: shpFile.height };
    this.setFrame(0);
  }

  setUiAnchorCompensation(enabled) {
    if (this.mesh) {
      throw new Error("UI anchor compensation can only be set before calling build()");
    }
    this.uiAnchorCompensation = enabled;
  }

  useMaterial(texture, palette, transparent) {
    if (texture.format !== THREE.RGBAFormat) {
      throw new Error("Texture must have format THREE.RGBAFormat");
    }
    
    this.materialCacheKey = texture.uuid + "_" + palette.uuid + "_" + Number(transparent);
    let cached = ShpBuilder.materialCache.get(this.materialCacheKey);
    let material;

    if (cached) {
      material = cached.material;
      cached.usages++;
    } else {
      material = new PaletteBasicMaterial({
        map: texture,
        palette: palette,
        alphaTest: 0.05,
        paletteCount: this.batchPalettes.length,
        flatShading: true,
        transparent: transparent,
      });
      cached = { material: material, usages: 1 };
      ShpBuilder.materialCache.set(this.materialCacheKey, cached);
    }
    
    return material;
  }

  freeMaterial() {
    if (!this.materialCacheKey) {
      throw new Error("Material cache key not set");
    }
    
    let cached = ShpBuilder.materialCache.get(this.materialCacheKey);
    if (cached) {
      if (cached.usages === 1) {
        ShpBuilder.materialCache.delete(this.materialCacheKey);
        cached.material.dispose();
      } else {
        cached.usages--;
      }
    }
  }

  setBatched(batched) {
    if (this.mesh) {
      throw new Error("Batching can only be set before calling build()");
    }
    this.useMeshBatching = batched;
  }

  setOffset(offset) {
    if (this.mesh) {
      throw new Error("Offset can only be set before calling build()");
    }
    this.offset = offset;
  }

  setAlign(x, y) {
    if (this.mesh) {
      throw new Error("Align can only be set before calling build()");
    }
    this.align = { x, y };
  }

  setFrameOffset(frameOffset) {
    if (this.mesh) {
      throw new Error("frameOffset can only be set before calling build()");
    }
    this.frameOffset = frameOffset;
  }

  initTexture() {
    ShpBuilder.prepareTexture(this.shpFile);
    this.atlas = ShpBuilder.textureCache.get(this.shpFile);
  }

  getSpriteGeometryOptions(frameNo) {
    frameNo += this.frameOffset;
    const image = this.shpFile.getImage(frameNo);
    const offset = {
      x: image.x - Math.floor(this.shpSize.width / 2) + Math.floor(this.offset.x),
      y: image.y - Math.floor(this.shpSize.height / 2) + Math.floor(this.offset.y),
    };
    // Prefer explicit align if provided; otherwise use UI compensation flag; fallback to default
    const align = this.align ? this.align : (this.uiAnchorCompensation ? { x: 0, y: -1 } : { x: 1, y: -1 });
    
    return {
      texture: this.atlas.getTexture(),
      textureArea: this.atlas.getTextureArea(frameNo),
      flat: this.flat,
      align: align,
      offset: offset,
      camera: this.camera,
      depth: this.depth,
      depthOffset: this.depthOffset,
      scale: this.scale,
    };
  }

  getGeometryCacheKey(frameNo) {
    return (
      frameNo +
      this.frameOffset +
      "_" +
      this.shpSize.width +
      "_" +
      this.shpSize.height +
      "_" +
      this.offset.x +
      "_" +
      this.offset.y +
      "_" +
      this.flat +
      "_" +
      this.depth +
      "_" +
      this.depthOffset
    );
  }

  setFrame(frameNo) {
    if (this.frameNo !== frameNo) {
      this.frameNo = frameNo;
      if (this.mesh) {
        let geometryCache = this.getGeometryCache();
        const cacheKey = this.getGeometryCacheKey(frameNo);
        let geometry = geometryCache.get(cacheKey);
        
        if (!geometry) {
          geometry = SpriteUtils.createSpriteGeometry(this.getSpriteGeometryOptions(frameNo));
          geometryCache.set(cacheKey, geometry);
        }
        
        this.mesh.geometry = geometry;
      }
    }
  }

  getGeometryCache() {
    let cache = ShpBuilder.geometryCache.get(this.shpFile);
    if (!cache) {
      cache = new Map();
      ShpBuilder.geometryCache.set(this.shpFile, cache);
    }
    return cache;
  }

  getFrame() {
    return this.frameNo;
  }

  setSize(size) {
    this.shpSize = { width: size.width, height: size.height };
  }

  getSize() {
    return this.shpSize;
  }

  get frameCount() {
    return this.shpFile.numImages;
  }

  getBatchPaletteIndex(palette) {
    const index = this.batchPalettes.findIndex((p) => p.hash === palette.hash);
    if (index === -1) {
      throw new Error(
        "Provided palette not found in the list of batch palettes. Call setBatchPalettes first."
      );
    }
    return index;
  }

  setPalette(palette) {
    this.palette = palette;
    if (this.mesh) {
      if (this.useMeshBatching) {
        const paletteIndex = this.getBatchPaletteIndex(palette);
        this.mesh.setPaletteIndex(paletteIndex);
      } else {
        const paletteTexture = TextureUtils.textureFromPalette(palette);
        let material = this.mesh.material;
        material.palette = paletteTexture;
      }
    }
  }

  setBatchPalettes(palettes) {
    if (!this.useMeshBatching) {
      throw new Error("Can't use multiple palettes when not batching");
    }
    if (this.mesh) {
      throw new Error("Palettes must be set before creating 3DObject");
    }
    this.batchPalettes = palettes;
  }

  setExtraLight(extraLight) {
    this.extraLight = extraLight;
    if (this.mesh) {
      if (this.useMeshBatching) {
        this.mesh.setExtraLight(extraLight);
      } else {
        let material = this.mesh.material;
        material.extraLight = extraLight;
      }
    }
  }

  setOpacity(opacity) {
    const oldOpacity = this.opacity;
    if (oldOpacity !== opacity) {
      this.opacity = opacity;
      this.updateOpacity();
    }
    
    if (Math.floor(oldOpacity) !== Math.floor(opacity) && !this.forceTransparent) {
      this.updateTransparency();
    }
  }

  setForceTransparent(forceTransparent) {
    if (forceTransparent !== this.forceTransparent) {
      this.forceTransparent = forceTransparent;
      this.updateTransparency();
    }
  }

  updateOpacity() {
    if (this.mesh) {
      if (this.useMeshBatching) {
        this.mesh.setOpacity(this.opacity);
      } else {
        this.mesh.material.opacity = this.opacity;
      }
    }
  }

  updateTransparency() {
    if (this.mesh) {
      const transparent = this.forceTransparent || this.opacity < 1;
      if (this.useMeshBatching) {
        const texture = this.mesh.material.map;
        const palette = this.mesh.material.palette;
        this.freeMaterial();
        this.mesh.material = this.useMaterial(texture, palette, transparent);
      } else {
        this.mesh.material.transparent = transparent;
      }
    }
  }

  build() {
    //console.log('[ShpBuilder] build() called');
    
    if (this.mesh) {
      //console.log('[ShpBuilder] Returning existing mesh');
      return this.mesh;
    }
    
    //console.log('[ShpBuilder] Creating new mesh, useMeshBatching:', this.useMeshBatching);
    
    this.initTexture();
    const texture = this.atlas.getTexture();
    const cacheKey = this.getGeometryCacheKey(this.frameNo);
    
    //console.log('[ShpBuilder] Texture:', texture);
    //console.log('[ShpBuilder] Cache key:', cacheKey);
    
    let geometryCache = this.getGeometryCache();
    let geometry = geometryCache.get(cacheKey);
    
    if (!geometry) {
      //console.log('[ShpBuilder] Creating new geometry');
      const options = this.getSpriteGeometryOptions(this.frameNo);
      //console.log('[ShpBuilder] Geometry options:', options);
      geometry = SpriteUtils.createSpriteGeometry(options);
      //console.log('[ShpBuilder] Created geometry:', geometry);
      geometryCache.set(cacheKey, geometry);
    } else {
      //console.log('[ShpBuilder] Using cached geometry');
    }

    let mesh;
    const transparent = this.opacity < 1 || this.forceTransparent;
    
    //console.log('[ShpBuilder] Creating mesh, transparent:', transparent);
    
    if (this.useMeshBatching) {
      //console.log('[ShpBuilder] Using batched mesh');
      const paletteTexture = TextureUtils.textureFromPalettes(this.batchPalettes);
      const material = this.useMaterial(texture, paletteTexture, transparent);
      //console.log('[ShpBuilder] Batched material:', material);
      mesh = new BatchedMesh(geometry, material, BatchMode.Merging);
      mesh.castShadow = false;
    } else {
      //console.log('[ShpBuilder] Using regular mesh');
      const paletteTexture = TextureUtils.textureFromPalette(this.palette);
      //console.log('[ShpBuilder] Palette texture:', paletteTexture);
      const material = new PaletteBasicMaterial({
        map: texture,
        palette: paletteTexture,
        alphaTest: 0.5,
        flatShading: true,
        transparent: transparent,
      });
      //console.log('[ShpBuilder] Regular material:', material);
      mesh = new THREE.Mesh(geometry, material);
    }
    
    //console.log('[ShpBuilder] Created mesh:', mesh);
    //console.log('[ShpBuilder] Mesh material:', mesh.material);
    //console.log('[ShpBuilder] Material map (texture):', mesh.material.map);
    //console.log('[ShpBuilder] Material palette:', mesh.material.palette);
    //console.log('[ShpBuilder] Mesh geometry:', mesh.geometry);
    //console.log('[ShpBuilder] Geometry attributes:', mesh.geometry.attributes);
    
    mesh.matrixAutoUpdate = false;
    this.mesh = mesh;
    this.setPalette(this.palette);
    this.updateOpacity();
    
    if (this.extraLight) {
      this.setExtraLight(this.extraLight);
    }
    
    //console.log('[ShpBuilder] Returning final mesh:', mesh);
    return mesh;
  }

  dispose() {
    if (this.mesh) {
      if (this.useMeshBatching) {
        this.freeMaterial();
      } else {
        this.mesh.material.dispose();
      }
      this.mesh = undefined;
    }
  }
}
  
