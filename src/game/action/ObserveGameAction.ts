import { Action } from './Action';
import { ActionType } from './ActionType';
import { PlayerResignedEvent } from '../event/PlayerResignedEvent';
import { PlayerDefeatedEvent } from '../event/PlayerDefeatedEvent';
import { RadarOnOffEvent } from '../event/RadarOnOffEvent';
import { Game } from '../Game';
export class ObserveGameAction extends Action {
    private game: Game;
    constructor(game: Game) {
        super(ActionType.ObserveGame);
        this.game = game;
    }
    unserialize(_data: Uint8Array): void { }
    serialize(): Uint8Array {
        return new Uint8Array();
    }
    process(): void {
        const player = this.player;
        this.game.removeAllPlayerAssets(player);
        if (!player.isCombatant() || player.defeated || player.isObserver) {
            return;
        }
        player.resigned = true;
        player.defeated = true;
        player.isObserver = true;
        this.game.events.dispatch(new PlayerResignedEvent(player));
        this.game.events.dispatch(new PlayerDefeatedEvent(player));
        this.game.mapShroudTrait.getPlayerShroud(player)?.revealAll();
        const wasRadarDisabled = player.radarTrait.isDisabled();
        player.radarTrait.setDisabled(false);
        if (wasRadarDisabled) {
            this.game.events.dispatch(new RadarOnOffEvent(player, true));
        }
    }
}
