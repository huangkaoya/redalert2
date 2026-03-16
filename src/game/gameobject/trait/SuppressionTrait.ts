import { NotifyTick } from './interface/NotifyTick';
export class SuppressionTrait {
    private suppressionTicks: number = 0;
    private enabled: boolean = true;
    disable(): void {
        this.enabled = false;
    }
    isSuppressed(): boolean {
        return this.enabled && this.suppressionTicks > 0;
    }
    suppress(): void {
        if (this.enabled) {
            this.suppressionTicks = 30;
        }
    }
    [NotifyTick.onTick](): void {
        if (this.suppressionTicks > 0) {
            this.suppressionTicks--;
        }
    }
}
