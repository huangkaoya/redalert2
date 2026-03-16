import { TriggerCondition } from '../TriggerCondition';
export class CreditsBelowCondition extends TriggerCondition {
    private threshold: number;
    constructor(params: any[], context: any) {
        super(params, context);
        this.threshold = Number(params[1]);
    }
    check(event: any, context: any): boolean {
        return !!this.player && this.player.credits < this.threshold;
    }
}
