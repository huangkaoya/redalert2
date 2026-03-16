import { LightingFx, LightingFxPriority } from './LightingFx';
export class NukeLightingFx extends LightingFx {
    private initialAmbient?: number;
    constructor() {
        super();
        this.priority = LightingFxPriority.High;
    }
    update(time: number, gameSpeed: number): {
        done: boolean;
        updated: boolean;
    } {
        let updated = false;
        let done = false;
        if (!this.initialAmbient) {
            this.initialAmbient = this.mapLighting.ambient;
        }
        let newAmbient: number | undefined;
        const elapsedSeconds = ((time - this.startTime!) / 1000) * gameSpeed;
        let progress: number;
        if (elapsedSeconds >= 3.3) {
            const remainingTime = elapsedSeconds - 3.3;
            progress = Math.min(1, remainingTime / 0.5);
            newAmbient = this.initialAmbient + 1.5 * (1 - progress);
            if (progress === 1) {
                done = true;
            }
        }
        else if (elapsedSeconds < 0.3) {
            progress = elapsedSeconds / 0.3;
            newAmbient = this.initialAmbient + 1.5 * progress;
        }
        if (newAmbient !== undefined && this.mapLighting.ambient !== newAmbient) {
            updated = true;
            this.mapLighting.ambient = newAmbient;
        }
        return { done, updated };
    }
}
