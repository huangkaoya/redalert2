import { Coords } from '@/game/Coords';
import * as THREE from 'three';

export class MindControlLinkFx {
  private sourcePos: THREE.Vector3;
  private targetPos: THREE.Vector3;
  private color: THREE.Color;
  private heightTiles: number;
  private colorAnimProgress: number = 0;
  private container?: any;
  private lineMesh?: THREE.Line;
  private lastUpdate?: number;

  constructor(
    sourcePos: THREE.Vector3,
    targetPos: THREE.Vector3,
    color: THREE.Color,
    heightTiles: number
  ) {
    this.sourcePos = sourcePos;
    this.targetPos = targetPos;
    this.color = color;
    this.heightTiles = heightTiles;
  }

  setContainer(container: any): void {
    this.container = container;
  }

  get3DObject(): THREE.Line | undefined {
    return this.lineMesh;
  }

  create3DObject(): void {
    if (!this.lineMesh) {
      this.lineMesh = this.createObject();
      this.lineMesh.name = "fx_mclink";
    }
  }

  updateEndpoints(sourcePos: THREE.Vector3, targetPos: THREE.Vector3): void {
    const hasChanged = !sourcePos.equals(this.sourcePos) || !targetPos.equals(this.targetPos);
    this.sourcePos = sourcePos;
    this.targetPos = targetPos;

    if (hasChanged && this.lineMesh) {
      this.lineMesh.geometry.dispose();
      this.lineMesh.geometry = this.createLineGeometry(
        this.sourcePos,
        this.targetPos,
        this.heightTiles,
        this.color,
        this.colorAnimProgress
      );
    }
  }

  update(timeMillis: number): void {
    if (!this.lastUpdate) {
      this.lastUpdate = timeMillis;
    }

    this.colorAnimProgress += (timeMillis - this.lastUpdate) / 1000;
    this.colorAnimProgress -= Math.floor(this.colorAnimProgress);
    this.lastUpdate = timeMillis;

    this.lineMesh!.geometry.dispose();
    this.lineMesh!.geometry = this.createLineGeometry(
      this.sourcePos,
      this.targetPos,
      this.heightTiles,
      this.color,
      this.colorAnimProgress
    );
  }

  private createObject(): THREE.Line {
    const geometry = this.createLineGeometry(
      this.sourcePos,
      this.targetPos,
      this.heightTiles,
      this.color,
      this.colorAnimProgress
    );

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true
    });

    const line = new THREE.Line(geometry, material);
    line.renderOrder = 1000000;
    return line;
  }

  private createLineGeometry(
    source: THREE.Vector3,
    target: THREE.Vector3,
    heightTiles: number,
    color: THREE.Color,
    animProgress: number
  ): THREE.BufferGeometry {
    const white = new THREE.Color(0xFFFFFF);
    const colorAnimPos = 1.5 * animProgress;
    const distanceTiles = target.clone().sub(source).length() / Coords.LEPTONS_PER_TILE;
    const numPoints = Math.max(2, Math.floor(15 * distanceTiles) + 1);

    const positions = new Float32Array(3 * numPoints);
    const colors = new Float32Array(3 * numPoints);
    const tempVec = new THREE.Vector3();

    for (let i = 0; i < numPoints; i++) {
      const t = numPoints === 1 ? 0 : i / (numPoints - 1);
      tempVec.lerpVectors(source, target, t);
      tempVec.y += Coords.LEPTONS_PER_TILE / 4 + 
        heightTiles * Coords.LEPTONS_PER_TILE * Math.sin(t * Math.PI);

      positions[3 * i] = tempVec.x;
      positions[3 * i + 1] = tempVec.y;
      positions[3 * i + 2] = tempVec.z;

      let pointColor = color;
      if (t < colorAnimPos && colorAnimPos - 0.5 <= t) {
        pointColor = color.clone().lerp(white, (t - (colorAnimPos - 0.5)) / 0.5);
      }

      colors[3 * i] = pointColor.r;
      colors[3 * i + 1] = pointColor.g;
      colors[3 * i + 2] = pointColor.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geometry;
  }

  removeAndDispose(): void {
    this.container?.remove(this);
    this.dispose();
  }

  dispose(): void {
    if (this.lineMesh) {
      this.lineMesh.geometry.dispose();
      this.lineMesh.material.dispose();
    }
  }
}
