import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
import { Coords } from '@/game/Coords';

interface WaypointVertex {
  enabled: boolean;
  position: THREE.Vector3;
  lineHead?: boolean;
}

interface LinePath {
  color: string | number;
  bgColor: string | number;
  vertices: WaypointVertex[];
  verticesNeedUpdate: boolean;
}

interface Camera extends THREE.Camera {
  top: number;
  right: number;
  rotation: THREE.Euler;
}

export class WaypointLine {
  private linePath: LinePath;
  private camera: Camera;
  private lastColor: string | number;
  private lastBgColor: string | number;
  private lineHeadMaterial: THREE.PointsMaterial;
  private lineHeadBgMaterial: THREE.PointsMaterial;
  private wrapper?: THREE.Object3D;
  private meshLine?: MeshLine;
  private fgLineMesh?: THREE.Mesh;
  private bgLineMesh?: THREE.Mesh;
  private lineHeadMeshes?: THREE.Points[];
  private lastLineVertexCount?: number;
  private lastUpdateMillis?: number;
  private cameraHash?: string;

  constructor(linePath: LinePath, camera: Camera) {
    this.linePath = linePath;
    this.camera = camera;
    this.lastColor = this.linePath.color;
    this.lastBgColor = this.linePath.bgColor;
    
    this.lineHeadMaterial = new THREE.PointsMaterial({
      size: 6,
      sizeAttenuation: false,
      color: linePath.color,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    
    this.lineHeadBgMaterial = new THREE.PointsMaterial({
      size: 8,
      sizeAttenuation: false,
      color: linePath.bgColor,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
  }

  get3DObject(): THREE.Object3D | undefined {
    return this.wrapper;
  }

  create3DObject(): void {
    if (!this.wrapper) {
      this.wrapper = new THREE.Object3D();
      this.wrapper.name = "waypoint_line";
      
      const meshLine = this.meshLine = new MeshLine();
      const vertices = this.linePath.vertices
        .filter((vertex) => vertex.enabled)
        .map((vertex) => vertex.position);
      
      this.lastLineVertexCount = vertices.length;
      meshLine.setPoints(vertices.map((pos) => [pos.x, pos.y, pos.z]).flat());
      
      this.fgLineMesh = new THREE.Mesh(
        meshLine.geometry,
        this.createFgLineMaterial(
          new THREE.Color(this.linePath.color),
          this.computeLineLength(vertices),
        ),
      );
      this.fgLineMesh.renderOrder = 1000002;
      this.wrapper.add(this.fgLineMesh);
      
      this.bgLineMesh = new THREE.Mesh(
        meshLine.geometry,
        this.createBgLineMaterial(
          new THREE.Color(this.linePath.bgColor),
        ),
      );
      this.bgLineMesh.renderOrder = 1000001;
      this.wrapper.add(this.bgLineMesh);
      
      this.lineHeadMeshes = this.createLineHeads(
        this.linePath.vertices
          .filter((vertex) => vertex.enabled && vertex.lineHead)
          .map((vertex) => vertex.position),
      );
      this.lineHeadMeshes.forEach((mesh) => this.wrapper!.add(mesh));
    }
  }

  update(timestamp: number): void {
    this.lastUpdateMillis = this.lastUpdateMillis || timestamp;
    const deltaTime = (timestamp - this.lastUpdateMillis) / (1000 / 120);
    this.lastUpdateMillis = timestamp;
    
    const cameraHash = this.camera.top + "_" + this.camera.right;
    if (cameraHash !== this.cameraHash) {
      this.cameraHash = cameraHash;
      [this.fgLineMesh!, this.bgLineMesh!].forEach((mesh) => {
        (mesh.material as any).uniforms.resolution.value.copy(
          this.computeResolution(this.camera),
        );
      });
    }
    
    if (this.linePath.verticesNeedUpdate) {
      this.linePath.verticesNeedUpdate = false;
      const vertices = this.linePath.vertices
        .filter((vertex) => vertex.enabled)
        .map((vertex) => vertex.position);
      
      if (this.lastLineVertexCount !== vertices.length) {
        this.lastLineVertexCount = vertices.length;
        (this.meshLine as any).attributes = undefined;
      }
      
      this.meshLine!.setPoints(
        vertices.map((pos) => [pos.x, pos.y, pos.z]).flat(),
      );
      
      const lineLength = this.computeLineLength(vertices);
      [this.fgLineMesh!].forEach((mesh) => {
        const material = mesh.material as any;
        material.uniforms.dashArray.value = this.computeDashArray(lineLength);
      });
      
      this.updateLineHeads(
        this.linePath.vertices
          .filter((vertex) => vertex.enabled && vertex.lineHead)
          .map((vertex) => vertex.position),
      );
    }
    
    if (this.linePath.color !== this.lastColor) {
      this.lastColor = this.linePath.color;
      (this.fgLineMesh!.material as any).uniforms.color.value = new THREE.Color(this.linePath.color);
      this.lineHeadMaterial.color.set(this.linePath.color);
    }
    
    if (this.linePath.bgColor !== this.lastBgColor) {
      this.lastBgColor = this.linePath.bgColor;
      (this.bgLineMesh!.material as any).uniforms.color.value = new THREE.Color(this.linePath.bgColor);
      this.lineHeadBgMaterial.color.set(this.linePath.bgColor);
    }
    
    [this.fgLineMesh!].forEach((mesh) => {
      const material = mesh.material as any;
      material.uniforms.dashOffset.value -= (material.uniforms.dashArray.value / 50) * deltaTime;
    });
  }

  private computeLineLength(vertices: THREE.Vector3[]): number {
    let length = 0;
    for (let i = 1, len = vertices.length; i < len; i++) {
      length += vertices[i].distanceTo(vertices[i - 1]);
    }
    return length;
  }

  private createFgLineMaterial(color: THREE.Color, lineLength: number): MeshLineMaterial {
    return new MeshLineMaterial({
      color: color,
      lineWidth: 2,
      resolution: this.computeResolution(this.camera),
      transparent: true,
      sizeAttenuation: 0,
      dashArray: this.computeDashArray(lineLength),
      depthTest: false,
    });
  }

  private createBgLineMaterial(color: THREE.Color): MeshLineMaterial {
    return new MeshLineMaterial({
      color: color,
      lineWidth: 4,
      resolution: this.computeResolution(this.camera),
      transparent: true,
      sizeAttenuation: 0,
      depthTest: false,
    });
  }

  private computeDashArray(lineLength: number): number {
    return Math.min(1, 5 / lineLength) * Coords.ISO_WORLD_SCALE;
  }

  private computeResolution(camera: Camera): THREE.Vector2 {
    const top = camera.top;
    const aspectRatio = camera.right / camera.top;
    const height = (2 * top) / Math.cos(camera.rotation.y);
    return new THREE.Vector2(height * aspectRatio, height).multiplyScalar(
      (top * Math.cos(this.camera.rotation.x)) / Coords.ISO_WORLD_SCALE,
    );
  }

  private createLineHeads(positions: THREE.Vector3[]): THREE.Points[] {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        new Float32Array(positions.map((pos) => [pos.x, pos.y, pos.z]).flat()),
        3,
      ),
    );
    
    const foregroundPoints = new THREE.Points(geometry, this.lineHeadMaterial);
    foregroundPoints.renderOrder = 1000004;
    
    const backgroundPoints = new THREE.Points(geometry, this.lineHeadBgMaterial);
    backgroundPoints.renderOrder = 1000003;
    
    return [foregroundPoints, backgroundPoints];
  }

  private updateLineHeads(positions: THREE.Vector3[]): void {
    const flatPositions = positions.map((pos) => [pos.x, pos.y, pos.z]).flat();
    const geometry = this.lineHeadMeshes![0].geometry;
    const positionAttribute = geometry.getAttribute("position") as THREE.BufferAttribute;
    
    if (positionAttribute.array.length !== flatPositions.length) {
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array(flatPositions), 3),
      );
    } else {
      const array = positionAttribute.array as Float32Array;
      for (let i = 0, len = array.length; i < len; i++) {
        array[i] = flatPositions[i];
      }
      positionAttribute.needsUpdate = true;
    }
  }

  dispose(): void {
    [this.fgLineMesh, this.bgLineMesh].forEach((mesh) => {
      if (mesh) {
        mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((entry) => entry.dispose());
        } else {
          material.dispose();
        }
      }
    });
    
    this.lineHeadMeshes?.forEach((mesh) => mesh.geometry.dispose());
    this.lineHeadMaterial.dispose();
    this.lineHeadBgMaterial.dispose();
  }
}
  
