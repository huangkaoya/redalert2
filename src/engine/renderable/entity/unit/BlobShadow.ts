import { Coords } from "@/game/Coords";
import { ZoneType } from "@/game/gameobject/unit/ZoneType";
import { StanceType } from "@/game/gameobject/infantry/StanceType";
import { BatchedMesh } from "@/engine/gfx/batch/BatchedMesh";
import * as THREE from "three";
export class BlobShadow {
    private static geometries = new Map<number, THREE.BufferGeometry>();
    private static mat = new THREE.MeshBasicMaterial({
        color: 0,
        transparent: true,
        opacity: 0.5,
        alphaTest: 0,
    });
    private obj?: THREE.Mesh | BatchedMesh;
    private lastTileZ?: number;
    private lastTileElevation?: number;
    private lastBridgeBelow?: boolean;
    constructor(private gameObject: any, private radius: number, private useMeshInstancing: boolean) { }
    get3DObject(): THREE.Mesh | BatchedMesh | undefined {
        return this.obj;
    }
    create3DObject(): void {
        if (!this.obj) {
            let geometry = BlobShadow.geometries.get(this.radius);
            if (!geometry) {
                geometry = new THREE.CircleGeometry(this.radius * Coords.ISO_WORLD_SCALE);
                BlobShadow.geometries.set(this.radius, geometry);
            }
            this.obj = new (this.useMeshInstancing ? BatchedMesh : THREE.Mesh)(geometry, BlobShadow.mat);
            this.obj.rotation.x = -Math.PI / 2;
            this.obj.matrixAutoUpdate = false;
        }
    }
    update(_: any, __: any): void {
        const obj = this.obj;
        if (!obj)
            return;
        let isVisible = this.gameObject.zone === ZoneType.Air ||
            (this.gameObject.isInfantry() &&
                this.gameObject.stance === StanceType.Paradrop);
        obj.visible = isVisible;
        if (isVisible) {
            const tileZ = this.gameObject.tile.z;
            const tileElevation = this.gameObject.tileElevation;
            const isOnBridge = !!this.gameObject.tile.onBridgeLandType;
            if (tileZ !== this.lastTileZ ||
                tileElevation !== this.lastTileElevation ||
                isOnBridge !== this.lastBridgeBelow) {
                this.lastTileZ = tileZ;
                this.lastTileElevation = tileElevation;
                this.lastBridgeBelow = isOnBridge;
                const bridgeBelow = this.gameObject.position.getBridgeBelow();
                obj.position.y =
                    Coords.tileHeightToWorld(-tileElevation) +
                        (bridgeBelow
                            ? Coords.tileHeightToWorld(bridgeBelow.tileElevation) +
                                0.01 * Coords.ISO_WORLD_SCALE
                            : 0);
                obj.updateMatrix();
            }
        }
    }
    dispose(): void { }
}
