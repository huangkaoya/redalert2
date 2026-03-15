import { ObjectArt } from '@/game/art/ObjectArt';
import { Coords } from '@/game/Coords';
import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';

interface GameSpeed {
  value?: number;
}

interface Container {
  remove(item: LineTrailFx): void;
}

export class LineTrailFx {
  private lazyTarget: () => THREE.Object3D | undefined;
  private trailColor: THREE.Color;
  private trailDecrement: number;
  private gameSpeed: GameSpeed;
  private camera: THREE.Camera;
  private trailInitialized: boolean = false;
  private container?: Container;
  private wrapper?: THREE.Object3D;
  private trailMesh?: THREE.Mesh;
  private trailMaterial?: MeshLineMaterial;
  private timeLeft?: number;
  private finishDurationSeconds?: number;
  private prevUpdateMillis?: number;
  private lastTargetPosition?: THREE.Vector3;
  private frozenTargetPosition?: THREE.Vector3;
  private trailPoints: THREE.Vector3[] = [];
  private maxPoints: number = 2;
  private cameraHash?: string;

  constructor(
    lazyTarget: () => THREE.Object3D | undefined,
    trailColor: THREE.Color,
    trailDecrement: number,
    gameSpeed: GameSpeed,
    camera: THREE.Camera
  ) {
    this.lazyTarget = lazyTarget;
    this.trailColor = trailColor;
    this.trailDecrement = trailDecrement;
    this.gameSpeed = gameSpeed;
    this.camera = camera;
  }

  setContainer(container: Container): void {
    this.container = container;
  }

  get3DObject(): THREE.Object3D | undefined {
    return this.wrapper;
  }

  create3DObject(): void {
    if (!this.wrapper) {
      this.wrapper = new THREE.Object3D();
      this.wrapper.name = "fx_linetrail";
    }
  }

  update(timeMillis: number): void {
    if (this.timeLeft !== undefined) {
      const prevTime = this.prevUpdateMillis;
      this.prevUpdateMillis = timeMillis;
      if (prevTime) {
        this.timeLeft = Math.max(0, this.timeLeft - (timeMillis - prevTime) / 1000);
      }
    }

    if (!this.trailInitialized) {
      this.trailInitialized = true;
      const trailMesh = this.createTrail(this.trailColor, this.trailDecrement);
      if (trailMesh) {
        this.trailMesh = trailMesh;
        this.wrapper?.add(trailMesh);
      } else {
        this.timeLeft = 0;
      }
    }

    if (this.trailMesh && this.trailMaterial) {
      const currentCameraHash = this.computeCameraHash();
      if (currentCameraHash !== this.cameraHash) {
        this.cameraHash = currentCameraHash;
        this.trailMaterial.resolution = this.computeResolution();
      }

      const currentTargetPosition = this.resolveTargetPosition();
      if (currentTargetPosition) {
        this.lastTargetPosition = currentTargetPosition.clone();
        this.updateTrailGeometry(currentTargetPosition);
      }

      const opacity =
        this.timeLeft === undefined || this.finishDurationSeconds === undefined
          ? 1
          : Math.max(0, this.timeLeft / this.finishDurationSeconds);
      this.trailMaterial.opacity = opacity;
    }

    if (this.isFinished()) {
      this.container?.remove(this);
      this.dispose();
    }
  }

  private createTrail(color: THREE.Color, decrement: number): THREE.Mesh | undefined {
    const targetPosition = this.resolveTargetPosition();
    if (!targetPosition) return undefined;

    this.maxPoints = Math.max(
      2,
      Math.floor(
      ((3 / this.getGameSpeedValue()) * 50) / 
      (decrement / ObjectArt.DEFAULT_LINE_TRAIL_DEC)
      )
    );
    this.trailPoints = [targetPosition.clone(), targetPosition.clone()];
    this.lastTargetPosition = targetPosition.clone();
    this.cameraHash = this.computeCameraHash();

    const meshLine = new MeshLine();
    meshLine.setPoints(this.flattenPoints(this.trailPoints));

    const material = new MeshLineMaterial({
      color: color.clone(),
      lineWidth: 0.8,
      resolution: this.computeResolution(),
      transparent: true,
      sizeAttenuation: 0,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    material.opacity = 1;
    this.trailMaterial = material;

    const mesh = new THREE.Mesh(meshLine.geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 1000000;
    return mesh;
  }

  isFinished(): boolean {
    return this.timeLeft === 0;
  }

  requestFinishAndDispose(): void {
    this.finishDurationSeconds = 0.8 / this.getGameSpeedValue();
    this.timeLeft = this.finishDurationSeconds;
  }

  stopTracking(): void {
    if (!this.frozenTargetPosition) {
      this.frozenTargetPosition =
        this.lastTargetPosition?.clone() ?? this.resolveTargetPosition()?.clone();
    }
  }

  dispose(): void {
    if (this.trailMesh) {
      this.trailMesh.geometry.dispose();
      this.trailMaterial?.dispose();
      this.wrapper?.remove(this.trailMesh);
      this.trailMesh = undefined;
    }
  }

  private resolveTargetPosition(): THREE.Vector3 | undefined {
    if (this.frozenTargetPosition) {
      return this.frozenTargetPosition.clone();
    }

    const target = this.lazyTarget();
    if (!target) {
      return undefined;
    }

    const position = new THREE.Vector3();
    target.getWorldPosition(position);
    return position;
  }

  private updateTrailGeometry(currentTargetPosition: THREE.Vector3): void {
    if (!this.trailMesh) {
      return;
    }

    const lastPoint = this.trailPoints[this.trailPoints.length - 1];
    if (!lastPoint) {
      this.trailPoints.push(currentTargetPosition.clone());
    } else if (lastPoint.distanceToSquared(currentTargetPosition) > 1) {
      this.trailPoints.push(currentTargetPosition.clone());
    } else {
      lastPoint.copy(currentTargetPosition);
    }

    while (this.trailPoints.length > this.maxPoints) {
      this.trailPoints.shift();
    }

    if (this.trailPoints.length === 1) {
      this.trailPoints.push(this.trailPoints[0].clone());
    }

    const meshLine = new MeshLine();
    meshLine.setPoints(this.flattenPoints(this.trailPoints));
    this.trailMesh.geometry.dispose();
    this.trailMesh.geometry = meshLine.geometry;
  }

  private flattenPoints(points: THREE.Vector3[]): number[] {
    return points.flatMap((point) => [point.x, point.y, point.z]);
  }

  private computeCameraHash(): string {
    const camera = this.camera as THREE.OrthographicCamera;
    return `${camera.top}_${camera.right}_${camera.rotation.x}_${camera.rotation.y}`;
  }

  private computeResolution(): THREE.Vector2 {
    const camera = this.camera as THREE.OrthographicCamera;
    const top = camera.top;
    const aspectRatio = camera.right / camera.top;
    const height = (2 * top) / Math.cos(camera.rotation.y);
    return new THREE.Vector2(height * aspectRatio, height).multiplyScalar(
      (top * Math.cos(camera.rotation.x)) / Coords.ISO_WORLD_SCALE,
    );
  }

  private getGameSpeedValue(): number {
    if (typeof this.gameSpeed?.value !== 'number') {
      throw new Error(
        `[LineTrailFx] invalid gameSpeed dependency. Expected BoxedVar<number>, got "${this.gameSpeed?.constructor?.name ?? typeof this.gameSpeed}"`,
      );
    }
    return this.gameSpeed.value;
  }
}
