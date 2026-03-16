import { Coords } from "@/game/Coords";
import { rampHeights } from "@/game/theater/rampHeights";
import { SpriteUtils } from "@/engine/gfx/SpriteUtils";
import { SpeedType } from "@/game/type/SpeedType";
import { CompositeDisposable } from "@/util/disposable/CompositeDisposable";
import { BufferGeometryUtils } from "@/engine/gfx/BufferGeometryUtils";
import { IsoCoords } from "@/engine/IsoCoords";
import * as THREE from "three";
export class MapTileLayerDebug {
    private _textureTilesNo: number = 20;
    public visible: boolean = true;
    public needsLinesUpdate: boolean = false;
    private disposables: CompositeDisposable;
    private map: any;
    private theater: any;
    private camera: any;
    private target?: any;
    private tileOverlay?: any;
    private lines?: any;
    private static textureCache?: any;
    constructor(map: any, theater: any, camera: any) {
        this.disposables = new CompositeDisposable();
        this.map = map;
        this.theater = theater;
        this.camera = camera;
    }
    private handleTileOccupationChanged = () => {
        this.needsLinesUpdate = true;
    };
    get3DObject(): any {
        return this.target;
    }
    create3DObject(): void {
        let target = this.get3DObject();
        if (!target) {
            target = new (THREE as any).Object3D();
            target.name = "map_tile_layer_debug";
            target.visible = this.visible;
            target.matrixAutoUpdate = false;
            if (this.visible) {
                if (!this.tileOverlay) {
                    const overlay = this.tileOverlay = this.createTileOverlay();
                    overlay.matrixAutoUpdate = false;
                    overlay.frustumCulled = false;
                    target.add(overlay);
                }
                this.setupLines(target);
            }
            this.target = target;
        }
    }
    update(): void {
        if (this.needsLinesUpdate && this.visible) {
            this.needsLinesUpdate = false;
            this.destroyLines();
            this.setupLines(this.target);
        }
    }
    setVisible(visible: boolean): void {
        if (visible !== this.visible) {
            this.visible = visible;
            if (this.target) {
                this.target.visible = visible;
                if (this.visible) {
                    if (!this.tileOverlay) {
                        const overlay = this.tileOverlay = this.createTileOverlay();
                        overlay.matrixAutoUpdate = false;
                        this.target.add(overlay);
                    }
                    this.setupLines(this.target);
                }
                else {
                    this.destroyLines();
                }
            }
        }
    }
    private setupLines(target: any): void {
        this.lines = new (THREE as any).Object3D();
        this.lines.matrixAutoUpdate = false;
        this.lines.add(this.createConnectivityLines(SpeedType.Foot, false, 0x00ff00));
        const floatLines = this.createConnectivityLines(SpeedType.Float, false, 0x0000ff);
        floatLines.position.y = 1;
        floatLines.updateMatrix();
        this.lines.add(floatLines);
        target.add(this.lines);
        this.map.tileOccupation.onChange.subscribe(this.handleTileOccupationChanged);
    }
    private destroyLines(): void {
        if (this.lines) {
            this.target.remove(this.lines);
            this.lines = undefined;
            this.map.tileOccupation.onChange.unsubscribe(this.handleTileOccupationChanged);
        }
    }
    private createTileOverlay(): any {
        const geometries: any[] = [];
        const tiles = this.map.tiles;
        tiles.forEach((tile: any) => {
            const worldPos = Coords.tile3dToWorld(tile.rx, tile.ry, tile.z + 1);
            const tileSize = IsoCoords.getScreenTileSize();
            const geometry = SpriteUtils.createSpriteGeometry({
                texture: this.getTileTexture(),
                textureArea: {
                    x: tile.z * tileSize.width,
                    y: 2 * tile.rampType * tileSize.height,
                    width: tileSize.width,
                    height: 2 * tileSize.height,
                },
                align: { x: 0, y: -1 },
                camera: this.camera,
                scale: Coords.ISO_WORLD_SCALE,
            });
            geometry.applyMatrix4(new (THREE as any).Matrix4().makeTranslation(worldPos.x, worldPos.y, worldPos.z));
            geometries.push(geometry);
        });
        const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
        const material = new (THREE as any).MeshBasicMaterial({
            map: this.getTileTexture(),
            alphaTest: 0.5,
            transparent: true,
            opacity: 0.7,
        });
        this.disposables.add(mergedGeometry, material);
        return new (THREE as any).Mesh(mergedGeometry, material);
    }
    private getTileTexture(): any {
        let texture = MapTileLayerDebug.textureCache;
        if (!texture) {
            const tileSize = IsoCoords.getScreenTileSize();
            const tilesNo = this._textureTilesNo;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Could not acquire canvas 2d context");
            }
            canvas.width = tileSize.width * tilesNo;
            canvas.height = 2 * tileSize.height * rampHeights.length;
            const screenPos = IsoCoords.tileToScreen(0, 0);
            screenPos.x += -tileSize.width / 2;
            const halfTileSize = Coords.ISO_TILE_SIZE / 2;
            for (let a = 0; a < tilesNo; ++a) {
                for (let i = 0; i < rampHeights.length; ++i) {
                    const heights = rampHeights[i];
                    const corners = [
                        [0, 1],
                        [0, 0],
                        [1, 0],
                        [1, 1],
                    ];
                    const color = 0xff0000 - (a << 11) - (a << 7);
                    ctx.beginPath();
                    const firstCorner = IsoCoords.tileToScreen.apply(this, corners[0]);
                    ctx.moveTo(-screenPos.x + firstCorner.x + a * tileSize.width, -screenPos.y + firstCorner.y + (1 - heights[0]) * halfTileSize + 2 * i * tileSize.height);
                    for (let t = 1; t < corners.length; ++t) {
                        const corner = IsoCoords.tileToScreen.apply(this, corners[t]);
                        ctx.lineTo(-screenPos.x + corner.x + a * tileSize.width, -screenPos.y + corner.y + (1 - heights[t]) * halfTileSize + 2 * i * tileSize.height);
                    }
                    ctx.closePath();
                    ctx.lineWidth = 1;
                    ctx.fillStyle = "#" + color.toString(16);
                    ctx.fill();
                    ctx.strokeStyle = "#" + (0xffffff - color).toString(16);
                    ctx.stroke();
                }
            }
            texture = new (THREE as any).Texture(canvas);
            texture.minFilter = (THREE as any).NearestFilter;
            texture.magFilter = (THREE as any).NearestFilter;
            texture.needsUpdate = true;
            MapTileLayerDebug.textureCache = texture;
        }
        return texture;
    }
    private createConnectivityLines(speedType: any, includeT: boolean, color: number): any {
        const graph = this.map.terrain.computePassabilityGraph(speedType, includeT);
        const points: THREE.Vector3[] = [];
        const processedConnections = new Set<string>();
        graph.forEachNode((node: any) => {
            const sourceNode = node;
            node.neighbors.forEach((neighbor: any) => {
                const targetNode = neighbor;
                const connectionId = sourceNode.id + "->" + targetNode.id;
                if (!processedConnections.has(connectionId)) {
                    processedConnections.add(connectionId);
                    points.push(Coords.tile3dToWorld(sourceNode.data.tile.rx + 0.5, sourceNode.data.tile.ry + 0.5, sourceNode.data.tile.z + (sourceNode.data.onBridge?.tileElevation ?? 0)), Coords.tile3dToWorld(targetNode.data.tile.rx + 0.5, targetNode.data.tile.ry + 0.5, targetNode.data.tile.z + (targetNode.data.onBridge?.tileElevation ?? 0)));
                }
            });
        });
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new (THREE as any).LineBasicMaterial({
            color: color,
            transparent: true,
            depthTest: false,
            depthWrite: false,
        });
        const lineSegments = new (THREE as any).LineSegments(geometry, material);
        lineSegments.matrixAutoUpdate = false;
        this.disposables.add(geometry, material);
        return lineSegments;
    }
    onRemove(): void {
        if (this.lines) {
            this.destroyLines();
        }
    }
    dispose(): void {
        this.disposables.dispose();
    }
}
