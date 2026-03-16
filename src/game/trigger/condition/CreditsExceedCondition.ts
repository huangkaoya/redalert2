import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class CreditsExceedCondition extends TriggerCondition {
    private threshold: number;
    constructor(params: any[], context: any) {
        super(params, context);
        this.threshold = Number(params[1]);
    }
    check(params: any, context: any): boolean {
        return !!this.player && this.player.credits > this.threshold;
    }
}
