import { Coords } from '@/game/Coords';
import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
import { truncToDecimals } from '@/util/math';
export class RadBeamFx {
    private camera: THREE.Camera;
    private sourcePos: THREE.Vector3;
    private targetPos: THREE.Vector3;
    private color: THREE.Color;
    private durationSeconds: number;
    private width: number;
    private amplitude: number = 0;
    private container?: any;
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
    setContainer(container: any): void {
        this.container = container;
    }
    get3DObject(): THREE.Mesh | undefined {
        return this.lineMesh;
    }
    create3DObject(): void {
        if (!this.lineMesh) {
            this.lineMesh = this.createObject();
            this.lineMesh.name = "fx_radbeam";
        }
    }
    update(timeMillis: number): void {
        if (!this.firstUpdateMillis) {
            this.firstUpdateMillis = timeMillis;
        }
        this.timeLeft = Math.max(0, 1 - (timeMillis - this.firstUpdateMillis) / (1000 * this.durationSeconds));
        const newAmplitude = truncToDecimals((Coords.LEPTONS_PER_TILE / 6) * (1 - this.timeLeft), 1);
        if (newAmplitude !== this.amplitude) {
            this.amplitude = newAmplitude;
            this.lineMesh!.geometry.dispose();
            this.lineMesh!.geometry = this.createLineGeometry(this.sourcePos, this.targetPos, this.amplitude);
        }
        if (this.isFinished()) {
            this.container.remove(this);
            this.dispose();
        }
    }
    private createObject(): THREE.Mesh {
        const sourcePos = this.sourcePos.clone();
        const targetPos = this.targetPos.clone();
        const geometry = this.createLineGeometry(sourcePos, targetPos, this.amplitude);
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
        });
        return new THREE.Mesh(geometry, material);
    }
    private createLineGeometry(sourcePos: THREE.Vector3, targetPos: THREE.Vector3, amplitude: number): THREE.BufferGeometry {
        const points: number[] = [];
        const distance = targetPos.clone().sub(sourcePos).length() / Coords.LEPTONS_PER_TILE;
        const segments = 15 * distance;
        const tempVec = new THREE.Vector3();
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            tempVec.lerpVectors(sourcePos, targetPos, t);
            tempVec.y += amplitude * Math.sin(t * distance * (Coords.LEPTONS_PER_TILE / Math.PI));
            points.push(tempVec.x, tempVec.y, tempVec.z);
        }
        const meshLine = new MeshLine();
        meshLine.setPoints(points);
        return meshLine.geometry;
    }
    private isFinished(): boolean {
        return this.timeLeft === 0;
    }
    dispose(): void {
        if (this.lineMesh) {
            this.lineMesh.geometry.dispose();
            this.lineMesh.material.dispose();
        }
    }
}
