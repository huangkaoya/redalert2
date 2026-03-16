import { PingLocationAction } from '../PingLocationAction';
import { Game } from '@/game/Game';
export class PingLocationActionFactory {
    private game: Game;
    constructor(game: Game) {
        this.game = game;
    }
    create(): PingLocationAction {
        return new PingLocationAction(this.game);
    }
}
