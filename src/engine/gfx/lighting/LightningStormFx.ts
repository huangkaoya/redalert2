import { LightingFx } from './LightingFx';
export class LightningStormFx extends LightingFx {
    private durationGameSeconds: number;
    private ionLighting: any;
    private cloudAnims: any[];
    constructor(durationGameSeconds: number, ionLighting: any) {
        super();
        this.durationGameSeconds = durationGameSeconds;
        this.ionLighting = ionLighting;
        this.cloudAnims = [];
    }
    waitForCloudAnim(anim: any): void {
        this.cloudAnims.push(anim);
    }
    update(time: number, gameSpeed: number): {
        done: boolean;
        updated: boolean;
    } {
        let updated = false;
        let done = false;
        if (time === this.startTime) {
            this.mapLighting.copy(this.ionLighting);
            updated = true;
        }
        if (((time - this.startTime) / 1000) * gameSpeed > this.durationGameSeconds &&
            !this.cloudAnims.some(anim => !anim.isAnimFinished())) {
            done = true;
        }
        return { done, updated };
    }
}
