import * as THREE from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';
import { Coords } from '@/game/Coords';
import { getMeshLineResolution } from '@/engine/renderable/fx/MeshLineResolution';
interface Camera extends THREE.Camera {
    top: number;
    right: number;
    rotation: THREE.Euler;
}
interface Container {
    remove(item: RallyPointFx): void;
}
export class RallyPointFx {
    private camera: Camera;
    public sourcePos: THREE.Vector3;
    public targetPos: THREE.Vector3;
    public color: THREE.Color;
    private renderOrder?: number;
    public needsUpdate: boolean = false;
    public visible: boolean = true;
    private cameraHash: string;
    private container?: Container;
    private wrapper?: THREE.Object3D;
    private lineMesh?: THREE.Mesh;
    private shadowLineMesh?: THREE.Mesh;
    private lastUpdateMillis?: number;
    constructor(camera: Camera, sourcePos: THREE.Vector3, targetPos: THREE.Vector3, color: THREE.Color, renderOrder?: number) {
        this.camera = camera;
        this.sourcePos = sourcePos;
        this.targetPos = targetPos;
        this.color = color;
        this.renderOrder = renderOrder;
        this.cameraHash = this.camera.top + "_" + this.camera.right;
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
            this.wrapper.matrixAutoUpdate = false;
            this.lineMesh = this.createLineMesh();
            this.lineMesh.name = "fx_rallypoint";
            this.lineMesh.matrixAutoUpdate = false;
            this.shadowLineMesh = this.createLineShadowMesh();
            this.shadowLineMesh.name = "fx_rallypoint_shadow";
            this.shadowLineMesh.matrixAutoUpdate = false;
            this.wrapper.add(this.lineMesh);
            this.wrapper.add(this.shadowLineMesh);
        }
    }
    update(currentTime: number): void {
        if (!this.lastUpdateMillis) {
            this.lastUpdateMillis = currentTime;
        }
        const deltaTime = (currentTime - this.lastUpdateMillis) / (1000 / 120);
        this.lastUpdateMillis = currentTime;
        if (this.wrapper) {
            this.wrapper.visible = this.visible;
        }
        const currentCameraHash = this.camera.top + "_" + this.camera.right;
        if (currentCameraHash !== this.cameraHash) {
            this.cameraHash = currentCameraHash;
            [this.lineMesh, this.shadowLineMesh].forEach((mesh) => {
                const material = mesh?.material as MeshLineMaterial | undefined;
                if (material && (material as any).isMeshLineMaterial) {
                    material.uniforms.resolution.value.copy(this.computeResolution(this.camera));
                }
            });
        }
        if (this.needsUpdate) {
            this.needsUpdate = false;
            if (this.lineMesh) {
                this.lineMesh.geometry = this.createLineGeometry(this.sourcePos, this.targetPos);
            }
            if (this.shadowLineMesh) {
                this.shadowLineMesh.geometry = this.createShadowLineGeometry(this.sourcePos, this.targetPos);
            }
            const lineMat = this.lineMesh?.material as MeshLineMaterial | undefined;
            if (lineMat && (lineMat as any).isMeshLineMaterial) {
                lineMat.uniforms.color.value = this.color.clone();
            }
            const distance = this.sourcePos.distanceTo(this.targetPos);
            [this.lineMesh, this.shadowLineMesh].forEach((mesh) => {
                const material = mesh?.material as MeshLineMaterial | undefined;
                if (material && (material as any).isMeshLineMaterial) {
                    material.uniforms.dashArray.value = this.computeDashArray(distance);
                    (material as any).depthTest = this.renderOrder === undefined;
                }
            });
            if (this.lineMesh) {
                this.lineMesh.renderOrder = this.renderOrder ?? 0;
            }
            if (this.shadowLineMesh) {
                this.shadowLineMesh.renderOrder = this.renderOrder !== undefined ? this.renderOrder - 1 : 0;
            }
        }
        [this.lineMesh, this.shadowLineMesh].forEach((mesh) => {
            const material = mesh?.material as MeshLineMaterial | undefined;
            if (material && (material as any).isMeshLineMaterial) {
                material.uniforms.dashOffset.value -=
                    (material.uniforms.dashArray.value / 50) * deltaTime;
            }
        });
    }
    private createLineMesh(): THREE.Mesh {
        const sourcePos = this.sourcePos.clone();
        const targetPos = this.targetPos.clone();
        const mesh = new THREE.Mesh(this.createLineGeometry(sourcePos, targetPos), this.createLineMaterial(this.color.clone(), sourcePos.distanceTo(targetPos)));
        if (this.renderOrder) {
            mesh.renderOrder = this.renderOrder;
        }
        return mesh;
    }
    private createLineShadowMesh(): THREE.Mesh {
        const mesh = new THREE.Mesh(this.createShadowLineGeometry(this.sourcePos, this.targetPos), this.createLineMaterial(new THREE.Color(0x000000), this.sourcePos.distanceTo(this.targetPos)));
        if (this.renderOrder) {
            mesh.renderOrder = this.renderOrder - 1;
        }
        return mesh;
    }
    private createShadowLineGeometry(sourcePos: THREE.Vector3, targetPos: THREE.Vector3): THREE.BufferGeometry {
        const offset = new THREE.Vector3(+Coords.ISO_WORLD_SCALE, 0, +Coords.ISO_WORLD_SCALE);
        return this.createLineGeometry(sourcePos.clone().add(offset), targetPos.clone().add(offset));
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
            lineWidth: 2,
            resolution: this.computeResolution(this.camera),
            transparent: true,
            sizeAttenuation: 0,
            dashArray: this.computeDashArray(distance),
            depthTest: this.renderOrder === undefined,
        });
    }
    private computeDashArray(distance: number): number {
        return Math.min(1, 5 / distance) * Coords.ISO_WORLD_SCALE;
    }
    private computeResolution(camera: Camera): THREE.Vector2 {
        return getMeshLineResolution(camera as unknown as THREE.Camera);
    }
    remove(): void {
        if (this.container) {
            this.container.remove(this);
        }
    }
    dispose(): void {
        if (this.wrapper) {
            [this.lineMesh, this.shadowLineMesh].forEach((mesh) => {
                if (mesh) {
                    if (mesh.geometry) {
                        mesh.geometry.dispose();
                    }
                    if (mesh.material instanceof THREE.Material) {
                        mesh.material.dispose();
                    }
                }
            });
        }
    }
}
