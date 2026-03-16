import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class SetAmbientLightExecutor extends TriggerExecutor {
    execute(context: any): void {
        const intensity = Number(this.action.params[1]) / 100;
        context.mapLightingTrait.setTargetAmbientIntensity(intensity);
    }
}
