import { LightingFx } from './LightingFx';
import { MapLighting } from '@/data/map/MapLighting';
import { Lighting } from '@/engine/Lighting';
export class LightingDirector {
    private lighting: Lighting;
    private renderer: {
        onFrame: {
            subscribe: (callback: (time: number) => void) => void;
            unsubscribe: (callback: (time: number) => void) => void;
        };
    };
    private gameSpeed: {
        value: number;
    };
    private effects: LightingFx[];
    private onFrame: (time: number) => void;
    constructor(lighting: Lighting, renderer: {
        onFrame: {
            subscribe: (callback: (time: number) => void) => void;
            unsubscribe: (callback: (time: number) => void) => void;
        };
    }, gameSpeed: {
        value: number;
    }) {
        this.lighting = lighting;
        this.renderer = renderer;
        this.gameSpeed = gameSpeed;
        this.effects = [];
        this.onFrame = (time: number) => {
            if (this.effects.length) {
                let needsUpdate = false;
                this.effects.slice().forEach((effect, index) => {
                    if (!effect.isRunning) {
                        effect.isRunning = true;
                        effect.startTime = time;
                        effect.mapLighting.copy(this.lighting.getBaseAmbient());
                    }
                    const result = effect.update(time, this.gameSpeed.value);
                    if (result.done) {
                        this.effects.splice(this.effects.indexOf(effect), 1);
                        if (!index) {
                            needsUpdate = true;
                        }
                    }
                    if (!index && result.updated) {
                        this.lighting.applyAmbientOverride(effect.mapLighting);
                    }
                });
                if (this.effects.length) {
                    if (needsUpdate) {
                        this.lighting.applyAmbientOverride(this.effects[0].mapLighting);
                    }
                }
                else {
                    this.lighting.applyAmbientOverride(undefined);
                }
            }
        };
    }
    init(): void {
        this.renderer.onFrame.subscribe(this.onFrame);
    }
    addEffect(effect: LightingFx): void {
        this.effects.push(effect);
        this.effects.sort((a, b) => b.priority - a.priority);
    }
    dispose(): void {
        this.renderer.onFrame.unsubscribe(this.onFrame);
    }
}
