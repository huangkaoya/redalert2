import * as THREE from 'three';
export enum BatchMode {
    Instancing = 0,
    Merging = 1
}
export class BatchedMesh extends THREE.Mesh {
    public batchMode: BatchMode;
    public isBatchedMesh: boolean = true;
    public opacity: number = 1;
    public extraLight: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    public paletteIndex: number = 0;
    public clippingPlanes: THREE.Plane[] = [];
    public clippingPlanesHash: string = "";
    constructor(geometry: THREE.BufferGeometry, material: THREE.Material, batchMode: BatchMode = BatchMode.Instancing) {
        super(geometry, material);
        this.geometry = geometry;
        this.material = material;
        this.batchMode = batchMode;
        this.castShadow = false;
        this.layers.disable(0);
        this.layers.enable(1);
    }
    getOpacity(): number {
        return this.opacity;
    }
    setOpacity(opacity: number): void {
        this.opacity = opacity;
    }
    getExtraLight(): THREE.Vector3 {
        return this.extraLight;
    }
    setExtraLight(extraLight: THREE.Vector3): void {
        this.extraLight = extraLight;
    }
    getPaletteIndex(): number {
        return this.paletteIndex;
    }
    setPaletteIndex(paletteIndex: number): void {
        this.paletteIndex = paletteIndex;
    }
    getClippingPlanes(): THREE.Plane[] {
        return this.clippingPlanes;
    }
    setClippingPlanes(clippingPlanes: THREE.Plane[]): void {
        this.clippingPlanes = clippingPlanes;
        this.updateClippingPlanesHash(clippingPlanes);
    }
    private updateClippingPlanesHash(clippingPlanes: THREE.Plane[]): void {
        this.clippingPlanesHash = clippingPlanes
            .map((plane) => [...plane.normal.toArray(), plane.constant])
            .flat()
            .join(",");
    }
    getClippingPlanesHash(): string {
        return this.clippingPlanesHash;
    }
}
