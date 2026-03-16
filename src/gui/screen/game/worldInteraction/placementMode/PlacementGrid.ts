import * as THREE from 'three';
import { Coords } from '@/game/Coords';
import { rampHeights } from '@/game/theater/rampHeights';
import { OverlayUtils } from '@/engine/gfx/OverlayUtils';
import { pointEquals } from '@/util/geometry';
import { SpriteUtils } from '@/engine/gfx/SpriteUtils';
import { IsoCoords } from '@/engine/IsoCoords';
export class PlacementGrid {
    private target?: THREE.Object3D;
    private tilesObject?: THREE.Object3D;
    private rangeObject?: THREE.Line;
    private readonly tileOverlays = new Map<number, THREE.Mesh>();
    private textureCache?: THREE.Texture;
    private lastRangeCircle?: any;
    constructor(private readonly viewModel: any, private readonly camera: any, private readonly mapTiles: any) { }
    get3DObject(): THREE.Object3D | undefined {
        return this.target;
    }
    create3DObject(): void {
        const object = new THREE.Object3D();
        object.name = 'placement_grid';
        this.target = object;
        this.createTileOverlays();
    }
    update(): void {
        this.refreshRangeCircle();
        if (this.viewModel.visible || !this.tilesObject) {
            const tilesContainer = new THREE.Object3D();
            tilesContainer.visible = true;
            for (const tile of this.viewModel.tiles) {
                const mapTile = this.mapTiles.getByMapCoords(tile.rx, tile.ry);
                if (!mapTile) {
                    throw new Error(`Map tile not found for coords (${tile.rx}, ${tile.ry})`);
                }
                const overlay = this.tileOverlays.get(mapTile.rampType);
                if (!overlay) {
                    throw new Error(`Missing overlay mesh for rampType ${mapTile.rampType}`);
                }
                const mesh = overlay.clone();
                const material = (overlay.material as THREE.MeshBasicMaterial).clone();
                material.color.set(tile.buildable ? (this.viewModel.showBusy ? 0xffff00 : 0x00ff00) : 0xff0000);
                mesh.material = material;
                mesh.position.copy(this.getTilePosition(mapTile));
                tilesContainer.add(mesh);
            }
            const container = this.get3DObject();
            if (!container) {
                throw new Error('Placement grid 3D object was not created');
            }
            this.disposeTilesObject();
            this.tilesObject = tilesContainer;
            container.add(tilesContainer);
        }
        else {
            this.tilesObject.visible = false;
        }
    }
    private refreshRangeCircle(): void {
        if (!(this.viewModel.visible || !this.rangeObject)) {
            if (this.rangeObject) {
                this.rangeObject.visible = false;
            }
            return;
        }
        if (this.rangeObject) {
            this.rangeObject.visible = true;
        }
        const container = this.get3DObject();
        if (!container) {
            throw new Error('Placement grid 3D object was not created');
        }
        const rangeIndicator = this.viewModel.rangeIndicator;
        if (!rangeIndicator) {
            this.disposeRangeObject(container);
            this.lastRangeCircle = undefined;
            return;
        }
        if (!this.lastRangeCircle || rangeIndicator.radius !== this.lastRangeCircle.radius) {
            const rangeObject = OverlayUtils.createGroundCircle(rangeIndicator.radius * Coords.getWorldTileSize(), this.viewModel.rangeIndicatorColor);
            this.disposeRangeObject(container);
            container.add(rangeObject);
            this.rangeObject = rangeObject;
        }
        if (!this.lastRangeCircle || !pointEquals(rangeIndicator.center, this.lastRangeCircle.center)) {
            const tileX = Math.floor(rangeIndicator.center.x);
            const tileY = Math.floor(rangeIndicator.center.y);
            const mapTile = this.mapTiles.getByMapCoords(tileX, tileY);
            if (!mapTile) {
                console.warn(`[PlacementGrid] Map tile not found for coords (${tileX}, ${tileY})`);
                return;
            }
            const position = this.getTilePosition(mapTile);
            position.x += (rangeIndicator.center.x % 1) * Coords.getWorldTileSize();
            position.z += (rangeIndicator.center.y % 1) * Coords.getWorldTileSize();
            this.rangeObject?.position.copy(position);
        }
        this.lastRangeCircle = rangeIndicator;
    }
    private createTileOverlays(): void {
        for (let rampType = 0; rampType < rampHeights.length; rampType++) {
            this.tileOverlays.set(rampType, this.createTileOverlay(rampType));
        }
    }
    private createTileOverlay(rampType: number): THREE.Mesh {
        const screenTileSize = IsoCoords.getScreenTileSize();
        const geometry = SpriteUtils.createSpriteGeometry({
            texture: this.getTileOverlayTexture(),
            textureArea: {
                x: 0,
                y: 2 * rampType * screenTileSize.height,
                width: screenTileSize.width,
                height: 2 * screenTileSize.height,
            },
            align: { x: 0, y: -1 },
            camera: this.camera,
            scale: Coords.ISO_WORLD_SCALE,
        });
        geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, Coords.tileHeightToWorld(1), 0));
        const material = new THREE.MeshBasicMaterial({
            map: this.getTileOverlayTexture(),
            alphaTest: 0.5,
            transparent: true,
            opacity: 0.7,
            depthTest: false,
            depthWrite: false,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.renderOrder = 1000000;
        mesh.frustumCulled = false;
        return mesh;
    }
    private getTilePosition(tile: any): any {
        return Coords.tile3dToWorld(tile.rx, tile.ry, tile.z);
    }
    private getTileOverlayTexture(): THREE.Texture {
        let texture = this.textureCache;
        if (texture) {
            return texture;
        }
        const screenTileSize = IsoCoords.getScreenTileSize();
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error("Couldn't acquire canvas 2d context");
        }
        canvas.width = THREE.MathUtils.ceilPowerOfTwo(screenTileSize.width);
        canvas.height = THREE.MathUtils.ceilPowerOfTwo(2 * screenTileSize.height * rampHeights.length);
        const tileOrigin = IsoCoords.tileToScreen(0, 0);
        tileOrigin.x += -screenTileSize.width / 2;
        const halfTileHeight = Coords.ISO_TILE_SIZE / 2;
        for (let rampType = 0; rampType < rampHeights.length; rampType++) {
            const heights = rampHeights[rampType];
            const corners = [
                [0, 1],
                [0, 0],
                [1, 0],
                [1, 1],
            ];
            context.beginPath();
            const first = IsoCoords.tileToScreen(corners[0][0], corners[0][1]);
            context.moveTo(-tileOrigin.x + first.x, -tileOrigin.y + first.y + (1 - heights[0]) * halfTileHeight + 2 * rampType * screenTileSize.height);
            for (let cornerIndex = 1; cornerIndex < corners.length; cornerIndex++) {
                const screen = IsoCoords.tileToScreen(corners[cornerIndex][0], corners[cornerIndex][1]);
                context.lineTo(-tileOrigin.x + screen.x, -tileOrigin.y + screen.y + (1 - heights[cornerIndex]) * halfTileHeight + 2 * rampType * screenTileSize.height);
            }
            context.closePath();
            context.lineWidth = 1;
            context.fillStyle = '#ffffff';
            context.fill();
            context.strokeStyle = '#000000';
            context.stroke();
        }
        texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        this.textureCache = texture;
        return texture;
    }
    private disposeTilesObject(): void {
        const container = this.get3DObject();
        if (this.tilesObject && container) {
            container.remove(this.tilesObject);
            this.tilesObject.traverse((object: THREE.Object3D) => {
                const mesh = object as THREE.Mesh;
                if (mesh.material && 'dispose' in mesh.material) {
                    (mesh.material as THREE.Material).dispose();
                }
            });
        }
        this.tilesObject = undefined;
    }
    private disposeRangeObject(container: THREE.Object3D): void {
        if (!this.rangeObject) {
            return;
        }
        container.remove(this.rangeObject);
        this.rangeObject.geometry.dispose();
        (this.rangeObject.material as THREE.Material).dispose();
        this.rangeObject = undefined;
    }
    dispose(): void {
        this.disposeTilesObject();
        if (this.target) {
            this.disposeRangeObject(this.target);
        }
        this.tileOverlays.forEach((overlay) => {
            overlay.geometry.dispose();
            (overlay.material as THREE.Material).dispose();
        });
        this.tileOverlays.clear();
        this.textureCache?.dispose();
        this.textureCache = undefined;
        this.lastRangeCircle = undefined;
    }
}
