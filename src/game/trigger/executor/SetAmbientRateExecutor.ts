import { int32ToFloat32 } from '@/util/number';
import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class SetAmbientRateExecutor extends TriggerExecutor {
    execute(context: any) {
        const rate = int32ToFloat32(Number(this.action.params[1]));
        context.mapLightingTrait.setAmbientChangeRate(rate);
    }
}
