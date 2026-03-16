import { TriggerCondition } from "@/game/trigger/TriggerCondition";
export class LowPowerCondition extends TriggerCondition {
    private houseId: number;
    private targetPlayer?: any;
    constructor(event: any, trigger: any) {
        super(event, trigger);
        this.houseId = Number(this.event.params[1]);
    }
    init(game: any): void {
        super.init(game);
        this.targetPlayer = game
            .getAllPlayers()
            .find((player: any) => player.country?.id === this.houseId);
    }
    check(): boolean {
        return !!this.targetPlayer?.powerTrait?.isLowPower();
    }
}
