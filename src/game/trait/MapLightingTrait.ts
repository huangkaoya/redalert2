import { MapLighting } from '@/data/map/MapLighting';
import { GameSpeed } from '@/game/GameSpeed';
import { EventDispatcher } from '@/util/event';
import { NotifyTick } from '@/game/trait/interface/NotifyTick';
export class MapLightingTrait {
    private mapLighting: MapLighting;
    private _onChange: EventDispatcher;
    private ambientChangeRate: number;
    private ambientChangeStep: number;
    private targetAmbient?: number;
    private ambientUpdateTicks?: number;
    get onChange() {
        return this._onChange.asEvent();
    }
    constructor(config: {
        ambientChangeRate: number;
        ambientChangeStep: number;
    }, initialLighting?: MapLighting) {
        this.mapLighting = new MapLighting();
        this._onChange = new EventDispatcher();
        this.ambientChangeRate = config.ambientChangeRate;
        this.ambientChangeStep = config.ambientChangeStep;
        if (initialLighting) {
            this.mapLighting.copy(initialLighting);
        }
    }
    setAmbientChangeRate(rate: number): void {
        this.ambientChangeRate = rate;
    }
    setAmbientChangeStep(step: number): void {
        this.ambientChangeStep = step;
    }
    setTargetAmbientIntensity(intensity: number): void {
        this.targetAmbient = intensity;
    }
    getAmbient(): MapLighting {
        return this.mapLighting;
    }
    [NotifyTick.onTick](): void {
        if (this.targetAmbient === undefined) {
            return;
        }
        if (this.ambientUpdateTicks === undefined) {
            this.ambientUpdateTicks = Math.floor(60 * GameSpeed.BASE_TICKS_PER_SECOND * this.ambientChangeRate);
        }
        if (this.ambientUpdateTicks <= 0) {
            this.ambientUpdateTicks = undefined;
            const currentAmbient = this.mapLighting.ambient;
            const diff = this.targetAmbient - currentAmbient;
            if (diff !== 0) {
                const step = Math.sign(diff) * Math.min(this.ambientChangeStep, Math.abs(diff));
                this.mapLighting.ambient += step;
                this._onChange.dispatch(this, this.mapLighting);
            }
            else {
                this.targetAmbient = undefined;
            }
        }
        else {
            this.ambientUpdateTicks--;
        }
    }
}
