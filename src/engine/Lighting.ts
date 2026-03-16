import { LightingType } from './type/LightingType';
import { MapLighting } from '../data/map/MapLighting';
import { EventDispatcher } from '../util/event';
import { CompositeDisposable } from '../util/disposable/CompositeDisposable';
import * as THREE from 'three';
export class Lighting {
    private baseAmbient: MapLighting;
    private tileLights: Map<string, Set<any>>;
    private disposables: CompositeDisposable;
    private _onChange: EventDispatcher;
    private ambientOverride?: MapLighting;
    constructor(parent?: Lighting) {
        this.baseAmbient = new MapLighting();
        this.tileLights = new Map();
        this.disposables = new CompositeDisposable();
        this._onChange = new EventDispatcher();
        if (parent) {
            this.baseAmbient.copy(parent.getAmbient());
            const handler = (ambient: MapLighting) => {
                this.baseAmbient.copy(ambient);
                this._onChange.dispatch(this, undefined);
            };
            parent.onChange.subscribe(handler);
            this.disposables.add(() => parent.onChange.unsubscribe(handler));
        }
    }
    get onChange() {
        return this._onChange.asEvent();
    }
    get mapLighting() {
        return this.ambientOverride ?? this.baseAmbient;
    }
    getAmbient(): MapLighting {
        return this.mapLighting;
    }
    forceUpdate(force?: any) {
        this._onChange.dispatch(this, force);
    }
    applyAmbientOverride(override: MapLighting) {
        this.ambientOverride = override;
        this._onChange.dispatch(this, undefined);
    }
    getBaseAmbient() {
        return new MapLighting().copy(this.baseAmbient);
    }
    addTileLight(tile: string, light: any) {
        if (!this.tileLights.has(tile)) {
            this.tileLights.set(tile, new Set());
        }
        this.tileLights.get(tile)!.add(light);
    }
    removeTileLight(tile: string, light: any) {
        const lights = this.tileLights.get(tile);
        if (lights) {
            lights.delete(light);
            if (!lights.size) {
                this.tileLights.delete(tile);
            }
        }
    }
    compute(type: LightingType, tile: any, height: number = 0): THREE.Vector3 {
        if (type === LightingType.None) {
            return new THREE.Vector3(1, 1, 1);
        }
        return this.computeTint(type)
            .add(this.computeTileTint(tile, type, new THREE.Vector3()))
            .multiplyScalar(this.mapLighting.ambient +
            this.mapLighting.ground +
            this.computeLevel(type, tile.z + height) +
            this.computeTileLightIntensity(tile));
    }
    computeNoAmbient(type: LightingType, tile: any, height: number = 0): number {
        return this.computeLevel(type, tile.z + height) + this.computeTileLightIntensity(tile);
    }
    computeLevel(type: LightingType, height: number): number {
        return type >= LightingType.Level ? this.mapLighting.level * (height - 1) : 0;
    }
    computeTint(type: LightingType): THREE.Vector3 {
        let red = 1, green = 1, blue = 1;
        if (type >= LightingType.Full || this.mapLighting.forceTint) {
            red = this.mapLighting.red;
            green = this.mapLighting.green;
            blue = this.mapLighting.blue;
        }
        return new THREE.Vector3(red, green, blue);
    }
    computeTileTint(tile: string, type: LightingType, result: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
        let red = 0, green = 0, blue = 0;
        if (type >= LightingType.Full) {
            const lights = this.tileLights.get(tile);
            if (lights?.size) {
                for (const light of lights) {
                    red += light.red;
                    green += light.green;
                    blue += light.blue;
                }
            }
        }
        return result.set(red, green, blue);
    }
    computeTileLightIntensity(tile: string): number {
        let intensity = 0;
        const lights = this.tileLights.get(tile);
        if (lights?.size) {
            for (const light of lights) {
                intensity += light.intensity;
            }
        }
        return intensity;
    }
    getAmbientIntensity(): number {
        return this.mapLighting.ambient + this.mapLighting.ground;
    }
    dispose() {
        this.disposables.dispose();
    }
}
