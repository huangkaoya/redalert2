import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
import { Coords } from '@/game/Coords';
interface Camera {
    top: number;
    right: number;
    rotation: THREE.Euler;
}
interface Container {
    remove(item: DetectionLineFx): void;
}
const whiteColor = new THREE.Color(0xffffff);
export class DetectionLineFx {
    private camera: Camera;
    public sourcePos: THREE.Vector3;
    public targetPos: THREE.Vector3;
    public color: THREE.Color;
    private renderOrder: number;
    public needsUpdate: boolean;
    private cameraHash: string;
    private computedColor: THREE.Color;
    private lineHeadMaterial: THREE.MeshBasicMaterial;
    private container?: Container;
    private wrapper?: THREE.Object3D;
    private lineMesh?: THREE.Mesh;
    private srcLineHead?: THREE.Mesh;
    private destLineHead?: THREE.Mesh;
    private lastUpdateMillis?: number;
    static lineHeadGeometry = new THREE.PlaneGeometry(3 * Coords.ISO_WORLD_SCALE, 3 * Coords.ISO_WORLD_SCALE);
    constructor(camera: Camera, sourcePos: THREE.Vector3, targetPos: THREE.Vector3, color: THREE.Color, renderOrder: number) {
        this.camera = camera;
        this.sourcePos = sourcePos;
        this.targetPos = targetPos;
        this.color = color;
        this.renderOrder = renderOrder;
        this.needsUpdate = false;
        this.cameraHash = this.camera.top + "_" + this.camera.right;
        this.computedColor = color.clone();
        this.lineHeadMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
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
            this.wrapper.name = "fx_detectionline";
            this.lineMesh = this.createLineMesh();
            this.srcLineHead = this.createLineHead();
            this.destLineHead = this.createLineHead();
            this.wrapper.add(this.srcLineHead);
            this.wrapper.add(this.destLineHead);
            this.wrapper.add(this.lineMesh);
            this.needsUpdate = true;
        }
    }
    update(timeMillis: number): void {
        if (!this.lastUpdateMillis) {
            this.lastUpdateMillis = timeMillis;
        }
        const deltaTime = (timeMillis - this.lastUpdateMillis) / (1000 / 120);
        this.lastUpdateMillis = timeMillis;
        const currentCameraHash = this.camera.top + "_" + this.camera.right;
        if (currentCameraHash !== this.cameraHash) {
            this.cameraHash = currentCameraHash;
            (this.lineMesh!.material as MeshLineMaterial).uniforms.resolution.value.copy(this.computeResolution(this.camera));
        }
        const material = this.lineMesh!.material as MeshLineMaterial;
        if (this.needsUpdate) {
            this.needsUpdate = false;
            this.lineMesh!.geometry.dispose();
            this.lineMesh!.geometry = this.createLineGeometry(this.sourcePos, this.targetPos);
            const distance = this.sourcePos.distanceTo(this.targetPos);
            material.uniforms.dashArray.value = this.computeDashArray(distance);
            this.srcLineHead!.position.copy(this.sourcePos);
            this.destLineHead!.position.copy(this.targetPos);
        }
        material.uniforms.dashOffset.value -= (material.uniforms.dashArray.value / 50) * deltaTime;
        const pulseValue = Math.sin(((timeMillis % 1000) / 1000) * Math.PI);
        const currentColor = this.computedColor.copy(this.color).lerp(whiteColor, pulseValue);
        material.uniforms.color.value = currentColor.clone();
        this.lineHeadMaterial.color.set(currentColor);
    }
    private createLineMesh(): THREE.Mesh {
        const sourcePos = this.sourcePos.clone();
        const targetPos = this.targetPos.clone();
        const mesh = new THREE.Mesh(this.createLineGeometry(sourcePos, targetPos), this.createLineMaterial(this.color.clone(), sourcePos.distanceTo(targetPos)));
        mesh.renderOrder = this.renderOrder;
        return mesh;
    }
    private createLineGeometry(sourcePos: THREE.Vector3, targetPos: THREE.Vector3): THREE.BufferGeometry {
        const points = [
            sourcePos.x, sourcePos.y, sourcePos.z,
            targetPos.x, targetPos.y, targetPos.z,
        ];
        const meshLine = new MeshLine();
        meshLine.setPoints(points);
        return meshLine.geometry;
    }
    private createLineMaterial(color: THREE.Color, distance: number): MeshLineMaterial {
        return new MeshLineMaterial({
            color: color,
            lineWidth: 1,
            resolution: this.computeResolution(this.camera),
            transparent: true,
            sizeAttenuation: 0,
            dashArray: this.computeDashArray(distance),
            depthTest: false,
        });
    }
    private createLineHead(): THREE.Mesh {
        const mesh = new THREE.Mesh(DetectionLineFx.lineHeadGeometry, this.lineHeadMaterial);
        const quaternion = new THREE.Quaternion().setFromEuler(this.camera.rotation);
        mesh.setRotationFromQuaternion(quaternion);
        mesh.renderOrder = this.renderOrder;
        return mesh;
    }
    private computeDashArray(distance: number): number {
        return Math.min(1, 5 / distance) * Coords.ISO_WORLD_SCALE;
    }
    private computeResolution(camera: Camera): THREE.Vector2 {
        const top = camera.top;
        const aspectRatio = camera.right / camera.top;
        const height = (2 * top) / Math.cos(camera.rotation.y);
        return new THREE.Vector2(height * aspectRatio, height).multiplyScalar((top * Math.cos(this.camera.rotation.x)) / Coords.ISO_WORLD_SCALE);
    }
    remove(): void {
        this.container?.remove(this);
    }
    dispose(): void {
        if (this.wrapper) {
            this.lineMesh!.geometry.dispose();
            (this.lineMesh!.material as MeshLineMaterial).dispose();
            this.lineHeadMaterial.dispose();
        }
    }
}
