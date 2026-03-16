import * as Coords from "@/game/Coords";
import * as rampHeights from "@/game/theater/rampHeights";
import * as BufferGeometryUtils from "@/engine/gfx/BufferGeometryUtils";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import * as THREE from "three";
export const MAGIC_OFFSET = 0.05;
export class MapSurface {
    private visible: boolean = true;
    private disposables: CompositeDisposable;
    private map: any;
    private theater: any;
    private target?: THREE.Object3D;
    constructor(map: any, theater: any) {
        this.disposables = new CompositeDisposable();
        this.map = map;
        this.theater = theater;
    }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    create3DObject(): void {
        let obj = this.get3DObject();
        if (!obj) {
            obj = this.createObject();
            obj.name = "map_surface_shadow";
            obj.matrixAutoUpdate = false;
            obj.visible = this.visible;
            this.target = obj;
        }
    }
    update(): void { }
    setVisible(visible: boolean): void {
        this.visible = visible;
        if (this.target) {
            this.target.visible = visible;
        }
    }
    private createObject(): THREE.Mesh {
        const geometries: THREE.BufferGeometry[] = [];
        const tiles = this.map.tiles;
        tiles.forEach((tile: any) => {
            const pos = Coords.Coords.tile3dToWorld(tile.rx, tile.ry, tile.z);
            const geometry = this.createRectGeometry(tile.rampType);
            geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(pos.x, pos.y + MAGIC_OFFSET, pos.z));
            geometries.push(geometry);
        });
        const mergedGeometry = BufferGeometryUtils.BufferGeometryUtils.mergeBufferGeometries(geometries);
        const material = new THREE.ShadowMaterial();
        material.transparent = true;
        material.opacity = 0.5;
        const mesh = new THREE.Mesh(mergedGeometry, material);
        mesh.receiveShadow = true;
        mesh.renderOrder = 5;
        mesh.frustumCulled = false;
        this.disposables.add(mergedGeometry, material);
        return mesh;
    }
    private createRectGeometry(rampType: number): THREE.BufferGeometry {
        const tileSize = Coords.Coords.getWorldTileSize();
        const heights = rampHeights.rampHeights[rampType];
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            0, Coords.Coords.tileHeightToWorld(heights[0]), tileSize,
            tileSize, Coords.Coords.tileHeightToWorld(heights[3]), tileSize,
            0, Coords.Coords.tileHeightToWorld(heights[1]), 0,
            tileSize, Coords.Coords.tileHeightToWorld(heights[2]), 0,
        ]);
        const indices = new Uint16Array([0, 1, 2, 3, 2, 1]);
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        return geometry;
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
