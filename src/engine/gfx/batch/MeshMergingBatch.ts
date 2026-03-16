import * as THREE from 'three';
import { MergedSpriteMesh } from './MergedSpriteMesh';
export class MeshMergingBatch {
    public maxInstances: number;
    private target?: THREE.Object3D;
    private mergedGeoMesh?: MergedSpriteMesh;
    private _castShadow: boolean = false;
    private _receiveShadow: boolean = false;
    private _clippingPlanes: THREE.Plane[] = [];
    private _renderOrder: number = 0;
    constructor(maxInstances: number) {
        this.maxInstances = maxInstances;
    }
    get castShadow(): boolean {
        return this._castShadow;
    }
    set castShadow(value: boolean) {
        this._castShadow = value;
        if (this.mergedGeoMesh) {
            this.mergedGeoMesh.castShadow = value;
        }
    }
    get receiveShadow(): boolean {
        return this._receiveShadow;
    }
    set receiveShadow(value: boolean) {
        this._receiveShadow = value;
        if (this.mergedGeoMesh) {
            this.mergedGeoMesh.receiveShadow = value;
        }
    }
    get clippingPlanes(): THREE.Plane[] {
        return this._clippingPlanes;
    }
    set clippingPlanes(value: THREE.Plane[]) {
        this._clippingPlanes = value;
        if (this.mergedGeoMesh) {
            (this.mergedGeoMesh.material as any).clippingPlanes = value;
        }
    }
    get renderOrder(): number {
        return this._renderOrder;
    }
    set renderOrder(value: number) {
        this._renderOrder = value;
        if (this.mergedGeoMesh) {
            this.mergedGeoMesh.renderOrder = value;
        }
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    create3DObject(): void {
        if (!this.target) {
            const object3D = new THREE.Object3D();
            object3D.matrixAutoUpdate = false;
            this.target = object3D;
            if (this.mergedGeoMesh) {
                object3D.add(this.mergedGeoMesh);
            }
        }
    }
    setMeshes(meshes: any[]): void {
        if (meshes.length > this.maxInstances) {
            throw new RangeError('Meshes array exceeds max number of instances');
        }
        if (meshes.length > 0) {
            if (!this.mergedGeoMesh) {
                this.mergedGeoMesh = new MergedSpriteMesh(meshes[0].geometry, meshes[0].material, this.maxInstances);
                this.mergedGeoMesh.castShadow = this._castShadow;
                this.mergedGeoMesh.receiveShadow = this._receiveShadow;
                this.mergedGeoMesh.renderOrder = this._renderOrder;
                (this.mergedGeoMesh.material as any).clippingPlanes = this._clippingPlanes;
                if (this.target) {
                    this.target.add(this.mergedGeoMesh);
                }
            }
            this.mergedGeoMesh.updateFromMeshes(meshes);
        }
        else {
            if (this.mergedGeoMesh) {
                if (this.target) {
                    this.target.remove(this.mergedGeoMesh);
                }
                this.mergedGeoMesh.dispose();
                this.mergedGeoMesh = undefined;
            }
        }
    }
    update(): void {
    }
    dispose(): void {
        if (this.mergedGeoMesh) {
            this.mergedGeoMesh.dispose();
        }
    }
}
