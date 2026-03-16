import { BattleControlApi } from './BattleControlApi';
export class ClientApi {
    public battleControl: BattleControlApi;
    constructor() {
        this.battleControl = new BattleControlApi();
    }
}
