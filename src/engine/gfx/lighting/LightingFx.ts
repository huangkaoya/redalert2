import { MapLighting } from '@/data/map/MapLighting';
export enum LightingFxPriority {
    Normal = 0,
    High = 1
}
export class LightingFx {
    priority: LightingFxPriority;
    mapLighting: MapLighting;
    isRunning: boolean;
    startTime?: number;
    constructor() {
        this.priority = LightingFxPriority.Normal;
        this.mapLighting = new MapLighting();
        this.isRunning = false;
    }
    update(time: number, gameSpeed: number): {
        done: boolean;
        updated?: boolean;
    } {
        return { done: true };
    }
}
