import { TriggerCondition } from '../TriggerCondition';
export class AmbientLightCondition extends TriggerCondition {
    private type: string;
    private threshold: number;
    private previousAmbient?: number;
    constructor(trigger: any, owner: any, type: string) {
        super(trigger, owner);
        this.type = type;
        this.threshold = Number(trigger.params[1]) / 100;
    }
    check(context: any): boolean {
        const previousAmbient = this.previousAmbient;
        const currentAmbient = context.mapLightingTrait.getAmbient().ambient;
        this.previousAmbient = currentAmbient;
        return (previousAmbient !== undefined &&
            previousAmbient !== currentAmbient &&
            (this.type === 'above'
                ? currentAmbient >= this.threshold && previousAmbient < this.threshold
                : currentAmbient <= this.threshold && previousAmbient > this.threshold));
    }
}
