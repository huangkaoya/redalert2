import { Coords } from '@/game/Coords';
import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
interface Container {
    remove(item: LaserFx): void;
}
export class LaserFx {
    private camera: THREE.Camera;
    private sourcePos: THREE.Vector3;
    private targetPos: THREE.Vector3;
    private color: THREE.Color;
    private durationSeconds: number;
    private width: number;
    private container?: Container;
    private lineMesh?: THREE.Mesh;
    private firstUpdateMillis?: number;
    private timeLeft: number = 1;
    constructor(camera: THREE.Camera, sourcePos: THREE.Vector3, targetPos: THREE.Vector3, color: THREE.Color, durationSeconds: number, width: number) {
        this.camera = camera;
        this.sourcePos = sourcePos;
        this.targetPos = targetPos;
        this.color = color;
        this.durationSeconds = durationSeconds;
        this.width = width;
    }
    setContainer(container: Container): void {
        this.container = container;
    }
    get3DObject(): THREE.Mesh | undefined {
        return this.lineMesh;
    }
    create3DObject(): void {
        if (!this.lineMesh) {
            this.lineMesh = this.createObject();
            this.lineMesh.name = "fx_laser";
        }
    }
    update(timeMillis: number): void {
        if (!this.firstUpdateMillis) {
            this.firstUpdateMillis = timeMillis;
        }
        this.timeLeft = Math.max(0, 1 - (timeMillis - this.firstUpdateMillis) / (1000 * this.durationSeconds));
        const material = this.lineMesh!.material as MeshLineMaterial;
        material.uniforms.opacity.value = +this.timeLeft;
        if (this.isFinished()) {
            this.container!.remove(this);
            this.dispose();
        }
    }
    private createObject(): THREE.Mesh {
        const sourcePos = this.sourcePos.clone();
        const targetPos = this.targetPos.clone();
        const points = [
            sourcePos.x, sourcePos.y, sourcePos.z,
            targetPos.x, targetPos.y, targetPos.z,
        ];
        const meshLine = new MeshLine();
        meshLine.setPoints(points);
        const top = this.camera.top;
        const aspect = this.camera.right / this.camera.top;
        const height = (2 * top) / Math.cos(this.camera.rotation.y);
        const width = height * aspect;
        const material = new MeshLineMaterial({
            color: this.color.clone(),
            lineWidth: this.width,
            resolution: new THREE.Vector2(width, height).multiplyScalar((top * Math.cos(this.camera.rotation.x)) / Coords.ISO_WORLD_SCALE),
            transparent: true,
            sizeAttenuation: 0,
            blending: THREE.AdditiveBlending
        });
        return new THREE.Mesh(meshLine.geometry, material);
    }
    private isFinished(): boolean {
        return this.timeLeft === 0;
    }
    dispose(): void {
        if (this.lineMesh) {
            this.lineMesh.geometry.dispose();
            const material = this.lineMesh.material;
            if (Array.isArray(material)) {
                material.forEach((entry) => entry.dispose());
            }
            else {
                material.dispose();
            }
        }
    }
}
