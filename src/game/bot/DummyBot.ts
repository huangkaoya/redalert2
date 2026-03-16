import { Bot } from './Bot';
import { OrderType } from '../order/OrderType';
export enum BotState {
    Initial = 0,
    Deployed = 1,
    Attacking = 2,
    Defeated = 3
}
export class DummyBot extends Bot {
    private botState: BotState = BotState.Initial;
    private tickRatio: number = 0;
    private enemyPlayers: string[] = [];
    constructor(name: string, country: string) {
        super(name, country);
    }
    onGameStart(event: any): void {
        const tickRate = event.getTickRate();
        this.tickRatio = Math.ceil(tickRate / 5);
        this.enemyPlayers = event.getPlayers().filter((player: string) => player !== this.name && !event.areAlliedPlayers(this.name, player));
    }
    onGameTick(event: any): void {
        if (event.getCurrentTick() % this.tickRatio === 0) {
            switch (this.botState) {
                case BotState.Initial: {
                    const baseUnit = event.getGeneralRules().baseUnit;
                    if (event.getVisibleUnits(this.name, "self", (unit: any) => unit.constructionYard).length) {
                        this.botState = BotState.Deployed;
                        break;
                    }
                    const units = event.getVisibleUnits(this.name, "self", (unit: any) => baseUnit.includes(unit.name));
                    if (units.length) {
                        this.actionsApi.orderUnits([units[0]], OrderType.DeploySelected);
                    }
                    break;
                }
                case BotState.Deployed:
                    break;
                case BotState.Attacking:
                    if (!event.getVisibleUnits(this.name, "self", (unit: any) => unit.isSelectableCombatant).length) {
                        this.botState = BotState.Defeated;
                        this.actionsApi.quitGame();
                    }
                    break;
            }
        }
    }
}
