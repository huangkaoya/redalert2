import { TriggerExecutor } from '@/game/trigger/TriggerExecutor';
export class ResizePlayerViewExecutor extends TriggerExecutor {
    execute(context: any): void {
        const [x, y, width, height] = this.action.params.slice(2, 6).map(Number);
        context.map.mapBounds.updateRawLocalSize({
            x,
            y,
            width,
            height,
        });
    }
}
