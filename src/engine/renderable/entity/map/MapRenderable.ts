import { MapTileLayer } from "@/engine/renderable/entity/map/MapTileLayer";
import { MapTileLayerDebug } from "@/engine/renderable/entity/map/MapTileLayerDebug";
import { MapSurface } from "@/engine/renderable/entity/map/MapSurface";
import { MapBounds } from "@/engine/renderable/entity/map/MapBounds";
import { MapShroudLayer } from "@/engine/renderable/entity/map/MapShroudLayer";
import { ShpAggregator } from "@/engine/renderable/builder/ShpAggregator";
import { MapSpriteBatchLayer } from "@/engine/renderable/entity/map/MapSpriteBatchLayer";
import { BridgeOverlayTypes } from "@/game/map/BridgeOverlayTypes";
import * as THREE from "three";
export class MapRenderable {
    private gameObj: any;
    private mapShroud: any;
    private mapRadiation: any;
    private lighting: any;
    private theater: any;
    private rules: any;
    private art: any;
    private imageFinder: any;
    private camera: any;
    private debugWireframe: any;
    private gameSpeed: any;
    private worldSound: any;
    private useSpriteBatching: boolean;
    private lastDebugValue: boolean = false;
    private invalidatedRadTiles: Set<any> = new Set();
    private radTileLights: Map<any, any> = new Map();
    private _objects: any[] = [];
    private target: any;
    private tileLayer: any;
    private debugLayer: any;
    private mapSurface: any;
    private mapBounds: any;
    private shroudLayer: any;
    public terrainLayer: any;
    public overlayLayer: any;
    public smudgeLayer: any;
    private handleRadChange = (tiles: any) => {
        for (const tile of tiles) {
            this.invalidatedRadTiles.add(tile);
        }
    };
    constructor(gameObj: any, mapShroud: any, mapRadiation: any, lighting: any, theater: any, rules: any, art: any, imageFinder: any, camera: any, debugWireframe: any, gameSpeed: any, worldSound: any, useSpriteBatching: boolean) {
        this.gameObj = gameObj;
        this.mapShroud = mapShroud;
        this.mapRadiation = mapRadiation;
        this.lighting = lighting;
        this.theater = theater;
        this.rules = rules;
        this.art = art;
        this.imageFinder = imageFinder;
        this.camera = camera;
        this.debugWireframe = debugWireframe;
        this.gameSpeed = gameSpeed;
        this.worldSound = worldSound;
        this.useSpriteBatching = useSpriteBatching;
        this.init();
    }
    get3DObject() {
        return this.target;
    }
    getGameObject() {
        return this.gameObj;
    }
    init() {
        const gameObject = this.getGameObject();
        this.tileLayer = new MapTileLayer(gameObject, this.theater, this.art, this.imageFinder, this.camera, this.debugWireframe, this.gameSpeed, this.worldSound, this.lighting, this.useSpriteBatching);
        this.addObject(this.tileLayer);
        this.debugLayer = new MapTileLayerDebug(gameObject, this.theater, this.camera);
        this.debugLayer.setVisible(false);
        this.addObject(this.debugLayer);
        this.mapSurface = new MapSurface(gameObject, this.theater);
        this.addObject(this.mapSurface);
        this.mapBounds = new MapBounds(gameObject);
        this.mapBounds.setVisible(false);
        if (this.mapShroud) {
            this.shroudLayer = new MapShroudLayer(this.mapShroud, this.imageFinder, this.camera);
            this.addObject(this.shroudLayer);
        }
        this.addObject(this.mapBounds);
        const shpAggregator = new ShpAggregator();
        this.terrainLayer = new MapSpriteBatchLayer("map_terrain_layer", [...this.rules.terrainRules.values()].filter((rule: any) => !rule.isAnimated && this.art.hasObject(rule.name, rule.type)), () => false, this.theater, this.art, this.imageFinder, this.camera, this.lighting, shpAggregator);
        this.addObject(this.terrainLayer);
        this.overlayLayer = new MapSpriteBatchLayer("map_overlay_layer", [...this.rules.overlayRules.values()].filter((rule: any) => this.art.hasObject(rule.name, rule.type) &&
            !BridgeOverlayTypes.isBridge(this.rules.getOverlayId(rule.name))), (rule: any) => rule.rules.wall, this.theater, this.art, this.imageFinder, this.camera, this.lighting, shpAggregator);
        this.overlayLayer.meshRenderOrder = -1;
        this.overlayLayer.meshNoDepth = true;
        this.addObject(this.overlayLayer);
        this.smudgeLayer = new MapSpriteBatchLayer("map_smudge_layer", [...this.rules.smudgeRules.values()].filter((rule: any) => this.art.hasObject(rule.name, rule.type)), () => false, this.theater, this.art, this.imageFinder, this.camera, this.lighting, shpAggregator);
        this.smudgeLayer.meshRenderOrder = -1;
        this.smudgeLayer.meshNoDepth = true;
        this.addObject(this.smudgeLayer);
        this.mapRadiation.onChange.subscribe(this.handleRadChange);
    }
    setShroud(shroud: any) {
        if (shroud !== this.mapShroud) {
            if (!shroud && this.shroudLayer) {
                this.removeObject(this.shroudLayer);
                this.shroudLayer.dispose();
                this.shroudLayer = undefined;
            }
            this.mapShroud = shroud;
            if (this.mapShroud) {
                if (this.shroudLayer) {
                    this.shroudLayer.setShroud(this.mapShroud);
                }
                else {
                    this.shroudLayer = new MapShroudLayer(this.mapShroud, this.imageFinder, this.camera);
                    this.addObject(this.shroudLayer);
                }
            }
        }
    }
    addObject(obj: any) {
        this._objects.push(obj);
        if (this.target) {
            obj.create3DObject();
            this.target.add(obj.get3DObject());
        }
    }
    removeObject(obj: any) {
        const index = this._objects.indexOf(obj);
        if (index !== -1) {
            this._objects.splice(index, 1);
            if (this.target && obj.get3DObject()) {
                this.target.remove(obj.get3DObject());
            }
        }
    }
    create3DObject() {
        let target = this.get3DObject();
        if (!target) {
            target = new (THREE as any).Object3D();
            target.name = "map";
            target.matrixAutoUpdate = false;
            this.target = target;
            for (let i = 0, length = this._objects.length; i < length; ++i) {
                this._objects[i].create3DObject();
                target.add(this._objects[i].get3DObject());
            }
        }
    }
    update(deltaTime: number, ...args: any[]) {
        const gameTime = args[0];
        this.create3DObject();
        if (this.debugWireframe.value !== this.lastDebugValue) {
            this.lastDebugValue = this.debugWireframe.value;
            this.debugLayer.setVisible(this.debugWireframe.value);
            this.mapBounds.setVisible(this.debugWireframe.value);
        }
        this._objects.forEach((obj: any) => obj.update(deltaTime, gameTime));
        if (this.invalidatedRadTiles.size) {
            for (const tile of this.invalidatedRadTiles) {
                const radLevel = this.mapRadiation.getRadLevel(tile);
                if (radLevel) {
                    const intensity = Math.min(1, radLevel / this.rules.radiation.radLevelMax);
                    if (this.radTileLights.has(tile)) {
                        this.lighting.removeTileLight(tile, this.radTileLights.get(tile));
                    }
                    const radColor = this.rules.radiation.radColor;
                    const lightData = {
                        intensity: this.rules.radiation.radLightFactor * intensity,
                        red: (radColor[0] / 255) * intensity,
                        green: (radColor[1] / 255) * intensity,
                        blue: (radColor[2] / 255) * intensity,
                    };
                    this.lighting.addTileLight(tile, lightData);
                    this.radTileLights.set(tile, lightData);
                }
                else {
                    this.lighting.removeTileLight(tile, this.radTileLights.get(tile));
                    this.radTileLights.delete(tile);
                }
            }
            this.lighting.forceUpdate([...this.invalidatedRadTiles]);
            this.invalidatedRadTiles.clear();
        }
    }
    updateLighting(lightingData: any) {
        this.tileLayer.updateLighting(lightingData);
        this.terrainLayer.updateLighting();
        this.overlayLayer.updateLighting();
        this.smudgeLayer.updateLighting();
    }
    dispose() {
        this.mapRadiation.onChange.unsubscribe(this.handleRadChange);
        this.tileLayer.dispose();
        this.debugLayer.dispose();
        this.terrainLayer.dispose();
        this.overlayLayer.dispose();
        this.smudgeLayer.dispose();
        this.shroudLayer?.dispose();
        this.mapBounds.dispose();
        this.mapSurface.dispose();
    }
}
