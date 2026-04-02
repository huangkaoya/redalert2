import { UiObject } from "../../../UiObject";
import { SpriteUtils } from "../../../../engine/gfx/SpriteUtils";
import * as geometry from "../../../../util/geometry";
import { MinimapRenderer } from "../../../../engine/renderable/entity/map/MinimapRenderer";
import { MapTileIntersectHelper } from "../../../../engine/util/MapTileIntersectHelper";
import { IsoCoords } from "../../../../engine/IsoCoords";
import { CompositeDisposable } from "../../../../util/disposable/CompositeDisposable";
import { EventDispatcher } from "../../../../util/event";
import { EventType } from "../../../../game/event/EventType";
import { MinimapPing, RadarRules as MinimapPingRadarRules } from "./MinimapPing";
import { RadarEventType } from "../../../../game/rules/general/RadarRules";
import { MinimapModel } from "../../../../engine/renderable/entity/map/MinimapModel";
import { GameSpeed } from "../../../../game/GameSpeed";
import * as THREE from "three";
interface Size {
    width: number;
    height: number;
}
interface Position {
    x: number;
    y: number;
}
interface Rect extends Position, Size {
}
interface PingColorConfig {
    high: number;
    low: number;
}
interface MinimapPingData {
    obj: MinimapPing;
    startTime: number | undefined;
    duration: number;
}
interface RenderResult {
    mesh: THREE.Mesh;
    texture: THREE.Texture;
    wrapperObj: THREE.Object3D;
    canvasLayoutSize: Size;
}
interface TileUpdateEvent {
    tiles: any[];
}
interface ShroudUpdateEvent {
    type: string;
    coords?: any[];
}
interface ObjectChangeEvent {
    target: any;
}
interface RadarEvent {
    target: any;
    tile: any;
    radarEventType: RadarEventType;
}
interface PointerEvent {
    button: number;
    isTouch: boolean;
    intersection: {
        uv: {
            x: number;
            y: number;
        };
    };
}
interface ExtendedRadarRules extends MinimapPingRadarRules {
    getEventVisibilityDuration(eventType: RadarEventType): number;
}
const PING_COLORS = new Map<RadarEventType, PingColorConfig>([
    [
        RadarEventType.EnemyObjectSensed,
        { high: 16776960, low: 8684544 },
    ],
    [RadarEventType.GenericNonCombat, { high: 65535, low: 33924 }],
]);
export class Minimap extends UiObject {
    private game: any;
    private localPlayer: any;
    private borderColor: number;
    private radarRules: ExtendedRadarRules;
    private disposables: CompositeDisposable;
    private tilesForRecalc: Set<any>;
    private tilesForRedraw: Set<any>;
    private needsFullRedraw: boolean;
    private pings: MinimapPingData[];
    private _onClick: EventDispatcher<any>;
    private _onRightClick: EventDispatcher<any>;
    private _onMouseOver: EventDispatcher<any>;
    private _onMouseMove: EventDispatcher<any>;
    private _onMouseOut: EventDispatcher<any>;
    private shroud: any;
    private minimapModel: MinimapModel;
    private fitSize?: Size;
    private mesh?: THREE.Mesh;
    private texture?: THREE.Texture;
    private wrapperObj?: THREE.Object3D;
    private size?: Size;
    private worldScene?: any;
    private mapTileIntersectHelper?: MapTileIntersectHelper;
    private minimapRenderer?: MinimapRenderer;
    private lastCanvasUpdate?: number;
    private lastPan?: Position;
    private lastViewport?: Rect;
    private viewportOutline?: THREE.Line;
    private queuedHoverUv?: {
        x: number;
        y: number;
    };
    private handleTileUpdate: (event: TileUpdateEvent) => void;
    private handleShroudUpdate: (event: ShroudUpdateEvent, helper: any) => void;
    private handleObjectChange: (event: ObjectChangeEvent) => void;
    private handleRadarEvent: (event: RadarEvent) => void;
    get onClick() {
        return this._onClick.asEvent();
    }
    get onRightClick() {
        return this._onRightClick.asEvent();
    }
    get onMouseOver() {
        return this._onMouseOver.asEvent();
    }
    get onMouseMove() {
        return this._onMouseMove.asEvent();
    }
    get onMouseOut() {
        return this._onMouseOut.asEvent();
    }
    constructor(game: any, localPlayer: any, borderColor: number, radarRules: ExtendedRadarRules) {
        super(new THREE.Object3D());
        this.game = game;
        this.localPlayer = localPlayer;
        this.borderColor = borderColor;
        this.radarRules = radarRules;
        this.disposables = new CompositeDisposable();
        this.tilesForRecalc = new Set();
        this.tilesForRedraw = new Set();
        this.needsFullRedraw = false;
        this.pings = [];
        this._onClick = new EventDispatcher();
        this._onRightClick = new EventDispatcher();
        this._onMouseOver = new EventDispatcher();
        this._onMouseMove = new EventDispatcher();
        this._onMouseOut = new EventDispatcher();
        this.handleTileUpdate = ({ tiles }: TileUpdateEvent) => {
            tiles.forEach((tile) => {
                this.tilesForRecalc.add(tile);
                this.tilesForRedraw.add(tile);
            });
        };
        this.handleShroudUpdate = (event: ShroudUpdateEvent, mapTileIntersectHelper: any) => {
            if (event.type === "incremental") {
                event.coords?.forEach((coord) => {
                    for (const tile of mapTileIntersectHelper.findTilesAtShroudCoords(coord, this.map.tiles)) {
                        this.tilesForRedraw.add(tile);
                    }
                });
            }
            else {
                this.needsFullRedraw = true;
            }
        };
        this.handleObjectChange = (event: ObjectChangeEvent) => {
            if (event.target.isSpawned) {
                this.map.tileOccupation
                    .calculateTilesForGameObject(event.target.tile, event.target)
                    .forEach((tile: any) => {
                    this.tilesForRecalc.add(tile);
                    this.tilesForRedraw.add(tile);
                });
            }
        };
        this.handleRadarEvent = (event: RadarEvent) => {
            if (event.target === this.localPlayer) {
                const canvasPos = this.minimapRenderer!.dxyToCanvas(event.tile.dx, event.tile.dy);
                const colorConfig = PING_COLORS.get(event.radarEventType);
                const ping = new MinimapPing(this.radarRules, colorConfig?.high ?? 16711935, colorConfig?.low ?? 8650884);
                ping.setPosition(this.wrapperObj!.position.x + canvasPos.x, this.wrapperObj!.position.y + canvasPos.y);
                this.pings.push({
                    obj: ping,
                    startTime: undefined,
                    duration: this.radarRules.getEventVisibilityDuration(event.radarEventType),
                });
            }
        };
        this.shroud = this.localPlayer &&
            game.mapShroudTrait.getPlayerShroud(this.localPlayer);
        this.minimapModel = new MinimapModel(game.map.tiles, game.map.tileOccupation, this.shroud, this.localPlayer, this.game.alliances, this.game.rules.general.paradrop);
    }
    get map() {
        return this.game.map;
    }
    setFitSize(size: Size): void {
        const oldFitSize = this.fitSize;
        this.fitSize = size;
        if (size.width !== oldFitSize?.width || size.height !== oldFitSize?.height) {
            this.forceRerender();
        }
    }
    forceRerender(): void {
        if (this.wrapperObj && this.fitSize) {
            this.get3DObject().remove(this.wrapperObj);
            this.destroyMesh();
            const { mesh, texture, wrapperObj, canvasLayoutSize } = this.renderMinimap(this.fitSize);
            this.mesh = mesh;
            this.texture = texture;
            this.wrapperObj = wrapperObj;
            this.size = canvasLayoutSize;
            this.get3DObject().add(wrapperObj);
            this.setupListeners(mesh);
            this.lastViewport = undefined;
        }
    }
    initWorld(worldScene: any): void {
        this.worldScene = worldScene;
        this.mapTileIntersectHelper = new MapTileIntersectHelper(this.map, worldScene);
    }
    changeLocalPlayer(localPlayer: any): void {
        this.localPlayer = localPlayer;
        this.shroud?.onChange.unsubscribe(this.handleShroudUpdate);
        this.shroud = this.localPlayer &&
            this.game.mapShroudTrait.getPlayerShroud(this.localPlayer);
        this.shroud?.onChange.subscribe(this.handleShroudUpdate);
        this.minimapModel = new MinimapModel(this.game.map.tiles, this.game.map.tileOccupation, this.shroud, this.localPlayer, this.game.alliances, this.game.rules.general.paradrop);
        this.forceRerender();
    }
    create3DObject(): void {
        super.create3DObject();
        if (!this.mesh) {
            const fitSize = this.fitSize;
            if (!fitSize) {
                throw new Error("setFitSize must be called before first render");
            }
            const { mesh, texture, wrapperObj, canvasLayoutSize } = this.renderMinimap(fitSize);
            this.mesh = mesh;
            this.texture = texture;
            this.wrapperObj = wrapperObj;
            this.size = canvasLayoutSize;
            this.get3DObject().add(wrapperObj);
            this.setupListeners(this.mesh);
            this.map.tileOccupation.onChange.subscribe(this.handleTileUpdate);
            this.disposables.add(() => this.map.tileOccupation.onChange.unsubscribe(this.handleTileUpdate));
            this.shroud?.onChange.subscribe(this.handleShroudUpdate);
            this.disposables.add(this.game.events.subscribe(EventType.ObjectOwnerChange, this.handleObjectChange), this.game.events.subscribe(EventType.ObjectDisguiseChange, this.handleObjectChange), this.game.events.subscribe(EventType.ObjectDestroy, (event: any) => {
                if (event.target.isBuilding()) {
                    const target = event.target;
                    if (target.rules.leaveRubble) {
                        this.map.tileOccupation
                            .calculateTilesForGameObject(target.tile, target)
                            .forEach((tile: any) => {
                            this.tilesForRecalc.add(tile);
                            this.tilesForRedraw.add(tile);
                        });
                    }
                }
            }), this.game.events.subscribe(EventType.RadarEvent, this.handleRadarEvent));
        }
    }
    renderMinimap(fitSize: Size): RenderResult {
        this.minimapRenderer = new MinimapRenderer(this.map, this.minimapModel, fitSize, `#${this.borderColor.toString(16).padStart(6, '0')}`, 2);
        this.minimapModel.computeAllColors();
        const canvas = this.minimapRenderer.renderFull();
        const canvasLayoutSize = { width: 0.5 * canvas.width, height: 0.5 * canvas.height };
        const position = this.computeMinimapPosition(fitSize, canvasLayoutSize);
        const texture = this.createTexture(canvas);
        const mesh = this.createMesh(texture, canvasLayoutSize.width, canvasLayoutSize.height);
        const wrapperObj = new THREE.Object3D();
        wrapperObj.matrixAutoUpdate = false;
        wrapperObj.position.x = position.x;
        wrapperObj.position.y = position.y;
        wrapperObj.updateMatrix();
        wrapperObj.add(mesh);
        return { mesh, texture, wrapperObj, canvasLayoutSize };
    }
    computeMinimapPosition(fitSize: Size, canvasSize: Size): Position {
        return {
            x: Math.floor((fitSize.width - canvasSize.width) / 2),
            y: Math.floor((fitSize.height - canvasSize.height) / 2),
        };
    }
    createTexture(canvas: HTMLCanvasElement): THREE.Texture {
        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.flipY = false;
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        return texture;
    }
    createMesh(texture: THREE.Texture, width: number, height: number): THREE.Mesh {
        const geometry = SpriteUtils.createRectGeometry(width, height);
        SpriteUtils.addRectUvs(geometry, { x: 0, y: 0, width, height }, { width, height });
        geometry.translate(width / 2, height / 2, 0);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.frustumCulled = false;
        return mesh;
    }
    setupListeners(mesh: THREE.Mesh): void {
        const pointerEvents = (this as any).pointerEvents;
        if (!pointerEvents) {
            throw new Error("Must call setPointerEvents before rendering");
        }
        this.disposables.add(pointerEvents.addEventListener(mesh, "click", (event: PointerEvent) => {
            const tile = this.computeIntersectionTile(event.intersection.uv);
            if (tile) {
                if (event.button === 2 || event.isTouch) {
                    this._onRightClick.dispatch(this, tile);
                }
                else if (event.button === 0) {
                    this._onClick.dispatch(this, tile);
                }
            }
        }), pointerEvents.addEventListener(mesh, "mouseover", () => this._onMouseOver.dispatch(this)), pointerEvents.addEventListener(mesh, "mousemove", (event: PointerEvent) => this.queuedHoverUv = event.intersection.uv), pointerEvents.addEventListener(mesh, "mouseout", () => this._onMouseOut.dispatch(this)));
    }
    computeIntersectionTile(uv: {
        x: number;
        y: number;
    }): any {
        return this.canvasCoordsToTile(uv.x * this.size!.width, uv.y * this.size!.height);
    }
    canvasCoordsToTile(x: number, y: number): any {
        const coords = this.minimapRenderer!.canvasToDxy(x, y);
        coords.x = Math.round(coords.x);
        coords.y = Math.round(coords.y);
        return this.map.tiles.getByDisplayCoords(coords.x, coords.y + ((coords.x % 2) - (coords.y % 2)));
    }
    update(time: number): void {
        super.update(time);
        if (!this.lastCanvasUpdate || time - this.lastCanvasUpdate >= 1000 / 30) {
            if (this.tilesForRecalc.size) {
                this.minimapModel.updateColors(Array.from(this.tilesForRecalc));
                this.tilesForRecalc.clear();
            }
            if (this.needsFullRedraw) {
                this.minimapRenderer!.renderFull();
                this.texture!.needsUpdate = true;
                this.needsFullRedraw = false;
                this.tilesForRedraw.clear();
            }
            if (this.tilesForRedraw.size) {
                this.lastCanvasUpdate = time;
                this.minimapRenderer!.renderIncremental(Array.from(this.tilesForRedraw));
                this.texture!.needsUpdate = true;
                this.tilesForRedraw.clear();
            }
            if (this.worldScene) {
                const pan = this.worldScene.cameraPan.getPan();
                const viewport = this.worldScene.viewport;
                const viewportChanged = !this.lastViewport || !geometry.rectEquals(viewport, this.lastViewport);
                if (!geometry.pointEquals(pan, this.lastPan) || viewportChanged) {
                    this.lastPan = pan;
                    this.lastViewport = viewport;
                    const centerTile = this.mapTileIntersectHelper!.getTileAtScreenPoint({
                        x: viewport.x + viewport.width / 2,
                        y: viewport.y + viewport.height / 2,
                    });
                    if (!centerTile) {
                        console.warn("Current pan intersects no map tile");
                        return;
                    }
                    const screenTileCoords = IsoCoords.screenToScreenTile(viewport.width / 2, viewport.height / 2);
                    const viewportRect = {
                        x: (centerTile as any).dx - screenTileCoords.x,
                        y: (centerTile as any).dy - screenTileCoords.y,
                        width: 2 * screenTileCoords.x,
                        height: 2 * screenTileCoords.y,
                    };
                    if (!this.viewportOutline || viewportChanged) {
                        const topLeft = this.minimapRenderer!.dxyToCanvas(viewportRect.x, viewportRect.y);
                        const bottomRight = this.minimapRenderer!.dxyToCanvas(viewportRect.x + viewportRect.width, viewportRect.y + viewportRect.height);
                        const outlineSize = {
                            width: bottomRight.x - topLeft.x,
                            height: bottomRight.y - topLeft.y,
                        };
                        if (this.viewportOutline) {
                            this.updateOutlineSize(this.viewportOutline, outlineSize.width, outlineSize.height);
                        }
                        else {
                            this.viewportOutline = this.createViewportOutline(outlineSize.width, outlineSize.height);
                            this.viewportOutline.matrixAutoUpdate = false;
                            this.wrapperObj!.add(this.viewportOutline);
                        }
                    }
                    const outlinePosition = this.minimapRenderer!.dxyToCanvas(viewportRect.x, viewportRect.y);
                    this.viewportOutline!.position.x = Math.max(2, Math.floor(outlinePosition.x));
                    this.viewportOutline!.position.y = Math.max(1, Math.floor(outlinePosition.y));
                    this.viewportOutline!.updateMatrix();
                }
            }
            if (this.queuedHoverUv) {
                const tile = this.computeIntersectionTile(this.queuedHoverUv);
                if (tile) {
                    this._onMouseMove.dispatch(this, tile);
                }
                this.queuedHoverUv = undefined;
            }
            this.pings.forEach((ping) => {
                if (ping.startTime) {
                    const elapsed = time - ping.startTime;
                    const adjustedDuration = ping.duration /
                        ((GameSpeed.BASE_TICKS_PER_SECOND / 1000) * this.game.speed.value);
                    if (elapsed > adjustedDuration) {
                        this.remove(ping.obj);
                        ping.obj.destroy();
                        this.pings.splice(this.pings.indexOf(ping), 1);
                    }
                }
                else {
                    ping.startTime = time;
                    this.add(ping.obj);
                }
            });
        }
    }
    createViewportOutline(width: number, height: number): THREE.Line {
        const geometry = new THREE.BufferGeometry();
        const vertices = new Float32Array([
            0, 0, 0,
            0, height, 0,
            width, height, 0,
            width, 0, 0,
            0, 0, 0,
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
        const material = new THREE.LineBasicMaterial({
            color: this.borderColor,
            transparent: true,
            side: THREE.DoubleSide,
        });
        return new THREE.Line(geometry, material);
    }
    updateOutlineSize(outline: THREE.Line, width: number, height: number): void {
        const geometry = outline.geometry as THREE.BufferGeometry;
        const vertices = new Float32Array([
            0, 0, 0,
            0, height, 0,
            width, height, 0,
            width, 0, 0,
            0, 0, 0,
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }
    destroy(): void {
        super.destroy();
        this.destroyMesh();
        this.shroud?.onChange.unsubscribe(this.handleShroudUpdate);
        this.disposables.dispose();
    }
    destroyMesh(): void {
        if (this.mesh) {
            this.mesh.geometry.dispose();
            if (Array.isArray(this.mesh.material)) {
                this.mesh.material.forEach(material => material.dispose());
            }
            else {
                this.mesh.material.dispose();
            }
        }
        this.texture?.dispose();
        this.destroyViewportOutline();
    }
    destroyViewportOutline(): void {
        if (this.viewportOutline) {
            this.wrapperObj?.remove(this.viewportOutline);
            this.viewportOutline.geometry.dispose();
            if (Array.isArray(this.viewportOutline.material)) {
                this.viewportOutline.material.forEach(material => material.dispose());
            }
            else {
                this.viewportOutline.material.dispose();
            }
            this.viewportOutline = undefined;
        }
    }
}
