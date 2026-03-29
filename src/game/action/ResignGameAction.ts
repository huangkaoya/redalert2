import { Action } from './Action';
import { PlayerResignedEvent } from '../event/PlayerResignedEvent';
import { ActionType } from './ActionType';
import { Game } from '../Game';
export class ResignGameAction extends Action {
    private game: Game;
    private localPlayerName: string;
    constructor(game: Game, localPlayerName: string) {
        super(ActionType.ResignGame);
        this.game = game;
        this.localPlayerName = localPlayerName;
    }
    unserialize(_data: Uint8Array): void { }
    serialize(): Uint8Array {
        return new Uint8Array();
    }
    process(): void {
        if (this.localPlayerName !== this.player.name) {
            const player = this.player;
            const redistributedAssets = this.game.redistributeAllPlayerAssets(player);
            this.game.removeAllPlayerAssets(player);
            if (player.isCombatant()) {
                player.resigned = true;
                this.game.events.dispatch(new PlayerResignedEvent(player, redistributedAssets));
            }
        }
    }
}
