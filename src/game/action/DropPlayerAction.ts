import { Action } from './Action';
import { ActionType } from './ActionType';
import { PlayerDroppedEvent } from '../event/PlayerDroppedEvent';
import { Game } from '../Game';
export class DropPlayerAction extends Action {
    private game: Game;
    private localPlayerName: string;
    constructor(game: Game, localPlayerName: string) {
        super(ActionType.DropPlayer);
        this.game = game;
        this.localPlayerName = localPlayerName;
    }
    process(): void {
        if (this.localPlayerName !== this.player.name) {
            const player = this.player;
            if (!player.defeated) {
                const redistributedAssets = this.game.redistributeAllPlayerAssets(player);
                this.game.removeAllPlayerAssets(player);
                player.dropped = true;
                this.game.events.dispatch(new PlayerDroppedEvent(player, redistributedAssets));
            }
        }
    }
}
