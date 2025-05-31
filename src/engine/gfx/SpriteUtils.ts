import { isBetween } from "../../util/math";
import { BufferGeometryUtils } from "./BufferGeometryUtils";
import * as THREE from 'three';

class SpriteUtilsClass {
  static MAGIC_DEPTH_SCALE = 0.8;
  USE_INDEXED_GEOMETRY: boolean;
  VERTICES_PER_SPRITE: number;
  TRIANGLES_PER_SPRITE: number;

  constructor() {
    this.USE_INDEXED_GEOMETRY = true;
    this.VERTICES_PER_SPRITE = this.USE_INDEXED_GEOMETRY ? 8 : 12;
    this.TRIANGLES_PER_SPRITE = 4;
  }

  createSpriteGeometry(options) {
    if (typeof options !== "object") {
      throw new Error("Invalid argument");
    }

    const camera = options.camera;
    const texture = options.texture;

    if (!options.textureArea) {
      options.textureArea = {
        x: 0,
        y: 0,
        width: texture.image.width,
        height: texture.image.height,
      };
    }

    if (!options.offset) {
      options.offset = { x: 0, y: 0 };
    }

    const textureWidth = options.textureArea.width;
    const textureHeight = options.textureArea.height;
    const imageSize = {
      width: options.texture.image.width,
      height: options.texture.image.height,
    };

    const cosY = Math.cos(camera.rotation.y) * (options.scale ?? 1);
    const flatScale = cosY / Math.sin(-camera.rotation.x);
    const spriteWidth = textureWidth * cosY;
    const spriteHeight = textureHeight * (options.flat ? flatScale : cosY);

    const useDepth = options.depth && !options.flat;
    const splitX = useDepth && isBetween(-options.offset.x, 0, spriteWidth / cosY)
      ? -options.offset.x
      : spriteWidth / cosY / 2;

    let leftGeometry = this.createRectGeometry(splitX * cosY, spriteHeight);
    let rightGeometry = this.createRectGeometry(spriteWidth - splitX * cosY, spriteHeight);

    this.addRectUvs(leftGeometry, { ...options.textureArea, width: splitX }, imageSize);
    this.addRectUvs(
      rightGeometry,
      {
        ...options.textureArea,
        x: options.textureArea.x + splitX,
        width: options.textureArea.width - splitX,
      },
      imageSize,
    );

    rightGeometry.applyMatrix4(
      new THREE.Matrix4().makeTranslation(
        (spriteWidth - splitX * cosY + splitX * cosY) / 2,
        0,
        0,
      ),
    );

    let geometry = BufferGeometryUtils.mergeBufferGeometries([leftGeometry, rightGeometry]);
    geometry.applyMatrix4(
      new THREE.Matrix4().makeTranslation(
        -(spriteWidth / 2 - (splitX * cosY) / 2),
        0,
        0,
      ),
    );

    const align = options.align;
    const offset = options.offset;

    geometry.applyMatrix4(
      new THREE.Matrix4().makeTranslation(
        (align.x * spriteWidth) / 2 + offset.x * cosY,
        (align.y * spriteHeight) / 2 - offset.y * (options.flat ? flatScale : cosY),
        0,
      ),
    );

    if (useDepth) {
      this.applyDepth(geometry, camera, options.depthOffset ?? 0);
    } else if (options.depth && options.flat && options.depthOffset) {
      this.applyFlatDepth(geometry, options.depthOffset);
    }

    const rotation = new THREE.Euler(camera.rotation.x, camera.rotation.y, 0, "YXZ");
    geometry.applyMatrix4(
      new THREE.Matrix4()
        .makeRotationFromEuler(rotation)
        .multiply(
          options.flat
            ? new THREE.Matrix4().makeRotationFromEuler(
                new THREE.Euler(-camera.rotation.x - Math.PI / 2, 0, 0),
              )
            : new THREE.Matrix4().identity(),
        ),
    );

    return geometry;
  }

  createRectGeometry(width, height) {
    return this.USE_INDEXED_GEOMETRY
      ? this.createIndexedRectGeometry(width, height)
      : this.createNonIndexedRectGeometry(width, height);
  }

  createNonIndexedRectGeometry(width, height) {
    let geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -0.5 * width, 0.5 * height, 0,
      -0.5 * width, -0.5 * height, 0,
      0.5 * width, 0.5 * height, 0,
      -0.5 * width, -0.5 * height, 0,
      0.5 * width, -0.5 * height, 0,
      0.5 * width, 0.5 * height, 0,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    return geometry;
  }

  createIndexedRectGeometry(width, height) {
    let geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -0.5 * width, 0.5 * height, 0,
      0.5 * width, 0.5 * height, 0,
      -0.5 * width, -0.5 * height, 0,
      0.5 * width, -0.5 * height, 0,
    ]);
    geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    
    const indices = new Uint16Array([0, 2, 1, 2, 3, 1]);
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    return geometry;
  }

  addRectUvs(geometry, textureArea, imageSize) {
    const uvs = new Float32Array(2 * geometry.getAttribute("position").count);
    if (this.USE_INDEXED_GEOMETRY) {
      this.writeIndexedRectUvsIntoBuffer(uvs, 0, textureArea, imageSize);
    } else {
      this.writeNonIndexedRectUvsIntoBuffer(uvs, 0, textureArea, imageSize);
    }
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  }

  writeNonIndexedRectUvsIntoBuffer(buffer, offset, textureArea, imageSize) {
    const u = textureArea.x / imageSize.width;
    const v = 1 - (textureArea.y + textureArea.height) / imageSize.height;
    const uWidth = textureArea.width / imageSize.width;
    const vHeight = textureArea.height / imageSize.height;

    buffer.set(
      [u, v + vHeight, u, v, u + uWidth, v + vHeight, u, v, u + uWidth, v, u + uWidth, v + vHeight],
      12 * offset,
    );
  }

  writeIndexedRectUvsIntoBuffer(buffer, offset, textureArea, imageSize) {
    const u = textureArea.x / imageSize.width;
    const v = 1 - (textureArea.y + textureArea.height) / imageSize.height;
    const uWidth = textureArea.width / imageSize.width;
    const vHeight = textureArea.height / imageSize.height;

    buffer.set([u, v + vHeight, u + uWidth, v + vHeight, u, v, u + uWidth, v], 8 * offset);
  }

  applyDepth(geometry, camera, depthOffset) {
    let positions = geometry.getAttribute("position");
    for (let i = 0, count = positions.count; i < count; i++) {
      const x = positions.getX(i) * SpriteUtilsClass.MAGIC_DEPTH_SCALE;
      let z;
      if (x < 0) {
        z = depthOffset - (Math.abs(x) / Math.cos(camera.rotation.x)) * Math.tan(camera.rotation.y);
      } else {
        z = depthOffset - x / Math.cos(camera.rotation.x) / Math.tan(camera.rotation.y);
      }
      positions.setZ(i, z);
    }
  }

  applyFlatDepth(geometry, depthOffset) {
    let positions = geometry.getAttribute("position");
    for (let i = 0, count = positions.count; i < count; i++) {
      positions.setZ(i, depthOffset);
    }
  }
}

// Create instance and export for both import patterns
const spriteUtilsInstance = new SpriteUtilsClass();

// For import * as SpriteUtils pattern (ShpBuilder.js)
export const createSpriteGeometry = spriteUtilsInstance.createSpriteGeometry.bind(spriteUtilsInstance);
export const VERTICES_PER_SPRITE = spriteUtilsInstance.VERTICES_PER_SPRITE;
export const TRIANGLES_PER_SPRITE = spriteUtilsInstance.TRIANGLES_PER_SPRITE;
export const MAGIC_DEPTH_SCALE = SpriteUtilsClass.MAGIC_DEPTH_SCALE;

// For import { SpriteUtils } pattern (TypeScript files)
export const SpriteUtils = spriteUtilsInstance; 