import * as Coords from "@/game/Coords";
import * as IsoCoords from "@/engine/IsoCoords";
import * as THREE from "three";
interface Size {
    width: number;
    height: number;
}
export class MapGrid {
    private size: Size;
    private target: THREE.Object3D;
    constructor(size: Size) {
        this.size = size;
        this.build();
    }
    private build(): void {
        const size = this.size;
        const tileSize = Coords.Coords.getWorldTileSize();
        const topLeft = IsoCoords.IsoCoords.screenTileToWorld(0, 0);
        const bottomRight = IsoCoords.IsoCoords.screenTileToWorld(size.width, size.height);
        const bottomLeft = IsoCoords.IsoCoords.screenTileToWorld(0, size.height);
        const topRight = IsoCoords.IsoCoords.screenTileToWorld(size.width, 0);
        const width = bottomRight.x - topLeft.x;
        const height = bottomLeft.y - topRight.y;
        const geometry = new THREE.PlaneGeometry(width, height, width / tileSize, height / tileSize);
        const material = new THREE.MeshBasicMaterial({
            color: 9474192,
            wireframe: true,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.rotation.x = Math.PI / 2;
        mesh.updateMatrix();
        const container = new THREE.Object3D();
        container.matrixAutoUpdate = false;
        container.add(mesh);
        container.position.x = width / 2;
        container.position.z = height / 2;
        container.position.y = -1 * Coords.Coords.ISO_WORLD_SCALE;
        container.updateMatrix();
        this.target = container;
    }
    public get3DObject(): THREE.Object3D {
        return this.target;
    }
    public create3DObject(): void { }
    public update(): void { }
}
